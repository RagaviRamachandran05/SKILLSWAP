const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const ChatRoom = require("./models/ChatRoom");

const app = express();

// ✅ LIVE_USERS: userId (string) → WebSocket
const LIVE_USERS = new Map();

const JWT_SECRET = process.env.JWT_SECRET;
const VIDEOSDK_API_KEY = process.env.VIDEOSDK_API_KEY;
const VIDEOSDK_SECRET_KEY = process.env.VIDEOSDK_SECRET_KEY;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

// ─── Uploads Directory ───────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 Created uploads folder");
}

// ─── Multer Storage ──────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 11) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExts = /\.(jpeg|jpg|png|gif|pdf|doc|docx|zip|mp4|txt)$/i;
    // ✅ FIX: Check actual MIME types, not extension regex against mimetype string
    const allowedMimes = /^(image\/(jpeg|jpg|png|gif)|application\/(pdf|msword|zip|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|video\/mp4|text\/plain)$/i;

    const extOk = allowedExts.test(path.extname(file.originalname));
    const mimeOk = allowedMimes.test(file.mimetype);

    if (extOk && mimeOk) return cb(null, true);
    cb(new Error("Only images, PDFs, docs, zip, mp4, txt allowed"));
  },
});

// ─── Auth Middleware ─────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const header = req.header("Authorization");
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email || "",
      name: decoded.name || "User",
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://skillswap-ulpp.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(uploadsDir));

// ─── Helper: Check Participant ───────────────────────────────────────────────
async function isChatParticipant(chatId, userId) {
  const chatRoom = await ChatRoom.findById(chatId);
  if (!chatRoom) return { ok: false, status: 404, message: "Chat room not found" };

  const isParticipant = chatRoom.participants.some(
    (p) => p.toString() === userId.toString()
  );

  if (!isParticipant) {
    return { ok: false, status: 403, message: "You are not allowed in this chat" };
  }

  return { ok: true, chatRoom };
}

// ─── Helper: Broadcast to Chat Room ─────────────────────────────────────────
// ✅ FIX: Convert both sides to string for comparison (ObjectId vs string issue)
function broadcastToRoom(wss, chatId, payload) {
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

// ─── Routes ──────────────────────────────────────────────────────────────────
// NOTE: Upload route is handled in chatRouter — removed duplicate here
app.use("/api/requests", require("./routes/requestsRouter"));
app.use("/api/auth", require("./routes/authRouter"));
app.use("/api/skills", require("./routes/skillsRouter"));
app.use("/api/chat", require("./routes/chatRouter"));

// ─── MongoDB ─────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/skillswap")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ─── HTTP + WebSocket Server ──────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });
app.set("wss", wss);

console.log("✅ WebSocket attached to Express app");

// ─── WebSocket Handlers ───────────────────────────────────────────────────────
wss.on("connection", (ws, req) => {
  console.log(`🔌 WS Client connected. Total: ${wss.clients.size}`);

  ws.isAlive = true;

  // ✅ FIX: Proper ping/pong keepalive
  const pingInterval = setInterval(() => {
    if (!ws.isAlive) {
      console.log("💀 Terminating dead WS connection");
      clearInterval(pingInterval);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  }, 30000);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

 ws.on("message", async (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log("📨 WS event:", message.type);

    // ── Join Room ──────────────────────────────────────────────────────────
    if (message.type === "join") {
      if (!message.token) {
        return ws.send(JSON.stringify({ type: "error", message: "No token provided" }));
      }

      let decoded;
      try {
        decoded = jwt.verify(message.token, JWT_SECRET);
      } catch (e) {
        return ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
      }

      const userId = (decoded.id || decoded.userId).toString();

      if (LIVE_USERS.has(userId)) {
        const oldWs = LIVE_USERS.get(userId);
        oldWs._userId = null;
      }

      ws.userId = userId;
      ws.chatRoomId = message.chatRoomId;
      ws._userId = userId;

      LIVE_USERS.set(userId, ws);

      console.log(`✅ ${userId} joined room ${message.chatRoomId}`);
      console.log(`👥 LIVE USERS: ${LIVE_USERS.size}`);

      ws.send(JSON.stringify({ type: "joined", userId, chatRoomId: message.chatRoomId }));
      return;
    }

    // ── Send Text Message ──────────────────────────────────────────────────
    if (message.type === "send-message") {
      if (!message.token) {
        return ws.send(JSON.stringify({ type: "error", message: "No token provided" }));
      }

      let decoded;
      try {
        decoded = jwt.verify(message.token, JWT_SECRET);
      } catch (e) {
        return ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
      }

      const userId = (decoded.id || decoded.userId).toString();
      const chatRoomId = message.chatRoomId?.toString();
      const content = message.content?.trim();

      if (!chatRoomId || !content) {
        return ws.send(
          JSON.stringify({
            type: "error",
            message: "chatRoomId and content are required",
          })
        );
      }

      const check = await isChatParticipant(chatRoomId, userId);
      if (!check.ok) {
        return ws.send(
          JSON.stringify({
            type: "error",
            message: check.message,
          })
        );
      }

      const chatRoom = check.chatRoom;

      const newMessage = {
        sender: new mongoose.Types.ObjectId(userId),
        content,
        type: "text",
        createdAt: new Date(),
        timestamp: new Date().toISOString(),
        readBy: [new mongoose.Types.ObjectId(userId)],
      };

      chatRoom.messages.push(newMessage);
      await chatRoom.save();

      await chatRoom.populate("messages.sender", "name email");

      const savedMessage = chatRoom.messages[chatRoom.messages.length - 1];

      broadcastToRoom(wss, chatRoomId, {
        type: "new-message",
        chatRoomId,
        message: savedMessage,
      });

      return;
    }

    // ── Video Invite ───────────────────────────────────────────────────────
    if (message.type === "video-invite-request") {
      if (!VIDEOSDK_API_KEY || !VIDEOSDK_SECRET_KEY) {
        return ws.send(
          JSON.stringify({
            type: "video-invite-failed",
            message: "❌ VideoSDK env variables missing",
          })
        );
      }

      const receiverWs = LIVE_USERS.get(message.receiverId?.toString());

      if (!receiverWs || receiverWs.readyState !== WebSocket.OPEN) {
        return ws.send(
          JSON.stringify({
            type: "video-invite-failed",
            message: `❌ ${message.receiverName || "User"} is offline`,
            timestamp: nowIST(),
          })
        );
      }

      const meetingId = `skillswap-${message.chatRoomId}-${Date.now()}`.slice(0, 64);

      const payload = {
        apikey: VIDEOSDK_API_KEY,
        permissions: ["allow_join", "allow_mod"],
        roomId: meetingId,
        version: 2,
      };

      const token = jwt.sign(payload, VIDEOSDK_SECRET_KEY, {
        expiresIn: "120m",
        algorithm: "HS256",
      });

      const timestamp = nowIST();

      const inviteData = {
        type: "video-invite",
        chatRoomId: message.chatRoomId,
        senderId: message.senderId,
        senderName: message.senderName,
        receiverId: message.receiverId,
        meetingId,
        token,
        timestamp,
      };

      receiverWs.send(JSON.stringify(inviteData));

      ws.send(
        JSON.stringify({
          type: "video-invite-sent",
          message: `✅ Invite sent to ${message.receiverName} at ${timestamp}`,
          timestamp,
        })
      );

      return;
    }
  } catch (error) {
    console.error("❌ WS message error:", error.message);
    ws.send(JSON.stringify({ type: "error", message: "Failed to process message" }));
  }
});

  ws.on("close", () => {
    clearInterval(pingInterval);

    // ✅ FIX: Only delete from LIVE_USERS if this ws is still the active one
    const userId = ws._userId;
    if (userId && LIVE_USERS.get(userId) === ws) {
      LIVE_USERS.delete(userId);
      console.log(`❌ ${userId} went OFFLINE. LIVE: ${LIVE_USERS.size}`);
    }
  });

  ws.on("error", (err) => {
    console.error("❌ WS error:", err.message);
    clearInterval(pingInterval);
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nowIST() {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Default Route ────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "🚀 SkillSwap Pro API + WebSocket LIVE!",
    timestamp: new Date().toISOString(),
    websocket: `ws://localhost:${process.env.PORT || 5000}/ws`,
    status: "production-ready",
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 SkillSwap Pro FULLSTACK LIVE!`);
  console.log(`📡 REST API  : http://localhost:${PORT}`);
  console.log(`🌐 WebSocket : ws://localhost:${PORT}/ws`);
  console.log(`📎 File Upload: POST http://localhost:${PORT}/api/chat/upload`);
  console.log(`📁 Static Files: http://localhost:${PORT}/uploads/`);
  console.log(`✅ Messages + Files PERSIST ON REFRESH!\n`);
});