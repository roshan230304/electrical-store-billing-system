const pool = require('../config/db');

// Get all held bills
exports.getHeldBills = async (req, res, next) => {
  try {
    const [bills] = await pool.query('SELECT * FROM held_bills ORDER BY held_at DESC');
    res.json({ success: true, data: bills });
  } catch (err) {
    next(err);
  }
};

// Park / Hold a bill
exports.holdBill = async (req, res, next) => {
  try {
    const {
      customer_name = 'Walk-in Customer',
      customer_phone = '',
      cart_data,
      subtotal = 0,
      tax_total = 0,
      grand_total = 0,
      item_count = 0,
      notes = ''
    } = req.body;

    if (!cart_data || !Array.isArray(cart_data) || cart_data.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot hold an empty cart.' });
    }

    const holdRef = `HOLD-${Date.now().toString().slice(-6)}`;

    const [result] = await pool.query(
      `INSERT INTO held_bills (
        hold_reference, customer_name, customer_phone, cart_data,
        subtotal, tax_total, grand_total, item_count, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        holdRef,
        customer_name,
        customer_phone,
        JSON.stringify(cart_data),
        subtotal,
        tax_total,
        grand_total,
        item_count || cart_data.length,
        notes
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Bill held successfully',
      data: { id: result.insertId, hold_reference: holdRef }
    });
  } catch (err) {
    next(err);
  }
};

// Resume a held bill (retrieves and removes from held queue)
exports.resumeBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [bills] = await pool.query('SELECT * FROM held_bills WHERE id = ?', [id]);

    if (!bills.length) {
      return res.status(404).json({ success: false, message: 'Held bill not found.' });
    }

    const bill = bills[0];
    // Remove from held table so it's not held anymore
    await pool.query('DELETE FROM held_bills WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Bill resumed successfully',
      data: {
        ...bill,
        cart_data: typeof bill.cart_data === 'string' ? JSON.parse(bill.cart_data) : bill.cart_data
      }
    });
  } catch (err) {
    next(err);
  }
};

// Delete a held bill
exports.deleteHeldBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM held_bills WHERE id = ?', [id]);
    res.json({ success: true, message: 'Held bill deleted.' });
  } catch (err) {
    next(err);
  }
};
