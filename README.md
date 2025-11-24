# 👟 Running Shoe Price Tracker

Full-stack project with React + TypeScript (Vite) and Node.js + Express.  
It tracks prices of running shoes (tested with loepeshop.no), detects **real** discounts, and can send email alerts when prices drop.

---

## Value proposition

From endless refreshing to one timely alert — **your size, your price, the moment it drops.**

Most “–20%” banners compare against a short-lived, inflated high price.  
This tracker compares everything against the price **when you started caring**, so you don’t get tricked by fake discounts.

---

## Features (MVP)

### Tracking & alerts

- **Add product by URL**  
  Paste a product page (e.g. from loepeshop.no) and preview the scraped title and current price.

- **Size-specific tracking**  
  Optionally store the size you care about (e.g. *EU 45*), so the tracked entry matches your real purchase intent.

- **True baseline at start time**  
  When you start tracking, that price is stored as `initialPrice`. It never changes, so all analytics are relative to *your* first touchpoint.

- **Up/down % change vs initial**  
  On each re-check, the backend computes:
  - `changeFromInitialPercent` – signed change vs initial (e.g. `+0.9%` = more expensive, `-12%` = cheaper).  
  - `dropFromInitialPercent` – real **discount** vs initial, never negative.

  In the UI:
  - Change is shown in **red** when the product is more expensive than your starting point, and **green** when it’s cheaper.
  - “Discount vs initial” only appears when there’s an actual discount.

- **Price history chart per product**  
  Every check is stored in `priceHistory`. The frontend renders a small line chart to show how the price has moved over time (not just the current value).

- **Per-product alert rules (backend)**  
  Each tracked product can have its own alert configuration:
  - **Target price** – alert when the current price is **less than or equal to** this value (e.g. `≤ 2800 NOK`).
  - **Target discount** – alert when the price is at least **X% cheaper** than the `initialPrice` (e.g. `≥ 20%` discount).
  - If **no rules** are set for a product, the tracker falls back to:  
    **“Alert on any real price drop”** compared to the previous check (but never twice for the exact same price).

  The alert logic is **OR-based**:
  - If *either* the target price rule **or** the target discount rule is satisfied, an alert is eligible.
  - Alerts are de-duplicated using `lastNotifiedPrice`, so the same price point does not spam your inbox.

- **Email notifications (Resend)**  
  When an alert rule is met, the backend sends an email via Resend (configured via `.env`).  
  Each alert email includes:
  - Current price and currency  
  - Initial price  
  - Discount vs initial (in %)  
  - Lowest price seen so far and when it occurred  
  - The alert rule(s) that were met (e.g. *“Price ≤ 2800 NOK”*, *“Discount vs initial ≥ 10%”*)  
  - Direct link to the product page  

  Subjects are sanitized (no newlines, normalized whitespace) so they comply with Resend’s validation rules.

> **Planned:** In a later iteration, the frontend will expose full UI controls for editing alert rules (target price / discount) per product. For now, configuration lives in the backend / database.

---

### Automation & storage

- **Manual re-check**  
  A “Re-check now” button calls a protected `/admin/tick` endpoint to scrape all tracked products on demand and show how many prices changed, how many alerts were triggered, and how many emails were sent.

- **Scheduled job every 30 minutes**  
  A cron job triggers the same tick endpoint on a schedule to keep prices fresh without manual interaction.

- **MongoDB Atlas storage**  
  Products, history and analytics (initial price, lowest price, change %, rules, etc.) are stored in MongoDB Atlas.

- **Email infrastructure via Resend**  
  All emails are sent through Resend’s REST API. Credentials and recipient addresses are injected via environment variables to keep secrets out of Git.

---

## How alert logic works (and why it’s designed this way)

Traditional trackers often answer:

> “Is this price lower than some recent peak?”

This project answers a more personal question:

> “Is this price better than when **I** started caring about this product?”

To support that, the alert system is built around:

1. **Personal baseline**  
   - `initialPrice` is captured when you first start tracking.  
   - All discounts and % changes are measured relative to that number, not the retailer’s latest “original” price.

2. **Two mental models of a good deal**
   - **Absolute price**:  
     “If this shoe hits **2 500 NOK or less**, I’m willing to buy.”
   - **Relative discount**:  
     “If it’s at least **20% off** the original price I saw, that feels like a real sale.”

   In behavioural economics terms:
   - The absolute price reflects your **willingness to pay** / budget constraint.
   - The discount reflects your sense of **value vs the original anchor**.

3. **OR logic instead of over-optimisation**  
   - The tracker sends an alert if **any one** of your conditions is met:
     - price ≤ target price **OR**  
     - discount ≥ target discount %
   - This matches how many people behave in practice:
     - They do not try to perfectly optimise the lowest possible price.
     - They “satisfice”: once the deal is **good enough** either in absolute terms or relative discount, they want to know and act before the price changes again.

4. **Avoiding regret and spam**
   - By de-duplicating on `lastNotifiedPrice`, the app avoids sending multiple alerts for the same price point.
   - By using your personal baseline and explicit rules, it reduces the chance of:
     - “Fake discounts” that are still worse than your starting point.
     - “I waited to save another 50 NOK and missed a perfectly good deal” regret.

Together, this makes the tracker more aligned with how real buyers think about deals, not just how retailers design their banners.

---

## Tech stack

**Frontend**

- React + Vite
- TypeScript
- Recharts (price history chart)

**Backend**

- Node.js, Express
- Cheerio (HTML scraping)
- Cron (30-minute scheduled checks)
- Custom alert logic + email templating

**Infrastructure**

- MongoDB Atlas (database)
- Resend (email delivery)

---

## Learning approach

I learn by building real things. I used ChatGPT to scaffold the initial setup so I could see the big-picture architecture quickly. From there, I work through the code in detail to understand the logic, then modify and extend it—aiming to take over more of the implementation myself while applying design thinking throughout (e.g. focusing on real user baselines instead of marketing prices).

---

## Roadmap

- Expose **alert rule editing** (target price / discount) directly in the UI
- Iterate on email templates and summaries (e.g. weekly “what changed” digest)
- Add more analytics (e.g. “best discount seen so far”, rolling averages)
- Multi-product and multi-retailer support
- Weekly summaries (what changed this week?)
- Subscription / freemium model experiments (e.g. premium alert tiers)
- Refined UI and public demo

---

## Status

Active development. See the Roadmap for next steps.  
The alert logic and email delivery via Resend are already live and used for real products.
