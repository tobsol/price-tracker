const cheerio = require("cheerio");
const fetch = global.fetch || require("node-fetch");

const {
  parseNokPrice,
  removeNonContent,
  readJsonLdPrice,
} = require("../utils/priceParsing");

// Scraper using Cheerio (JSON-LD -> DOM selectors -> scoped regex)
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

module.exports = { scrapePrice };
