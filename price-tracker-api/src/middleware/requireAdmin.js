function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    return res.status(500).json({ error: "ADMIN_TOKEN is not configured" });
  }

  const token = req.header("x-admin-token");
  if (token !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

module.exports = { requireAdmin };
