const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const {
  createRoom,
  getRoom,
  joinRoom,
  listParticipants,
  changeRole,
  removeParticipant,
  transferHost,
  closeRoom,
} = require("../controllers/roomController");

const router = express.Router();

router.use(requireAuth);

router.post("/", asyncHandler(createRoom));
router.get("/:roomId", asyncHandler(getRoom));
router.post("/:roomId/join", asyncHandler(joinRoom));
router.delete("/:roomId", asyncHandler(closeRoom));

router.get("/:roomId/participants", asyncHandler(listParticipants));
router.patch("/:roomId/participants/:userId/role", asyncHandler(changeRole));
router.delete("/:roomId/participants/:userId", asyncHandler(removeParticipant));

router.post("/:roomId/transfer-host", asyncHandler(transferHost));

module.exports = router;
