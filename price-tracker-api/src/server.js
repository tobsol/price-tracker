require("dotenv").config();

const { app } = require("./app");
const { connectDb } = require("./db/connect");
const { logConfig } = require("./config/logConfig");

/**
 * Application entry point.
 *
 * Scheduling policy (production):
 * - This service does not run background schedulers (cron) inside the web process.
 * - Periodic jobs (e.g., price checks) are triggered externally via GitHub Actions
 *   calling the protected admin endpoint (e.g., POST /admin/tick).
 *
 * Rationale:
 * - Avoids duplicate scheduling when multiple instances are running.
 * - Keeps the web service focused on request/response work.
 * - Makes scheduling explicit, auditable, and easy to manage in CI/CD.
 */
async function start() {
  // Log configuration and environment status (useful for diagnostics).
  logConfig();

  // Connect to the database before accepting traffic.
  await connectDb();

  // Start the HTTP server.
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
