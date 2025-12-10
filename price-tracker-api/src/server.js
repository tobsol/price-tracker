require("dotenv").config();

const { app } = require("./app");
const { connectDb } = require("./db/connect");
const { logConfig } = require("./config/logConfig");
const { registerTickCron } = require("./jobs/tick.cron");

async function start() {
  // Useful while debugging email
  logConfig();

  // MongoDB
  await connectDb();

  // Cron
  registerTickCron();

  // Start server
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Fatal startup error:", err);
  process.exit(1);
});
