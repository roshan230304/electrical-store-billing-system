const { recordCashMovement } = require('../services/cashService');
const pool = require('../config/db');

const categories = [
  'Shop rent', 'Electricity bill', 'Employee salary', 'Transportation',
  'Maintenance', 'Internet', 'Packaging', 'Other'
];

function validateExpense(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const amount = Number(body.amount);
  const date = body.expense_date;
  if (!title) return { error: 'Expense title is required.' };
  if (!category) return { error: 'Expense category is required.' };
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Expense amount must be greater than zero.' };
  if (!date || Number.isNaN(Date.parse(date))) return { error: 'A valid expense date is required.' };
  return {
    values: [
      title,
      category,
      amount,
      date,
      body.payment_method || 'Cash',
      typeof body.description === 'string' ? body.description.trim() || null : null,
      typeof body.notes === 'string' ? body.notes.trim() || null : null
    ]
  };
}

exports.getExpenses = async (req, res, next) => {
  try {
    const { category, fromDate, toDate, search, period } = req.query;
    let startDate = fromDate;
    let endDate = toDate;
    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);
    if (period === 'daily') {
      startDate = todayString;
      endDate = todayString;
    } else if (period === 'weekly') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      startDate = start.toISOString().slice(0, 10);
      endDate = todayString;
    } else if (period === 'monthly') {
      startDate = `${todayString.slice(0, 7)}-01`;
      endDate = todayString;
    }

    let query = `
      SELECT expense_id AS id, expense_title AS title, category, amount,
             expense_date, payment_method, description, notes, created_at
      FROM expenses WHERE 1 = 1`;
    const params = [];
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (startDate) {
      query += ' AND expense_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND expense_date <= ?';
      params.push(endDate);
    }
    if (search) {
      query += ' AND (expense_title LIKE ? OR category LIKE ? OR description LIKE ? OR notes LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    query += ' ORDER BY expense_date DESC, expense_id DESC';

    const [expenses] = await pool.query(query, params);
    const totalAmount = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return res.json({
      success: true,
      data: expenses,
      totalAmount: Math.round((totalAmount + Number.EPSILON) * 100) / 100
    });
  } catch (err) {
    return next(err);
  }
};

exports.getExpenseCategories = async (req, res) => {
  return res.json({
    success: true,
    data: categories.map((name, index) => ({ id: index + 1, name }))
  });
};

exports.createExpense = async (req, res, next) => {
  try {
    const validated = validateExpense(req.body);
    if (validated.error) {
      return res.status(400).json({ success: false, message: validated.error });
    }
    const expConn = await pool.getConnection();
    try {
      await expConn.beginTransaction();
      const [result] = await expConn.query(
        `INSERT INTO expenses
           (expense_title, category, amount, expense_date, payment_method, description, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        validated.values
      );
      const expenseId = result.insertId;
      const [title, category, amount, expense_date, payment_method] = validated.values;
      if (payment_method === 'Cash') {
        await recordCashMovement(expConn, {
          entry_type: 'Expense',
          reference_id: 'EXP-' + expenseId,
          party_name: category || 'Expense',
          date: expense_date,
          inflow: 0,
          outflow: amount,
          description: `Cash paid for expense: ${title}`,
          created_by: req.user?.username || 'Admin'
        });
      }
      await expConn.commit();
      return res.status(201).json({
        success: true,
        message: 'Expense recorded successfully.',
        data: { id: expenseId }
      });
    } catch (innerErr) {
      await expConn.rollback();
      throw innerErr;
    } finally {
      expConn.release();
    }
  } catch (err) {
    return next(err);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const expenseId = Number(req.params.id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid expense ID.' });
    }
    const validated = validateExpense(req.body);
    if (validated.error) {
      return res.status(400).json({ success: false, message: validated.error });
    }
    const [result] = await pool.query(
      `UPDATE expenses
       SET expense_title = ?, category = ?, amount = ?, expense_date = ?,
           payment_method = ?, description = ?, notes = ?
       WHERE expense_id = ?`,
      [...validated.values, expenseId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }
    return res.json({ success: true, message: 'Expense updated successfully.' });
  } catch (err) {
    return next(err);
  }
};

exports.deleteExpense = async (req, res, next) => {
  const delConn = await pool.getConnection();
  try {
    const expenseId = Number(req.params.id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      delConn.release();
      return res.status(400).json({ success: false, message: 'Invalid expense ID.' });
    }
    await delConn.beginTransaction();
    const [expenses] = await delConn.query(
      'SELECT expense_title, category, amount, expense_date, payment_method FROM expenses WHERE expense_id = ? FOR UPDATE',
      [expenseId]
    );
    if (!expenses.length) {
      await delConn.rollback();
      delConn.release();
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }
    const exp = expenses[0];
    await delConn.query('DELETE FROM expenses WHERE expense_id = ?', [expenseId]);
    if (exp.payment_method === 'Cash') {
      await recordCashMovement(delConn, {
        entry_type: 'Expense Reversal',
        reference_id: 'EXP-' + expenseId,
        party_name: exp.category || 'Expense',
        date: new Date(),
        inflow: Number(exp.amount),
        outflow: 0,
        description: `Reversal of deleted cash expense: ${exp.expense_title}`,
        created_by: req.user?.username || 'Admin'
      });
    }
    await delConn.commit();
    return res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    await delConn.rollback();
    return next(err);
  } finally {
    delConn.release();
  }
};
