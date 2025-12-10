function adminAuth(req, res, next) {
  const auth = req.get("Authorization");
  const token =
    process.env.ADMIN_TOKEN ||
    process.env.TICK_TOKEN ||
    "dev-secret-token";

  if (!auth || auth !== `Bearer ${token}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

module.exports = { adminAuth };
