function logConfig() {
  console.log("[CONFIG] RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);
  console.log("[CONFIG] EMAIL_TO:", process.env.EMAIL_TO);
  console.log("[CONFIG] EMAIL_FROM:", process.env.EMAIL_FROM);
}

module.exports = { logConfig };
