// index.js — Price Tracker API with Cheerio + robust price detection
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
const cheerio = require("cheerio");
const fetch = global.fetch || require("node-fetch");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
);
app.use(express.json());

// ====== Config logging (useful while debugging email) ======
console.log("[CONFIG] RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);
console.log("[CONFIG] EMAIL_TO:", process.env.EMAIL_TO);
console.log("[CONFIG] EMAIL_FROM:", process.env.EMAIL_FROM);

// ====== MongoDB Connection ======
const MONGO_URL =
  process.env.MONGO_URL || "mongodb://127.0.0.1:27017/price-tracker";

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

// ====== Mongoose Model ======
const ProductSchema = new mongoose.Schema(
  {
    url: { type: String, required: true }, // same URL can be tracked with different sizes
    title: String,
    currency: String,

    // size-specific tracking
    size: String, // e.g. "EU 45"

    // Prices
    lastPrice: Number, // latest price
    initialPrice: Number, // first seen price
    lowestPrice: Number, // lowest ever seen
    lowestPriceDate: Date, // when the lowestPrice happened

    // Derived analytics
    dropFromInitialPercent: Number, // % down from initial price (never negative)
    changeFromInitialPercent: Number, // signed % change vs initial (can be + or -)

    // Threshold rules
    targetPrice: Number, // notify when price <= this
    targetDiscountPercent: Number, // notify when % drop >= this

    // To avoid spamming notifications for the same exact price
    lastNotifiedPrice: Number,

    // History of checks
    priceHistory: [
      {
        price: Number,
        checkedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", ProductSchema);

// ====== Helpers ======

// Parse Norwegian price like "2 975,00 kr" -> 2975
function parseNokPrice(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/[^\d.,\s]/g, "");
  const normalized = cleaned.replace(/\s/g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

// Remove non-content to avoid banner/freemsg numbers
function removeNonContent($) {
  $("script,style,noscript,template,iframe").remove();
  $("header, nav, footer").remove();
}

// JSON-LD Product offers.price (most reliable when present)
function readJsonLdPrice($) {
  const blocks = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get();
  for (const raw of blocks) {
    try {
      const data = JSON.parse(raw);
      const arr = Array.isArray(data) ? data : [data];

      for (const item of arr) {
        // support @graph or plain object
        const graph = Array.isArray(item && item["@graph"])
          ? item["@graph"]
          : null;
        const candidates = graph || [item];

        for (const node of candidates) {
          if (!node || typeof node !== "object") continue;
          const isProduct = node["@type"] === "Product" || node.offers;
          const isOffer = node["@type"] === "Offer";

          if (!isProduct && !isOffer) continue;

          const offers = node.offers
            ? Array.isArray(node.offers)
              ? node.offers
              : [node.offers]
            : isOffer
            ? [node]
            : [];

          for (const offer of offers) {
            const p = offer?.price ?? offer?.priceSpecification?.price;
            if (p != null) {
              const num = Number(
                String(p).replace(/\s/g, "").replace(",", ".")
              );
              if (Number.isFinite(num)) return num;
            }
          }
        }
      }
    } catch {
      /* ignore malformed JSON-LD blocks */
    }
  }
  return null;
}

// ====== Scraper using Cheerio (JSON-LD -> DOM selectors -> scoped regex) ======
async function scrapePrice(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PriceTrackerBot/1.0)",
      "Accept-Language": "nb-NO,nb;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching product page`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // ---------- Title ----------
  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    "Product";

  // ---------- Price: JSON-LD first ----------
  const ldPrice = readJsonLdPrice($);
  if (ldPrice != null) return { title, price: ldPrice, currency: "NOK" };

  // ---------- Price: DOM (product-scoped) ----------
  // Search only in likely product containers (not header/nav/footer)
  const $scopes =
    $("main, .product, .product-page, .product__info, .product__content")
      .length
      ? $("main, .product, .product-page, .product__info, .product__content")
      : $("body");

  const selectors = [
    ".product__price",
    ".price__current",
    ".product-price",
    ".price--detail",
    "[itemprop='price']",
    "[data-price]",
  ];

  for (const sel of selectors) {
    const node = $scopes.find(sel).first();
    if (node && node.length) {
      const candidate =
        node.attr("content") || node.attr("data-price") || node.text();
      const price = parseNokPrice((candidate || "").trim());
      if (price != null) return { title, price, currency: "NOK" };
    }
  }

  // ---------- Price: scoped regex fallback (prefer 4–5 digit prices) ----------
  removeNonContent($);
  const mainText = $scopes.text();
  const m = mainText.match(
    /(\d{4,5}|\d{1,3}(?:[ .]\d{3}))(?:[.,]\d{2})?\s*(?:NOK|kr)/i
  );
  if (m) {
    const price = parseNokPrice(m[0]);
    if (price != null) return { title, price, currency: "NOK" };
  }

  throw new Error("Price not found on page");
}

// ====== Email Sender (Resend) ======
async function sendEmail({ subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.EMAIL_TO;
  const from =
    process.env.EMAIL_FROM || "Price Tracker <onboarding@resend.dev>";

  if (!apiKey || !to) {
    console.warn("✉️ Email skipped (missing RESEND_API_KEY or EMAIL_TO)", {
      apiKeyPresent: !!apiKey,
      to,
    });
    return false;
  }

  console.log("[EMAIL] Sending via Resend", { to, from, subject });

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  const body = await resp.text().catch(() => "");
  if (!resp.ok) {
    console.error("Resend error:", resp.status, body);
    return false;
  }

  console.log("✉️ Resend accepted email:", body);
  return true;
}

// ====== Email template for price alerts ======
function buildPriceAlertEmail(product) {
  const {
    title,
    url,
    currency,
    lastPrice,
    initialPrice,
    dropFromInitialPercent,
    lowestPrice,
    lowestPriceDate,
    targetPrice,
    targetDiscountPercent,
  } = product;

  const formattedLowestDate = lowestPriceDate
    ? new Date(lowestPriceDate).toLocaleDateString("nb-NO")
    : null;

  const rules = [];
  if (typeof targetPrice === "number") {
    rules.push(`Price ≤ ${targetPrice} ${currency}`);
  }
  if (typeof targetDiscountPercent === "number") {
    rules.push(`Discount vs initial ≥ ${targetDiscountPercent}%`);
  }

  const subject = `💸 Price alert: ${title} now ${lastPrice} ${currency}`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Price alert</title>
  </head>
  <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; padding:24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:20px 24px;border-bottom:1px solid #e4e4e7;">
          <h1 style="margin:0;font-size:20px;">Price alert</h1>
          <p style="margin:4px 0 0;font-size:14px;color:#71717a;">${title}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">
            The price for this product just met your alert rules.
          </p>

          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#27272a;margin-bottom:16px;">
            <tr>
              <td style="padding:4px 0;width:45%;color:#6b7280;">Current price</td>
              <td style="padding:4px 0;font-weight:600;">${lastPrice} ${currency}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#6b7280;">Initial price</td>
              <td style="padding:4px 0;">${initialPrice ?? "n/a"} ${currency}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#6b7280;">Discount vs initial</td>
              <td style="padding:4px 0;">${dropFromInitialPercent ?? 0}%</td>
            </tr>
            ${
              typeof lowestPrice === "number"
                ? `<tr>
                     <td style="padding:4px 0;color:#6b7280;">Lowest seen</td>
                     <td style="padding:4px 0;">${lowestPrice} ${currency}${
                     formattedLowestDate ? ` on ${formattedLowestDate}` : ""
                   }</td>
                   </tr>`
                : ""
            }
          </table>

          ${
            rules.length
              ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Your alert rule(s):</p>
                 <ul style="margin:0 0 16px 18px;padding:0;font-size:13px;color:#4b5563;">
                   ${rules.map((r) => `<li>${r}</li>`).join("")}
                 </ul>`
              : ""
          }

          <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">
            Product page:
            <a href="${url}" style="color:#2563eb;text-decoration:none;">${url}</a>
          </p>

          <p style="margin:0;font-size:12px;color:#a1a1aa;">
            This email was sent by your Running Shoe Price Tracker whenever a tracked product met your configured thresholds.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    `Price alert: ${title}`,
    "",
    `Current price: ${lastPrice} ${currency}`,
    `Initial price: ${initialPrice ?? "n/a"} ${currency}`,
    `Discount vs initial: ${dropFromInitialPercent ?? 0}%`,
  ];

  if (typeof lowestPrice === "number") {
    textLines.push(
      `Lowest seen: ${lowestPrice} ${currency}${
        formattedLowestDate ? ` on ${formattedLowestDate}` : ""
      }`
    );
  }

  if (rules.length) {
    textLines.push("", "Alert rule(s):", ...rules.map((r) => `- ${r}`));
  }

  textLines.push("", `Product page: ${url}`);

  const text = textLines.join("\n");

  return { subject, html, text };
}

// ====== Routes ======

// Preview (no persistence)
app.post("/preview", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "url required" });
    const info = await scrapePrice(url);
    res.json({ ...info, url });
  } catch (err) {
    console.error("preview error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Add product
app.post("/products", async (req, res) => {
  try {
    const { url, size, targetPrice, targetDiscountPercent } = req.body || {};
    if (!url) return res.status(400).json({ error: "url required" });

    // For now we still treat one product per URL (no duplicates)
    const existing = await Product.findOne({ url });
    if (existing) return res.json(existing);

    const info = await scrapePrice(url);
    const now = new Date();

    const product = new Product({
      url,
      title: info.title,
      currency: info.currency || "NOK",

      size: size || undefined,

      lastPrice: info.price,
      initialPrice: info.price,
      lowestPrice: info.price,
      lowestPriceDate: now,
      dropFromInitialPercent: 0,
      changeFromInitialPercent: 0,

      targetPrice:
        typeof targetPrice === "number" ? targetPrice : undefined,
      targetDiscountPercent:
        typeof targetDiscountPercent === "number"
          ? targetDiscountPercent
          : undefined,

      priceHistory: [{ price: info.price, checkedAt: now }],
    });

    await product.save();
    res.json(product);
  } catch (err) {
    console.error("add product error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// List products
app.get("/products", async (_req, res) => {
  try {
    const products = await Product.find().sort({ updatedAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update size / thresholds
app.patch("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { size, targetPrice, targetDiscountPercent } = req.body || {};

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Not found" });

    // Size: string or null to clear
    if (typeof size === "string" || size === null) {
      product.size = size ? size.trim() : undefined;
    }

    // Thresholds: number or null to clear
    if (targetPrice === null) {
      product.targetPrice = undefined;
    } else if (typeof targetPrice === "number") {
      product.targetPrice = targetPrice;
    }

    if (targetDiscountPercent === null) {
      product.targetDiscountPercent = undefined;
    } else if (typeof targetDiscountPercent === "number") {
      product.targetDiscountPercent = targetDiscountPercent;
    }

    // When rules change, allow new alerts again
    product.lastNotifiedPrice = undefined;

    await product.save();
    res.json(product);
  } catch (err) {
    console.error("update product error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ====== Analytics + notification helpers ======
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

// ====== Manual tick (protected) ======
app.post("/admin/tick", async (req, res) => {
  const auth = req.get("Authorization");
  const token =
    process.env.ADMIN_TOKEN ||
    process.env.TICK_TOKEN ||
    "dev-secret-token";
  if (!auth || auth !== `Bearer ${token}`)
    return res.status(401).json({ error: "Unauthorized" });

  try {
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

    res.json({
      ok: true,
      reason: req.body?.reason || "manual",
      checked,
      drops,
      totalTracked: products.length,
      emailed,
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("tick error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== Test email ======
app.post("/admin/test-email", async (_req, res) => {
  try {
    const sent = await sendEmail({
      subject: "✅ Test Email from Price Tracker",
      html: "<p>This is a successful test email from your backend.</p>",
      text: "Test email from Price Tracker",
    });
    res.json({ ok: sent, message: sent ? "Test email sent" : "Email failed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Cron: every 30 minutes ======
cron.schedule("*/30 * * * *", async () => {
  console.log("⏰ Scheduled tick (every 30m)...");
  try {
    await fetch(
      `http://localhost:${process.env.PORT || 3001}/admin/tick`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            process.env.ADMIN_TOKEN ||
            process.env.TICK_TOKEN ||
            "dev-secret-token"
          }`,
        },
        body: JSON.stringify({ reason: "cron" }),
      }
    );
    console.log("✅ Scheduled tick finished.");
  } catch (err) {
    console.error("❌ Scheduled tick failed:", err);
  }
});

// ====== Start server ======
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API listening on http://localhost:${PORT}`);
});
