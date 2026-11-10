require('dotenv').config();
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/controllers/reportController.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the broken cash query (payments-based) with cash_ledger-based
const oldPattern = /const \[cash\] = await pool\.query\(\s*`SELECT COALESCE\(SUM\(CASE[\s\S]*?WHERE payment_method = 'Cash'`\s*\);/;
const newQuery = `// Cash in Hand: single source of truth from cash_ledger
    const [cashLedgerTotals] = await pool.query(
      'SELECT COALESCE(SUM(inflow - outflow), 0) AS balance FROM cash_ledger'
    );`;

if (!oldPattern.test(content)) {
  console.error('Pattern not found in reportController.js!');
  process.exit(1);
}

content = content.replace(oldPattern, newQuery);

// Fix the usage of the variable name
content = content.replace('cashInHand: round2(cash[0].balance),', 'cashInHand: round2(cashLedgerTotals[0].balance),');

fs.writeFileSync(filePath, content, 'utf8');
console.log('reportController.js patched: cashInHand now reads from cash_ledger');

// Verify the fix
if (content.includes('cashLedgerTotals[0].balance')) {
  console.log('✓ cashInHand reference updated correctly');
} else {
  console.error('✗ cashInHand reference was not updated!');
}
if (!content.includes('FROM payments\n       WHERE payment_method')) {
  console.log('✓ Old broken payments query removed');
}

