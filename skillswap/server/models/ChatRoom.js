const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "file"],
      default: "text",
    },
    content: {
      type: String,
      default: "",
      trim: true,
    },
    filename: {
      type: String,
      default: "",
    },
    filesize: {
      type: String,
      default: "",
    },
    fileUrl: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const chatRoomSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
      validate: {
        validator: function (value) {
          return value.length === 2;
        },
        message: "Chat room must contain exactly 2 participants",
      },
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    messages: [messageSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastMessage: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatRoom", chatRoomSchema);