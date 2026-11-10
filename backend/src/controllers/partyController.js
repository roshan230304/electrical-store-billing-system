const pool = require('../config/db');
const normalizePhone = value => typeof value === 'string' ? value.trim() || null : null;

const customerBalanceJoin = `
  LEFT JOIN (
    SELECT s.customer_id,
           SUM(GREATEST(0, s.grand_total - COALESCE(p.received, 0))) AS current_balance
    FROM sales s
    LEFT JOIN (
      SELECT sale_id, SUM(amount) AS received
      FROM payments
      WHERE sale_id IS NOT NULL
      GROUP BY sale_id
    ) p ON p.sale_id = s.sale_id
    GROUP BY s.customer_id
  ) balances ON balances.customer_id = c.customer_id
`;

const supplierBalanceJoin = `
  LEFT JOIN (
    SELECT p.supplier_id,
           SUM(GREATEST(0, p.grand_total - COALESCE(payments.paid, 0))) AS current_balance
    FROM purchases p
    LEFT JOIN (
      SELECT purchase_id, SUM(amount) AS paid
      FROM payments
      WHERE purchase_id IS NOT NULL
      GROUP BY purchase_id
    ) payments ON payments.purchase_id = p.purchase_id
    GROUP BY p.supplier_id
  ) balances ON balances.supplier_id = s.supplier_id
`;

async function findParties(search, type) {
  const term = `%${search || ''}%`;
  const includeCustomers = !type || type === 'All' || type === 'Customer' || type === 'Both';
  const includeSuppliers = !type || type === 'All' || type === 'Supplier' || type === 'Both';
  const parties = [];

  if (includeCustomers) {
    const [customers] = await pool.query(
      `SELECT c.customer_id AS id, c.customer_id, c.customer_name AS name,
              c.gst_number AS gstin, c.phone AS phone_number, c.email,
              c.loyalty_points,
              c.address AS billing_address, c.address AS shipping_address,
              0 AS opening_balance, COALESCE(balances.current_balance, 0) AS current_balance,
              'Customer' AS party_type
       FROM customers c
       ${customerBalanceJoin}
       WHERE c.customer_name LIKE ? OR c.phone LIKE ? OR c.gst_number LIKE ?
       ORDER BY c.customer_name`,
      [term, term, term]
    );
    parties.push(...customers);
  }

  if (includeSuppliers) {
    const [suppliers] = await pool.query(
      `SELECT s.supplier_id AS id, s.supplier_id, s.supplier_name AS name,
              s.gst_number AS gstin, s.phone AS phone_number, s.email,
              s.address AS billing_address, s.address AS shipping_address,
              0 AS opening_balance, COALESCE(balances.current_balance, 0) AS current_balance,
              'Supplier' AS party_type
       FROM suppliers s
       ${supplierBalanceJoin}
       WHERE s.supplier_name LIKE ? OR s.phone LIKE ? OR s.gst_number LIKE ?
       ORDER BY s.supplier_name`,
      [term, term, term]
    );
    parties.push(...suppliers);
  }

  return parties.sort((a, b) => a.name.localeCompare(b.name));
}

exports.getParties = async (req, res, next) => {
  try {
    const rows = await findParties(req.query.search || '', req.query.type);
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.getCustomerByPhone = async (req, res, next) => {
  try {
    const phone = String(req.params.phone || '').trim();
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Customer phone number is required.' });
    }
    const [rows] = await pool.query(
      `SELECT customer_id AS id, customer_id, customer_name AS name,
              phone AS phone_number, loyalty_points, gst_number
       FROM customers WHERE phone = ? LIMIT 1`,
      [phone]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'No customer found for this phone number.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return next(err);
  }
};

exports.getLoyaltyHistory = async (req, res, next) => {
  try {
    const customerId = Number(req.params.id);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID.' });
    }
    const [rows] = await pool.query(
      `SELECT transaction_id AS id, phone_number, sale_id, invoice_number,
              transaction_type, points, description, created_at
       FROM loyalty_points_transactions
       WHERE customer_id = ?
       ORDER BY transaction_id DESC`,
      [customerId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
};

exports.getPartyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const type = req.query.type === 'Supplier' ? 'Supplier' : 'Customer';
    const rows = await findParties('', type);
    const party = rows.find(row => String(row.id) === String(id));
    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    let transactions;
    if (type === 'Customer') {
      [transactions] = await pool.query(
        `SELECT 'Sale' AS type, s.sale_id AS id, s.invoice_number AS number,
                s.sale_date AS date, s.grand_total AS total,
                GREATEST(0, s.grand_total - COALESCE(p.amount, 0)) AS balance,
                s.payment_status AS status,
                COALESCE(p.payment_mode, 'Cash') AS payment_type
         FROM sales s
         LEFT JOIN (
           SELECT sale_id, SUM(amount) AS amount,
                  SUBSTRING_INDEX(GROUP_CONCAT(payment_method ORDER BY payment_id DESC), ',', 1) AS payment_mode
           FROM payments WHERE sale_id IS NOT NULL GROUP BY sale_id
         ) p ON p.sale_id = s.sale_id
         WHERE s.customer_id = ?
         ORDER BY s.sale_date DESC`,
        [id]
      );
    } else {
      [transactions] = await pool.query(
        `SELECT 'Purchase' AS type, p.purchase_id AS id,
                p.purchase_number AS number, p.purchase_date AS date,
                p.grand_total AS total,
                GREATEST(0, p.grand_total - COALESCE(payments.amount, 0)) AS balance,
                p.payment_status AS status,
                COALESCE(payments.payment_mode, 'Cash') AS payment_type
         FROM purchases p
         LEFT JOIN (
           SELECT purchase_id, SUM(amount) AS amount,
                  SUBSTRING_INDEX(GROUP_CONCAT(payment_method ORDER BY payment_id DESC), ',', 1) AS payment_mode
           FROM payments WHERE purchase_id IS NOT NULL GROUP BY purchase_id
         ) payments ON payments.purchase_id = p.purchase_id
         WHERE p.supplier_id = ?
         ORDER BY p.purchase_date DESC`,
        [id]
      );
    }

    return res.json({ success: true, data: { ...party, transactions } });
  } catch (err) {
    next(err);
  }
};

exports.createParty = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const {
      name, gstin, phone_number, email, billing_address, party_type = 'Customer'
    } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Party Name is required.' });
    }

    await connection.beginTransaction();
    let result;
    if (party_type === 'Supplier') {
      [result] = await connection.query(
        'INSERT INTO suppliers (supplier_name, phone, email, address, gst_number) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), normalizePhone(phone_number), email || null, billing_address || null, gstin || null]
      );
    } else {
      [result] = await connection.query(
        'INSERT INTO customers (customer_name, phone, email, address, gst_number) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), normalizePhone(phone_number), email || null, billing_address || null, gstin || null]
      );
      if (party_type === 'Both') {
        await connection.query(
          'INSERT INTO suppliers (supplier_name, phone, email, address, gst_number) VALUES (?, ?, ?, ?, ?)',
          [name.trim(), normalizePhone(phone_number), email || null, billing_address || null, gstin || null]
        );
      }
    }
    await connection.commit();

    const type = party_type === 'Supplier' ? 'Supplier' : 'Customer';
    const rows = await findParties(name.trim(), type);
    const created = rows.find(party => String(party.id) === String(result.insertId));
    return res.status(201).json({
      success: true,
      message: 'Party saved successfully.',
      data: { ...created, party_type }
    });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A customer with this phone number already exists.' });
    }
    next(err);
  } finally {
    connection.release();
  }
};

exports.updateParty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, gstin, phone_number, email, billing_address
    } = req.body;
    const type = req.query.type === 'Supplier' || req.body.party_type === 'Supplier'
      ? 'Supplier'
      : 'Customer';
    const table = type === 'Supplier' ? 'suppliers' : 'customers';
    const idColumn = type === 'Supplier' ? 'supplier_id' : 'customer_id';
    const nameColumn = type === 'Supplier' ? 'supplier_name' : 'customer_name';
    const [result] = await pool.query(
      `UPDATE ${table}
       SET ${nameColumn} = ?, phone = ?, email = ?, address = ?, gst_number = ?
       WHERE ${idColumn} = ?`,
      [name?.trim(), normalizePhone(phone_number), email || null, billing_address || null, gstin || null, id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Party not found.' });
    }
    const rows = await findParties('', type);
    return res.json({
      success: true,
      message: 'Party updated successfully.',
      data: rows.find(party => String(party.id) === String(id))
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A customer with this phone number already exists.' });
    }
    next(err);
  }
};

exports.deleteParty = async (req, res, next) => {
  try {
    const type = req.query.type === 'Supplier' ? 'Supplier' : 'Customer';
    const table = type === 'Supplier' ? 'suppliers' : 'customers';
    const idColumn = type === 'Supplier' ? 'supplier_id' : 'customer_id';
    const referenceTable = type === 'Supplier' ? 'purchases' : 'sales';
    const referenceColumn = type === 'Supplier' ? 'supplier_id' : 'customer_id';
    const [references] = await pool.query(
      `SELECT 1 FROM ${referenceTable} WHERE ${referenceColumn} = ? LIMIT 1`,
      [req.params.id]
    );
    if (references.length) {
      return res.status(409).json({
        success: false,
        message: 'This party has transaction history and cannot be deleted.'
      });
    }
    const [result] = await pool.query(
      `DELETE FROM ${table} WHERE ${idColumn} = ?`,
      [req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Party not found.' });
    }
    return res.json({ success: true, message: 'Party deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.addPaymentIn = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { amount, payment_mode, linked_sales } = req.body;
    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }
    const method = ['Cash', 'UPI', 'Card', 'Bank Transfer'].includes(payment_mode)
      ? payment_mode
      : 'Cash';

    await connection.beginTransaction();
    const allocations = Array.isArray(linked_sales) && linked_sales.length
      ? linked_sales.filter(link => Number(link.allocated_amount) > 0 && link.sale_id)
      : [{ sale_id: null, allocated_amount: paymentAmount }];
    const allocatedTotal = allocations.reduce((sum, link) => sum + Number(link.allocated_amount), 0);
    if (allocatedTotal > paymentAmount) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Allocated payments cannot exceed the received amount.' });
    }

    for (const allocation of allocations) {
      if (allocation.sale_id) {
        const [sales] = await connection.query(
          'SELECT sale_id, grand_total FROM sales WHERE sale_id = ? AND customer_id = ? FOR UPDATE',
          [allocation.sale_id, req.body.party_id]
        );
        if (!sales.length) {
          await connection.rollback();
          return res.status(400).json({ success: false, message: 'Selected invoice does not belong to this customer.' });
        }
      }
      await connection.query(
        'INSERT INTO payments (sale_id, payment_method, amount) VALUES (?, ?, ?)',
        [allocation.sale_id || null, method, Number(allocation.allocated_amount)]
      );
    }
    await connection.commit();
    return res.status(201).json({ success: true, message: 'Payment recorded successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};
