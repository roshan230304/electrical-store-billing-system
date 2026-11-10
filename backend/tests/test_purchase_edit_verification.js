const pool = require('../src/config/db');
const purchaseController = require('../src/controllers/purchaseController');

async function runTest() {
  console.log('Testing Purchase Editing Stock Difference Logic...');
  const conn = await pool.getConnection();
  try {
    // 1. Find or create a test product
    const [prods] = await conn.query('SELECT product_id, product_name, stock_quantity FROM products WHERE is_active = 1 LIMIT 1');
    if (!prods.length) {
      console.log('No active product found for test.');
      return;
    }
    const testProduct = prods[0];
    const initialStock = Number(testProduct.stock_quantity);
    console.log(`Test product: ${testProduct.product_name} (ID: ${testProduct.product_id}), Initial Stock: ${initialStock}`);

    // 2. Create a purchase of 10 units
    const mockReqCreate = {
      body: {
        bill_number: `TEST-PB-${Date.now()}`,
        bill_date: new Date().toISOString().split('T')[0],
        supplier_name: 'Test Supplier Havells',
        phone_number: '9876500001',
        payment_type: 'Cash',
        paid_amount: 500,
        items: [
          {
            product_id: testProduct.product_id,
            item_name: testProduct.product_name,
            quantity: 10,
            unit: 'Piece',
            price_per_unit: 50,
            discount_percent: 0,
            tax_rate: 'GST@18%'
          }
        ]
      }
    };

    let createdPurchaseId;
    const mockResCreate = {
      status(code) { this.statusCode = code; return this; },
      json(data) {
        if (!data.success) throw new Error(data.message || 'Creation failed');
        createdPurchaseId = data.data.id;
        console.log(`Created test purchase bill: ${data.data.bill_number} (ID: ${createdPurchaseId})`);
      }
    };

    await purchaseController.createPurchase(mockReqCreate, mockResCreate, (err) => { if (err) throw err; });

    // Check stock after creation: should be initialStock + 10
    const [stockAfterCreate] = await conn.query('SELECT stock_quantity FROM products WHERE product_id = ?', [testProduct.product_id]);
    const stock1 = Number(stockAfterCreate[0].stock_quantity);
    console.log(`Stock after +10 purchase: ${stock1} (Expected: ${initialStock + 10})`);
    if (stock1 !== initialStock + 10) throw new Error('Stock creation did not add 10 units');

    // 3. Edit purchase: Change quantity from 10 to 14 (+4 difference)
    const mockReqUpdate = {
      params: { id: createdPurchaseId },
      user: { username: 'AdminTester' },
      body: {
        bill_date: new Date().toISOString().split('T')[0],
        supplier_name: 'Test Supplier Havells',
        phone_number: '9876500001',
        payment_type: 'Cash',
        paid_amount: 500,
        modification_reason: 'Updated quantity from 10 to 14',
        items: [
          {
            product_id: testProduct.product_id,
            item_name: testProduct.product_name,
            quantity: 14, // +4 units more
            unit: 'Piece',
            price_per_unit: 50,
            discount_percent: 0,
            tax_rate: 'GST@18%'
          }
        ]
      }
    };

    const mockResUpdate = {
      status(code) { this.statusCode = code; return this; },
      json(data) {
        if (!data.success) throw new Error(data.message || 'Update failed');
        console.log(`Updated purchase successfully. Stock changes:`, data.data.stock_changes);
      }
    };

    await purchaseController.updatePurchase(mockReqUpdate, mockResUpdate, (err) => { if (err) throw err; });

    // Check stock after update: should be initialStock + 14 (i.e. +4, NOT +14 again!)
    const [stockAfterUpdate] = await conn.query('SELECT stock_quantity FROM products WHERE product_id = ?', [testProduct.product_id]);
    const stock2 = Number(stockAfterUpdate[0].stock_quantity);
    console.log(`Stock after edit to 14: ${stock2} (Expected: ${initialStock + 14})`);
    if (stock2 !== initialStock + 14) throw new Error(`Stock after edit is wrong! Got ${stock2}, expected ${initialStock + 14}`);

    // 4. Verify purchase_history entry
    const [historyRows] = await conn.query('SELECT * FROM purchase_history WHERE purchase_id = ?', [createdPurchaseId]);
    console.log(`Purchase history rows found: ${historyRows.length}`);
    if (historyRows.length < 1) throw new Error('No purchase_history recorded');
    console.log('Purchase history entry:', historyRows[0].modification_reason);

    // 5. Clean up test purchase
    const mockReqDelete = {
      params: { id: createdPurchaseId }
    };
    const mockResDelete = {
      status(code) { this.statusCode = code; return this; },
      json(data) {
        console.log('Cleaned up test purchase:', data.message);
      }
    };
    await purchaseController.deletePurchase(mockReqDelete, mockResDelete, (err) => { if (err) throw err; });

    // Final stock check
    const [finalStockRow] = await conn.query('SELECT stock_quantity FROM products WHERE product_id = ?', [testProduct.product_id]);
    const finalStock = Number(finalStockRow[0].stock_quantity);
    console.log(`Stock after deleting test purchase: ${finalStock} (Expected: ${initialStock})`);
    if (finalStock !== initialStock) throw new Error(`Stock after delete did not revert! Got ${finalStock}, expected ${initialStock}`);

    console.log('✅ ALL PURCHASE INVENTORY DIFFERENCE TESTS PASSED!');
  } finally {
    conn.release();
    process.exit(0);
  }
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

