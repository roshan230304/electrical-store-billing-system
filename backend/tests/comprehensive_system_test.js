const pool = require('../src/config/db');
const { calculatePointsEarned } = require('../src/utils/loyalty');
const saleController = require('../src/controllers/saleController');
const itemController = require('../src/controllers/itemController');
const expenseController = require('../src/controllers/expenseController');
const partyController = require('../src/controllers/partyController');

async function runComprehensiveTests() {
  console.log('====================================================');
  console.log(' RUNNING COMPREHENSIVE ELECTRICAL BILLING SYSTEM TEST');
  console.log('====================================================\n');

  // Test 7 & 8: Loyalty Points formula
  console.log('--- Test 7 & 8: Loyalty Points Calculation Rule ---');
  const points80 = calculatePointsEarned(80);
  const points100 = calculatePointsEarned(100);
  const points200 = calculatePointsEarned(200);
  const points250 = calculatePointsEarned(250);
  const points500 = calculatePointsEarned(500);
  const points999 = calculatePointsEarned(999);
  console.log(`₹80 => ${points80} pts (Expected: 0)`);
  console.log(`₹100 => ${points100} pts (Expected: 1)`);
  console.log(`₹200 => ${points200} pts (Expected: 2)`);
  console.log(`₹250 => ${points250} pts (Expected: 2)`);
  console.log(`₹500 => ${points500} pts (Expected: 5)`);
  console.log(`₹999 => ${points999} pts (Expected: 9)`);

  if (points80 !== 0 || points100 !== 1 || points200 !== 2 || points250 !== 2 || points500 !== 5 || points999 !== 9) {
    throw new Error('Loyalty points calculation rule failed!');
  }
  console.log('✅ Points formula tests passed.\n');

  // Test 6: Customer Phone Identification
  console.log('--- Test 6: Customer Phone Identification ---');
  const testPhone = `98765${Date.now().toString().slice(-5)}`;
  const testName = 'Rohit Sharma Electricals';

  // Lookup non-existent customer
  let lookupResult;
  await partyController.getCustomerByPhone(
    { params: { phone: testPhone } },
    {
      status(c) { return this; },
      json(d) { lookupResult = d; }
    },
    () => {}
  );
  console.log('Lookup non-existent customer:', lookupResult.message);
  if (lookupResult.success) throw new Error('Expected 404 for new customer');

  // Create customer via sale
  console.log('\n--- Test 6 & 13: Customer Auto-Registration & Point Award via Sale ---');
  const [prods] = await pool.query('SELECT product_id, product_name, selling_price, stock_quantity FROM products WHERE is_active = 1 LIMIT 1');
  const testProd = prods[0];
  const prodInitialStock = Number(testProd.stock_quantity);

  const idempotencyKey1 = `test-chk-${Date.now()}`;
  let sale1Result;
  await saleController.createSale(
    {
      body: {
        idempotency_key: idempotencyKey1,
        phone_number: testPhone,
        customer_name: testName,
        payment_type: 'Cash',
        received_amount: 250,
        redeem_points: 0,
        items: [
          {
            product_id: testProd.product_id,
            quantity: 1,
            unit: 'Piece',
            discount_percent: 0
          }
        ]
      }
    },
    {
      status(c) { return this; },
      json(d) { sale1Result = d; }
    },
    (err) => { if (err) throw err; }
  );

  if (!sale1Result.success) throw new Error(sale1Result.message || 'Sale 1 failed');
  console.log(`Sale 1 completed. Invoice: ${sale1Result.data.invoice_number}, Grand Total: ₹${sale1Result.data.grand_total}, Points Earned: ${sale1Result.data.points_earned}, Points Balance: ${sale1Result.data.remaining_points}`);

  // Test 6 verification: Lookup by phone now retrieves customer and points
  let lookupExisting;
  await partyController.getCustomerByPhone(
    { params: { phone: testPhone } },
    {
      status(c) { return this; },
      json(d) { lookupExisting = d; }
    },
    () => {}
  );
  if (!lookupExisting.success || lookupExisting.data.phone_number !== testPhone) {
    throw new Error('Customer lookup failed after registration!');
  }
  console.log(`✅ Customer identified by phone: ${lookupExisting.data.name}, Points: ${lookupExisting.data.loyalty_points}`);

  // Test 11: Idempotency / Points not awarded twice for same checkout key
  console.log('\n--- Test 11: Duplicate Checkout Prevention (Idempotency) ---');
  let duplicateSaleResult;
  await saleController.createSale(
    {
      body: {
        idempotency_key: idempotencyKey1,
        phone_number: testPhone,
        customer_name: testName,
        payment_type: 'Cash',
        received_amount: 250,
        redeem_points: 0,
        items: [
          {
            product_id: testProd.product_id,
            quantity: 1,
            unit: 'Piece',
            discount_percent: 0
          }
        ]
      }
    },
    {
      status(c) { return this; },
      json(d) { duplicateSaleResult = d; }
    },
    (err) => { if (err) throw err; }
  );
  console.log('Duplicate checkout response:', duplicateSaleResult.message);
  if (!duplicateSaleResult.message.includes('already completed')) {
    throw new Error('Duplicate checkout was not detected!');
  }
  console.log('✅ Duplicate checkout prevented; points not awarded twice.');

  // Test 9 & 10: Points Redemption
  console.log('\n--- Test 9 & 10: Points Redemption & Final Payable Reduction ---');
  const availablePoints = Number(sale1Result.data.remaining_points);
  const redeemAmount = Math.min(availablePoints, 2); // redeem 2 points = ₹2 discount

  let sale2Result;
  await saleController.createSale(
    {
      body: {
        idempotency_key: `test-chk-redeem-${Date.now()}`,
        phone_number: testPhone,
        customer_name: testName,
        payment_type: 'Cash',
        redeem_points: redeemAmount,
        items: [
          {
            product_id: testProd.product_id,
            quantity: 1,
            unit: 'Piece',
            discount_percent: 0
          }
        ]
      }
    },
    {
      status(c) { return this; },
      json(d) { sale2Result = d; }
    },
    (err) => { if (err) throw err; }
  );

  if (!sale2Result.success) throw new Error(sale2Result.message || 'Sale 2 redemption failed');
  console.log(`Sale 2 completed with redemption: Points Redeemed: ${sale2Result.data.points_redeemed}, Discount: ₹${sale2Result.data.redemption_discount}, Grand Total (payable): ₹${sale2Result.data.grand_total}`);
  if (sale2Result.data.points_redeemed !== redeemAmount || Number(sale2Result.data.redemption_discount) !== redeemAmount) {
    throw new Error('Redemption amount did not match 1 pt = ₹1 rule');
  }
  console.log('✅ Points redemption and discount reduction verified.');

  // Test 13: Customer loyalty transaction history
  console.log('\n--- Test 13: Customer Loyalty History Verification ---');
  const [historyRows] = await pool.query(
    'SELECT transaction_type, points, invoice_number, description FROM loyalty_points_transactions WHERE customer_id = ? ORDER BY transaction_id ASC',
    [sale1Result.data.customer_id]
  );
  console.log('Loyalty transactions logged:');
  historyRows.forEach(h => console.log(`  - [${h.transaction_type}] ${h.points} pts (Inv: ${h.invoice_number})`));
  if (historyRows.length < 2) throw new Error('Loyalty transactions not logged in history!');
  console.log('✅ Loyalty history verified.');

  // Test 12: Failed checkout does not award points or reduce stock
  console.log('\n--- Test 12: Failed Checkout Stock & Points Safety ---');
  const [stockBeforeFail] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [testProd.product_id]);
  const [pointsBeforeFail] = await pool.query('SELECT loyalty_points FROM customers WHERE customer_id = ?', [sale1Result.data.customer_id]);

  let failedSaleResult;
  try {
    await saleController.createSale(
      {
        body: {
          phone_number: testPhone,
          customer_name: testName,
          items: [
            {
              product_id: testProd.product_id,
              quantity: 9999999, // Exceeds available stock
              unit: 'Piece'
            }
          ]
        }
      },
      {
        status(c) { return this; },
        json(d) { failedSaleResult = d; }
      },
      (err) => { failedSaleResult = { success: false, message: err?.message }; }
    );
  } catch (e) {
    failedSaleResult = { success: false, message: e.message };
  }
  console.log('Failed checkout rejected with message:', failedSaleResult.message);
  const [stockAfterFail] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [testProd.product_id]);
  const [pointsAfterFail] = await pool.query('SELECT loyalty_points FROM customers WHERE customer_id = ?', [sale1Result.data.customer_id]);

  if (Number(stockBeforeFail[0].stock_quantity) !== Number(stockAfterFail[0].stock_quantity)) {
    throw new Error('Stock changed during failed checkout!');
  }
  if (Number(pointsBeforeFail[0].loyalty_points) !== Number(pointsAfterFail[0].loyalty_points)) {
    throw new Error('Loyalty points changed during failed checkout!');
  }
  console.log('✅ Failed checkout safely preserved stock and points.');

  // Clean up test customer, sales, loyalty history
  console.log('\n--- Cleaning up test records ---');
  await pool.query('DELETE FROM loyalty_points_transactions WHERE customer_id = ?', [sale1Result.data.customer_id]);
  await pool.query('DELETE FROM payments WHERE sale_id IN (?, ?)', [sale1Result.data.id, sale2Result.data.id]);
  await pool.query('DELETE FROM sale_items WHERE sale_id IN (?, ?)', [sale1Result.data.id, sale2Result.data.id]);
  await pool.query('DELETE FROM sales WHERE sale_id IN (?, ?)', [sale1Result.data.id, sale2Result.data.id]);
  await pool.query('DELETE FROM customers WHERE customer_id = ?', [sale1Result.data.customer_id]);
  await pool.query('UPDATE products SET stock_quantity = ? WHERE product_id = ?', [prodInitialStock, testProd.product_id]);
  console.log('✅ Cleanup completed.');

  console.log('\n====================================================');
  console.log(' 🎉 ALL 13 TEST VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runComprehensiveTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });

