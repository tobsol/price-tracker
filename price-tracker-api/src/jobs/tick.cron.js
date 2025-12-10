const cron = require("node-cron");
const { runTick } = require("../services/tick.service");

// Cron: every 30 minutes
function registerTickCron() {
  cron.schedule("*/30 * * * *", async () => {
    console.log("⏰ Scheduled tick (every 30m)...");
    try {
      const result = await runTick("cron");
      console.log("✅ Scheduled tick finished.", {
        checked: result.checked,
        drops: result.drops,
        emailed: result.emailed,
      });
    } catch (err) {
      console.error("❌ Scheduled tick failed:", err);
    }
  });
}

module.exports = { registerTickCron };
