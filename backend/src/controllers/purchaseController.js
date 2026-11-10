const pool = require('../config/db');
const { recordCashMovement } = require('../services/cashService');

const round2 = num => Math.round((Number(num) + Number.EPSILON) * 100) / 100;
const paidByPurchase = `
  SELECT purchase_id, SUM(amount) AS paid,
         SUBSTRING_INDEX(GROUP_CONCAT(payment_method ORDER BY payment_id DESC), ',', 1) AS payment_type
  FROM payments
  WHERE purchase_id IS NOT NULL
  GROUP BY purchase_id
`;

function parseRate(value) {
  const parsed = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

exports.getPurchases = async (req, res, next) => {
  try {
    const { startDate, endDate, partyId, search } = req.query;
    let query = `
      SELECT pu.purchase_id AS id, pu.purchase_number AS bill_number,
             pu.purchase_date AS bill_date, pu.supplier_id AS party_id,
             COALESCE(s.supplier_name, 'Supplier') AS supplier_name,
             s.phone AS phone_number, pu.subtotal,
             pu.discount AS discount_total, pu.gst_amount AS tax_total,
             pu.grand_total, COALESCE(pay.paid, 0) AS paid_amount,
             GREATEST(0, pu.grand_total - COALESCE(pay.paid, 0)) AS balance_due,
             COALESCE(pay.payment_type, 'Unpaid') AS payment_type,
             pu.payment_status AS status, pu.notes
      FROM purchases pu
      LEFT JOIN suppliers s ON s.supplier_id = pu.supplier_id
      LEFT JOIN (${paidByPurchase}) pay ON pay.purchase_id = pu.purchase_id
      WHERE 1 = 1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND pu.purchase_date BETWEEN ? AND ?';
      params.push(startDate, `${endDate} 23:59:59`);
    }
    if (partyId) {
      query += ' AND pu.supplier_id = ?';
      params.push(partyId);
    }
    if (search) {
      query += ' AND (pu.purchase_number LIKE ? OR s.supplier_name LIKE ? OR s.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    query += ' ORDER BY pu.purchase_id DESC';

    const [rows] = await pool.query(query, params);
    const summary = rows.reduce((totals, purchase) => ({
      paid: totals.paid + Number(purchase.paid_amount || 0),
      unpaid: totals.unpaid + Number(purchase.balance_due || 0),
      total: totals.total + Number(purchase.grand_total || 0)
    }), { paid: 0, unpaid: 0, total: 0 });

    return res.json({
      success: true,
      summary: {
        paid: round2(summary.paid),
        unpaid: round2(summary.unpaid),
        total: round2(summary.total)
      },
      data: rows
    });
  } catch (err) {
    return next(err);
  }
};

exports.createPurchase = async (req, res, next) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    const {
      bill_number,
      bill_date,
      party_id,
      supplier_name,
      phone_number,
      state_of_supply,
      payment_type,
      paid_amount,
      notes,
      items
    } = req.body;

    const supplierName = typeof supplier_name === 'string' ? supplier_name.trim() : '';
    if (!supplierName) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }
    if (items !== undefined && !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Purchase items must be a list.' });
    }

    const purchaseNumber = typeof bill_number === 'string' && bill_number.trim()
      ? bill_number.trim()
      : `PB-${Date.now().toString().slice(-8)}`;
    if (purchaseNumber.length > 50) {
      return res.status(400).json({ success: false, message: 'Bill number cannot exceed 50 characters.' });
    }

    const processedItems = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    for (const item of items || []) {
      const itemName = typeof item.item_name === 'string' ? item.item_name.trim() : '';
      if (!itemName) continue;

      const quantity = Number(item.quantity || 0);
      const price = Number(item.price_per_unit || 0);
      const discountPercent = Number(item.discount_percent || 0);
      if (!Number.isFinite(quantity) || quantity <= 0 ||
          !Number.isFinite(price) || price < 0 ||
          !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        return res.status(400).json({ success: false, message: `Invalid quantity, price, or discount for "${itemName}".` });
      }

      const gstRate = parseRate(item.tax_rate);
      const lineSubtotal = round2(quantity * price);
      const discount = round2(lineSubtotal * discountPercent / 100);
      const gstAmount = round2((lineSubtotal - discount) * gstRate / 100);
      const total = round2(lineSubtotal - discount + gstAmount);
      subtotal += lineSubtotal;
      discountTotal += discount;
      taxTotal += gstAmount;
      processedItems.push({
        productId: item.product_id ? Number(item.product_id) : null,
        itemName,
        quantity,
        unit: item.unit || 'Piece',
        price,
        gstRate,
        gstAmount,
        discount,
        total
      });
    }
    if (!processedItems.length) {
      return res.status(400).json({ success: false, message: 'At least one purchase item is required.' });
    }

    subtotal = round2(subtotal);
    discountTotal = round2(discountTotal);
    taxTotal = round2(taxTotal);
    const grandTotal = round2(subtotal - discountTotal + taxTotal);
    const paid = Number(paid_amount || 0);
    if (!Number.isFinite(paid) || paid < 0 || paid > grandTotal) {
      return res.status(400).json({ success: false, message: 'Paid amount must be between zero and the purchase total.' });
    }
    const paidAmount = round2(paid);
    const balanceDue = round2(grandTotal - paidAmount);
    const paymentStatus = balanceDue === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid';

    await connection.beginTransaction();
    transactionStarted = true;

    let supplierId = party_id ? Number(party_id) : null;
    if (supplierId && (!Number.isInteger(supplierId) || supplierId <= 0)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Selected supplier is invalid.' });
    }
    if (supplierId) {
      const [suppliers] = await connection.query(
        'SELECT supplier_id FROM suppliers WHERE supplier_id = ? FOR UPDATE',
        [supplierId]
      );
      if (!suppliers.length) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'Selected supplier was not found.' });
      }
    } else {
      const [suppliers] = await connection.query(
        'SELECT supplier_id FROM suppliers WHERE supplier_name = ? AND (phone = ? OR (? IS NULL AND phone IS NULL)) LIMIT 1',
        [supplierName, phone_number || null, phone_number || null]
      );
      if (suppliers.length) {
        supplierId = suppliers[0].supplier_id;
      } else {
        const [createdSupplier] = await connection.query(
          'INSERT INTO suppliers (supplier_name, phone) VALUES (?, ?)',
          [supplierName, phone_number || null]
        );
        supplierId = createdSupplier.insertId;
      }
    }

    const lockedProducts = new Map();
    for (const item of processedItems) {
      if (!item.productId) continue;
      if (!Number.isInteger(item.productId) || item.productId <= 0) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: `Invalid product selected for "${item.itemName}".` });
      }

      let product = lockedProducts.get(item.productId);
      if (!product) {
        const [products] = await connection.query(
          `SELECT product_id, product_name, stock_quantity, is_active, item_type
           FROM products WHERE product_id = ? FOR UPDATE`,
          [item.productId]
        );
        if (!products.length || !products[0].is_active || products[0].item_type !== 'Product') {
          await connection.rollback();
          transactionStarted = false;
          return res.status(400).json({ success: false, message: `Product for "${item.itemName}" is unavailable.` });
        }
        product = products[0];
        lockedProducts.set(item.productId, product);
      }
      if (product.product_name.trim().toLowerCase() !== item.itemName.toLowerCase()) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'A selected product does not match its purchase line.' });
      }
    }

    const purchaseDate = bill_date || new Date();
    const purchaseNotes = [
      state_of_supply ? `State of supply: ${state_of_supply}` : '',
      typeof notes === 'string' ? notes.trim() : ''
    ].filter(Boolean).join('\n') || null;
    const [purchaseResult] = await connection.query(
      `INSERT INTO purchases (
        purchase_number, supplier_id, purchase_date, subtotal, discount,
        gst_amount, grand_total, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseNumber, supplierId, purchaseDate, subtotal, discountTotal,
        taxTotal, grandTotal, paymentStatus, purchaseNotes
      ]
    );
    const purchaseId = purchaseResult.insertId;

    for (const item of processedItems) {
      await connection.query(
        `INSERT INTO purchase_items (
          purchase_id, product_id, item_name, quantity, unit, purchase_price,
          discount, gst_rate, gst_amount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseId, item.productId, item.itemName, item.quantity, item.unit,
          item.price, item.discount, item.gstRate, item.gstAmount, item.total
        ]
      );

      if (item.productId) {
        const product = lockedProducts.get(item.productId);
        const stockBefore = Number(product.stock_quantity || 0);
        const stockAfter = round2(stockBefore + item.quantity);
        await connection.query(
          'UPDATE products SET stock_quantity = ? WHERE product_id = ?',
          [stockAfter, item.productId]
        );
        product.stock_quantity = stockAfter;
        await connection.query(
          `INSERT INTO stock_movements (
            product_id, movement_type, quantity, previous_stock, new_stock,
            reference_id, description
          ) VALUES (?, 'Purchase', ?, ?, ?, ?, ?)`,
          [item.productId, item.quantity, stockBefore, stockAfter, purchaseId, `Purchase ${purchaseNumber}`]
        );
      }
    }

    if (paidAmount > 0) {
      const method = payment_type === 'UPI' || payment_type === 'Card'
        ? payment_type
        : payment_type === 'Cash'
          ? 'Cash'
          : 'Bank Transfer';
      await connection.query(
        'INSERT INTO payments (purchase_id, payment_method, amount, reference_number) VALUES (?, ?, ?, ?)',
        [purchaseId, method, paidAmount, method === 'Bank Transfer' && payment_type === 'Cheque' ? 'Cheque' : null]
      );
      // Record cash outflow in ledger — only for Cash payments
      if (method === 'Cash') {
        await recordCashMovement(connection, {
          entry_type: 'Purchase',
          reference_id: purchaseNumber,
          party_name: supplierName,
          date: new Date(),
          inflow: 0,
          outflow: paidAmount,
          description: 'Cash paid for Purchase Bill #' + purchaseNumber,
          created_by: req.user && req.user.username ? req.user.username : 'Admin'
        });
      }
    }

    await connection.commit();
    transactionStarted = false;
    return res.status(201).json({
      success: true,
      message: 'Purchase bill recorded successfully.',
      data: {
        id: purchaseId,
        bill_number: purchaseNumber,
        grand_total: grandTotal,
        paid_amount: paidAmount,
        balance_due: balanceDue
      }
    });
  } catch (err) {
    if (transactionStarted) await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A purchase with this bill number already exists.' });
    }
    return next(err);
  } finally {
    connection.release();
  }
};


exports.getPurchaseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const purchaseId = Number(id);
    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid purchase ID.' });
    }

    const [purchases] = await pool.query(
      `SELECT pu.purchase_id AS id, pu.purchase_number AS bill_number,
              pu.purchase_date AS bill_date, pu.supplier_id AS party_id,
              COALESCE(s.supplier_name, 'Supplier') AS supplier_name,
              s.phone AS phone_number, s.email, s.address, s.gst_number AS gstin,
              pu.subtotal, pu.discount AS discount_total, pu.gst_amount AS tax_total,
              pu.grand_total, COALESCE(pay.paid, 0) AS paid_amount,
              GREATEST(0, pu.grand_total - COALESCE(pay.paid, 0)) AS balance_due,
              COALESCE(pay.payment_type, 'Unpaid') AS payment_type,
              pu.payment_status AS status, pu.notes, pu.updated_at
       FROM purchases pu
       LEFT JOIN suppliers s ON s.supplier_id = pu.supplier_id
       LEFT JOIN (${paidByPurchase}) pay ON pay.purchase_id = pu.purchase_id
       WHERE pu.purchase_id = ?`,
      [purchaseId]
    );

    if (!purchases.length) {
      return res.status(404).json({ success: false, message: 'Purchase bill not found.' });
    }

    const purchase = purchases[0];

    const [items] = await pool.query(
      `SELECT pi.purchase_item_id, pi.product_id, pi.item_name,
              pi.quantity, pi.unit, pi.purchase_price AS price_per_unit,
              pi.discount,
              ROUND((pi.discount / NULLIF(pi.quantity * pi.purchase_price, 0)) * 100, 2) AS discount_percent,
              pi.gst_rate, CONCAT('GST@', CAST(pi.gst_rate AS CHAR), '%') AS tax_rate,
              pi.gst_amount, pi.total AS total_amount,
              p.stock_quantity AS current_stock, p.product_code AS item_code, p.product_code, p.barcode
       FROM purchase_items pi
       LEFT JOIN products p ON p.product_id = pi.product_id
       WHERE pi.purchase_id = ?
       ORDER BY pi.purchase_item_id ASC`,
      [purchaseId]
    );

    const [payments] = await pool.query(
      `SELECT payment_id, payment_date, payment_method, amount, reference_number
       FROM payments
       WHERE purchase_id = ?
       ORDER BY payment_id ASC`,
      [purchaseId]
    );

    const [history] = await pool.query(
      `SELECT history_id, purchase_number, previous_grand_total, new_grand_total,
              modified_by, modification_reason, changes_summary, modified_at
       FROM purchase_history
       WHERE purchase_id = ?
       ORDER BY modified_at DESC`,
      [purchaseId]
    );

    return res.json({
      success: true,
      data: {
        ...purchase,
        items,
        payments,
        history
      }
    });
  } catch (err) {
    return next(err);
  }
};

exports.updatePurchase = async (req, res, next) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    const { id } = req.params;
    const purchaseId = Number(id);
    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid purchase ID.' });
    }

    const {
      bill_date,
      party_id,
      supplier_name,
      phone_number,
      state_of_supply,
      payment_type,
      paid_amount,
      notes,
      modification_reason,
      items
    } = req.body;

    const supplierName = typeof supplier_name === 'string' ? supplier_name.trim() : '';
    if (!supplierName) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }
    if (items !== undefined && !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Purchase items must be a list.' });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    // Lock purchase record
    const [existingPurchases] = await connection.query(
      'SELECT * FROM purchases WHERE purchase_id = ? FOR UPDATE',
      [purchaseId]
    );
    if (!existingPurchases.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'Purchase bill not found.' });
    }
    const currentPurchase = existingPurchases[0];

    // Lock existing purchase items
    const [origItems] = await connection.query(
      'SELECT * FROM purchase_items WHERE purchase_id = ? FOR UPDATE',
      [purchaseId]
    );

    // Map original quantities by product_id
    const origQtyMap = new Map();
    for (const item of origItems) {
      if (item.product_id) {
        origQtyMap.set(
          item.product_id,
          round2((origQtyMap.get(item.product_id) || 0) + Number(item.quantity || 0))
        );
      }
    }

    // Process new items
    const processedItems = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    const newQtyMap = new Map();

    for (const item of items || []) {
      const itemName = typeof item.item_name === 'string' ? item.item_name.trim() : '';
      if (!itemName) continue;

      const quantity = Number(item.quantity || 0);
      const price = Number(item.price_per_unit || 0);
      const discountPercent = Number(item.discount_percent || 0);
      if (!Number.isFinite(quantity) || quantity <= 0 ||
          !Number.isFinite(price) || price < 0 ||
          !Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: `Invalid quantity, price, or discount for "${itemName}".` });
      }

      const gstRate = parseRate(item.tax_rate !== undefined ? item.tax_rate : item.gst_rate);
      const lineSubtotal = round2(quantity * price);
      const discount = round2(lineSubtotal * discountPercent / 100);
      const gstAmount = round2((lineSubtotal - discount) * gstRate / 100);
      const total = round2(lineSubtotal - discount + gstAmount);
      subtotal += lineSubtotal;
      discountTotal += discount;
      taxTotal += gstAmount;

      const productId = item.product_id ? Number(item.product_id) : null;
      if (productId) {
        newQtyMap.set(
          productId,
          round2((newQtyMap.get(productId) || 0) + quantity)
        );
      }

      processedItems.push({
        productId,
        itemName,
        quantity,
        unit: item.unit || 'Piece',
        price,
        gstRate,
        gstAmount,
        discount,
        total
      });
    }

    if (!processedItems.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'At least one purchase item is required.' });
    }

    subtotal = round2(subtotal);
    discountTotal = round2(discountTotal);
    taxTotal = round2(taxTotal);
    const grandTotal = round2(subtotal - discountTotal + taxTotal);

    // Calculate stock deltas and validate stock availability for negative adjustments
    const allProductIds = new Set([...origQtyMap.keys(), ...newQtyMap.keys()]);
    const stockChanges = [];

    for (const prodId of allProductIds) {
      const origQty = origQtyMap.get(prodId) || 0;
      const newQty = newQtyMap.get(prodId) || 0;
      const delta = round2(newQty - origQty);

      if (delta !== 0) {
        const [prods] = await connection.query(
          'SELECT product_id, product_name, stock_quantity, is_active FROM products WHERE product_id = ? FOR UPDATE',
          [prodId]
        );
        if (!prods.length) {
          await connection.rollback();
          transactionStarted = false;
          return res.status(400).json({ success: false, message: `Product ID ${prodId} no longer exists.` });
        }
        const prod = prods[0];
        const currentStock = Number(prod.stock_quantity || 0);

        if (delta < 0 && (currentStock + delta) < 0) {
          await connection.rollback();
          transactionStarted = false;
          return res.status(400).json({
            success: false,
            message: `Cannot reduce quantity of "${prod.product_name}" by ${Math.abs(delta)}. Current stock is only ${currentStock}, which would become negative.`
          });
        }

        const newStock = round2(currentStock + delta);
        await connection.query(
          'UPDATE products SET stock_quantity = ? WHERE product_id = ?',
          [newStock, prodId]
        );

        await connection.query(
          `INSERT INTO stock_movements (
            product_id, movement_type, quantity, previous_stock, new_stock,
            reference_id, description
          ) VALUES (?, 'Adjustment', ?, ?, ?, ?, ?)`,
          [
            prodId,
            Math.abs(delta),
            currentStock,
            newStock,
            purchaseId,
            `Purchase ${currentPurchase.purchase_number} adjustment: ${delta > 0 ? '+' : ''}${delta} units`
          ]
        );

        stockChanges.push({
          productId: prodId,
          productName: prod.product_name,
          origQty,
          newQty,
          delta,
          previousStock: currentStock,
          newStock
        });
      }
    }

    // Resolve supplier
    let supplierId = party_id ? Number(party_id) : null;
    if (supplierId && (!Number.isInteger(supplierId) || supplierId <= 0)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Selected supplier is invalid.' });
    }
    if (supplierId) {
      const [suppliers] = await connection.query(
        'SELECT supplier_id FROM suppliers WHERE supplier_id = ? FOR UPDATE',
        [supplierId]
      );
      if (!suppliers.length) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'Selected supplier was not found.' });
      }
    } else {
      const [suppliers] = await connection.query(
        'SELECT supplier_id FROM suppliers WHERE supplier_name = ? AND (phone = ? OR (? IS NULL AND phone IS NULL)) LIMIT 1',
        [supplierName, phone_number || null, phone_number || null]
      );
      if (suppliers.length) {
        supplierId = suppliers[0].supplier_id;
      } else {
        const [createdSupplier] = await connection.query(
          'INSERT INTO suppliers (supplier_name, phone) VALUES (?, ?)',
          [supplierName, phone_number || null]
        );
        supplierId = createdSupplier.insertId;
      }
    }

    // Payments handling
    const [existingPayments] = await connection.query(
      'SELECT payment_id, amount, payment_method FROM payments WHERE purchase_id = ? FOR UPDATE',
      [purchaseId]
    );
    const existingPaid = existingPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    let targetPaid = paid_amount !== undefined ? round2(Number(paid_amount) || 0) : existingPaid;

    if (!Number.isFinite(targetPaid) || targetPaid < existingPaid || targetPaid > grandTotal) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        message: targetPaid < existingPaid
          ? 'Recorded purchase payments cannot be reduced while editing; add a separate reversal instead.'
          : 'Paid amount must be between the already recorded payments and the purchase grand total.'
      });
    }

    const method = payment_type === 'UPI' || payment_type === 'Card'
      ? payment_type
      : payment_type === 'Cash'
        ? 'Cash'
        : 'Bank Transfer';

    if (paid_amount !== undefined) {
      const additionalPayment = round2(targetPaid - existingPaid);
      if (additionalPayment > 0) {
        await connection.query(
          'INSERT INTO payments (purchase_id, payment_method, amount, reference_number) VALUES (?, ?, ?, ?)',
          [purchaseId, method, additionalPayment, payment_type === 'Cheque' ? 'Cheque' : null]
        );
        // Record cash outflow in ledger for additional cash payment in updatePurchase
        if (method === 'Cash') {
          await recordCashMovement(connection, {
            entry_type: 'Purchase',
            reference_id: currentPurchase.purchase_number,
            party_name: supplierName,
            date: new Date(),
            inflow: 0,
            outflow: additionalPayment,
            description: 'Additional cash paid for Purchase Bill #' + currentPurchase.purchase_number,
            created_by: req.user && req.user.username ? req.user.username : 'Admin'
          });
        }
      }
    }

    const balanceDue = round2(Math.max(0, grandTotal - targetPaid));
    const paymentStatus = balanceDue === 0 ? 'Paid' : targetPaid > 0 ? 'Partial' : 'Unpaid';

    // Update purchases table (purchase_number remains UNCHANGED)
    const purchaseDate = bill_date || currentPurchase.purchase_date;
    const purchaseNotes = [
      state_of_supply ? `State of supply: ${state_of_supply}` : '',
      typeof notes === 'string' ? notes.trim() : ''
    ].filter(Boolean).join('\n') || null;

    await connection.query(
      `UPDATE purchases
       SET supplier_id = ?, purchase_date = ?, subtotal = ?, discount = ?,
           gst_amount = ?, grand_total = ?, payment_status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE purchase_id = ?`,
      [
        supplierId, purchaseDate, subtotal, discountTotal,
        taxTotal, grandTotal, paymentStatus, purchaseNotes, purchaseId
      ]
    );

    // Delete old items and insert updated items
    await connection.query('DELETE FROM purchase_items WHERE purchase_id = ?', [purchaseId]);

    for (const item of processedItems) {
      await connection.query(
        `INSERT INTO purchase_items (
          purchase_id, product_id, item_name, quantity, unit, purchase_price,
          discount, gst_rate, gst_amount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseId, item.productId, item.itemName, item.quantity, item.unit,
          item.price, item.discount, item.gstRate, item.gstAmount, item.total
        ]
      );
    }

    // Insert audit history
    const changesSummary = {
      previous_grand_total: currentPurchase.grand_total,
      new_grand_total: grandTotal,
      previous_items_count: origItems.length,
      new_items_count: processedItems.length,
      stock_changes: stockChanges
    };

    await connection.query(
      `INSERT INTO purchase_history (
        purchase_id, purchase_number, previous_grand_total, new_grand_total,
        modified_by, modification_reason, changes_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseId,
        currentPurchase.purchase_number,
        currentPurchase.grand_total,
        grandTotal,
        req.user?.username || 'Admin',
        typeof modification_reason === 'string' && modification_reason.trim()
          ? modification_reason.trim()
          : 'Purchase bill edited',
        JSON.stringify(changesSummary)
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return res.json({
      success: true,
      message: 'Purchase bill updated successfully.',
      data: {
        id: purchaseId,
        bill_number: currentPurchase.purchase_number,
        grand_total: grandTotal,
        paid_amount: targetPaid,
        balance_due: balanceDue,
        stock_changes: stockChanges
      }
    });
  } catch (err) {
    if (transactionStarted) await connection.rollback();
    return next(err);
  } finally {
    connection.release();
  }
};

exports.deletePurchase = async (req, res, next) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    const { id } = req.params;
    const purchaseId = Number(id);
    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid purchase ID.' });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    const [purchases] = await connection.query(
      'SELECT * FROM purchases WHERE purchase_id = ? FOR UPDATE',
      [purchaseId]
    );
    if (!purchases.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'Purchase bill not found.' });
    }
    const purchase = purchases[0];

    const [items] = await connection.query(
      'SELECT * FROM purchase_items WHERE purchase_id = ? FOR UPDATE',
      [purchaseId]
    );

    // Validate that removing stock won't take inventory negative
    for (const item of items) {
      if (item.product_id) {
        const [prods] = await connection.query(
          'SELECT product_id, product_name, stock_quantity FROM products WHERE product_id = ? FOR UPDATE',
          [item.product_id]
        );
        if (prods.length) {
          const currentStock = Number(prods[0].stock_quantity || 0);
          const removeQty = Number(item.quantity || 0);
          if (currentStock - removeQty < 0) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({
              success: false,
              message: `Cannot delete purchase bill. Stock for "${prods[0].product_name}" is only ${currentStock}, which would become negative upon removing ${removeQty} purchased units.`
            });
          }
          const newStock = round2(currentStock - removeQty);
          await connection.query(
            'UPDATE products SET stock_quantity = ? WHERE product_id = ?',
            [newStock, item.product_id]
          );
          await connection.query(
            `INSERT INTO stock_movements (
              product_id, movement_type, quantity, previous_stock, new_stock,
              reference_id, description
            ) VALUES (?, 'Adjustment', ?, ?, ?, ?, ?)`,
            [
              item.product_id,
              removeQty,
              currentStock,
              newStock,
              purchaseId,
              `Purchase ${purchase.purchase_number} deleted: removed ${removeQty} units`
            ]
          );
        }
      }
    }

    await connection.query('DELETE FROM payments WHERE purchase_id = ?', [purchaseId]);
    await connection.query('DELETE FROM purchase_items WHERE purchase_id = ?', [purchaseId]);
    await connection.query('DELETE FROM purchase_history WHERE purchase_id = ?', [purchaseId]);
    await connection.query('DELETE FROM purchases WHERE purchase_id = ?', [purchaseId]);

    await connection.commit();
    transactionStarted = false;

    return res.json({
      success: true,
      message: `Purchase bill ${purchase.purchase_number} deleted successfully.`
    });
  } catch (err) {
    if (transactionStarted) await connection.rollback();
    return next(err);
  } finally {
    connection.release();
  }
};

exports.getPurchaseHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const purchaseId = Number(id);
    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid purchase ID.' });
    }

    const [history] = await pool.query(
      `SELECT history_id, purchase_id, purchase_number, previous_grand_total,
              new_grand_total, modified_by, modification_reason, changes_summary, modified_at
       FROM purchase_history
       WHERE purchase_id = ?
       ORDER BY modified_at DESC`,
      [purchaseId]
    );

    return res.json({
      success: true,
      data: history
    });
  } catch (err) {
    return next(err);
  }
};
