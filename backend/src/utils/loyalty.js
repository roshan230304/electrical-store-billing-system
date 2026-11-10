function calculatePointsEarned(eligibleAmount) {
  const amount = Number(eligibleAmount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor((amount + Number.EPSILON) / 100);
}

function calculateReturnPointAdjustments(pointsEarned, pointsRedeemed, cumulativeRefund, invoiceTotal) {
  const total = Number(invoiceTotal);
  const share = total > 0
    ? Math.min(1, Math.max(0, Number(cumulativeRefund) / total))
    : 1;
  return {
    earnedReversal: Math.floor(Math.max(0, Number(pointsEarned) || 0) * share + Number.EPSILON),
    redeemedRestore: Math.floor(Math.max(0, Number(pointsRedeemed) || 0) * share + Number.EPSILON)
  };
}

module.exports = { calculatePointsEarned, calculateReturnPointAdjustments };
