const fetch = global.fetch || require("node-fetch");

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

  // Collapse all whitespace (including newlines) into single spaces for subject/text
  const safeTitle = (title || "Product").replace(/\s+/g, " ").trim();

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

  const subject = `💸 Price alert: ${safeTitle} now ${lastPrice} ${currency}`;

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
    `Price alert: ${safeTitle}`,
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

module.exports = {
  sendEmail,
  buildPriceAlertEmail,
};
