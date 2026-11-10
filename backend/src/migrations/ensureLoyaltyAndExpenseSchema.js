async function addMissingColumns(pool, tableName, columns) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM information_schema.columns
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  const existing = new Set(rows.map(row => row.COLUMN_NAME));
  for (const [name, definition] of Object.entries(columns)) {
    if (!existing.has(name)) {
      await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${name}\` ${definition}`);
    }
  }
}

async function ensureLoyaltyAndExpenseSchema(pool) {
  await addMissingColumns(pool, 'products', {
    description: 'TEXT DEFAULT NULL'
  });
  await addMissingColumns(pool, 'customers', {
    loyalty_points: 'INT UNSIGNED NOT NULL DEFAULT 0'
  });
  await addMissingColumns(pool, 'sales', {
    points_earned: 'INT UNSIGNED NOT NULL DEFAULT 0',
    points_redeemed: 'INT UNSIGNED NOT NULL DEFAULT 0',
    redemption_discount: 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00',
    checkout_key: 'VARCHAR(64) DEFAULT NULL',
    state_of_supply: "VARCHAR(100) NOT NULL DEFAULT 'Karnataka'",
    cgst_amount: 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00',
    sgst_amount: 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00',
    igst_amount: 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00',
    amount_tendered: 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00',
    change_returned: 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00'
  });
  await addMissingColumns(pool, 'expenses', {
    category: "VARCHAR(100) NOT NULL DEFAULT 'Other'",
    payment_method: "VARCHAR(50) NOT NULL DEFAULT 'Cash'",
    notes: 'TEXT DEFAULT NULL'
  });

  const [phoneIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM information_schema.statistics
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'
       AND COLUMN_NAME = 'phone' AND NON_UNIQUE = 0`
  );
  if (!phoneIndexes.length) {
    const [duplicates] = await pool.query(
      `SELECT phone
       FROM customers
       WHERE phone IS NOT NULL AND TRIM(phone) <> ''
       GROUP BY phone
       HAVING COUNT(*) > 1
       LIMIT 1`
    );
    if (duplicates.length) {
      throw new Error('Cannot add unique customer phone index: duplicate phone numbers already exist.');
    }
    await pool.query('ALTER TABLE customers ADD UNIQUE INDEX uq_customers_phone (phone)');
  }

  const [checkoutIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM information_schema.statistics
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales'
       AND COLUMN_NAME = 'checkout_key' AND NON_UNIQUE = 0`
  );
  if (!checkoutIndexes.length) {
    await pool.query('ALTER TABLE sales ADD UNIQUE INDEX uq_sales_checkout_key (checkout_key)');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS loyalty_points_transactions (
      transaction_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      phone_number VARCHAR(30) NOT NULL,
      sale_id INT DEFAULT NULL,
      return_id INT DEFAULT NULL,
      invoice_number VARCHAR(100) NOT NULL,
      transaction_type VARCHAR(20) NOT NULL,
      points INT UNSIGNED NOT NULL,
      description VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_loyalty_sale_type (sale_id, transaction_type),
      KEY idx_loyalty_customer_date (customer_id, created_at),
      CONSTRAINT fk_loyalty_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
      CONSTRAINT fk_loyalty_sale
        FOREIGN KEY (sale_id) REFERENCES sales(sale_id)
    ) ENGINE=InnoDB
  `);

  const [loyaltyColumns] = await pool.query(
    `SELECT COLUMN_NAME, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
     FROM information_schema.columns
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loyalty_points_transactions'`
  );
  const saleIdColumn = loyaltyColumns.find(column => column.COLUMN_NAME === 'sale_id');
  if (saleIdColumn && saleIdColumn.IS_NULLABLE !== 'YES') {
    await pool.query('ALTER TABLE loyalty_points_transactions MODIFY COLUMN sale_id INT DEFAULT NULL');
  }
  if (!loyaltyColumns.some(column => column.COLUMN_NAME === 'return_id')) {
    await pool.query('ALTER TABLE loyalty_points_transactions ADD COLUMN return_id INT DEFAULT NULL');
  }
  const transactionTypeColumn = loyaltyColumns.find(column => column.COLUMN_NAME === 'transaction_type');
  if (transactionTypeColumn && Number(transactionTypeColumn.CHARACTER_MAXIMUM_LENGTH) < 40) {
    await pool.query('ALTER TABLE loyalty_points_transactions MODIFY COLUMN transaction_type VARCHAR(40) NOT NULL');
  }
  const [returnPointIndexes] = await pool.query(
    `SELECT INDEX_NAME FROM information_schema.statistics
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loyalty_points_transactions'
       AND INDEX_NAME = 'uq_loyalty_return_type'`
  );
  if (!returnPointIndexes.length) {
    await pool.query(
      'ALTER TABLE loyalty_points_transactions ADD UNIQUE INDEX uq_loyalty_return_type (return_id, transaction_type)'
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_returns (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      return_number VARCHAR(50) NOT NULL UNIQUE,
      return_date DATE NOT NULL,
      sale_id INT NOT NULL,
      invoice_number VARCHAR(50) NOT NULL,
      party_id INT DEFAULT NULL,
      customer_name VARCHAR(150) NOT NULL,
      total_refund_amount DECIMAL(12, 2) NOT NULL,
      refund_mode VARCHAR(50) NOT NULL,
      return_reason VARCHAR(255) NOT NULL,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_sales_returns_sale (sale_id),
      CONSTRAINT fk_sales_returns_sale
        FOREIGN KEY (sale_id) REFERENCES sales(sale_id)
    ) ENGINE=InnoDB
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_return_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      return_id INT NOT NULL,
      sale_item_id INT NOT NULL,
      product_id INT NOT NULL,
      item_name VARCHAR(150) NOT NULL,
      quantity DECIMAL(12, 3) NOT NULL,
      unit VARCHAR(30) DEFAULT NULL,
      price_per_unit DECIMAL(12, 2) NOT NULL,
      tax_rate VARCHAR(20) DEFAULT NULL,
      refund_amount DECIMAL(12, 2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_return_items_sale_item (sale_item_id),
      CONSTRAINT fk_sales_return_items_return
        FOREIGN KEY (return_id) REFERENCES sales_returns(id),
      CONSTRAINT fk_sales_return_items_sale_item
        FOREIGN KEY (sale_item_id) REFERENCES sale_items(sale_item_id),
      CONSTRAINT fk_sales_return_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
    ) ENGINE=InnoDB
  `);
  const [returnConstraints] = await pool.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.referential_constraints
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = 'loyalty_points_transactions'
       AND CONSTRAINT_NAME = 'fk_loyalty_return'`
  );
  if (!returnConstraints.length) {
    await pool.query(
      `ALTER TABLE loyalty_points_transactions
       ADD CONSTRAINT fk_loyalty_return
       FOREIGN KEY (return_id) REFERENCES sales_returns(id)`
    );
  }

  const electricalCategories = [
    'LED Bulbs', 'Tube Lights', 'Fans', 'Switches', 'Sockets', 'Wires',
    'Cables', 'MCBs', 'Distribution Boards', 'Conduits', 'PVC Pipes',
    'Electrical Accessories'
  ];
  for (const categoryName of electricalCategories) {
    await pool.query(
      `INSERT INTO categories (category_name)
       SELECT ? WHERE NOT EXISTS (
         SELECT 1 FROM categories WHERE category_name = ?
       )`,
      [categoryName, categoryName]
    );
  }
}

module.exports = ensureLoyaltyAndExpenseSchema;
