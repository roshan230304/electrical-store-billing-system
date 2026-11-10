const pool = require('../config/db');
const { getCashSummary } = require('../services/cashService');

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

// Bank Accounts
exports.getBankAccounts = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bank_accounts ORDER BY id DESC');
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.addBankAccount = async (req, res, next) => {
  try {
    const {
      account_display_name,
      opening_balance,
      account_number,
      ifsc_code,
      upi_id,
      bank_name,
      account_holder_name,
      print_qr_on_invoice,
      print_bank_details,
      accept_payments_online
    } = req.body;

    if (!account_display_name || !account_number) {
      return res.status(400).json({ success: false, message: 'Account display name and account number are required.' });
    }

    const opBal = parseFloat(opening_balance || 0);

    const [result] = await pool.query(
      `INSERT INTO bank_accounts (
        account_display_name, account_number, ifsc_code, bank_name,
        account_holder_name, upi_id, opening_balance, current_balance,
        print_qr_on_invoice, print_bank_details, accept_payments_online
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        account_display_name.trim(),
        account_number.trim(),
        ifsc_code || '',
        bank_name || '',
        account_holder_name || '',
        upi_id || '',
        opBal,
        opBal,
        print_qr_on_invoice !== false,
        print_bank_details !== false,
        Boolean(accept_payments_online)
      ]
    );

    const [newAcc] = await pool.query('SELECT * FROM bank_accounts WHERE id = ?', [result.insertId]);
    return res.status(201).json({
      success: true,
      message: 'Bank account added successfully.',
      data: newAcc[0]
    });
  } catch (err) {
    next(err);
  }
};

// Cash In Hand Ledger
exports.getCashInHand = async (req, res, next) => {
  try {
    const summary = await getCashSummary(pool);
    const [ledger] = await pool.query(
      'SELECT * FROM cash_ledger ORDER BY date DESC, id DESC'
    );

    return res.json({
      success: true,
      current_balance: summary.current_balance,
      opening_balance: summary.opening_balance,
      total_inflow: summary.total_inflow,
      total_outflow: summary.total_outflow,
      transactions: ledger
    });
  } catch (err) {
    next(err);
  }
};

// Adjust Cash Modal (as seen on the Cash in Hand page)
exports.adjustCash = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { adjustment_type, amount, date, description } = req.body;
    const adjAmount = parseFloat(amount || 0);

    if (adjAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
    }

    const [last] = await connection.query('SELECT balance_after FROM cash_ledger ORDER BY id DESC LIMIT 1');
    const currentBal = last.length ? parseFloat(last[0].balance_after) : 0;

    let newBal = currentBal;
    let inflow = 0;
    let outflow = 0;

    if (adjustment_type === 'Add Cash') {
      newBal = round2(currentBal + adjAmount);
      inflow = adjAmount;
    } else {
      newBal = round2(currentBal - adjAmount);
      outflow = adjAmount;
    }

    await connection.query(
      `INSERT INTO cash_ledger (entry_type, reference_id, party_name, date, inflow, outflow, balance_after, description)
       VALUES ('Adjustment', NULL, 'Self/Business', ?, ?, ?, ?, ?)`,
      [date || new Date(), inflow, outflow, newBal, description || `${adjustment_type} Adjustment`]
    );

    await connection.commit();
    return res.status(201).json({
      success: true,
      message: `Cash balance successfully updated. New Balance: ₹${newBal}`,
      balance_after: newBal
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

