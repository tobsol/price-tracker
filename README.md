# Running Shoe Price Tracker

A fullstack web app that monitors prices for running shoes and sends email alerts when the price actually drops.

![Demo](assets/demo.gif)

---

## Why this exists

Checking whether a shoe you want has *actually* become cheaper often has hidden costs:
- You end up revisiting the same product pages repeatedly to see if the price changed.
- “-20%” banners can be misleading if the price was temporarily inflated right before the “sale”.
- Availability and buying intent can be size-dependent.

This tracker automates the monitoring and keeps a price history so you can see the *real* price development over time.

---

## Key features

- **Automatic price monitoring** on a schedule
- **Email notifications** when conditions are met
- **Price history** for each tracked product (to spot real drops vs “fake sales”)
- **Baseline analytics** (initial price, lowest seen, change vs initial)
- **Optional thresholds per product** (target price and/or discount % vs initial)
- **Optional size field stored per product** (see “Size” section below)
- **Web UI** for tracked items + price history chart

---

## How it works

1. Paste a product URL
2. (Optional) Set alert thresholds
3. The app performs scheduled checks in the background and emails you when your condition is met  
   **— or on any price drop by default if no thresholds are set.**

---

## Alerts & email notifications (correct logic)

Alerts are evaluated per tracked product at each scheduled price check.

### Alert rules (per product)

You can optionally configure one or both thresholds:

- **Target price**: notify when `newPrice ≤ targetPrice`
- **Target discount % (vs initial price)**: notify when  
  `dropFromInitialPercent ≥ targetDiscountPercent`

If **no thresholds are set**, the tracker falls back to a sensible default:

- **Default alert (no thresholds): notify on any price drop vs the previous check**
  - No alert on the first observation
  - Notify only when `newPrice < oldPrice`

### Anti-spam / duplicate protection

To reduce repetitive notifications, the system avoids sending duplicate alerts at the same price level:

- If `lastNotifiedPrice === newPrice`, the alert is skipped.

---

## Size (current status) + roadmap

### Current status
You can **store a size** per tracked product. This is currently used to keep tracking aligned with your intended purchase (i.e., “this is the size I care about”).

**Note:** size is **not yet used as an alert condition**.

### Roadmap: size-based alerts
Planned next step is **size-based alerting**, so notifications can be tied to the selected size (for example: only notify when the chosen size is available and/or the relevant size variant price drops).

---

## Tech overview

- React + TypeScript
- Node.js
- MongoDB / MongoDB Atlas
- Cheerio (scraping)
- Resend (email)
- Render (deployment)
