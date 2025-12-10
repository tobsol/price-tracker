function updateAnalyticsFields(product, newPrice, now = new Date()) {
  // If we don't have an initial price yet, use this price as the starting point
  if (product.initialPrice == null) {
    product.initialPrice = newPrice;
  }

  // Lowest price + date
  if (product.lowestPrice == null || newPrice < product.lowestPrice) {
    product.lowestPrice = newPrice;
    product.lowestPriceDate = now;
  }

  // Percentage change from initial
  if (product.initialPrice) {
    // signed change vs initial: positive = more expensive, negative = cheaper
    const change =
      ((newPrice - product.initialPrice) / product.initialPrice) * 100;
    product.changeFromInitialPercent = Math.round(change * 10) / 10; // 1 decimal

    // discount is just the positive part of -change
    const drop = -change;
    product.dropFromInitialPercent =
      drop > 0 ? Math.round(drop * 10) / 10 : 0;
  } else {
    product.changeFromInitialPercent = 0;
    product.dropFromInitialPercent = 0;
  }
}

function shouldSendNotification(product, oldPrice, newPrice) {
  const hasTargetPrice = typeof product.targetPrice === "number";
  const hasTargetDiscount =
    typeof product.targetDiscountPercent === "number";

  // If no thresholds set, fall back to "any price drop vs lastPrice"
  if (!hasTargetPrice && !hasTargetDiscount) {
    if (oldPrice == null) return false; // first observation, no alert
    if (newPrice >= oldPrice) return false; // must be a drop
    if (product.lastNotifiedPrice === newPrice) return false; // avoid duplicates
    return true;
  }

  // With thresholds: ONLY notify when at least one rule is met
  let meetsPrice = false;
  let meetsDiscount = false;

  if (hasTargetPrice) {
    meetsPrice = newPrice <= product.targetPrice;
  }

  if (
    hasTargetDiscount &&
    typeof product.dropFromInitialPercent === "number"
  ) {
    meetsDiscount =
      product.dropFromInitialPercent >= product.targetDiscountPercent;
  }

  if (!meetsPrice && !meetsDiscount) return false;
  if (product.lastNotifiedPrice === newPrice) return false;

  return true;
}

module.exports = {
  updateAnalyticsFields,
  shouldSendNotification,
};
