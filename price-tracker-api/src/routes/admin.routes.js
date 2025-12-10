const express = require("express");
const router = express.Router();

const { adminAuth } = require("../middleware/adminAuth");
const { runTick } = require("../services/tick.service");
const { sendEmail } = require("../services/email.service");

// Manual tick (protected)
router.post("/tick", adminAuth, async (req, res) => {
  try {
    const result = await runTick(req.body?.reason || "manual");
    res.json(result);
  } catch (err) {
    console.error("tick error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Test email (protected)
router.post("/test-email", adminAuth, async (_req, res) => {
  try {
    const sent = await sendEmail({
      subject: "✅ Test Email from Price Tracker",
      html: "<p>This is a successful test email from your backend.</p>",
      text: "Test email from Price Tracker",
    });

    res.json({ ok: sent, message: sent ? "Test email sent" : "Email failed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
