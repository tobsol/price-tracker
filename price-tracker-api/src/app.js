const express = require("express");
const cors = require("cors");

const routes = require("./routes");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
);

app.use(express.json());

app.use(routes);

module.exports = { app };
