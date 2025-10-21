# ????? Running Shoe Price Tracker

A simple full-stack project built with **React + TypeScript (Vite)** and **Node.js + Express**.  
It tracks prices of running shoes (tested with [loepeshop.no](https://www.loepeshop.no)) and detects price drops.

## ?? Features
- Preview product details by URL
- Track products and check for price drops
- Simple re-check API to refresh prices
- Ready for future email notifications via Resend

## ?? Stack
- Frontend: React + Vite + TypeScript  
- Backend: Node.js + Express + Cheerio  
- API communication via REST (JSON)

## ?? Structure
\\\
price-tracker/
+-- price-tracker-api/   # Express backend
+-- price-tracker-web/   # React frontend
+-- README.md
\\\

## ?? Run locally

### Backend
\\\ash
cd price-tracker-api
npm install
npm run dev
\\\

### Frontend
\\\ash
cd price-tracker-web
npm install
npm run dev
\\\

## ?? Future improvements
- Email alerts for price drops
- User subscriptions
- Persistent storage (DB)

---
\*Created as a learning project to demonstrate full-stack development skills.
