# 🏃‍♂️ Running Shoe Price Tracker

Full-stack project with React + TypeScript (Vite) and Node.js + Express.  
It tracks prices of running shoes (tested with loepeshop.no), detects price drops, and is prepared for email notifications.

## Value proposition
From endless refreshing to one timely alert — your size, your price, the moment it drops.

## Features (MVP)
- Preview product details from a URL
- Track products and detect price drops
- Recheck API to refresh prices on demand
- Scheduled job every 30 minutes to update prices
- Data stored in MongoDB
- Prepared for future email notifications via Resend

## Tech stack
Frontend: React, Vite, TypeScript  
Backend: Node.js, Express, Cheerio  
Database: MongoDB  
Email (planned): Resend  
Scheduling: Cron (30-minute interval)

## Learning approach
I learn by building real things. I used ChatGPT to scaffold the initial setup so I could see the big-picture architecture quickly. From there, I work through the code in detail to understand the logic, then modify and extend it, with the goal of writing more myself as I progress while applying design thinking throughout.

## Roadmap
- Price-drop email alerts (private beta → public)
- Size-specific tracking and price thresholds/percent-drop rules
- Multi-product and multi-retailer support
- Weekly summaries
- Subscription billing (freemium model)

## Status
Active development. See the Roadmap for next steps.
