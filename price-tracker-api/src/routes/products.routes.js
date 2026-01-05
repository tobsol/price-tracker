const express = require("express");
const router = express.Router();

const { requireAdmin } = require("../middleware/requireAdmin");

const Product = require("../models/Product");
const { scrapePrice } = require("../services/scrape.service");

// Add product (ADMIN ONLY)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { url, size, targetPrice, targetDiscountPercent } = req.body || {};
    if (!url) return res.status(400).json({ error: "url required" });

    // Keep existing behavior: one product per URL (no duplicates)
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

      targetPrice: typeof targetPrice === "number" ? targetPrice : undefined,
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

// List products (PUBLIC)
router.get("/", async (_req, res) => {
  try {
    const products = await Product.find().sort({ updatedAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update size / thresholds (ADMIN ONLY)
router.patch("/:id", requireAdmin, async (req, res) => {
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

module.exports = router;
