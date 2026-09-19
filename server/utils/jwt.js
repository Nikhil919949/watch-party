const jwt = require("jsonwebtoken");

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), username: user.username, isGuest: user.isGuest },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
