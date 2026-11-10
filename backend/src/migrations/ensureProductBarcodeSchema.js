async function ensureProductBarcodeSchema(pool) {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM information_schema.columns
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'`
  );
  const columnNames = new Set(columns.map(column => column.COLUMN_NAME));

  const productColumns = {
    product_code: 'VARCHAR(100) NULL',
    is_active: 'BOOLEAN NOT NULL DEFAULT TRUE',
    item_type: "VARCHAR(20) NOT NULL DEFAULT 'Product'",
    hsn_code: 'VARCHAR(20) DEFAULT NULL',
    discount_value: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00',
    discount_type: "VARCHAR(20) NOT NULL DEFAULT 'Percentage'",
    sale_price_tax_type: "VARCHAR(20) NOT NULL DEFAULT 'With Tax'",
    purchase_price_tax_type: "VARCHAR(20) NOT NULL DEFAULT 'With Tax'",
    location: 'VARCHAR(100) DEFAULT NULL',
    image_url: 'TEXT DEFAULT NULL'
  };
  for (const [column, definition] of Object.entries(productColumns)) {
    if (!columnNames.has(column)) {
      await pool.query(`ALTER TABLE products ADD COLUMN ${column} ${definition}`);
    }
  }

  const [saleItemColumns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM information_schema.columns
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items'`
  );
  const saleItemColumnNames = new Set(saleItemColumns.map(column => column.COLUMN_NAME));
  const saleItemAdditions = {
    hsn_code: 'VARCHAR(20) DEFAULT NULL',
    price_tax_type: "VARCHAR(20) NOT NULL DEFAULT 'Without Tax'"
  };
  for (const [column, definition] of Object.entries(saleItemAdditions)) {
    if (!saleItemColumnNames.has(column)) {
      await pool.query(`ALTER TABLE sale_items ADD COLUMN ${column} ${definition}`);
    }
  }

  const [purchaseItemColumns] = await pool.query(
    `SELECT COLUMN_NAME, IS_NULLABLE
     FROM information_schema.columns
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_items'`
  );
  const purchaseItemColumnNames = new Set(purchaseItemColumns.map(column => column.COLUMN_NAME));
  const purchaseItemAdditions = {
    item_name: 'VARCHAR(150) DEFAULT NULL',
    discount: 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00'
  };
  for (const [column, definition] of Object.entries(purchaseItemAdditions)) {
    if (!purchaseItemColumnNames.has(column)) {
      await pool.query(`ALTER TABLE purchase_items ADD COLUMN ${column} ${definition}`);
    }
  }
  const productId = purchaseItemColumns.find(column => column.COLUMN_NAME === 'product_id');
  if (productId && productId.IS_NULLABLE !== 'YES') {
    await pool.query(
      'ALTER TABLE purchase_items MODIFY COLUMN product_id INT DEFAULT NULL'
    );
  }

  const [barcodeIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM information_schema.statistics
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
       AND COLUMN_NAME = 'barcode' AND NON_UNIQUE = 0`
  );
  if (!barcodeIndexes.length) {
    const [duplicates] = await pool.query(
      `SELECT barcode
       FROM products
       WHERE barcode IS NOT NULL
       GROUP BY barcode
       HAVING COUNT(*) > 1
       LIMIT 1`
    );
    if (duplicates.length) {
      throw new Error('Cannot add the unique barcode index: duplicate product barcodes already exist.');
    }
    await pool.query('ALTER TABLE products ADD UNIQUE INDEX uq_products_barcode (barcode)');
  }

  const [codeIndexes] = await pool.query(
    `SELECT INDEX_NAME
     FROM information_schema.statistics
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
       AND COLUMN_NAME = 'product_code' AND NON_UNIQUE = 0`
  );
  if (!codeIndexes.length) {
    await pool.query('ALTER TABLE products ADD UNIQUE INDEX uq_products_product_code (product_code)');
  }

  await pool.query(
    `UPDATE products
     SET product_code = barcode
     WHERE product_code IS NULL AND barcode IS NOT NULL AND barcode <> ''`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_code_registry (
      registry_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(100) NOT NULL UNIQUE,
      product_id INT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS held_bills (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      hold_reference VARCHAR(30) NOT NULL UNIQUE,
      customer_name VARCHAR(150) NOT NULL,
      customer_phone VARCHAR(20) DEFAULT NULL,
      cart_data JSON NOT NULL,
      subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      tax_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      item_count INT NOT NULL DEFAULT 0,
      notes TEXT,
      held_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
  await pool.query(
    `INSERT IGNORE INTO product_code_registry (code, product_id)
     SELECT product_code, product_id
     FROM products
     WHERE product_code IS NOT NULL AND product_code <> ''`
  );

}

module.exports = ensureProductBarcodeSchema;
