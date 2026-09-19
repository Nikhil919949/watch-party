const User = require("../models/User");
const { signToken } = require("../utils/jwt");

// POST /api/auth/register
// Creates a persistent account with a username/email/password.
async function register(req, res) {
  const { username, email, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }
  if (username.trim().length < 2) {
    return res.status(400).json({ error: "username must be at least 2 characters" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  if (email) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }
  }

  const user = new User({ username: username.trim(), email: email || undefined, isGuest: false });
  await user.setPassword(password);
  await user.save();

  const token = signToken(user);
  return res.status(201).json({ token, user: user.toSafeJSON() });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user);
  return res.json({ token, user: user.toSafeJSON() });
}

// POST /api/auth/guest
// Lightweight identity for jumping straight into a room without an account.
async function guestLogin(req, res) {
  const { username } = req.body;
  if (!username || username.trim().length < 2) {
    return res.status(400).json({ error: "username must be at least 2 characters" });
  }
  if (username.trim().length > 24) {
    return res.status(400).json({ error: "username must be 24 characters or fewer" });
  }

  const user = new User({ username: username.trim(), isGuest: true });
  await user.save();

  const token = signToken(user);
  return res.status(201).json({ token, user: user.toSafeJSON() });
}

// GET /api/auth/me
async function me(req, res) {
  return res.json({ user: req.user.toSafeJSON() });
}

module.exports = { register, login, guestLogin, me };
