const Room = require("../models/Room");
const ActionRequest = require("../models/ActionRequest");
const ChatMessage = require("../models/ChatMessage");
const { extractYouTubeId } = require("../utils/youtube");

const {
  findParticipant,
  canControlPlayback,
  canManageParticipants,
  isHost,
} = require("../utils/permissions");

function err(socket, message) {
  socket.emit("error_message", { error: message });
}

// Check if user has permission to control playback
function userCanControl(room, userId) {
  if (isHost(room, userId)) return true;
  const participant = findParticipant(room, userId);
  if (!participant) return false;
  if (participant.role === "MODERATOR") return true;
  if (room.allowParticipantControl && participant.role === "PARTICIPANT") return true;
  return false;
}

// ============================================================
// REQUIRE ROOM (Robust check with payload fallback)
// ============================================================
async function requireRoom(socket, fallbackRoomId) {
  // 1. Check socket.data, or fallback to the roomId passed in the event payload
  let roomId = socket.data?.roomId || fallbackRoomId;

  // 2. If still not found, check socket rooms (excluding socket.id)
  if (!roomId && socket.rooms) {
    for (const r of socket.rooms) {
      if (r !== socket.id) {
        roomId = r;
        break;
      }
    }
  }

  if (!roomId) {
    socket.emit("error_message", { error: "You are not in a room" });
    return null;
  }

  const room = await Room.findOne({
    roomId: roomId.toUpperCase(),
    closed: false,
  });

  if (!room) {
    err(socket, "Room not found");
    return null;
  }

  // Heal socket session if it was lost on reconnect
  socket.data.roomId = room.roomId;
  socket.join(room.roomId);

  return room;
}

module.exports = function registerRoomHandlers(io, socket) {
  // ============================================================
  // JOIN ROOM
  // ============================================================
  socket.on("join_room", async ({ roomId }, ack) => {
    try {
      if (!roomId) {
        return err(socket, "roomId is required");
      }

      const room = await Room.findOne({
        roomId: roomId.toUpperCase(),
      });

      if (!room || room.closed) {
        return err(socket, "Room not found");
      }

      let participant = findParticipant(room, socket.user._id);

      if (!participant) {
        participant = {
          userId: socket.user._id,
          username: socket.user.username,
          role: "PARTICIPANT",
          socketId: socket.id,
          online: true,
          joinedAt: new Date(),
        };

        room.participants.push(participant);
      } else {
        participant.socketId = socket.id;
        participant.online = true;
        participant.username = socket.user.username;
      }

      await room.save();

      // Store room ID on socket
      socket.data.roomId = room.roomId;

      // Join Socket.IO room
      socket.join(room.roomId);

      // Send current room state to joining user
      socket.emit("sync_state", room.toPublicState());

      // Tell other users that someone joined
      socket.broadcast.to(room.roomId).emit("user_joined", {
        userId: socket.user._id.toString(),
        username: socket.user.username,
        role: findParticipant(room, socket.user._id).role,
        participants: room.toPublicState().participants,
      });

      if (typeof ack === "function") {
        ack({
          ok: true,
          room: room.toPublicState(),
        });
      }
    } catch (e) {
      console.error("join_room error:", e);

      if (typeof ack === "function") {
        ack({
          ok: false,
          error: "Failed to join room",
        });
      }

      err(socket, "Failed to join room");
    }
  });

  // ============================================================
  // LEAVE ROOM
  // ============================================================
  socket.on("leave_room", async () => {
    await handleLeave(io, socket);
  });

  socket.on("disconnect", async () => {
    await handleLeave(io, socket);
  });

  // ============================================================
  // UPDATE ROOM SETTINGS (HOST ONLY)
  // ============================================================
  socket.on("update_room_settings", async ({ roomId, allowParticipantControl }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    if (!isHost(room, socket.user._id)) {
      return err(socket, "Only the host can modify room settings");
    }

    room.allowParticipantControl = Boolean(allowParticipantControl);
    await room.save();

    io.to(room.roomId).emit("room_settings_updated", {
      allowParticipantControl: room.allowParticipantControl,
    });
  });

  // ============================================================
  // PLAY
  // ============================================================
  socket.on("play", async ({ currentTime, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    if (!userCanControl(room, socket.user._id)) {
      return err(socket, "You do not have permission to control playback");
    }

    room.playbackState = "playing";
    if (typeof currentTime === "number") {
      room.currentTime = currentTime;
    }
    await room.save();

    io.to(room.roomId).emit("play", {
      currentTime: room.currentTime,
      userId: socket.user._id.toString(),
    });
  });

  // ============================================================
  // PAUSE
  // ============================================================
  socket.on("pause", async ({ currentTime, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    if (!userCanControl(room, socket.user._id)) {
      return err(socket, "You do not have permission to control playback");
    }

    room.playbackState = "paused";
    if (typeof currentTime === "number") {
      room.currentTime = currentTime;
    }
    await room.save();

    io.to(room.roomId).emit("pause", {
      currentTime: room.currentTime,
      userId: socket.user._id.toString(),
    });
  });

  // ============================================================
  // SEEK
  // ============================================================
  socket.on("seek", async ({ time, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    if (!userCanControl(room, socket.user._id)) {
      return err(socket, "You do not have permission to control playback");
    }

    if (typeof time !== "number" || time < 0) {
      return err(socket, "Invalid seek time");
    }

    room.currentTime = time;
    await room.save();

    io.to(room.roomId).emit("seek", {
      time,
      userId: socket.user._id.toString(),
    });
  });

  // ============================================================
  // CHANGE VIDEO
  // ============================================================
  socket.on("change_video", async ({ videoUrl, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    if (!userCanControl(room, socket.user._id)) {
      return err(socket, "You do not have permission to change the video");
    }

    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      return err(socket, "That doesn't look like a valid YouTube URL");
    }

    room.currentVideoId = videoId;
    room.playbackState = "paused";
    room.currentTime = 0;
    await room.save();

    io.to(room.roomId).emit("change_video", {
      videoId,
      userId: socket.user._id.toString(),
    });
  });

  // ============================================================
  // ASSIGN ROLE
  // ============================================================
  socket.on("assign_role", async ({ userId, role, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    const validRoles = ["MODERATOR", "PARTICIPANT", "VIEWER"];

    if (!canManageParticipants(room, socket.user._id)) {
      return err(socket, "Only the host can assign roles");
    }

    if (!validRoles.includes(role)) {
      return err(socket, "Invalid role");
    }

    if (userId === room.hostId.toString()) {
      return err(socket, "Cannot change the host's role directly");
    }

    const target = findParticipant(room, userId);
    if (!target) {
      return err(socket, "Participant not found");
    }

    target.role = role;
    await room.save();

    io.to(room.roomId).emit("role_assigned", {
      userId: target.userId.toString(),
      role,
      participants: room.toPublicState().participants,
    });
  });

  // ============================================================
  // REMOVE PARTICIPANT
  // ============================================================
  socket.on("remove_participant", async ({ userId, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    if (!canManageParticipants(room, socket.user._id)) {
      return err(socket, "Only the host can remove participants");
    }

    if (userId === room.hostId.toString()) {
      return err(socket, "The host cannot remove themselves");
    }

    const target = findParticipant(room, userId);
    if (!target) {
      return err(socket, "Participant not found");
    }

    room.participants = room.participants.filter(
      (p) => p.userId.toString() !== userId
    );
    await room.save();

    io.to(room.roomId).emit("participant_removed", {
      userId,
      participants: room.toPublicState().participants,
    });

    if (target.socketId) {
      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.emit("you_were_removed", { roomId: room.roomId });
        targetSocket.leave(room.roomId);
        targetSocket.data.roomId = null;
      }
    }
  });

  // ============================================================
  // TRANSFER HOST
  // ============================================================
  socket.on("transfer_host", async ({ newHostId, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    if (!isHost(room, socket.user._id)) {
      return err(socket, "Only the current host can transfer ownership");
    }

    const newHost = findParticipant(room, newHostId);
    if (!newHost) {
      return err(socket, "That user is not in this room");
    }

    const oldHost = findParticipant(room, room.hostId);
    if (oldHost) {
      oldHost.role = "MODERATOR";
    }

    newHost.role = "HOST";
    room.hostId = newHost.userId;
    await room.save();

    io.to(room.roomId).emit("host_transferred", {
      newHostId: newHost.userId.toString(),
      participants: room.toPublicState().participants,
    });
  });

  // ============================================================
  // REQUEST ACTION
  // ============================================================
  socket.on("request_action", async ({ action, payload, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    const validActions = ["play", "pause", "seek", "change_video"];
    if (!validActions.includes(action)) {
      return err(socket, "Invalid requested action");
    }

    // Direct controllers do not need approval
    if (userCanControl(room, socket.user._id)) {
      return err(socket, "You already have playback permissions; act directly");
    }

    const request = await ActionRequest.create({
      roomId: room.roomId,
      requesterId: socket.user._id,
      requesterUsername: socket.user.username,
      action,
      payload: payload || {},
    });

    const approvers = room.participants.filter((p) =>
      ["HOST", "MODERATOR"].includes(p.role)
    );

    approvers.forEach((approver) => {
      if (approver.socketId) {
        io.to(approver.socketId).emit("incoming_request", request.toPublic());
      }
    });
  });

  // ============================================================
  // APPROVE REQUEST
  // ============================================================
  socket.on("approve_request", async ({ requestId, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    if (!canControlPlayback(room, socket.user._id)) {
      return err(socket, "You do not have permission to approve requests");
    }

    const request = await ActionRequest.findOne({
      _id: requestId,
      roomId: room.roomId,
      status: "pending",
    });

    if (!request) {
      return err(socket, "Request not found or already resolved");
    }

    request.status = "approved";
    request.resolvedBy = socket.user._id;
    await request.save();

    if (request.action === "play") {
      room.playbackState = "playing";
      if (typeof request.payload?.currentTime === "number") {
        room.currentTime = request.payload.currentTime;
      }
      await room.save();
      io.to(room.roomId).emit("play", { currentTime: room.currentTime });
    } else if (request.action === "pause") {
      room.playbackState = "paused";
      if (typeof request.payload?.currentTime === "number") {
        room.currentTime = request.payload.currentTime;
      }
      await room.save();
      io.to(room.roomId).emit("pause", { currentTime: room.currentTime });
    } else if (request.action === "seek") {
      if (typeof request.payload?.time === "number") {
        room.currentTime = request.payload.time;
        await room.save();
        io.to(room.roomId).emit("seek", { time: room.currentTime });
      }
    } else if (request.action === "change_video") {
      const videoId = extractYouTubeId(request.payload?.videoUrl);
      if (videoId) {
        room.currentVideoId = videoId;
        room.playbackState = "paused";
        room.currentTime = 0;
        await room.save();
        io.to(room.roomId).emit("change_video", { videoId });
      }
    }

    io.to(room.roomId).emit("request_resolved", request.toPublic());
  });

  // ============================================================
  // REJECT REQUEST
  // ============================================================
  socket.on("reject_request", async ({ requestId, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    if (!canControlPlayback(room, socket.user._id)) {
      return err(socket, "You do not have permission to reject requests");
    }

    const request = await ActionRequest.findOne({
      _id: requestId,
      roomId: room.roomId,
      status: "pending",
    });

    if (!request) {
      return err(socket, "Request not found or already resolved");
    }

    request.status = "rejected";
    request.resolvedBy = socket.user._id;
    await request.save();

    io.to(room.roomId).emit("request_resolved", request.toPublic());
  });

  // ============================================================
  // CHAT
  // ============================================================
  socket.on("chat_message", async ({ text, roomId }) => {
    const room = await requireRoom(socket, roomId);
    if (!room) return;

    const trimmed = (text || "").trim();
    if (!trimmed) return;

    if (trimmed.length > 500) {
      return err(socket, "Message too long");
    }

    const message = await ChatMessage.create({
      roomId: room.roomId,
      userId: socket.user._id,
      username: socket.user.username,
      text: trimmed,
    });

    io.to(room.roomId).emit("chat_message", message.toPublic());
  });
};

// ============================================================
// HANDLE LEAVE
// ============================================================
async function handleLeave(io, socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = await Room.findOne({ roomId });
  if (!room) {
    socket.data.roomId = null;
    return;
  }

  const participant = findParticipant(room, socket.user._id);

  if (participant) {
    participant.online = false;
    participant.socketId = null;
    await room.save();

    socket.broadcast.to(room.roomId).emit("user_left", {
      userId: socket.user._id.toString(),
      participants: room.toPublicState().participants,
    });
  }

  socket.leave(room.roomId);
  socket.data.roomId = null;
}