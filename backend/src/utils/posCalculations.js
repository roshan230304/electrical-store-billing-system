const round2 = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const DECIMAL_UNITS = new Set([
  'm', 'meter', 'meters', 'metre', 'metres', 'mtr',
  'kg', 'kilogram', 'kilograms', 'g', 'gram', 'grams',
  'l', 'liter', 'litre', 'liters', 'litres'
]);

function isWholeUnit(unit) {
  return !DECIMAL_UNITS.has(String(unit || 'Piece').trim().toLowerCase());
}

function calculateLine({
  quantity, price, discountPercent, discountType = 'Percentage',
  billDiscountPercent = 0, gstRate, priceTaxType
}) {
  const qty = Number(quantity);
  const unitPrice = Number(price);
  const itemDiscountPercent = Number(discountPercent);
  const billDiscount = Number(billDiscountPercent);
  const rate = Number(gstRate);
  const isAmountDiscount = String(discountType).toLowerCase() === 'amount';
  if (![qty, unitPrice, itemDiscountPercent, billDiscount, rate].every(Number.isFinite)
    || qty <= 0 || unitPrice < 0 || itemDiscountPercent < 0
    || (!isAmountDiscount && itemDiscountPercent > 100)
    || (isAmountDiscount && itemDiscountPercent > unitPrice)
    || billDiscount < 0 || billDiscount > 100 || rate < 0) {
    throw new Error('Invalid quantity, price, discount, or GST rate.');
  }

  const subtotal = round2(qty * unitPrice);
  const itemDiscount = isAmountDiscount
    ? round2(itemDiscountPercent * qty)
    : round2(subtotal * itemDiscountPercent / 100);
  const afterItemDiscount = round2(subtotal - itemDiscount);
  const billLevelDiscount = round2(afterItemDiscount * billDiscount / 100);
  const afterDiscount = round2(afterItemDiscount - billLevelDiscount);
  const taxInclusive = String(priceTaxType || '').toLowerCase() === 'with tax';
  const taxableAmount = taxInclusive
    ? round2(afterDiscount / (1 + rate / 100))
    : afterDiscount;
  const gstAmount = taxInclusive
    ? round2(afterDiscount - taxableAmount)
    : round2(taxableAmount * rate / 100);

  return {
    subtotal,
    discount: round2(itemDiscount + billLevelDiscount),
    taxableAmount,
    gstAmount,
    total: taxInclusive ? afterDiscount : round2(taxableAmount + gstAmount)
  };
}

function splitGst(gstAmount, intraState) {
  const gst = round2(gstAmount);
  if (intraState) {
    const cgst = round2(gst / 2);
    return { cgst, sgst: round2(gst - cgst), igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: gst };
}

function calculatePaymentAllocation(requestedPayments, grandTotal, cashTendered) {
  const methods = new Set(['Cash', 'UPI', 'Card', 'Bank Transfer']);
  if (!Array.isArray(requestedPayments) || requestedPayments.some(payment =>
    !methods.has(payment.method) || !Number.isFinite(payment.amount) || payment.amount < 0
  )) {
    throw new Error('Payment methods and amounts must be valid and non-negative.');
  }

  const consolidated = new Map();
  for (const payment of requestedPayments) {
    if (payment.amount > 0) {
      consolidated.set(payment.method, round2((consolidated.get(payment.method) || 0) + payment.amount));
    }
  }
  const payments = Array.from(consolidated, ([method, amount]) => ({ method, amount }));
  const received = round2(payments.reduce((sum, payment) => sum + payment.amount, 0));
  if (received > grandTotal) throw new Error('Payment allocation cannot exceed the amount due.');

  const cashAllocation = round2(payments
    .filter(payment => payment.method === 'Cash')
    .reduce((sum, payment) => sum + payment.amount, 0));
  const nonCashAllocation = round2(payments
    .filter(payment => payment.method !== 'Cash')
    .reduce((sum, payment) => sum + payment.amount, 0));
  const tendered = cashTendered === undefined || cashTendered === ''
    ? cashAllocation
    : Number(cashTendered);
  if (!Number.isFinite(tendered) || tendered < cashAllocation) {
    throw new Error('Cash tendered cannot be less than the cash payment amount.');
  }

  return {
    payments,
    received,
    cashAllocation,
    nonCashAllocation,
    amountTendered: round2(tendered + nonCashAllocation),
    changeReturned: round2(tendered - cashAllocation),
    balanceDue: round2(Math.max(0, grandTotal - received))
  };
}

module.exports = {
  round2,
  isWholeUnit,
  calculateLine,
  splitGst,
  calculatePaymentAllocation
};
