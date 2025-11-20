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
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
);
app.use(express.json());


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
    url: { type: String, required: true }, // removed unique:true so same URL can be tracked for different sizes
    title: String,
    currency: String,

    // NEW: size-specific tracking
    size: String, // e.g. "EU 42"

    // Prices
    lastPrice: Number,      // latest price
    initialPrice: Number,   // first seen price
    lowestPrice: Number,    // lowest ever seen
    lowestPriceDate: Date,  // when the lowestPrice happened

    // Derived analytics
        // Derived analytics
    dropFromInitialPercent: Number,   // % down from initial price (never negative)
    changeFromInitialPercent: Number, // signed % change vs initial (can be + or -)


    // Threshold rules
    targetPrice: Number,           // notify when price <= this
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
  const blocks = $('script[type="application/ld+json"]').map((_, el) => $(el).text()).get();
  for (const raw of blocks) {
    try {
      const data = JSON.parse(raw);
      const arr = Array.isArray(data) ? data : [data];

      for (const item of arr) {
        // support @graph or plain object
        const graph = Array.isArray(item && item["@graph"]) ? item["@graph"] : null;
        const candidates = graph || [item];

        for (const node of candidates) {
          if (!node || typeof node !== "object") continue;
          const isProduct = node["@type"] === "Product" || node.offers;
          const isOffer = node["@type"] === "Offer";

          if (!isProduct && !isOffer) continue;

          const offers = node.offers
            ? Array.isArray(node.offers) ? node.offers : [node.offers]
            : isOffer ? [node] : [];

          for (const offer of offers) {
            const p = offer?.price ?? offer?.priceSpecification?.price;
            if (p != null) {
              const num = Number(String(p).replace(/\s/g, "").replace(",", "."));
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
    $("main, .product, .product-page, .product__info, .product__content").length
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
      const candidate = node.attr("content") || node.attr("data-price") || node.text();
      const price = parseNokPrice((candidate || "").trim());
      if (price != null) return { title, price, currency: "NOK" };
    }
  }

  // ---------- Price: scoped regex fallback (prefer 4–5 digit prices) ----------
  removeNonContent($);
  const mainText = $scopes.text();
  const m = mainText.match(/(\d{4,5}|\d{1,3}(?:[ .]\d{3}))(?:[.,]\d{2})?\s*(?:NOK|kr)/i);
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
  const from = process.env.EMAIL_FROM || "Price Tracker <onboarding@resend.dev>";
  if (!apiKey || !to) {
    console.warn("✉️  Email skipped (missing RESEND_API_KEY or EMAIL_TO)");
    return;
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("Resend error:", resp.status, t);
  } else {
    console.log("✉️  Email sent:", subject);
  }
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
  const hasTargetDiscount = typeof product.targetDiscountPercent === "number";

  // If no thresholds set, fall back to the old behaviour:
  // notify on any price drop
  if (!hasTargetPrice && !hasTargetDiscount) {
    if (oldPrice == null) return false;
    if (newPrice >= oldPrice) return false;
    if (product.lastNotifiedPrice === newPrice) return false;
    return true;
  }

  let meetsPrice = false;
  let meetsDiscount = false;

  if (hasTargetPrice) {
    meetsPrice = newPrice <= product.targetPrice;
  }

  if (hasTargetDiscount && product.initialPrice) {
    const drop =
      ((product.initialPrice - newPrice) / product.initialPrice) * 100;
    meetsDiscount = drop >= product.targetDiscountPercent;
  }

  // If neither condition is met, no notification
  if (!(meetsPrice || meetsDiscount)) return false;

  // Avoid sending again for exactly the same price
  if (product.lastNotifiedPrice === newPrice) return false;

  return true;
}


// Manual tick (protected)
app.post("/admin/tick", async (req, res) => {
  const auth = req.get("Authorization");
  const token =
    process.env.ADMIN_TOKEN || process.env.TICK_TOKEN || "dev-secret-token";
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
          emailed++;

          await sendEmail({
            subject: `💸 Price alert: ${p.title} → ${newPrice} ${p.currency}`,
            html: `<h2>Price alert</h2>
                   <p><strong>${p.title}</strong></p>
                   <p>Current: ${newPrice} ${p.currency}</p>
                   ${
                     p.initialPrice
                       ? `<p>Initial: ${p.initialPrice} ${p.currency} (${p.dropFromInitialPercent}% down)</p>`
                       : ""
                   }
                   <p><a href="${p.url}">View product</a></p>`,
            text: `${p.title}
Current: ${newPrice} ${p.currency}
Initial: ${p.initialPrice ?? "n/a"} ${p.currency}
Drop: ${p.dropFromInitialPercent ?? 0}% 
${p.url}`,
          });

          p.lastNotifiedPrice = newPrice;
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


// Test email
app.post("/admin/test-email", async (_req, res) => {
  try {
    await sendEmail({
      subject: "✅ Test Email from Price Tracker",
      html: "<p>This is a successful test email from your backend.</p>",
      text: "Test email from Price Tracker",
    });
    res.json({ ok: true, message: "Test email sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Cron: every 30 minutes ======
cron.schedule("*/30 * * * *", async () => {
  console.log("⏰ Scheduled tick (every 30m)...");
  try {
    await fetch(`http://localhost:${process.env.PORT || 3001}/admin/tick`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ADMIN_TOKEN || process.env.TICK_TOKEN || "dev-secret-token"}`,
      },
      body: JSON.stringify({ reason: "cron" }),
    });
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
