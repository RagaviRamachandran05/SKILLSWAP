const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

const ChatRoom = require("../models/ChatRoom");
const Request = require("../models/Request");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const header = req.header("Authorization");
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id || decoded.userId,
      name: decoded.name || "User",
      email: decoded.email || "",
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ─── Multer Setup ─────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 10) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExts = /\.(jpeg|jpg|png|gif|pdf|doc|docx|zip|mp4|txt)$/i;
    // ✅ FIX: Proper MIME type check
    const allowedMimes = /^(image\/(jpeg|jpg|png|gif)|application\/(pdf|msword|zip|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|video\/mp4|text\/plain)$/i;

    const extOk = allowedExts.test(path.extname(file.originalname));
    const mimeOk = allowedMimes.test(file.mimetype);

    if (extOk && mimeOk) return cb(null, true);
    cb(new Error("Only images, PDFs, docs, zip, mp4, txt allowed"));
  },
});

// ─── Helper: Broadcast to Chat Room ──────────────────────────────────────────
// ✅ FIX: String comparison to avoid ObjectId vs string mismatch
function broadcastToRoom(wss, chatId, payload) {
  if (!wss) return;
  const chatIdStr = chatId.toString();
  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.chatRoomId &&
      client.chatRoomId.toString() === chatIdStr
    ) {
      client.send(JSON.stringify(payload));
    }
  });
}

// ─── GET /api/chat/request/:requestId ────────────────────────────────────────
// Load or create a chat room from an accepted request
router.get("/request/:requestId", auth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const isParticipant =
      request.fromUser.toString() === req.user.id.toString() ||
      request.toUser.toString() === req.user.id.toString();

    if (!isParticipant) {
      return res.status(403).json({ error: "You are not allowed in this chat" });
    }

    if (request.status !== "accepted") {
      return res.status(403).json({ error: "Chat is only available for accepted requests" });
    }

    let chat = await ChatRoom.findOne({ requestId })
      .populate("participants", "name email avatar")
      .populate("messages.sender", "name avatar");

    if (!chat) {
      chat = await ChatRoom.create({
        requestId: request._id,
        fromUser: request.fromUser,
        toUser: request.toUser,
        participants: [request.fromUser, request.toUser],
        messages: [],
        lastMessage: "",
      });

      chat = await ChatRoom.findById(chat._id)
        .populate("participants", "name email avatar")
        .populate("messages.sender", "name avatar");
    }

    res.json(chat);
  } catch (error) {
    console.error("Chat load error:", error.message);
    res.status(500).json({ error: "Failed to load chat" });
  }
});

// ─── GET /api/chat/:chatId ────────────────────────────────────────────────────
// Refresh / reload a chat room by its ID
router.get("/:chatId", auth, async (req, res) => {
  try {
    const chat = await ChatRoom.findById(req.params.chatId)
      .populate("participants", "name email avatar")
      .populate("messages.sender", "name avatar");

    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const isParticipant = chat.participants.some(
      (p) => p._id.toString() === req.user.id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: "You are not allowed in this chat" });
    }

    res.json(chat);
  } catch (error) {
    console.error("Refresh error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/chat/messages ──────────────────────────────────────────────────
// Send a text message
router.post("/messages", auth, async (req, res) => {
  try {
    const { content, chatId } = req.body;

    if (!chatId || !content || !content.trim()) {
      return res.status(400).json({ error: "chatId and content are required" });
    }

    const chat = await ChatRoom.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user.id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: "You are not allowed in this chat" });
    }

    const message = {
      sender: req.user.id,
      senderName: req.user.name,
      content: content.trim(),
      type: "text",
      read: false,
    };

    chat.messages.push(message);
    chat.lastMessage = content.trim();
    await chat.save();

    // ✅ FIX: Use broadcastToRoom with string comparison
    const wss = req.app.get("wss");
    broadcastToRoom(wss, chatId, {
      type: "new-message",
      chatId: chatId.toString(),
      message,
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error("Message error:", error.message);
    res.status(500).json({ error: "Message send failed" });
  }
});

// ─── POST /api/chat/upload ────────────────────────────────────────────────────
// Upload a file and broadcast to room
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) return res.status(400).json({ error: "chatId is required" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const chat = await ChatRoom.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user.id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: "You are not allowed in this chat" });
    }

    const message = {
      sender: req.user.id,
      senderName: req.user.name,
      type: "file",
      filename: req.file.originalname,
      filesize: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
      fileUrl: `/uploads/${req.file.filename}`,
      read: false,
    };

    chat.messages.push(message);
    chat.lastMessage = `📎 ${req.file.originalname}`;
    await chat.save();

    // ✅ FIX: Use broadcastToRoom with string comparison
    const wss = req.app.get("wss");
    broadcastToRoom(wss, chatId, {
      type: "new-file",
      chatId: chatId.toString(),
      message,
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
});

// ─── POST /api/chat/start-video-lesson ───────────────────────────────────────
// Generate a VideoSDK token for a lesson
router.post("/start-video-lesson", auth, async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) return res.status(400).json({ error: "chatId required" });

    if (!process.env.VIDEOSDK_API_KEY || !process.env.VIDEOSDK_SECRET_KEY) {
      return res.status(500).json({ error: "VideoSDK env variables missing" });
    }

    const chat = await ChatRoom.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user.id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: "You are not allowed in this chat" });
    }

    // ✅ FIX: Unique meetingId with timestamp to avoid stale room clashes
    const meetingId = `skillswap-${chatId}-${Date.now()}`.slice(0, 64);

    const payload = {
      apikey: process.env.VIDEOSDK_API_KEY,
      permissions: ["allow_join", "allow_mod"],
      roomId: meetingId,
      version: 2,
    };

    const token = jwt.sign(payload, process.env.VIDEOSDK_SECRET_KEY, {
      expiresIn: "120m",
      algorithm: "HS256",
    });

    res.json({ success: true, meetingId, token });
  } catch (error) {
    console.error("Video token error:", error.message);
    res.status(500).json({ error: "Video token generation failed" });
  }
});

module.exports = router;