// price-tracker-api/index.js
const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- fetchPrice (real) ----------------
async function fetchPrice(url) {
  // polite headers + timeout
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 15_000);

  const res = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PriceTrackerBot/0.1 (+https://example.com)",
      "Accept-Language": "en-US,en;q=0.9,nb;q=0.8",
    },
  }).catch((e) => {
    throw new Error("Network error: " + e.message);
  });
  clearTimeout(to);

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching product page`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // 1) JSON-LD Product first
  const jsonLdInfo = tryJsonLd($);
  if (jsonLdInfo) {
    return {
      title: jsonLdInfo.title ?? guessTitle($),
      price: jsonLdInfo.price,
      currency: jsonLdInfo.currency ?? guessCurrency($) ?? "NOK",
      url,
    };
  }

  // 2) CSS selector fallback
  const selCandidates = [
    "[itemprop=price]",
    "meta[itemprop=price][content]",
    "meta[property='product:price:amount'][content]",
    ".price, .product-price, .current-price, .price__current, .product__price",
    ".ProductPrice, .product-price__current",
    "[data-test*=price],[data-testid*=price]",
  ];

  let priceText = "";
  for (const sel of selCandidates) {
    const node = $(sel).first();
    if (!node || node.length === 0) continue;
    priceText = node.attr("content") || node.attr("data-price") || node.text().trim();
    if (priceText) break;
  }

  const parsedPrice = parsePrice(priceText);
  if (parsedPrice != null) {
    return {
      title: guessTitle($),
      price: parsedPrice,
      currency: guessCurrency($) ?? "NOK",
      url,
    };
  }

  throw new Error("Could not find a price on the page");
}

// ---------------- helpers ----------------
function tryJsonLd($) {
  const scripts = $('script[type="application/ld+json"]');
  for (const el of scripts) {
    const raw = $(el).contents().text().trim();
    if (!raw) continue;

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      const pool = item["@graph"] && Array.isArray(item["@graph"]) ? item["@graph"] : [item];

      for (const node of pool) {
        const types = toArray(node["@type"]);
        const isProduct = types.includes("Product");
        if (!isProduct) continue;

        const title = node.name || node.title || undefined;
        const offer =
          node.offers ||
          (Array.isArray(node.offers) ? node.offers[0] : null) ||
          null;

        if (offer) {
          const price =
            num(offer.price) ??
            num(offer.priceSpecification && offer.priceSpecification.price);
          const currency =
            offer.priceCurrency ||
            (offer.priceSpecification && offer.priceSpecification.priceCurrency) ||
            undefined;

          if (price != null) return { title, price, currency };
        }
      }
    }
  }
  return null;
}

function toArray(x) {
  if (Array.isArray(x)) return x;
  if (x == null) return [];
  return [x];
}

function num(x) {
  if (x == null) return null;
  const n = Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.,]/g, "").replace(/\s+/g, "");
  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    // "1.999,00" → 1999.00
    if (cleaned.indexOf(",") > cleaned.indexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // "1,999.00" → 1999.00
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    normalized = cleaned.replace(",", "."); // "1999,00" → "1999.00"
  } else {
    const parts = cleaned.split(".");
    if (parts.length > 2) normalized = cleaned.replace(/\./g, "");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function guessTitle($) {
  const t =
    $('meta[property="og:title"]').attr("content") ||
    $("h1").first().text().trim() ||
    $("title").text().trim();
  return t || "Product";
}

function guessCurrency($) {
  const cur =
    $('meta[property="product:price:currency"]').attr("content") ||
    $('meta[itemprop="priceCurrency"]').attr("content") ||
    undefined;
  return cur || "NOK";
}

// ---------------- In-memory store (MVP) ----------------
const products = []; // { id, url, title, currency, lastPrice }
let nextId = 1;

// ---------------- Routes ----------------
app.get("/", (_req, res) => res.send("API running"));

// preview a single URL (no persistence)
app.post("/preview", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'url' in body" });
    }
    const info = await fetchPrice(url);
    return res.json(info);
  } catch (e) {
    console.error("preview error:", e);
    return res.status(500).json({ error: String(e.message || e) });
  }
});

// add a product to track (in memory)
app.post("/products", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: "url required" });

    const info = await fetchPrice(url);
    const product = {
      id: nextId++,
      url,
      title: info.title,
      currency: info.currency,
      lastPrice: info.price,
    };

    // de-dupe by URL if you want
    const exists = products.find((p) => p.url === url);
    if (exists) {
      exists.title = product.title;
      exists.currency = product.currency;
      exists.lastPrice = product.lastPrice;
      return res.json(exists);
    }

    products.push(product);
    return res.json(product);
  } catch (e) {
    console.error("create product error:", e);
    return res.status(500).json({ error: String(e.message || e) });
  }
});

// list tracked products
app.get("/products", (_req, res) => {
  res.json(products);
});

// re-check all products (manual tick)
// optional: protect with bearer token via env TICK_TOKEN
app.post("/admin/tick", async (req, res) => {
  const auth = req.headers.authorization || "";
  if (process.env.TICK_TOKEN) {
    if (!auth.startsWith("Bearer ") || auth.split(" ")[1] !== process.env.TICK_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  let checked = 0;
  let drops = 0;
  for (const p of products) {
    try {
      checked++;
      const info = await fetchPrice(p.url);
      if (info.price < p.lastPrice) {
        drops++;
        console.log(
          `[DROP] ${p.title} — ${p.lastPrice} → ${info.price} ${p.currency || "NOK"} (${p.url})`
        );
        p.lastPrice = info.price;
        // later: send email here
      } else {
        p.lastPrice = info.price; // keep updated even if it went up
      }
      // keep title/currency fresh
      p.title = info.title || p.title;
      p.currency = info.currency || p.currency;
    } catch (e) {
      console.error("tick error", p.url, e);
    }
  }

  res.json({ checked, drops, totalTracked: products.length });
});

// ---------------- Start server ----------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
