require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ====== PATCH saleController.js ======
{
  const filePath = path.join(__dirname, 'src/controllers/saleController.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // The exact CRLF block to replace
  const oldBlock = "if (received > 0) {\r\n      const paymentMethod = ['Cash', 'UPI', 'Card', 'Bank Transfer'].includes(payment_type)\r\n        ? payment_type\r\n        : 'Cash';\r\n      await connection.query(\r\n        `INSERT INTO payments (sale_id, payment_method, amount, reference_number)\r\n         VALUES (?, ?, ?, NULL)`,\r\n        [saleId, paymentMethod, received]\r\n      );\r\n    }";

  const newBlock = "if (received > 0) {\r\n      const paymentMethod = ['Cash', 'UPI', 'Card', 'Bank Transfer'].includes(payment_type)\r\n        ? payment_type\r\n        : 'Cash';\r\n      await connection.query(\r\n        `INSERT INTO payments (sale_id, payment_method, amount, reference_number)\r\n         VALUES (?, ?, ?, NULL)`,\r\n        [saleId, paymentMethod, received]\r\n      );\r\n      // Record cash ledger entry for cash payments only\r\n      if (paymentMethod === 'Cash') {\r\n        await recordCashMovement(connection, {\r\n          entry_type: 'Sale',\r\n          reference_id: invoiceNumber,\r\n          party_name: resolvedCustomerName || 'Walk-in Customer',\r\n          date: new Date(),\r\n          inflow: received,\r\n          outflow: 0,\r\n          description: `Cash received for Invoice #${invoiceNumber}`,\r\n          created_by: req.user?.username || 'Cashier'\r\n        });\r\n      }\r\n    }";

  if (!content.includes(oldBlock)) {
    console.error('saleController: payment block NOT FOUND');
    process.exit(1);
  }
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ saleController.js: cash ledger recording wired into createSale');
}

// ====== PATCH expenseController.js ======
{
  const filePath = path.join(__dirname, 'src/controllers/expenseController.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Find and replace createExpense core logic
  const oldCreate = "    const [result] = await pool.query(\r\n      `INSERT INTO expenses\r\n         (expense_title, category, amount, expense_date, payment_method, description, notes)\r\n       VALUES (?, ?, ?, ?, ?, ?, ?)`,\r\n      validated.values\r\n    );\r\n    return res.status(201).json({\r\n      success: true,\r\n      message: 'Expense recorded successfully.',\r\n      data: { id: result.insertId }\r\n    });";

  const newCreate = "    const expConn = await pool.getConnection();\r\n    try {\r\n      await expConn.beginTransaction();\r\n      const [result] = await expConn.query(\r\n        `INSERT INTO expenses\r\n           (expense_title, category, amount, expense_date, payment_method, description, notes)\r\n         VALUES (?, ?, ?, ?, ?, ?, ?)`,\r\n        validated.values\r\n      );\r\n      const expenseId = result.insertId;\r\n      const [title, category, amount, expense_date, payment_method] = validated.values;\r\n      if (payment_method === 'Cash') {\r\n        await recordCashMovement(expConn, {\r\n          entry_type: 'Expense',\r\n          reference_id: 'EXP-' + expenseId,\r\n          party_name: category || 'Expense',\r\n          date: expense_date,\r\n          inflow: 0,\r\n          outflow: amount,\r\n          description: `Cash paid for expense: ${title}`,\r\n          created_by: req.user?.username || 'Admin'\r\n        });\r\n      }\r\n      await expConn.commit();\r\n      return res.status(201).json({\r\n        success: true,\r\n        message: 'Expense recorded successfully.',\r\n        data: { id: expenseId }\r\n      });\r\n    } catch (innerErr) {\r\n      await expConn.rollback();\r\n      throw innerErr;\r\n    } finally {\r\n      expConn.release();\r\n    }";

  if (!content.includes(oldCreate)) {
    console.error('expenseController: createExpense block NOT FOUND');
    process.exit(1);
  }
  content = content.replace(oldCreate, newCreate);

  // Replace deleteExpense
  const oldDelete = "exports.deleteExpense = async (req, res, next) => {\r\n  try {\r\n    const expenseId = Number(req.params.id);\r\n    if (!Number.isInteger(expenseId) || expenseId <= 0) {\r\n      return res.status(400).json({ success: false, message: 'Invalid expense ID.' });\r\n    }\r\n    const [result] = await pool.query('DELETE FROM expenses WHERE expense_id = ?', [expenseId]);\r\n    if (!result.affectedRows) {\r\n      return res.status(404).json({ success: false, message: 'Expense not found.' });\r\n    }\r\n    return res.json({ success: true, message: 'Expense deleted successfully.' });\r\n  } catch (err) {\r\n    return next(err);\r\n  }\r\n};";

  const newDelete = "exports.deleteExpense = async (req, res, next) => {\r\n  const delConn = await pool.getConnection();\r\n  try {\r\n    const expenseId = Number(req.params.id);\r\n    if (!Number.isInteger(expenseId) || expenseId <= 0) {\r\n      delConn.release();\r\n      return res.status(400).json({ success: false, message: 'Invalid expense ID.' });\r\n    }\r\n    await delConn.beginTransaction();\r\n    const [expenses] = await delConn.query(\r\n      'SELECT expense_title, category, amount, expense_date, payment_method FROM expenses WHERE expense_id = ? FOR UPDATE',\r\n      [expenseId]\r\n    );\r\n    if (!expenses.length) {\r\n      await delConn.rollback();\r\n      delConn.release();\r\n      return res.status(404).json({ success: false, message: 'Expense not found.' });\r\n    }\r\n    const exp = expenses[0];\r\n    await delConn.query('DELETE FROM expenses WHERE expense_id = ?', [expenseId]);\r\n    if (exp.payment_method === 'Cash') {\r\n      await recordCashMovement(delConn, {\r\n        entry_type: 'Expense Reversal',\r\n        reference_id: 'EXP-' + expenseId,\r\n        party_name: exp.category || 'Expense',\r\n        date: new Date(),\r\n        inflow: Number(exp.amount),\r\n        outflow: 0,\r\n        description: `Reversal of deleted cash expense: ${exp.expense_title}`,\r\n        created_by: req.user?.username || 'Admin'\r\n      });\r\n    }\r\n    await delConn.commit();\r\n    return res.json({ success: true, message: 'Expense deleted successfully.' });\r\n  } catch (err) {\r\n    await delConn.rollback();\r\n    return next(err);\r\n  } finally {\r\n    delConn.release();\r\n  }\r\n};";

  if (!content.includes(oldDelete)) {
    console.error('expenseController: deleteExpense block NOT FOUND');
    process.exit(1);
  }
  content = content.replace(oldDelete, newDelete);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ expenseController.js: cash ledger wired into createExpense + deleteExpense');
}

console.log('\nAll patches applied successfully!');

