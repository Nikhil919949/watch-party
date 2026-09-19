const Room = require("../models/Room");
const generateRoomId = require("../utils/generateRoomId");
const { extractYouTubeId } = require("../utils/youtube");
const { findParticipant, canManageParticipants, isHost } = require("../utils/permissions");
const { getIO } = require("../sockets");

// POST /api/rooms  { videoUrl? }
// Creates a room and makes the requester the HOST.
async function createRoom(req, res) {
  const { videoUrl } = req.body || {};
  let currentVideoId = null;
  if (videoUrl) {
    currentVideoId = extractYouTubeId(videoUrl);
    if (!currentVideoId) {
      return res.status(400).json({ error: "That doesn't look like a valid YouTube URL" });
    }
  }

  let roomId;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateRoomId();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Room.findOne({ roomId: candidate });
    if (!exists) {
      roomId = candidate;
      break;
    }
  }
  if (!roomId) {
    return res.status(500).json({ error: "Could not allocate a room code, please try again" });
  }

  const room = new Room({
    roomId,
    hostId: req.user._id,
    currentVideoId,
    participants: [
      {
        userId: req.user._id,
        username: req.user.username,
        role: "HOST",
        online: false,
      },
    ],
  });
  await room.save();

  return res.status(201).json({ room: room.toPublicState() });
}

// GET /api/rooms/:roomId
async function getRoom(req, res) {
  const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
  if (!room || room.closed) {
    return res.status(404).json({ error: "Room not found" });
  }
  return res.json({ room: room.toPublicState() });
}

// POST /api/rooms/:roomId/join
// Adds the caller to the room as PARTICIPANT if not already a member.
// Actual real-time presence is established over the socket "join_room" event;
// this endpoint lets the client validate + reserve a spot before connecting.
async function joinRoom(req, res) {
  const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
  if (!room || room.closed) {
    return res.status(404).json({ error: "Room not found" });
  }

  const existing = findParticipant(room, req.user._id);
  if (!existing) {
    room.participants.push({
      userId: req.user._id,
      username: req.user.username,
      role: "PARTICIPANT",
      online: false,
    });
    await room.save();
  }

  return res.json({ room: room.toPublicState() });
}

// GET /api/rooms/:roomId/participants
async function listParticipants(req, res) {
  const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
  if (!room || room.closed) {
    return res.status(404).json({ error: "Room not found" });
  }
  return res.json({ participants: room.toPublicState().participants });
}

// PATCH /api/rooms/:roomId/participants/:userId/role  { role }
async function changeRole(req, res) {
  const { role } = req.body;
  const validRoles = ["HOST", "MODERATOR", "PARTICIPANT", "VIEWER"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
  if (!room || room.closed) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (!canManageParticipants(room, req.user._id)) {
    return res.status(403).json({ error: "Only the host can change roles" });
  }
  if (role === "HOST") {
    return res.status(400).json({ error: "Use the transfer-host endpoint to change the host" });
  }
  if (req.params.userId === room.hostId.toString()) {
    return res.status(400).json({ error: "Cannot change the host's role directly" });
  }

  const target = findParticipant(room, req.params.userId);
  if (!target) {
    return res.status(404).json({ error: "Participant not found in this room" });
  }

  target.role = role;
  await room.save();

  getIO()?.to(room.roomId).emit("role_assigned", {
    userId: target.userId.toString(),
    role: target.role,
    participants: room.toPublicState().participants,
  });

  return res.json({ room: room.toPublicState() });
}

// DELETE /api/rooms/:roomId/participants/:userId
async function removeParticipant(req, res) {
  const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
  if (!room || room.closed) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (!canManageParticipants(room, req.user._id)) {
    return res.status(403).json({ error: "Only the host can remove participants" });
  }
  if (req.params.userId === room.hostId.toString()) {
    return res.status(400).json({ error: "The host cannot remove themselves; transfer host first" });
  }

  const before = room.participants.length;
  room.participants = room.participants.filter(
    (p) => p.userId.toString() !== req.params.userId
  );
  if (room.participants.length === before) {
    return res.status(404).json({ error: "Participant not found in this room" });
  }
  await room.save();

  const io = getIO();
  io?.to(room.roomId).emit("participant_removed", {
    userId: req.params.userId,
    participants: room.toPublicState().participants,
  });
  io?.in(room.roomId).socketsLeave(room.roomId);

  return res.json({ room: room.toPublicState() });
}

// POST /api/rooms/:roomId/transfer-host  { newHostId }
async function transferHost(req, res) {
  const { newHostId } = req.body;
  if (!newHostId) {
    return res.status(400).json({ error: "newHostId is required" });
  }

  const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
  if (!room || room.closed) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (!isHost(room, req.user._id)) {
    return res.status(403).json({ error: "Only the current host can transfer ownership" });
  }

  const newHost = findParticipant(room, newHostId);
  if (!newHost) {
    return res.status(404).json({ error: "That user is not a participant in this room" });
  }

  const oldHost = findParticipant(room, room.hostId);
  if (oldHost) oldHost.role = "MODERATOR";
  newHost.role = "HOST";
  room.hostId = newHost.userId;
  await room.save();

  getIO()?.to(room.roomId).emit("host_transferred", {
    newHostId: newHost.userId.toString(),
    participants: room.toPublicState().participants,
  });

  return res.json({ room: room.toPublicState() });
}

// DELETE /api/rooms/:roomId
async function closeRoom(req, res) {
  const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });
  if (!room || room.closed) {
    return res.status(404).json({ error: "Room not found" });
  }
  if (!isHost(room, req.user._id)) {
    return res.status(403).json({ error: "Only the host can close the room" });
  }

  room.closed = true;
  await room.save();

  const io = getIO();
  io?.to(room.roomId).emit("room_closed", { roomId: room.roomId });
  io?.in(room.roomId).socketsLeave(room.roomId);

  return res.json({ success: true });
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  listParticipants,
  changeRole,
  removeParticipant,
  transferHost,
  closeRoom,
};
