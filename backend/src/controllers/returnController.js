const crypto = require('crypto');
const pool = require('../config/db');
const { calculateReturnPointAdjustments } = require('../utils/loyalty');

const round2 = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

exports.getReturns = async (req, res, next) => {
  try {
    const { search, fromDate, toDate } = req.query;
    let query = `
      SELECT sr.*,
             (SELECT COUNT(*) FROM sales_return_items sri WHERE sri.return_id = sr.id) AS item_count
      FROM sales_returns sr
      WHERE 1 = 1`;
    const params = [];
    if (search) {
      query += ' AND (sr.return_number LIKE ? OR sr.invoice_number LIKE ? OR sr.customer_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (fromDate) {
      query += ' AND sr.return_date >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      query += ' AND sr.return_date <= ?';
      params.push(toDate);
    }
    query += ' ORDER BY sr.return_date DESC, sr.id DESC';
    const [returns] = await pool.query(query, params);
    return res.json({ success: true, data: returns });
  } catch (err) {
    return next(err);
  }
};

exports.createReturn = async (req, res, next) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    const saleId = Number(req.body.sale_id);
    const returnDate = req.body.return_date || new Date().toISOString().slice(0, 10);
    const refundMode = req.body.refund_mode || 'Cash';
    const returnReason = typeof req.body.return_reason === 'string'
      ? req.body.return_reason.trim()
      : '';
    const requestedItems = req.body.items;
    if (!Number.isInteger(saleId) || saleId <= 0 ||
        !Array.isArray(requestedItems) || requestedItems.length === 0 ||
        !returnReason) {
      return res.status(400).json({ success: false, message: 'A valid invoice, return reason, and at least one item are required.' });
    }
    if (!['Cash', 'UPI', 'Card', 'Bank Transfer'].includes(refundMode)) {
      return res.status(400).json({ success: false, message: 'Select a supported refund method.' });
    }

    await connection.beginTransaction();
    transactionStarted = true;
    const [sales] = await connection.query(
      'SELECT * FROM sales WHERE sale_id = ? FOR UPDATE',
      [saleId]
    );
    if (!sales.length || (req.body.invoice_number && req.body.invoice_number !== sales[0].invoice_number)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'The original sale invoice was not found.' });
    }
    const sale = sales[0];
    const [saleItems] = await connection.query(
      `SELECT si.sale_item_id, si.product_id, p.product_name AS item_name,
              si.quantity, si.unit, si.selling_price AS price_per_unit,
              si.gst_rate, si.total
       FROM sale_items si
       JOIN products p ON p.product_id = si.product_id
       WHERE si.sale_id = ?
       ORDER BY si.sale_item_id
       FOR UPDATE`,
      [saleId]
    );
    const saleItemsById = new Map(saleItems.map(item => [Number(item.sale_item_id), item]));

    const [priorItems] = await connection.query(
      `SELECT sri.sale_item_id, SUM(sri.quantity) AS quantity_returned
       FROM sales_return_items sri
       JOIN sales_returns sr ON sr.id = sri.return_id
       WHERE sr.sale_id = ?
       GROUP BY sri.sale_item_id`,
      [saleId]
    );
    const returnedQuantities = new Map(
      priorItems.map(item => [Number(item.sale_item_id), Number(item.quantity_returned || 0)])
    );
    const requestedBySaleItem = new Map();
    for (const item of requestedItems) {
      const saleItemId = Number(item.sale_item_id || item.id);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(saleItemId) || saleItemId <= 0 ||
          !Number.isFinite(quantity) || quantity <= 0) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'Each returned item must have a valid sale line and positive quantity.' });
      }
      requestedBySaleItem.set(
        saleItemId,
        round2((requestedBySaleItem.get(saleItemId) || 0) + quantity)
      );
    }

    const [previousReturns] = await connection.query(
      'SELECT COALESCE(SUM(total_refund_amount), 0) AS total FROM sales_returns WHERE sale_id = ?',
      [saleId]
    );
    const previousRefundTotal = Number(previousReturns[0].total || 0);
    const sourceAmount = saleItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const invoiceTotal = Number(sale.grand_total || 0);
    if (sourceAmount <= 0 || invoiceTotal < 0) {
      throw new Error('The original invoice has no refundable item value.');
    }
    const invoiceAllocation = invoiceTotal / sourceAmount;
    const processedItems = [];
    let totalRefund = 0;

    for (const [saleItemId, quantity] of requestedBySaleItem) {
      const saleItem = saleItemsById.get(saleItemId);
      if (!saleItem) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'A returned item does not belong to the selected invoice.' });
      }
      const originalQuantity = Number(saleItem.quantity || 0);
      const alreadyReturned = returnedQuantities.get(saleItemId) || 0;
      if (quantity > originalQuantity - alreadyReturned + 0.000001) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({
          success: false,
          message: `Return quantity for "${saleItem.item_name}" exceeds the remaining invoice quantity.`
        });
      }
      const refundAmount = round2(
        (Number(saleItem.total) / originalQuantity) * quantity * invoiceAllocation
      );
      totalRefund = round2(totalRefund + refundAmount);
      processedItems.push({
        ...saleItem,
        quantity,
        refundAmount
      });
    }

    if (previousRefundTotal + totalRefund > invoiceTotal + 0.01) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Refund amount exceeds the remaining invoice balance.' });
    }

    const [customerRows] = sale.customer_id
      ? await connection.query(
        `SELECT customer_id, customer_name, phone, loyalty_points
         FROM customers WHERE customer_id = ? FOR UPDATE`,
        [sale.customer_id]
      )
      : [[]];
    const customer = customerRows[0] || null;
    const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const customerName = customer?.customer_name || req.body.customer_name || 'Customer';
    const [returnResult] = await connection.query(
      `INSERT INTO sales_returns (
        return_number, return_date, sale_id, invoice_number, party_id,
        customer_name, total_refund_amount, refund_mode, return_reason, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        returnNumber, returnDate, saleId, sale.invoice_number, sale.customer_id,
        customerName, totalRefund, refundMode, returnReason, req.user?.id || null
      ]
    );
    const returnId = returnResult.insertId;

    for (const item of processedItems) {
      await connection.query(
        `INSERT INTO sales_return_items (
          return_id, sale_item_id, product_id, item_name, quantity, unit,
          price_per_unit, tax_rate, refund_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          returnId, item.sale_item_id, item.product_id, item.item_name,
          item.quantity, item.unit || 'Piece', item.price_per_unit,
          `GST@${Number(item.gst_rate || 0)}%`, item.refundAmount
        ]
      );

      const [products] = await connection.query(
        'SELECT stock_quantity FROM products WHERE product_id = ? FOR UPDATE',
        [item.product_id]
      );
      if (!products.length) {
        throw new Error(`Product ${item.product_id} for a returned sale line no longer exists.`);
      }
      const stockBefore = Number(products[0].stock_quantity || 0);
      const stockAfter = round2(stockBefore + item.quantity);
      await connection.query(
        'UPDATE products SET stock_quantity = ? WHERE product_id = ?',
        [stockAfter, item.product_id]
      );
      await connection.query(
        `INSERT INTO stock_movements (
          product_id, movement_type, quantity, previous_stock, new_stock,
          reference_id, description
        ) VALUES (?, 'Return', ?, ?, ?, ?, ?)`,
        [item.product_id, item.quantity, stockBefore, stockAfter, returnId, `Return ${returnNumber} for ${sale.invoice_number}`]
      );
    }

    let earnedPointsReversed = 0;
    let redeemedPointsRestored = 0;
    if (customer) {
      const cumulativeRefund = round2(previousRefundTotal + totalRefund);
      const { earnedReversal: targetEarnedReversal, redeemedRestore: targetRedeemedRestore } =
        calculateReturnPointAdjustments(
          sale.points_earned,
          sale.points_redeemed,
          cumulativeRefund,
          invoiceTotal
        );
      const [priorPointReversals] = await connection.query(
        `SELECT
           COALESCE(SUM(CASE WHEN l.transaction_type = 'Return Earned Reversal' THEN l.points ELSE 0 END), 0) AS earned_reversed,
           COALESCE(SUM(CASE WHEN l.transaction_type = 'Return Redeemed Restore' THEN l.points ELSE 0 END), 0) AS redeemed_restored
         FROM loyalty_points_transactions l
         JOIN sales_returns sr ON sr.id = l.return_id
         WHERE sr.sale_id = ?`,
        [saleId]
      );
      const alreadyReversed = Number(priorPointReversals[0].earned_reversed || 0);
      const alreadyRestored = Number(priorPointReversals[0].redeemed_restored || 0);
      earnedPointsReversed = Math.min(
        Math.max(0, targetEarnedReversal - alreadyReversed),
        Number(customer.loyalty_points || 0)
      );
      redeemedPointsRestored = Math.max(0, targetRedeemedRestore - alreadyRestored);
      const newPointsBalance = Number(customer.loyalty_points || 0) -
        earnedPointsReversed + redeemedPointsRestored;
      await connection.query(
        'UPDATE customers SET loyalty_points = ? WHERE customer_id = ?',
        [newPointsBalance, customer.customer_id]
      );
      await connection.query(
        `INSERT INTO loyalty_points_transactions
          (customer_id, phone_number, sale_id, return_id, invoice_number, transaction_type, points, description)
         VALUES (?, ?, NULL, ?, ?, 'Return Earned Reversal', ?, ?)`,
        [
          customer.customer_id, customer.phone || '', returnId, sale.invoice_number,
          earnedPointsReversed, `Points reversed for return ${returnNumber}`
        ]
      );
      await connection.query(
        `INSERT INTO loyalty_points_transactions
          (customer_id, phone_number, sale_id, return_id, invoice_number, transaction_type, points, description)
         VALUES (?, ?, NULL, ?, ?, 'Return Redeemed Restore', ?, ?)`,
        [
          customer.customer_id, customer.phone || '', returnId, sale.invoice_number,
          redeemedPointsRestored, `Redeemed points restored for return ${returnNumber}`
        ]
      );
    }

    await connection.commit();
    transactionStarted = false;
    return res.status(201).json({
      success: true,
      message: 'Sales return processed successfully.',
      data: {
        id: returnId,
        return_number: returnNumber,
        total_refund_amount: totalRefund,
        points_reversed: earnedPointsReversed,
        points_restored: redeemedPointsRestored
      }
    });
  } catch (err) {
    if (transactionStarted) await connection.rollback();
    return next(err);
  } finally {
    connection.release();
  }
};
