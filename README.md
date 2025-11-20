# 🏃‍♂️ Running Shoe Price Tracker

Full-stack project with React + TypeScript (Vite) and Node.js + Express.  
It tracks prices of running shoes (tested with loepeshop.no), detects **real** discounts, and can send email alerts when prices drop.

---

## Value proposition

From endless refreshing to one timely alert — **your size, your price, your starting point.**

Most “-20%” banners compare against a short-lived, inflated high price.  
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

- **Alert rules**
  - Optional **target price** (e.g. `≤ 2800 NOK`)
  - Optional **target discount %** (e.g. `≥ 10%`)
  - The backend only sends an email when one of these rules is met and the price hasn’t already been notified at that level.

### Automation & storage

- **Manual re-check**  
  A “Re-check now” button calls a protected `/admin/tick` endpoint to scrape all tracked products on demand.

- **Scheduled job every 30 minutes**  
  Cron job triggers the same tick endpoint on a schedule to keep prices fresh.

- **MongoDB Atlas storage**  
  Products, history and analytics (initial price, lowest price, change %, etc.) are stored in Atlas.

- **Email notifications via Resend**  
  When a threshold is crossed, the backend can send an email using Resend’s API (configurable via `.env`).

---

## Why this exists (design thinking)

Online retailers constantly tweak prices, then shout “–20%” compared to a short-lived peak. Traditional trackers and sale banners often compare against that inflated high, which creates **false positives**:

- A product is “on sale”, but still **more expensive** than when you first saw it.
- As a user, you make a bad decision because the reference point is wrong.

This project is designed around a different question:

> "Is this price better than when I started caring about this product?"

Key design choices:

- **Personal baseline**  
  The first time you track a product, its price is stored as `initialPrice`. This is your truth, not the shop’s.

- **Signed change vs initial**  
  Instead of just “10% difference”, the app shows `+10%` (worse) or `-10%` (better). The sign is preserved.

- **Real discount only**  
  `dropFromInitialPercent` is derived from that signed change and clamped at 0. The app never calls a price increase a “discount”.

- **Transparent history**  
  The line chart and “lowest price since tracking” date let you see if a current “deal” is actually worse than a previous low.

Together, this helps avoid **fake discounts** based on temporary price spikes and supports more honest decision-making.

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

**Infrastructure**

- MongoDB Atlas (database)
- Resend (email delivery)

---

## Learning approach

I learn by building real things. I used ChatGPT to scaffold the initial setup so I could see the big-picture architecture quickly. From there, I work through the code in detail to understand the logic, then modify and extend it—aiming to take over more of the implementation myself while applying design thinking throughout (e.g. focusing on real user baselines instead of marketing prices).

---

## Roadmap

- Polish email templates and open up price-drop alerts
- Add more analytics (e.g. “best discount seen so far”, rolling averages)
- Multi-product and multi-retailer support
- Weekly summaries (what changed this week?)
- Subscription / freemium model experiments
- Refined UI and public demo

---

## Status

Active development. See the Roadmap for next steps. 
