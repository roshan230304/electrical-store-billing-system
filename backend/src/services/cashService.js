const pool = require('../config/db');

const round2 = num => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

/**
 * Record a cash movement (inflow or outflow) in cash_ledger inside an existing connection/transaction.
 */
async function recordCashMovement(connection, {
  entry_type,
  reference_id,
  party_name = 'Business',
  date = new Date(),
  inflow = 0,
  outflow = 0,
  description = '',
  created_by = 'System'
}) {
  const inAmt = round2(Math.max(0, Number(inflow) || 0));
  const outAmt = round2(Math.max(0, Number(outflow) || 0));
  if (inAmt === 0 && outAmt === 0) return null;

  const transaction_type = inAmt > 0 ? 'INFLOW' : 'OUTFLOW';

  // Lock the last record to calculate accurate running balance
  const [last] = await connection.query(
    'SELECT balance_after FROM cash_ledger ORDER BY date DESC, id DESC LIMIT 1 FOR UPDATE'
  );
  const previousBal = last.length ? Number(last[0].balance_after) : 0;
  const newBal = round2(previousBal + inAmt - outAmt);

  const [res] = await connection.query(`
    INSERT INTO cash_ledger
      (entry_type, reference_id, transaction_type, party_name, date, inflow, outflow, balance_after, payment_method, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Cash', ?, ?)
  `, [
    entry_type,
    reference_id || null,
    transaction_type,
    party_name,
    date,
    inAmt,
    outAmt,
    newBal,
    description || `${entry_type} Cash Movement`,
    created_by
  ]);

  return { id: res.insertId, balance_after: newBal };
}

/**
 * Get current cash summary: opening_balance, total_inflow, total_outflow, current_balance
 */
async function getCashSummary(db = pool) {
  const [openingRows] = await db.query(
    "SELECT COALESCE(SUM(inflow), 0) AS opening_balance FROM cash_ledger WHERE entry_type = 'Opening Balance'"
  );
  const [totals] = await db.query(`
    SELECT
      COALESCE(SUM(inflow), 0) AS total_inflow,
      COALESCE(SUM(outflow), 0) AS total_outflow,
      COALESCE(SUM(inflow - outflow), 0) AS current_balance
    FROM cash_ledger
  `);

  const opening_balance = round2(openingRows[0]?.opening_balance || 0);
  const total_inflow = round2(totals[0]?.total_inflow || 0);
  const total_outflow = round2(totals[0]?.total_outflow || 0);
  const current_balance = round2(totals[0]?.current_balance || 0);

  return {
    opening_balance,
    total_inflow,
    total_outflow,
    current_balance
  };
}

/**
 * Recalculate running balance_after for all cash_ledger entries in chronological order.
 */
async function recalculateLedgerBalances(db = pool) {
  const [entries] = await db.query('SELECT id, inflow, outflow FROM cash_ledger ORDER BY date ASC, id ASC');
  let running = 0;
  for (const entry of entries) {
    running = round2(running + Number(entry.inflow) - Number(entry.outflow));
    await db.query('UPDATE cash_ledger SET balance_after = ? WHERE id = ?', [running, entry.id]);
  }
  return running;
}

module.exports = {
  round2,
  recordCashMovement,
  getCashSummary,
  recalculateLedgerBalances
};

