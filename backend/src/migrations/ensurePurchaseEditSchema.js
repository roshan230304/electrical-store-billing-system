async function ensurePurchaseEditSchema(pool) {
  // Check purchases table columns
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM information_schema.columns
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchases'`
  );
  const columnNames = new Set(columns.map(column => column.COLUMN_NAME));

  if (!columnNames.has('updated_at')) {
    await pool.query('ALTER TABLE purchases ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('[DB] Added updated_at column to purchases table');
  }

  // Create purchase_history table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_history (
      history_id INT AUTO_INCREMENT PRIMARY KEY,
      purchase_id INT NOT NULL,
      purchase_number VARCHAR(50) NOT NULL,
      previous_grand_total DECIMAL(12,2) DEFAULT 0.00,
      new_grand_total DECIMAL(12,2) DEFAULT 0.00,
      modified_by VARCHAR(100) DEFAULT 'Admin',
      modification_reason VARCHAR(255) DEFAULT 'Purchase bill edited',
      changes_summary JSON DEFAULT NULL,
      modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_purchase_hist_id (purchase_id)
    ) ENGINE=InnoDB
  `);
  console.log('[DB] Ensured purchase_history table exists');

  // Create expense_categories table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    ) ENGINE=InnoDB
  `);

  const defaultExpenseCategories = [
    'Shop rent',
    'Electricity bill',
    'Employee salary',
    'Transportation',
    'Maintenance',
    'Internet',
    'Packaging',
    'Other expenses'
  ];

  for (const cat of defaultExpenseCategories) {
    await pool.query(
      'INSERT IGNORE INTO expense_categories (name) VALUES (?)',
      [cat]
    );
  }
  console.log('[DB] Ensured expense_categories table & defaults exist');
}

module.exports = ensurePurchaseEditSchema;
