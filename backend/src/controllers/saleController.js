const crypto = require('crypto');
const pool = require('../config/db');
const { calculatePointsEarned } = require('../utils/loyalty');
const { recordCashMovement } = require('../services/cashService');
const {
  round2,
  isWholeUnit,
  calculateLine,
  splitGst,
  calculatePaymentAllocation
} = require('../utils/posCalculations');

const STATE_CODES = {
  'andhra pradesh': '37', 'arunachal pradesh': '12', assam: '18', bihar: '10',
  chhattisgarh: '22', goa: '30', gujarat: '24', haryana: '06',
  'himachal pradesh': '02', jharkhand: '20', karnataka: '29', kerala: '32',
  'madhya pradesh': '23', maharashtra: '27', manipur: '14', meghalaya: '17',
  mizoram: '15', nagaland: '13', odisha: '21', punjab: '03', rajasthan: '08',
  sikkim: '11', 'tamil nadu': '33', telangana: '36', tripura: '16',
  'uttar pradesh': '09', uttarakhand: '05', 'west bengal': '19',
  delhi: '07', 'jammu and kashmir': '01', ladakh: '38',
  'andaman and nicobar islands': '35', chandigarh: '04',
  'dadra and nagar haveli and daman and diu': '26', lakshadweep: '31',
  puducherry: '34'
};

function getStateCode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (/^\d{2}$/.test(normalized)) return normalized;
  return STATE_CODES[normalized] || null;
}

function getStateName(code) {
  return Object.entries(STATE_CODES).find(([, stateCode]) => stateCode === code)?.[0]
    .replace(/\b\w/g, character => character.toUpperCase()) || null;
}

const saleFields = `
  s.sale_id AS id,
  s.invoice_number,
  s.sale_date AS invoice_date,
  s.customer_id AS party_id,
  COALESCE(c.customer_name, 'Walk-in Customer') AS customer_name,
  c.phone AS phone_number,
  c.address AS billing_address,
  s.subtotal,
  s.discount AS discount_total,
  s.gst_amount AS tax_total,
  s.points_earned,
  s.points_redeemed,
  s.redemption_discount,
  s.state_of_supply,
  s.cgst_amount,
  s.sgst_amount,
  s.igst_amount,
  s.amount_tendered,
  s.change_returned,
  0 AS round_off,
  s.grand_total,
  COALESCE(payments.received_amount, 0) AS received_amount,
  GREATEST(0, s.grand_total - COALESCE(payments.received_amount, 0)) AS balance_due,
  COALESCE(payments.payment_type,
           CASE WHEN s.payment_status = 'Unpaid' THEN 'Credit' ELSE 'Cash' END) AS payment_type,
  s.payment_status AS status,
  s.notes
`;

const salesFrom = `
  FROM sales s
  LEFT JOIN customers c ON s.customer_id = c.customer_id
  LEFT JOIN (
    SELECT sale_id, SUM(amount) AS received_amount,
           CASE WHEN COUNT(DISTINCT payment_method) > 1 THEN 'Split'
                ELSE SUBSTRING_INDEX(GROUP_CONCAT(payment_method ORDER BY payment_id DESC), ',', 1)
           END AS payment_type
    FROM payments
    WHERE sale_id IS NOT NULL
    GROUP BY sale_id
  ) payments ON payments.sale_id = s.sale_id
`;

exports.getNextInvoiceNumber = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) + 1 AS next_invoice_no FROM sales');
    return res.json({ success: true, next_invoice_no: rows[0].next_invoice_no });
  } catch (err) {
    next(err);
  }
};

exports.getSales = async (req, res, next) => {
  try {
    const { startDate, endDate, search } = req.query;
    let query = `SELECT ${saleFields} ${salesFrom} WHERE 1 = 1`;
    const params = [];

    if (startDate && endDate) {
      query += ' AND s.sale_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    if (search) {
      query += ' AND (s.invoice_number LIKE ? OR c.customer_name LIKE ? OR c.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    query += ' ORDER BY s.sale_id DESC';

    const [rows] = await pool.query(query, params);
    const summary = rows.reduce((totals, sale) => ({
      totalSales: totals.totalSales + Number(sale.grand_total || 0),
      totalReceived: totals.totalReceived + Number(sale.received_amount || 0),
      totalBalance: totals.totalBalance + Number(sale.balance_due || 0)
    }), { totalSales: 0, totalReceived: 0, totalBalance: 0 });

    return res.json({
      success: true,
      summary: {
        totalSales: round2(summary.totalSales),
        totalReceived: round2(summary.totalReceived),
        totalBalance: round2(summary.totalBalance)
      },
      data: rows
    });
  } catch (err) {
    next(err);
  }
};

exports.getSaleById = async (req, res, next) => {
  try {
    const [sales] = await pool.query(
      `SELECT ${saleFields}
       ${salesFrom}
       WHERE s.sale_id = ? OR s.invoice_number = ?
       LIMIT 1`,
      [req.params.id, req.params.id]
    );
    if (!sales.length) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found.' });
    }

    const sale = sales[0];
    const [items] = await pool.query(
      `SELECT si.sale_item_id AS id, si.product_id, p.product_name AS item_name,
              si.hsn_code, p.product_code, p.barcode, si.quantity, si.unit,
              si.selling_price AS price_per_unit, si.price_tax_type,
              si.discount AS discount_amount,
              CASE WHEN si.quantity * si.selling_price = 0 THEN 0
                   ELSE si.discount / (si.quantity * si.selling_price) * 100 END AS discount_percent,
              CONCAT('GST@', COALESCE(si.gst_rate, 0), '%') AS tax_rate,
              si.gst_amount AS tax_amount, si.total AS total_amount,
              si.sale_item_id,
              GREATEST(0, si.quantity - COALESCE(returned.quantity, 0)) AS returnable_quantity
       FROM sale_items si
       LEFT JOIN products p ON p.product_id = si.product_id
       LEFT JOIN (
         SELECT sri.sale_item_id, SUM(sri.quantity) AS quantity
         FROM sales_return_items sri
         GROUP BY sri.sale_item_id
       ) returned ON returned.sale_item_id = si.sale_item_id
       WHERE si.sale_id = ?
       ORDER BY si.sale_item_id`,
      [sale.id]
    );
    const [businessRows] = await pool.query(
      `SELECT store_name AS business_name, owner_name, phone AS phone_number,
              email, address AS business_address, gst_number AS gstin, currency
       FROM store_settings
       ORDER BY setting_id
       LIMIT 1`
    );
    const [payments] = await pool.query(
       `SELECT payment_method AS method, amount, payment_date
        FROM payments WHERE sale_id = ? ORDER BY payment_id`,
       [sale.id]
    );

    return res.json({
      success: true,
      data: {
        ...sale,
        items,
        payments,
        business: businessRows[0] || {}
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createSale = async (req, res, next) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  const checkoutLockNames = [];
  try {
    const {
      party_id,
      customer_name,
      phone_number,
      payment_type,
      received_amount,
      payments: requestedPayments,
      cash_tendered,
      bill_discount_percent = 0,
      state_of_supply = 'Karnataka',
      redeem_points = 0,
      idempotency_key,
      notes,
      items
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one product is required for the invoice.' });
    }
    const billDiscountPercent = Number(bill_discount_percent);
    if (!Number.isFinite(billDiscountPercent) || billDiscountPercent < 0 || billDiscountPercent > 100) {
      return res.status(400).json({ success: false, message: 'Bill discount must be between 0 and 100 percent.' });
    }
    const phone = String(phone_number || '').trim();
    if (!/^\+?[0-9\s()-]{7,20}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'A valid customer phone number is required.' });
    }
    const checkoutKey = typeof idempotency_key === 'string' && idempotency_key.trim()
      ? idempotency_key.trim()
      : null;
    if (checkoutKey && checkoutKey.length > 64) {
      return res.status(400).json({ success: false, message: 'Checkout idempotency key is too long.' });
    }

    const lockValues = [];
    if (checkoutKey) {
      lockValues.push(`sale-${checkoutKey}`);
    }
    lockValues.push(`customer-${phone}`);
    for (const value of lockValues) {
      const lockName = `checkout-${crypto.createHash('sha256').update(value).digest('hex').slice(0, 55)}`;
      const [lockRows] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', [lockName]);
      if (Number(lockRows[0]?.acquired) !== 1) {
        return res.status(409).json({ success: false, message: 'This checkout is already being processed. Please retry.' });
      }
      checkoutLockNames.push(lockName);
    }

    await connection.beginTransaction();
    transactionStarted = true;

    if (checkoutKey) {
      const [existingSales] = await connection.query(
        `SELECT sale_id AS id, invoice_number, grand_total,
                points_earned, points_redeemed, redemption_discount,
                customer_id
         FROM sales WHERE checkout_key = ? FOR UPDATE`,
        [checkoutKey]
      );
      if (existingSales.length) {
        const existingSale = existingSales[0];
        const [customerRows] = await connection.query(
          'SELECT customer_name, phone, loyalty_points FROM customers WHERE customer_id = ?',
          [existingSale.customer_id]
        );
        await connection.rollback();
        transactionStarted = false;
        return res.status(200).json({
          success: true,
          message: 'This checkout was already completed.',
          data: {
            id: existingSale.id,
            invoice_number: existingSale.invoice_number,
            grand_total: Number(existingSale.grand_total),
            points_earned: existingSale.points_earned,
            points_redeemed: existingSale.points_redeemed,
            redemption_discount: Number(existingSale.redemption_discount),
            customer_name: customerRows[0]?.customer_name,
            customer_id: existingSale.customer_id,
            phone_number: customerRows[0]?.phone,
            remaining_points: customerRows[0]?.loyalty_points
          }
        });
      }
    }

    const lockedProducts = new Map();
    const quantitiesByProduct = new Map();
    const processedItems = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity || 1);
      if (!Number.isInteger(productId) || productId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'Each sale line must include a valid product and quantity.' });
      }

      let product = lockedProducts.get(productId);
      if (!product) {
        const [productRows] = await connection.query(
          `SELECT product_id, product_name, hsn_code, selling_price,
                  sale_price_tax_type, discount_value, discount_type, unit, gst_rate,
                  stock_quantity, is_active
           FROM products
           WHERE product_id = ? AND is_active = TRUE AND item_type = 'Product'
           FOR UPDATE`,
          [productId]
        );
        if (!productRows.length || !productRows[0].is_active) {
          await connection.rollback();
          transactionStarted = false;
          return res.status(400).json({ success: false, message: 'A product in this sale is missing or inactive.' });
        }
        product = productRows[0];
        lockedProducts.set(productId, product);
      }

      const requestedStock = (quantitiesByProduct.get(productId) || 0) + quantity;
      const availableStock = Number(product.stock_quantity || 0);
      if (isWholeUnit(product.unit) && !Number.isInteger(quantity)) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({
          success: false,
          message: `"${product.product_name}" is sold by whole ${product.unit || 'units'} only.`
        });
      }
      if (requestedStock > availableStock) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.product_name}". Available: ${availableStock}, requested: ${requestedStock}.`
        });
      }
      quantitiesByProduct.set(productId, requestedStock);

      const rawPrice = Number(product.selling_price || 0);
      const discountPercent = Number(item.discount_value ?? item.discount_percent ?? product.discount_value ?? 0);
      const discountType = item.discount_type || product.discount_type || 'Percentage';
      const taxRate = Number(product.gst_rate || 0);
      const priceTaxType = product.sale_price_tax_type || 'Without Tax';
      let line;
      try {
        line = calculateLine({
          quantity,
          price: rawPrice,
          discountPercent,
          discountType,
          billDiscountPercent,
          gstRate: taxRate,
          priceTaxType
        });
      } catch (error) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: error.message });
      }

      subtotal += line.subtotal;
      discountTotal += line.discount;
      taxTotal += line.gstAmount;
      processedItems.push({
        product_id: productId,
        item_name: product.product_name,
        hsn_code: product.hsn_code,
        quantity,
        unit: product.unit || 'Piece',
        price_per_unit: rawPrice,
        price_tax_type: priceTaxType,
        discount: line.discount,
        gst_rate: taxRate,
        gst_amount: line.gstAmount,
        taxable_amount: line.taxableAmount,
        total: line.total
      });
    }

    subtotal = round2(subtotal);
    discountTotal = round2(discountTotal);
    taxTotal = round2(taxTotal);
    const eligibleAmount = round2(processedItems.reduce((sum, item) => sum + item.total, 0));
    const pointsToRedeem = Number(redeem_points);
    if (!Number.isInteger(pointsToRedeem) || pointsToRedeem < 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Redeemed points must be a non-negative whole number.' });
    }

    const finalCustomerName = String(customer_name || '').trim();
    const [existingCustomers] = await connection.query(
      `SELECT customer_id, customer_name, phone, loyalty_points, gst_number
       FROM customers WHERE phone = ? FOR UPDATE`,
      [phone]
    );
    let customerId;
    let customerPoints = 0;
    let resolvedCustomerName = finalCustomerName;
    if (existingCustomers.length) {
      const customer = existingCustomers[0];
      customerId = customer.customer_id;
      customerPoints = Number(customer.loyalty_points || 0);
      resolvedCustomerName = customer.customer_name;
      if (party_id && Number(party_id) !== customerId) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'Customer phone number does not match the selected customer.' });
      }
    } else {
      if (!finalCustomerName || finalCustomerName === 'Walk-in Customer') {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'Enter the name to register this new customer phone number.' });
      }
      await connection.query(
        `INSERT INTO customers (customer_name, phone)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE phone = VALUES(phone)`,
        [finalCustomerName, phone]
      );
      const [createdCustomers] = await connection.query(
        `SELECT customer_id, customer_name, phone, loyalty_points, gst_number
         FROM customers WHERE phone = ? FOR UPDATE`,
        [phone]
      );
      if (!createdCustomers.length) {
        throw new Error('Could not resolve the customer record for this phone number.');
      }
      customerId = createdCustomers[0].customer_id;
      customerPoints = Number(createdCustomers[0].loyalty_points || 0);
      resolvedCustomerName = createdCustomers[0].customer_name;
    }

    if (pointsToRedeem > customerPoints) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Customer does not have enough loyalty points.' });
    }
    if (pointsToRedeem > eligibleAmount) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Redeemed points cannot exceed the amount due.' });
    }

    const redemptionDiscount = round2(pointsToRedeem);
    const grandTotal = round2(eligibleAmount - redemptionDiscount);
    const pointsEarned = calculatePointsEarned(eligibleAmount);
    let payments;
    if (Array.isArray(requestedPayments)) {
      payments = requestedPayments.map(payment => ({
        method: String(payment?.method || '').trim(),
        amount: round2(Number(payment?.amount))
      }));
    } else if (payment_type === 'Credit') {
      payments = [];
    } else if (payment_type === 'Split') {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Enter the amount for each split payment method.' });
    } else {
      const legacyAmount = received_amount === undefined ? 0 : Number(received_amount);
      payments = legacyAmount > 0 ? [{ method: payment_type || 'Cash', amount: round2(legacyAmount) }] : [];
    }

    let paymentAllocation;
    try {
      paymentAllocation = calculatePaymentAllocation(payments, grandTotal, cash_tendered);
    } catch (error) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: error.message });
    }
    payments = paymentAllocation.payments;
    const {
      received,
      cashAllocation,
      nonCashAllocation,
      amountTendered,
      changeReturned,
      balanceDue
    } = paymentAllocation;
    if (received === 0 && grandTotal > 0 && payment_type !== 'Credit') {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        message: 'No payment amount was entered. Choose Credit explicitly to record an outstanding balance.'
      });
    }
    const paymentStatus = balanceDue === 0 ? 'Paid' : received > 0 ? 'Partial' : 'Unpaid';

    const [storeRows] = await connection.query(
      'SELECT gst_number FROM store_settings ORDER BY setting_id LIMIT 1'
    );
    const storeGstNumber = String(storeRows[0]?.gst_number || '');
    const customerGstNumber = String(existingCustomers[0]?.gst_number || '');
    const originStateCode = storeGstNumber.slice(0, 2).match(/^\d{2}$/)?.[0] || '29';
    const destinationStateCode = customerGstNumber.slice(0, 2).match(/^\d{2}$/)?.[0]
      || getStateCode(state_of_supply);
    if (!destinationStateCode) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Select a valid state of supply for GST calculation.' });
    }
    const taxBreakdown = splitGst(taxTotal, originStateCode === destinationStateCode);
    const resolvedStateOfSupply = getStateName(destinationStateCode) || state_of_supply;

    const invoiceNumber = `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const [saleResult] = await connection.query(
      `INSERT INTO sales (
        invoice_number, customer_id, subtotal, discount, gst_amount,
        grand_total, points_earned, points_redeemed, redemption_discount,
        checkout_key, payment_status, notes, state_of_supply, cgst_amount,
        sgst_amount, igst_amount, amount_tendered, change_returned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        customerId,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        pointsEarned,
        pointsToRedeem,
        redemptionDiscount,
        checkoutKey,
        paymentStatus,
        notes || null,
        resolvedStateOfSupply,
        taxBreakdown.cgst,
        taxBreakdown.sgst,
        taxBreakdown.igst,
        round2(amountTendered + nonCashAllocation),
        changeReturned
      ]
    );
    const saleId = saleResult.insertId;

    for (const item of processedItems) {
      await connection.query(
        `INSERT INTO sale_items (
          sale_id, product_id, hsn_code, quantity, unit, selling_price,
          price_tax_type, discount, gst_rate, gst_amount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.product_id,
          item.hsn_code,
          item.quantity,
          item.unit,
          item.price_per_unit,
          item.price_tax_type,
          item.discount,
          item.gst_rate,
          item.gst_amount,
          item.total
        ]
      );
    }

    for (const [productId, quantity] of quantitiesByProduct) {
      const product = lockedProducts.get(productId);
      const stockBefore = Number(product.stock_quantity || 0);
      const stockAfter = round2(stockBefore - quantity);
      await connection.query(
        'UPDATE products SET stock_quantity = ? WHERE product_id = ?',
        [stockAfter, productId]
      );
      await connection.query(
        `INSERT INTO stock_movements (
          product_id, movement_type, quantity, previous_stock, new_stock,
          reference_id, description
        ) VALUES (?, 'Sale', ?, ?, ?, ?, ?)`,
        [productId, -quantity, stockBefore, stockAfter, saleId, `Sale ${invoiceNumber}`]
      );
    }

    for (const payment of payments) {
      await connection.query(
        `INSERT INTO payments (sale_id, payment_method, amount, reference_number)
         VALUES (?, ?, ?, NULL)`,
        [saleId, payment.method, payment.amount]
      );
    }
    if (cashAllocation > 0) {
      await recordCashMovement(connection, {
        entry_type: 'Sale',
        reference_id: invoiceNumber,
        party_name: resolvedCustomerName || 'Walk-in Customer',
        date: new Date(),
        inflow: cashAllocation,
        outflow: 0,
        description: `Cash received for Invoice #${invoiceNumber}`,
        created_by: req.user?.username || 'Cashier'
      });
    }

    const pointsAfterSale = customerPoints - pointsToRedeem + pointsEarned;
    if (pointsToRedeem > 0 || pointsEarned > 0) {
      const [loyaltyUpdate] = await connection.query(
        `UPDATE customers
         SET loyalty_points = loyalty_points - ? + ?
         WHERE customer_id = ? AND loyalty_points >= ?`,
        [pointsToRedeem, pointsEarned, customerId, pointsToRedeem]
      );
      if (!loyaltyUpdate.affectedRows) {
        throw new Error('Loyalty points balance changed during checkout; please retry the sale.');
      }
    }
    if (pointsEarned > 0) {
      await connection.query(
        `INSERT INTO loyalty_points_transactions
          (customer_id, phone_number, sale_id, invoice_number, transaction_type, points, description)
         VALUES (?, ?, ?, ?, 'Earned', ?, 'Points earned from completed sale')`,
        [customerId, phone, saleId, invoiceNumber, pointsEarned]
      );
    }
    if (pointsToRedeem > 0) {
      await connection.query(
        `INSERT INTO loyalty_points_transactions
          (customer_id, phone_number, sale_id, invoice_number, transaction_type, points, description)
         VALUES (?, ?, ?, ?, 'Redeemed', ?, 'Points redeemed against completed sale')`,
        [customerId, phone, saleId, invoiceNumber, pointsToRedeem]
      );
    }

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: 'Sale invoice created successfully.',
      data: {
        id: saleId,
        invoice_number: invoiceNumber,
        grand_total: grandTotal,
        received_amount: received,
        balance_due: balanceDue,
        customer_name: resolvedCustomerName,
        customer_id: customerId,
        phone_number: phone,
        points_earned: pointsEarned,
        points_redeemed: pointsToRedeem,
        remaining_points: pointsAfterSale,
        redemption_discount: redemptionDiscount,
        amount_tendered: round2(amountTendered + nonCashAllocation),
        change_returned: changeReturned,
        payment_type: payments.length > 1
          ? 'Split'
          : payments[0]?.method || 'Credit',
        payment_status: paymentStatus,
        state_of_supply: resolvedStateOfSupply,
        cgst_amount: taxBreakdown.cgst,
        sgst_amount: taxBreakdown.sgst,
        igst_amount: taxBreakdown.igst
      }
    });
  } catch (err) {
    if (transactionStarted) await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY' && typeof req.body.idempotency_key === 'string') {
      try {
        const [sales] = await connection.query(
          `SELECT s.sale_id AS id, s.invoice_number, s.grand_total,
                  s.points_earned, s.points_redeemed, s.redemption_discount,
                  c.customer_name, c.phone AS phone_number,
                  c.loyalty_points AS remaining_points
           FROM sales s
           LEFT JOIN customers c ON c.customer_id = s.customer_id
           WHERE s.checkout_key = ? LIMIT 1`,
          [req.body.idempotency_key.trim()]
        );
        if (sales.length) {
          return res.status(200).json({
            success: true,
            message: 'This checkout was already completed.',
            data: sales[0]
          });
        }
      } catch (lookupError) {
        return next(lookupError);
      }
    }
    next(err);
  } finally {
    for (const lockName of checkoutLockNames.reverse()) {
      try {
        await connection.query('SELECT RELEASE_LOCK(?)', [lockName]);
      } catch (lockError) {
        console.error('[POS] Failed to release checkout lock:', lockError.message);
      }
    }
    connection.release();
  }
};
