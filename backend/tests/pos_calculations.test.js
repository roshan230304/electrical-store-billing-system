const assert = require('assert');
const { calculatePointsEarned } = require('../src/utils/loyalty');
const {
  calculateLine,
  isWholeUnit,
  splitGst,
  calculatePaymentAllocation
} = require('../src/utils/posCalculations');

const exclusive = calculateLine({
  quantity: 1,
  price: 500,
  discountPercent: 0,
  gstRate: 18,
  priceTaxType: 'Without Tax'
});
assert.deepStrictEqual(exclusive, {
  subtotal: 500,
  discount: 0,
  taxableAmount: 500,
  gstAmount: 90,
  total: 590
});

const inclusive = calculateLine({
  quantity: 1,
  price: 118,
  discountPercent: 0,
  gstRate: 18,
  priceTaxType: 'With Tax'
});
assert.deepStrictEqual(inclusive, {
  subtotal: 118,
  discount: 0,
  taxableAmount: 100,
  gstAmount: 18,
  total: 118
});

const discounted = calculateLine({
  quantity: 1,
  price: 500,
  discountPercent: 10,
  billDiscountPercent: 10,
  gstRate: 18,
  priceTaxType: 'Without Tax'
});
assert.deepStrictEqual(discounted, {
  subtotal: 500,
  discount: 95,
  taxableAmount: 405,
  gstAmount: 72.9,
  total: 477.9
});

const cable = calculateLine({
  quantity: 1.5,
  price: 20,
  discountPercent: 0,
  gstRate: 5,
  priceTaxType: 'With Tax'
});
assert.strictEqual(cable.subtotal, 30);
assert.strictEqual(cable.total, 30);
assert.strictEqual(isWholeUnit('Piece'), true);
assert.strictEqual(isWholeUnit('Metre'), false);

assert.strictEqual(calculatePointsEarned(99), 0);
assert.strictEqual(calculatePointsEarned(100), 1);
assert.strictEqual(calculatePointsEarned(250), 2);
assert.strictEqual(calculatePointsEarned(999), 9);
assert.deepStrictEqual(splitGst(18, true), { cgst: 9, sgst: 9, igst: 0 });
assert.deepStrictEqual(splitGst(18, false), { cgst: 0, sgst: 0, igst: 18 });

const splitPayment = calculatePaymentAllocation([
  { method: 'Cash', amount: 400 },
  { method: 'UPI', amount: 600 }
], 1000, 500);
assert.strictEqual(splitPayment.received, 1000);
assert.strictEqual(splitPayment.cashAllocation, 400);
assert.strictEqual(splitPayment.amountTendered, 1100);
assert.strictEqual(splitPayment.changeReturned, 100);
assert.strictEqual(splitPayment.balanceDue, 0);

const partialPayment = calculatePaymentAllocation([
  { method: 'Cash', amount: 400 },
  { method: 'UPI', amount: 500 }
], 1000, 400);
assert.strictEqual(partialPayment.balanceDue, 100);
assert.throws(
  () => calculatePaymentAllocation([{ method: 'UPI', amount: 1001 }], 1000, 0),
  /cannot exceed/
);

console.log('POS GST, discount, decimal quantity, loyalty, split-payment, and cash-change tests passed.');
