const assert = require('assert');
const pool = require('../src/config/db');
const itemController = require('../src/controllers/itemController');
const posController = require('../src/controllers/posController');
const saleController = require('../src/controllers/saleController');
const bwipjs = require('bwip-js');

async function runElectricalBarcodeTests() {
  console.log('--- STARTING ELECTRICAL STORE BARCODE & POS TEST SUITE ---');

  // 1. Database connects successfully
  const [dbResult] = await pool.query('SELECT DATABASE() AS current_db');
  assert.strictEqual(dbResult[0].current_db, 'electrical_store_db');
  console.log('✅ Scenario 1: Connected to database: electrical_store_db');

  // Helper mock req/res
  const mockReqRes = (body = {}, params = {}, query = {}) => {
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
      type() {
        return this;
      },
      set() {
        return this;
      },
      send(data) {
        responseData = data;
        return this;
      }
    };
    return { req: { body, params, query }, res, getStatus: () => statusCode, getData: () => responseData };
  };

  // 2. New product gets automatically generated unique product code (e.g. Havells LED Bulb 12W)
  const product1Req = mockReqRes({
    name: 'Havells LED Bulb 12W',
    brand: 'Havells',
    model_number: '12W-B22',
    unit: 'Piece',
    purchase_price: 80,
    sale_price: 120,
    gst_rate: 18,
    opening_quantity: 50,
    min_stock_to_maintain: 5,
    location: 'Shelf E-1'
  });

  await itemController.createItem(product1Req.req, product1Req.res, err => { if (err) throw err; });
  assert.strictEqual(product1Req.getStatus(), 201);
  const p1 = product1Req.getData().data;
  assert.ok(p1.product_id, 'Product 1 must have product_id');
  assert.ok(p1.product_code.startsWith('ELEC-'), `Product code must start with ELEC-, got: ${p1.product_code}`);
  console.log(`✅ Scenario 2: Generated unique code: ${p1.product_code} for ${p1.name}`);

  // 3. Product code and barcode match exactly
  assert.strictEqual(p1.product_code, p1.barcode, 'Product code and barcode must match exactly');
  console.log(`✅ Scenario 3: Product code (${p1.product_code}) and barcode (${p1.barcode}) match exactly`);

  // Add Product 2: Anchor Modular Switch to verify sequential/unique code
  const product2Req = mockReqRes({
    name: 'Anchor Modular Switch',
    brand: 'Anchor',
    model_number: 'MOD-10A',
    unit: 'Piece',
    purchase_price: 45,
    sale_price: 80,
    gst_rate: 18,
    opening_quantity: 100,
    min_stock_to_maintain: 10,
    location: 'Shelf S-3'
  });
  await itemController.createItem(product2Req.req, product2Req.res, err => { if (err) throw err; });
  const p2 = product2Req.getData().data;
  assert.ok(p2.product_code.startsWith('ELEC-'));
  assert.notStrictEqual(p1.product_code, p2.product_code, 'Product 1 and Product 2 must have distinct codes');
  assert.strictEqual(p2.product_code, p2.barcode);
  console.log(`✅ Created Product 2: ${p2.name} with code: ${p2.product_code} (Barcode: ${p2.barcode})`);

  // 4. Barcode remains unchanged after editing a product
  const updateReq = mockReqRes({
    name: 'Havells LED Bulb 12W Premium',
    brand: 'Havells India',
    model_number: '12W-B22-V2',
    sale_price: 130,
    purchase_price: 85,
    unit: 'Piece',
    gst_rate: 18,
    min_stock_to_maintain: 8
  }, { id: p1.product_id });

  await itemController.updateItem(updateReq.req, updateReq.res, err => { if (err) throw err; });
  assert.strictEqual(updateReq.getStatus(), 200);
  const updatedP1 = updateReq.getData().data;
  assert.strictEqual(updatedP1.product_code, p1.product_code, 'Product code must not change on update');
  assert.strictEqual(updatedP1.barcode, p1.barcode, 'Barcode must not change on update');
  assert.strictEqual(updatedP1.name, 'Havells LED Bulb 12W Premium');
  console.log('✅ Scenario 4: Barcode and product code remained unchanged after product update');

  // 5. Barcode label prints / renders correctly (Code 128 format via bwip-js)
  const barcodeSvgReq = mockReqRes({}, { id: p1.product_id });
  await itemController.getBarcodeSvg(barcodeSvgReq.req, barcodeSvgReq.res, err => { if (err) throw err; });
  const svgOutput = barcodeSvgReq.getData();
  assert.ok(svgOutput && svgOutput.includes('<svg'), 'Barcode SVG output must contain <svg tag');
  assert.ok(svgOutput.includes('<path'), 'Barcode SVG output must render barcode bars as vector paths');
  console.log('✅ Scenario 5: Code 128 barcode label generated successfully as vector SVG');

  // 6. Scanning a barcode finds the correct product
  const scanP1Req = mockReqRes({}, {}, { code: p1.barcode });
  await posController.scanBarcode(scanP1Req.req, scanP1Req.res, err => { if (err) throw err; });
  assert.strictEqual(scanP1Req.getStatus(), 200);
  const scannedP1 = scanP1Req.getData().data;
  assert.strictEqual(scannedP1.product_id, p1.product_id);
  assert.strictEqual(scannedP1.barcode, p1.barcode);
  console.log(`✅ Scenario 6: Scanned barcode '${p1.barcode}' correctly found: ${scannedP1.name}`);

  // 7. Scanning the same product again increases its cart quantity (Simulated POS Cart)
  const cart = [];
  function addToCart(product) {
    const existingIndex = cart.findIndex(item => item.product_id === product.id);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        product_id: product.id,
        name: product.name,
        price_per_unit: Number(product.sale_price),
        quantity: 1,
        current_stock: Number(product.current_stock)
      });
    }
  }

  // Scan P1 first time
  addToCart(scannedP1);
  assert.strictEqual(cart.length, 1);
  assert.strictEqual(cart[0].quantity, 1);

  // Scan P1 second time
  addToCart(scannedP1);
  assert.strictEqual(cart.length, 1, 'Duplicate row must NOT be created');
  assert.strictEqual(cart[0].quantity, 2, 'Quantity must increment to 2');
  console.log('✅ Scenario 7: Scanning the same product again increased cart quantity to 2 without duplicate row');

  // Scan P2 into cart
  addToCart(p2);
  assert.strictEqual(cart.length, 2);
  assert.strictEqual(cart[1].quantity, 1);

  // 8. Invalid barcode displays an error (404)
  const invalidScanReq = mockReqRes({}, {}, { code: 'INVALID-BARCODE-999999' });
  await posController.scanBarcode(invalidScanReq.req, invalidScanReq.res, err => { if (err) throw err; });
  assert.strictEqual(invalidScanReq.getStatus(), 404);
  assert.ok(invalidScanReq.getData().message.includes('not found'));
  console.log('✅ Scenario 8: Invalid barcode returned 404 with error message');

  // 9. Manual product search continues working
  const searchReq = mockReqRes({}, {}, { search: 'Havells' });
  await itemController.getItems(searchReq.req, searchReq.res, err => { if (err) throw err; });
  assert.strictEqual(searchReq.getStatus(), 200);
  const searchResults = searchReq.getData().data;
  assert.ok(searchResults.some(item => item.product_id === p1.product_id));
  console.log(`✅ Scenario 9: Manual product search returned ${searchResults.length} matching item(s)`);

  // 10. Successful checkout updates stock exactly once
  const [stockBeforeP1] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [p1.product_id]);
  const [stockBeforeP2] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [p2.product_id]);
  const initialStock1 = Number(stockBeforeP1[0].stock_quantity);
  const initialStock2 = Number(stockBeforeP2[0].stock_quantity);

  const checkoutReq = mockReqRes({
    customer_name: 'Electrical Contractor Ramesh',
    phone_number: '9888877777',
    payment_type: 'Cash',
    received_amount: 400,
    items: [
      { product_id: p1.product_id, quantity: 2 },
      { product_id: p2.product_id, quantity: 1 }
    ]
  });

  await saleController.createSale(checkoutReq.req, checkoutReq.res, err => { if (err) throw err; });
  assert.strictEqual(checkoutReq.getStatus(), 201);
  const saleData = checkoutReq.getData().data;
  assert.ok(saleData.id, 'Sale must return invoice ID');
  assert.ok(saleData.invoice_number, 'Sale must return invoice number');

  // Verify stock was reduced exactly once: P1 by 2, P2 by 1
  const [stockAfterP1] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [p1.product_id]);
  const [stockAfterP2] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [p2.product_id]);
  assert.strictEqual(Number(stockAfterP1[0].stock_quantity), initialStock1 - 2);
  assert.strictEqual(Number(stockAfterP2[0].stock_quantity), initialStock2 - 1);

  // Check stock_movements table for audit trail
  const [movements] = await pool.query('SELECT * FROM stock_movements WHERE reference_id = ?', [saleData.id]);
  assert.strictEqual(movements.length, 2, 'Two stock movements must be recorded');
  console.log(`✅ Scenario 10: Checkout successful (Invoice: ${saleData.invoice_number}). Stock reduced accurately: P1 -2, P2 -1`);

  // 11. Invoice, payments and reports continue working
  const saleDetailReq = mockReqRes({}, { id: saleData.id });
  await saleController.getSaleById(saleDetailReq.req, saleDetailReq.res, err => { if (err) throw err; });
  assert.strictEqual(saleDetailReq.getStatus(), 200);
  const invoice = saleDetailReq.getData().data;
  assert.strictEqual(invoice.items.length, 2);
  assert.strictEqual(invoice.customer_name, 'Electrical Contractor Ramesh');

  // Verify payments table record
  const [payments] = await pool.query('SELECT * FROM payments WHERE sale_id = ?', [saleData.id]);
  assert.ok(payments.length > 0, 'Payment record must be saved in MySQL');
  assert.strictEqual(payments[0].payment_method, 'Cash');

  console.log('✅ Scenario 11: Invoice retrieved with all items, customer details, and payment recorded in MySQL');

  console.log('--- ALL 11 SCENARIOS PASSED WITH 100% SUCCESS ---');
}

runElectricalBarcodeTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
