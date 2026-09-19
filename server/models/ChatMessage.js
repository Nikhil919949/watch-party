const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true }
);

chatMessageSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    roomId: this.roomId,
    userId: this.userId.toString(),
    username: this.username,
    text: this.text,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
