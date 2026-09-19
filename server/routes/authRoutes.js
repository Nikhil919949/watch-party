const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { register, login, guestLogin, me } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/guest", asyncHandler(guestLogin));
router.get("/me", requireAuth, asyncHandler(me));

module.exports = router;
