require('dotenv').config();
const pool = require('./src/config/db');

// Recalculate all running balances in chronological order and show the result
async function recalcAndReport() {
  const [entries] = await pool.query('SELECT id, entry_type, reference_id, inflow, outflow, balance_after, date FROM cash_ledger ORDER BY date ASC, id ASC');
  
  console.log('=== Before recalculation ===');
  for (const e of entries) {
    console.log(`id=${e.id} [${e.entry_type}] in=${e.inflow} out=${e.outflow} balance_after=${e.balance_after} date=${e.date}`);
  }

  let running = 0;
  const updates = [];
  for (const entry of entries) {
    running = Math.round((running + Number(entry.inflow) - Number(entry.outflow) + Number.EPSILON) * 100) / 100;
    updates.push({ id: entry.id, balance_after: running });
  }

  console.log('\n=== Recalculated balances ===');
  for (const u of updates) {
    console.log(`id=${u.id} new balance_after=${u.balance_after}`);
    await pool.query('UPDATE cash_ledger SET balance_after = ? WHERE id = ?', [u.balance_after, u.id]);
  }

  console.log('\n=== Final correct cash balance:', running, '===');

  // Verify getCashSummary
  const [openingRows] = await pool.query("SELECT COALESCE(SUM(inflow), 0) AS opening_balance FROM cash_ledger WHERE entry_type = 'Opening Balance'");
  const [totals] = await pool.query("SELECT COALESCE(SUM(inflow), 0) AS total_inflow, COALESCE(SUM(outflow), 0) AS total_outflow, COALESCE(SUM(inflow - outflow), 0) AS current_balance FROM cash_ledger");
  
  console.log('\n=== Cash Summary ===');
  console.log('Opening Balance:', openingRows[0].opening_balance);
  console.log('Total Inflow:', totals[0].total_inflow);
  console.log('Total Outflow:', totals[0].total_outflow);
  console.log('Current Balance (SUM formula):', totals[0].current_balance);
  console.log('Current Balance (running last row):', running);

  process.exit(0);
}

recalcAndReport().catch(e => { console.error(e); process.exit(1); });

