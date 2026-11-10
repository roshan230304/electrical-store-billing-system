const assert = require('assert');
const pool = require('../src/config/db');
const itemController = require('../src/controllers/itemController');
const posController = require('../src/controllers/posController');
const saleController = require('../src/controllers/saleController');

async function runPosScannerAcceptanceTest() {
  console.log('================================================================');
  console.log(' POS REAL-TIME BARCODE SCANNER FINAL ACCEPTANCE TEST SUITE');
  console.log('================================================================');

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
      }
    };
    return { req: { body, params, query }, res, getStatus: () => statusCode, getData: () => responseData };
  };

  // Step 1: Ensure products ELEC-000001 and ELEC-000002 exist in database
  let p1, p2;

  // Check if ELEC-000001 exists
  const [rowsP1] = await pool.query('SELECT * FROM products WHERE barcode = ? OR product_code = ?', ['ELEC-000001', 'ELEC-000001']);
  if (rowsP1.length) {
    p1 = rowsP1[0];
  } else {
    // Create product 1
    const p1Req = mockReqRes({
      name: 'Havells LED Bulb 12W',
      brand: 'Havells',
      model_number: '12W-B22',
      unit: 'Piece',
      purchase_price: 80,
      sale_price: 120,
      gst_rate: 18,
      opening_quantity: 50,
      min_stock_to_maintain: 5
    });
    await itemController.createItem(p1Req.req, p1Req.res, err => { if (err) throw err; });
    p1 = p1Req.getData().data;
  }

  const [rowsP2] = await pool.query('SELECT * FROM products WHERE barcode = ? OR product_code = ?', ['ELEC-000002', 'ELEC-000002']);
  if (rowsP2.length) {
    p2 = rowsP2[0];
  } else {
    // Create product 2
    const p2Req = mockReqRes({
      name: 'Anchor Modular Switch',
      brand: 'Anchor',
      model_number: 'MOD-01',
      unit: 'Piece',
      purchase_price: 45,
      sale_price: 80,
      gst_rate: 18,
      opening_quantity: 100,
      min_stock_to_maintain: 10
    });
    await itemController.createItem(p2Req.req, p2Req.res, err => { if (err) throw err; });
    p2 = p2Req.getData().data;
  }

  // Ensure stock is sufficient for testing
  await pool.query('UPDATE products SET stock_quantity = 50, is_active = TRUE WHERE product_id = ?', [p1.product_id]);
  await pool.query('UPDATE products SET stock_quantity = 100, is_active = TRUE WHERE product_id = ?', [p2.product_id]);

  console.log(`Product 1 in MySQL: ID=${p1.product_id}, Name="${p1.product_name || p1.name}", Barcode=${p1.barcode || p1.product_code}, Price=₹${p1.selling_price || p1.sale_price}`);
  console.log(`Product 2 in MySQL: ID=${p2.product_id}, Name="${p2.product_name || p2.name}", Barcode=${p2.barcode || p2.product_code}, Price=₹${p2.selling_price || p2.sale_price}`);

  // Step 2: Start a new bill with empty cart
  const cart = [];
  let scanFeedbackMessage = null;

  function calculateLineTotal(item) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price_per_unit) || 0;
    const discPct = parseFloat(item.discount_percent) || 0;
    const taxPct = parseFloat(item.tax_percent) || 0;
    const base = qty * price;
    const discAmount = (base * discPct) / 100;
    const afterDisc = base - discAmount;
    if (item.price_tax_type === 'With Tax') {
      return afterDisc;
    } else {
      return afterDisc + ((afterDisc * taxPct) / 100);
    }
  }

  function simulateAddToCart(product) {
    if (!product || !product.id || product.is_active === false || Number(product.is_active) === 0) {
      scanFeedbackMessage = { type: 'error', text: 'Cannot add: Product is inactive in system.' };
      return false;
    }

    const cartItem = cart.find(item => item.product_id === product.id);
    const currentQty = Number(cartItem?.quantity || 0);
    const requestedQuantity = currentQty + 1;
    const availableStock = Number(product.current_stock ?? product.stock_quantity ?? 0);

    if (availableStock <= 0 || requestedQuantity > availableStock) {
      scanFeedbackMessage = { type: 'warning', text: 'Insufficient stock for this product.' };
      return false;
    }

    const newQty = currentQty + 1;
    const existingIndex = cart.findIndex(item => item.product_id === product.id);
    if (existingIndex > -1) {
      cart[existingIndex].quantity = newQty;
      cart[existingIndex].total = calculateLineTotal(cart[existingIndex]);
      scanFeedbackMessage = { type: 'success', text: `Quantity updated: ${product.name} × ${newQty}` };
    } else {
      const unitPrice = parseFloat(product.sale_price ?? product.selling_price ?? 0);
      const discountPercent = parseFloat(product.discount_value || 0);
      const taxRateStr = product.tax_rate || `GST@${product.gst_rate || 0}%`;
      const taxPercent = parseFloat(String(taxRateStr).replace(/[^0-9.]/g, '') || product.gst_rate || 0);

      const newItem = {
        product_id: product.id ?? product.product_id,
        name: product.name ?? product.product_name,
        brand: product.brand,
        hsn_code: product.hsn_code,
        barcode: product.barcode || product.product_code,
        unit: product.unit || 'Piece',
        quantity: 1,
        price_per_unit: unitPrice,
        price_tax_type: product.sale_price_tax_type || 'With Tax',
        discount_percent: discountPercent,
        tax_rate: taxRateStr,
        tax_percent: taxPercent,
        current_stock: availableStock
      };
      newItem.total = calculateLineTotal(newItem);
      cart.push(newItem);
      scanFeedbackMessage = { type: 'success', text: `Product added: ${product.name}` };
    }
    return true;
  }

  async function simulateBarcodeScan(code) {
    const scanReq = mockReqRes({}, {}, { code });
    await posController.scanBarcode(scanReq.req, scanReq.res, err => { if (err) throw err; });
    if (scanReq.getStatus() !== 200 || !scanReq.getData().data) {
      scanFeedbackMessage = { type: 'error', text: 'Barcode not found. Please check the product label.' };
      return false;
    }
    return simulateAddToCart(scanReq.getData().data);
  }

  // Step 3 & 4: Scan barcode ELEC-000001 (or p1.barcode)
  const code1 = p1.barcode || p1.product_code;
  const resScan1 = await simulateBarcodeScan(code1);
  assert.strictEqual(resScan1, true);
  assert.strictEqual(cart.length, 1);
  assert.strictEqual(cart[0].product_id, p1.product_id);
  assert.strictEqual(cart[0].quantity, 1);
  assert.strictEqual(scanFeedbackMessage.text, `Product added: ${p1.product_name || p1.name}`);
  console.log(`[PASS] Step 3 & 4: Scanned ${code1} -> Correct product appeared in cart (Qty: 1)`);
  console.log(`       Feedback: "${scanFeedbackMessage.text}"`);

  // Step 5 & 6: Scan ELEC-000002 (or p2.barcode)
  const code2 = p2.barcode || p2.product_code;
  const resScan2 = await simulateBarcodeScan(code2);
  assert.strictEqual(resScan2, true);
  assert.strictEqual(cart.length, 2);
  assert.strictEqual(cart[1].product_id, p2.product_id);
  assert.strictEqual(cart[1].quantity, 1);
  assert.strictEqual(scanFeedbackMessage.text, `Product added: ${p2.product_name || p2.name}`);
  console.log(`[PASS] Step 5 & 6: Scanned ${code2} -> Second product appeared in cart (Qty: 1)`);
  console.log(`       Feedback: "${scanFeedbackMessage.text}"`);

  // Step 7 & 8: Scan ELEC-000001 again
  const resScan3 = await simulateBarcodeScan(code1);
  assert.strictEqual(resScan3, true);
  assert.strictEqual(cart.length, 2, 'Must still be 2 distinct line items');
  assert.strictEqual(cart[0].quantity, 2, 'First product quantity must increment to 2');
  assert.strictEqual(scanFeedbackMessage.text, `Quantity updated: ${p1.product_name || p1.name} × 2`);
  console.log(`[PASS] Step 7 & 8: Scanned ${code1} again -> Quantity increased to 2 without duplicates`);
  console.log(`       Feedback: "${scanFeedbackMessage.text}"`);

  // Step 9: Scan an invalid barcode and verify error message
  const resScanInvalid = await simulateBarcodeScan('UNKNOWN-BARCODE-99999');
  assert.strictEqual(resScanInvalid, false);
  assert.strictEqual(scanFeedbackMessage.type, 'error');
  assert.strictEqual(scanFeedbackMessage.text, 'Barcode not found. Please check the product label.');
  assert.strictEqual(cart.length, 2, 'Cart must remain unchanged on invalid barcode');
  console.log(`[PASS] Step 9: Scanned invalid barcode -> Correctly rejected`);
  console.log(`       Feedback: "${scanFeedbackMessage.text}"`);

  // Step 10: Change product quantity manually and verify total
  cart[1].quantity = 3; // Change Anchor switch from 1 to 3
  cart[1].total = calculateLineTotal(cart[1]);
  const subtotal = cart.reduce((sum, it) => sum + (it.quantity * it.price_per_unit), 0);
  assert.strictEqual(cart[0].quantity, 2);
  assert.strictEqual(cart[1].quantity, 3);
  // P1: 2 * 120 (or current selling price), P2: 3 * 80 (or current selling price)
  const expectedSubtotal = (2 * Number(p1.selling_price || p1.sale_price)) + (3 * Number(p2.selling_price || p2.sale_price));
  assert.strictEqual(subtotal, expectedSubtotal);
  console.log(`[PASS] Step 10: Manually updated Product 2 quantity to 3 -> Subtotal recalculated: ₹${subtotal}`);

  // Step 11 & 12: Select customer and complete checkout
  const [stockP1Before] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [p1.product_id]);
  const [stockP2Before] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [p2.product_id]);
  const before1 = Number(stockP1Before[0].stock_quantity);
  const before2 = Number(stockP2Before[0].stock_quantity);

  const checkoutReq = mockReqRes({
    customer_name: 'Shree Krishna Electricals',
    phone_number: '9945012345',
    payment_type: 'Cash',
    received_amount: subtotal,
    items: [
      { product_id: p1.product_id, quantity: 2 },
      { product_id: p2.product_id, quantity: 3 }
    ]
  });

  await saleController.createSale(checkoutReq.req, checkoutReq.res, err => { if (err) throw err; });
  assert.strictEqual(checkoutReq.getStatus(), 201);
  const saleResp = checkoutReq.getData().data;
  console.log(`[PASS] Step 11 & 12: Checkout completed -> Invoice: ${saleResp.invoice_number}`);

  // Step 13: Verify the invoice
  const saleDetailReq = mockReqRes({}, { id: saleResp.id });
  await saleController.getSaleById(saleDetailReq.req, saleDetailReq.res, err => { if (err) throw err; });
  assert.strictEqual(saleDetailReq.getStatus(), 200);
  const invoiceData = saleDetailReq.getData().data;
  assert.strictEqual(invoiceData.customer_name, 'Shree Krishna Electricals');
  assert.strictEqual(invoiceData.items.length, 2);
  console.log(`[PASS] Step 13: Invoice verified with customer name and ${invoiceData.items.length} line items`);

  // Step 14: Verify MySQL stock is reduced exactly once for the sold quantities
  const [stockP1After] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [p1.product_id]);
  const [stockP2After] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [p2.product_id]);
  const after1 = Number(stockP1After[0].stock_quantity);
  const after2 = Number(stockP2After[0].stock_quantity);

  assert.strictEqual(after1, before1 - 2, 'Product 1 stock must be reduced by exactly 2');
  assert.strictEqual(after2, before2 - 3, 'Product 2 stock must be reduced by exactly 3');
  console.log(`[PASS] Step 14: MySQL stock reduced accurately: Product 1 (${before1} -> ${after1}), Product 2 (${before2} -> ${after2})`);

  console.log('================================================================');
  console.log(' ALL 14 POS REAL-TIME SCANNER STEPS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runPosScannerAcceptanceTest()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Acceptance test failed:', err);
    process.exit(1);
  });

