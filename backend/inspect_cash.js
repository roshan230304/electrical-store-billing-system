require('dotenv').config();
const pool = require('./src/config/db');

(async () => {
  try {
    const [ledger] = await pool.query('SELECT * FROM cash_ledger ORDER BY id ASC');
    console.log('=== cash_ledger rows:', ledger.length, '===');
    console.log(JSON.stringify(ledger, null, 2));

    const [cashPayments] = await pool.query(
      "SELECT payment_id, sale_id, purchase_id, payment_method, amount, payment_date FROM payments WHERE payment_method = 'Cash'"
    );
    console.log('\n=== Cash payments:', cashPayments.length, '===');
    console.log(JSON.stringify(cashPayments, null, 2));

    const [cashExpenses] = await pool.query(
      "SELECT expense_id, expense_title, amount, expense_date, payment_method FROM expenses WHERE payment_method = 'Cash'"
    );
    console.log('\n=== Cash expenses:', cashExpenses.length, '===');
    console.log(JSON.stringify(cashExpenses, null, 2));

    const [allPayments] = await pool.query('SELECT * FROM payments ORDER BY payment_id ASC');
    console.log('\n=== All payments:', allPayments.length, '===');
    console.log(JSON.stringify(allPayments, null, 2));

    const [ledgerDescribe] = await pool.query('DESCRIBE cash_ledger');
    console.log('\n=== cash_ledger columns ===');
    console.log(JSON.stringify(ledgerDescribe.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null })), null, 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

