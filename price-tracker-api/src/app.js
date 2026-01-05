const express = require("express");
const cors = require("cors");

const routes = require("./routes");

const app = express();

/**
 * CORS
 * - Allows local dev (Vite) by default
 * - Allows production frontend via env var FRONTEND_ORIGIN (Render)
 * - Also allows requests with no Origin (curl/Postman/server-to-server)
 *
 * Set on Render (API service):
 *   FRONTEND_ORIGIN=https://price-tracker-web.onrender.com
 */
const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map((s) => s.trim())
    : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser requests
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
);

app.use(express.json());

app.use(routes);

module.exports = { app };
