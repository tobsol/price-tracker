const express = require("express");
const router = express.Router();

const productsRouter = require("./products.routes");
const adminRouter = require("./admin.routes");
const { scrapePrice } = require("../services/scrape.service");

// Preview (no persistence) — POST /preview
router.post("/preview", async (req, res) => {
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

router.use("/products", productsRouter);
router.use("/admin", adminRouter);

module.exports = router;
