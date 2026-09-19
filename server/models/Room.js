const mongoose = require("mongoose");

const ROLES = ["HOST", "MODERATOR", "PARTICIPANT", "VIEWER"];

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "PARTICIPANT" },
    socketId: { type: String, default: null },
    online: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    currentVideoId: { type: String, default: null },
    playbackState: { type: String, enum: ["playing", "paused"], default: "paused" },
    currentTime: { type: Number, default: 0 },
    allowParticipantControl: { type: Boolean, default: false },
    participants: { type: [participantSchema], default: [] },
    closed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roomSchema.methods.toPublicState = function () {
  return {
    roomId: this.roomId,
    hostId: this.hostId.toString(),
    currentVideoId: this.currentVideoId,
    playbackState: this.playbackState,
    currentTime: this.currentTime,
    allowParticipantControl: this.allowParticipantControl ?? false,
    participants: this.participants.map((p) => ({
      userId: p.userId.toString(),
      username: p.username,
      role: p.role,
      online: p.online,
    })),
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("Room", roomSchema);
module.exports.ROLES = ROLES;
