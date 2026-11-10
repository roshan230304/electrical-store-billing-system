async function ensureCashLedgerSchema(pool) {
  // 1. Create cash_ledger table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cash_ledger (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entry_type VARCHAR(50) NOT NULL,
      reference_id VARCHAR(100) DEFAULT NULL,
      transaction_type ENUM('INFLOW', 'OUTFLOW') NOT NULL,
      party_name VARCHAR(150) DEFAULT NULL,
      date DATETIME NOT NULL,
      inflow DECIMAL(12,2) DEFAULT 0.00,
      outflow DECIMAL(12,2) DEFAULT 0.00,
      balance_after DECIMAL(12,2) DEFAULT 0.00,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      description TEXT DEFAULT NULL,
      created_by VARCHAR(100) DEFAULT 'System',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cash_date (date),
      INDEX idx_cash_ref (reference_id)
    ) ENGINE=InnoDB
  `);
  console.log('[DB] Ensured cash_ledger table exists');

  // 2. Create bank_accounts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_display_name VARCHAR(100) NOT NULL,
      account_number VARCHAR(50) NOT NULL,
      ifsc_code VARCHAR(20) DEFAULT '',
      bank_name VARCHAR(100) DEFAULT '',
      account_holder_name VARCHAR(100) DEFAULT '',
      upi_id VARCHAR(100) DEFAULT '',
      opening_balance DECIMAL(12,2) DEFAULT 0.00,
      current_balance DECIMAL(12,2) DEFAULT 0.00,
      print_qr_on_invoice TINYINT(1) DEFAULT 1,
      print_bank_details TINYINT(1) DEFAULT 1,
      accept_payments_online TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  console.log('[DB] Ensured bank_accounts table exists');

  // 3. Historical Cash Ledger Reconciliation
  const [existingLedger] = await pool.query('SELECT COUNT(*) AS total FROM cash_ledger');
  if (existingLedger[0].total === 0) {
    console.log('[DB] Reconciling historical cash transactions into cash_ledger...');

    // A. Opening Cash Balance (Default ₹10,000 for retail drawer, configurable by admin)
    await pool.query(`
      INSERT INTO cash_ledger
        (entry_type, reference_id, transaction_type, party_name, date, inflow, outflow, balance_after, description, created_by)
      VALUES
        ('Opening Balance', 'OPENING-CASH', 'INFLOW', 'Business/Store Drawer', '2026-11-01 00:00:00', 10000.00, 0.00, 10000.00, 'Initial Physical Opening Cash in Drawer', 'Admin')
    `);

    // B. Historical Sales paid in Cash
    const [cashSales] = await pool.query(`
      SELECT p.amount, p.payment_date, s.invoice_number, COALESCE(c.customer_name, 'Walk-in Customer') AS customer_name
      FROM payments p
      JOIN sales s ON s.sale_id = p.sale_id
      LEFT JOIN customers c ON c.customer_id = s.customer_id
      WHERE p.payment_method = 'Cash' AND p.amount > 0
      ORDER BY p.payment_date ASC, p.payment_id ASC
    `);

    for (const sale of cashSales) {
      await pool.query(`
        INSERT INTO cash_ledger
          (entry_type, reference_id, transaction_type, party_name, date, inflow, outflow, balance_after, description, created_by)
        VALUES
          ('Sale', ?, 'INFLOW', ?, ?, ?, 0.00, 0.00, ?, 'Cashier')
      `, [sale.invoice_number, sale.customer_name, sale.payment_date, Number(sale.amount), `Cash received for Invoice #${sale.invoice_number}`]);
    }

    // C. Historical Purchases paid in Cash
    const [cashPurchases] = await pool.query(`
      SELECT p.amount, p.payment_date, pu.purchase_number, COALESCE(s.supplier_name, 'Supplier') AS supplier_name
      FROM payments p
      JOIN purchases pu ON pu.purchase_id = p.purchase_id
      LEFT JOIN suppliers s ON s.supplier_id = pu.supplier_id
      WHERE p.payment_method = 'Cash' AND p.amount > 0
      ORDER BY p.payment_date ASC, p.payment_id ASC
    `);

    for (const purchase of cashPurchases) {
      await pool.query(`
        INSERT INTO cash_ledger
          (entry_type, reference_id, transaction_type, party_name, date, inflow, outflow, balance_after, description, created_by)
        VALUES
          ('Purchase', ?, 'OUTFLOW', ?, ?, 0.00, ?, 0.00, ?, 'Admin')
      `, [purchase.purchase_number, purchase.supplier_name, purchase.payment_date, Number(purchase.amount), `Cash paid for Purchase Bill #${purchase.purchase_number}`]);
    }

    // D. Historical Expenses paid in Cash
    const [cashExpenses] = await pool.query(`
      SELECT expense_id, expense_title, category, amount, expense_date
      FROM expenses
      WHERE payment_method = 'Cash' AND amount > 0
      ORDER BY expense_date ASC, expense_id ASC
    `);

    for (const expense of cashExpenses) {
      await pool.query(`
        INSERT INTO cash_ledger
          (entry_type, reference_id, transaction_type, party_name, date, inflow, outflow, balance_after, description, created_by)
        VALUES
          ('Expense', ?, 'OUTFLOW', ?, ?, 0.00, ?, 0.00, ?, 'Admin')
      `, [`EXP-${expense.expense_id}`, expense.category, expense.expense_date, Number(expense.amount), `Cash paid for ${expense.expense_title}`]);
    }

    // E. Recompute running balance_after for all entries chronologically
    const [entries] = await pool.query('SELECT id, inflow, outflow FROM cash_ledger ORDER BY date ASC, id ASC');
    let runningBalance = 0;
    for (const entry of entries) {
      runningBalance = Math.round((runningBalance + Number(entry.inflow) - Number(entry.outflow) + Number.EPSILON) * 100) / 100;
      await pool.query('UPDATE cash_ledger SET balance_after = ? WHERE id = ?', [runningBalance, entry.id]);
    }
    console.log(`[DB] Reconciled ${entries.length} cash ledger entries. Final Cash in Hand: ₹${runningBalance}`);
  }
}

module.exports = ensureCashLedgerSchema;

