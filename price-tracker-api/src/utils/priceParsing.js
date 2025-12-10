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

module.exports = {
  parseNokPrice,
  removeNonContent,
  readJsonLdPrice,
};
