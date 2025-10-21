# 🏃 Running Shoe Price Tracker

A full-stack web application that tracks and monitors running shoe prices in real time.  
Built with **React**, **TypeScript**, and **Node.js (Express)** to demonstrate modern development, data scraping, and API integration skills.

This project showcases a practical example of combining **frontend and backend development** to deliver live data insights — ideal for demonstrating hands-on full-stack experience in a professional portfolio.


---

## 🚀 Features
- 🔍 Preview product details by URL  
- 💾 Track products and check for price drops  
- 🔁 Manual “Re-check” API to refresh prices  
- ✉️ Ready for future email notifications via Resend  

---

## 🧠 Tech Stack
- **Frontend:** React + Vite + TypeScript  
- **Backend:** Node.js + Express + Cheerio  
- **Communication:** REST (JSON)  

---

## 📂 Project Structure
price-tracker/  
├── price-tracker-api/   # Express backend  
├── price-tracker-web/   # React frontend  
└── README.md  

---

## 🧩 Run Locally

▶️ **Backend**
cd price-tracker-api  
npm install  
npm run dev  

💻 **Frontend**
cd price-tracker-web  
npm install  
npm run dev  

---

## 🧰 Environment Variables
Create a `.env` file in the `price-tracker-api` folder (copy from `.env.example`):

RESEND_API_KEY=your_resend_api_key_here  
EMAIL_TO=you@example.com  
TICK_TOKEN=dev-secret-token  

---

## ✨ Future Improvements
- 📬 Email alerts for price drops  
- 👥 User subscriptions and authentication  
- 💾 Persistent database (SQLite or MongoDB)  
- 🌐 Deployable live demo  

---

## 🏁 Project Purpose
This project was created as a **learning and portfolio project** to demonstrate full-stack development skills, REST API design, and real-world data-scraping using Node.js and TypeScript.

It serves as an example of:
- Building a complete React + Express system  
- Fetching and parsing live product data  
- Managing tracked items and detecting price changes  

---

**👤 Author:** [tobsol](https://github.com/tobsol)
