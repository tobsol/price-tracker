const Product = require("../models/Product");
const { scrapePrice } = require("./scrape.service");
const {
  updateAnalyticsFields,
  shouldSendNotification,
} = require("./analytics.service");
const {
  sendEmail,
  buildPriceAlertEmail,
} = require("./email.service");

async function runTick(reason = "manual") {
  const products = await Product.find();

  let checked = 0,
    drops = 0,
    emailed = 0;

  for (const p of products) {
    try {
      const info = await scrapePrice(p.url);
      checked++;

      const oldPrice = p.lastPrice;
      const newPrice = info.price;
      const now = new Date();

      // Basic fields
      p.title = info.title || p.title;
      p.currency = info.currency || p.currency || "NOK";

      // History
      p.priceHistory.push({ price: newPrice, checkedAt: now });

      // Analytics
      updateAnalyticsFields(p, newPrice, now);

      // Last price
      p.lastPrice = newPrice;

      // Decide whether to send notification
      const notify = shouldSendNotification(p, oldPrice, newPrice);

      if (notify) {
        drops++;

        const { subject, html, text } = buildPriceAlertEmail(p);
        const sent = await sendEmail({ subject, html, text });

        if (sent) {
          emailed++;
          p.lastNotifiedPrice = newPrice;
        }
      }

      await p.save();
    } catch (e) {
      console.warn("check failed:", p.url, e.message || e);
    }
  }

  return {
    ok: true,
    reason,
    checked,
    drops,
    totalTracked: products.length,
    emailed,
    at: new Date().toISOString(),
  };
}

module.exports = { runTick };
