require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ============================================================
// 1. PATCH saleController.js — add cashService import and
//    record cash movement after cash sale payment
// ============================================================
const saleFile = path.join(__dirname, 'src/controllers/saleController.js');
let saleContent = fs.readFileSync(saleFile, 'utf8');

// Add cashService require after the existing requires
if (!saleContent.includes('cashService')) {
  saleContent = saleContent.replace(
    "const { calculatePointsEarned } = require('../utils/loyalty');",
    "const { calculatePointsEarned } = require('../utils/loyalty');\nconst { recordCashMovement } = require('../services/cashService');"
  );
  console.log('✓ saleController: added cashService import');
} else {
  console.log('  saleController: cashService already imported');
}

// After inserting the payments row, add cash ledger recording
// The insertion looks like:
//   await connection.query(`INSERT INTO payments (sale_id, payment_method, amount ...) VALUES (...)`)
// Then comes loyalty points, then commit.
// We want to add cash recording inside the payment block when paymentMethod === 'Cash'
const oldPaymentBlock = `    if (received > 0) {
      const paymentMethod = ['Cash', 'UPI', 'Card', 'Bank Transfer'].includes(payment_type)
        ? payment_type
        : 'Cash';
      await connection.query(
        \`INSERT INTO payments (sale_id, payment_method, amount, reference_number)
         VALUES (?, ?, ?, NULL)\`,
        [saleId, paymentMethod, received]
      );
    }`;

const newPaymentBlock = `    if (received > 0) {
      const paymentMethod = ['Cash', 'UPI', 'Card', 'Bank Transfer'].includes(payment_type)
        ? payment_type
        : 'Cash';
      await connection.query(
        \`INSERT INTO payments (sale_id, payment_method, amount, reference_number)
         VALUES (?, ?, ?, NULL)\`,
        [saleId, paymentMethod, received]
      );
      // Record cash movement — only for actual cash payments
      if (paymentMethod === 'Cash') {
        await recordCashMovement(connection, {
          entry_type: 'Sale',
          reference_id: invoiceNumber,
          party_name: resolvedCustomerName || 'Walk-in Customer',
          date: new Date(),
          inflow: received,
          outflow: 0,
          description: \`Cash received for Invoice #\${invoiceNumber}\`,
          created_by: req.user?.username || 'Cashier'
        });
      }
    }`;

if (saleContent.includes(oldPaymentBlock)) {
  saleContent = saleContent.replace(oldPaymentBlock, newPaymentBlock);
  console.log('✓ saleController: cash ledger recording wired into createSale');
} else {
  console.error('✗ saleController: payment block not found — check exact whitespace!');
}

fs.writeFileSync(saleFile, saleContent, 'utf8');

// ============================================================
// 2. PATCH expenseController.js — add cashService import and
//    record cash movement when expense payment_method = Cash
// ============================================================
const expenseFile = path.join(__dirname, 'src/controllers/expenseController.js');
let expenseContent = fs.readFileSync(expenseFile, 'utf8');

if (!expenseContent.includes('cashService')) {
  expenseContent = "const { recordCashMovement } = require('../services/cashService');\n" + expenseContent;
  console.log('✓ expenseController: added cashService import');
} else {
  console.log('  expenseController: cashService already imported');
}

// In createExpense, after the INSERT, add cash recording if payment_method === 'Cash'
const oldCreateExpense = `    const [result] = await pool.query(
      \`INSERT INTO expenses
         (expense_title, category, amount, expense_date, payment_method, description, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)\`,
      validated.values
    );
    return res.status(201).json({
      success: true,
      message: 'Expense recorded successfully.',
      data: { id: result.insertId }
    });`;

const newCreateExpense = `    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        \`INSERT INTO expenses
           (expense_title, category, amount, expense_date, payment_method, description, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)\`,
        validated.values
      );
      const expenseId = result.insertId;
      const [title, category, amount, expense_date, payment_method] = validated.values;
      // Record cash movement only for cash expenses
      if (payment_method === 'Cash') {
        await recordCashMovement(connection, {
          entry_type: 'Expense',
          reference_id: 'EXP-' + expenseId,
          party_name: category || 'Expense',
          date: expense_date,
          inflow: 0,
          outflow: amount,
          description: \`Cash paid for expense: \${title}\`,
          created_by: req.user?.username || 'Admin'
        });
      }
      await connection.commit();
      return res.status(201).json({
        success: true,
        message: 'Expense recorded successfully.',
        data: { id: expenseId }
      });
    } catch (innerErr) {
      await connection.rollback();
      throw innerErr;
    } finally {
      connection.release();
    }`;

if (expenseContent.includes(oldCreateExpense)) {
  expenseContent = expenseContent.replace(oldCreateExpense, newCreateExpense);
  console.log('✓ expenseController: cash ledger recording wired into createExpense');
} else {
  console.error('✗ expenseController: createExpense block not found');
}

// In deleteExpense, before DELETE, fetch and reverse cash movement
const oldDeleteExpense = `exports.deleteExpense = async (req, res, next) => {
  try {
    const expenseId = Number(req.params.id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid expense ID.' });
    }
    const [result] = await pool.query('DELETE FROM expenses WHERE expense_id = ?', [expenseId]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }
    return res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    return next(err);
  }
};`;

const newDeleteExpense = `exports.deleteExpense = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const expenseId = Number(req.params.id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Invalid expense ID.' });
    }
    await connection.beginTransaction();
    const [expenses] = await connection.query(
      'SELECT expense_title, category, amount, expense_date, payment_method FROM expenses WHERE expense_id = ? FOR UPDATE',
      [expenseId]
    );
    if (!expenses.length) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }
    const exp = expenses[0];
    await connection.query('DELETE FROM expenses WHERE expense_id = ?', [expenseId]);
    // Reverse cash ledger entry if this was a cash expense
    if (exp.payment_method === 'Cash') {
      await recordCashMovement(connection, {
        entry_type: 'Expense Reversal',
        reference_id: 'EXP-' + expenseId,
        party_name: exp.category || 'Expense',
        date: new Date(),
        inflow: Number(exp.amount),
        outflow: 0,
        description: \`Reversal of deleted cash expense: \${exp.expense_title}\`,
        created_by: req.user?.username || 'Admin'
      });
    }
    await connection.commit();
    return res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    await connection.rollback();
    return next(err);
  } finally {
    connection.release();
  }
};`;

if (expenseContent.includes(oldDeleteExpense)) {
  expenseContent = expenseContent.replace(oldDeleteExpense, newDeleteExpense);
  console.log('✓ expenseController: cash ledger reversal wired into deleteExpense');
} else {
  console.error('✗ expenseController: deleteExpense block not found');
}

fs.writeFileSync(expenseFile, expenseContent, 'utf8');
console.log('\nAll patches complete.');

