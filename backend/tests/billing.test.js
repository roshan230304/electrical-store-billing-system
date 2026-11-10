const assert = require('assert');
const bwipjs = require('bwip-js');
const pool = require('../src/config/db');
const ensureProductBarcodeSchema = require('../src/migrations/ensureProductBarcodeSchema');
const ensureLoyaltyAndExpenseSchema = require('../src/migrations/ensureLoyaltyAndExpenseSchema');
const { calculatePointsEarned, calculateReturnPointAdjustments } = require('../src/utils/loyalty');

async function runTests() {
  try {
    const round2 = num => Math.round((Number(num) + Number.EPSILON) * 100) / 100;
    assert.strictEqual(round2(1525.423), 1525.42);
    assert.strictEqual(round2(269.076), 269.08);

    const basePrice = 1525.42;
    const discount = round2(basePrice * 0.02);
    const taxable = round2(basePrice - discount);
    const tax = round2(taxable * 0.18);
    const total = round2(taxable + tax);
    assert.strictEqual(discount, 30.51);
    assert.strictEqual(tax, 269.08);
    assert.strictEqual(total, 1763.99);
    assert.strictEqual(calculatePointsEarned(80), 0);
    assert.strictEqual(calculatePointsEarned(100), 1);
    assert.strictEqual(calculatePointsEarned(250), 2);
    assert.strictEqual(calculatePointsEarned(999), 9);
    assert.deepStrictEqual(calculateReturnPointAdjustments(10, 5, 500, 1000), {
      earnedReversal: 5,
      redeemedRestore: 2
    });
    assert.deepStrictEqual(calculateReturnPointAdjustments(10, 5, 1000, 1000), {
      earnedReversal: 10,
      redeemedRestore: 5
    });

    const [database] = await pool.query('SELECT DATABASE() AS name');
    assert.strictEqual(database[0].name, 'electrical_store_db');
    await ensureProductBarcodeSchema(pool);
    await ensureProductBarcodeSchema(pool);
    await ensureLoyaltyAndExpenseSchema(pool);
    await ensureLoyaltyAndExpenseSchema(pool);

    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.columns
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'`
    );
    const columnNames = new Set(columns.map(column => column.COLUMN_NAME));
    for (const column of [
      'product_code', 'barcode', 'is_active', 'item_type',
      'discount_value', 'sale_price_tax_type', 'purchase_price_tax_type'
    ]) {
      assert.ok(columnNames.has(column), `Missing products.${column}`);
    }

    const [saleItemColumns] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.columns
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items'`
    );
    const saleItemColumnNames = new Set(saleItemColumns.map(column => column.COLUMN_NAME));
    assert.ok(saleItemColumnNames.has('hsn_code'), 'Missing sale_items.hsn_code');
    assert.ok(saleItemColumnNames.has('price_tax_type'), 'Missing sale_items.price_tax_type');

    const [purchaseItemColumns] = await pool.query(
      `SELECT COLUMN_NAME, IS_NULLABLE FROM information_schema.columns
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_items'`
    );
    const purchaseItemColumnMap = new Map(
      purchaseItemColumns.map(column => [column.COLUMN_NAME, column.IS_NULLABLE])
    );
    assert.ok(purchaseItemColumnMap.has('item_name'), 'Missing purchase_items.item_name');
    assert.ok(purchaseItemColumnMap.has('discount'), 'Missing purchase_items.discount');
    assert.strictEqual(purchaseItemColumnMap.get('product_id'), 'YES', 'purchase_items.product_id must allow non-stock bill lines');

    const [uniqueIndexes] = await pool.query(
      `SELECT COLUMN_NAME
       FROM information_schema.statistics
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
         AND NON_UNIQUE = 0 AND COLUMN_NAME IN ('product_code', 'barcode')`
    );
    const indexedColumns = new Set(uniqueIndexes.map(index => index.COLUMN_NAME));
    assert.ok(indexedColumns.has('product_code'), 'product_code must have a unique index');
    assert.ok(indexedColumns.has('barcode'), 'barcode must have a unique index');

    const [customerColumns] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.columns
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'`
    );
    assert.ok(customerColumns.some(column => column.COLUMN_NAME === 'loyalty_points'));
    const [saleColumns] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.columns
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales'`
    );
    const saleColumnNames = new Set(saleColumns.map(column => column.COLUMN_NAME));
    assert.ok(saleColumnNames.has('checkout_key'));
    for (const column of [
      'state_of_supply', 'cgst_amount', 'sgst_amount', 'igst_amount',
      'amount_tendered', 'change_returned'
    ]) {
      assert.ok(saleColumnNames.has(column), `Missing sales.${column}`);
    }
    const [checkoutIndexes] = await pool.query(
      `SELECT INDEX_NAME FROM information_schema.statistics
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales'
         AND COLUMN_NAME = 'checkout_key' AND NON_UNIQUE = 0`
    );
    assert.ok(checkoutIndexes.length, 'Checkout idempotency key must be unique');

    const [loyaltyTables] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.tables
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN ('loyalty_points_transactions', 'sales_returns', 'sales_return_items')`
    );
    assert.strictEqual(loyaltyTables.length, 3, 'Expected loyalty, return, and return-item tables');

    const svg = bwipjs.toSVG({
      bcid: 'code128',
      text: 'ELEC-000001',
      scale: 2,
      height: 12,
      includetext: true
    });
    assert.ok(svg.includes('<svg'), 'Expected a Code 128 SVG barcode');
    assert.ok(svg.length > 100, 'Expected a rendered Code 128 barcode');

    console.log('Billing and loyalty calculations, MySQL schema migrations, and Code 128 tests passed.');
  } finally {
    await pool.end();
  }
}

runTests().catch(error => {
  console.error('Test failed:', error);
  process.exitCode = 1;
});
