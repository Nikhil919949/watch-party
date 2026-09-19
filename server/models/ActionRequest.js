const mongoose = require("mongoose");

const actionRequestSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requesterUsername: { type: String, required: true },
    action: {
      type: String,
      enum: ["play", "pause", "seek", "change_video"],
      required: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

actionRequestSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    roomId: this.roomId,
    requesterId: this.requesterId.toString(),
    requesterUsername: this.requesterUsername,
    action: this.action,
    payload: this.payload,
    status: this.status,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("ActionRequest", actionRequestSchema);
