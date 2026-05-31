const express = require("express");
const jwt = require("jsonwebtoken");
const Request = require("../models/Request");
const ChatRoom = require("../models/ChatRoom");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

const auth = (req, res, next) => {
  const header = req.header("Authorization");
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).json({ error: "Invalid token" });
  }
};

router.post("/", auth, async (req, res) => {
  try {
    const { fromUserId, toUserId, fromSkillId, toSkillId } = req.body;

    if (!fromUserId || !toUserId || !fromSkillId || !toSkillId) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({
        message: "You cannot send a request to yourself",
      });
    }

    const existingRequest = await Request.findOne({
      fromUser: fromUserId,
      toUser: toUserId,
      fromSkill: fromSkillId,
      toSkill: toSkillId,
    });

    if (existingRequest) {
      return res.status(409).json({
        message: "Request already exists",
      });
    }

    const request = new Request({
      fromUser: fromUserId,
      toUser: toUserId,
      fromSkill: fromSkillId,
      toSkill: toSkillId,
    });

    await request.save();

    const populated = await Request.findById(request._id)
      .populate("fromUser", "name email avatar")
      .populate("toUser", "name email avatar")
      .populate("fromSkill", "title description level")
      .populate("toSkill", "title description level");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const sentRequests = await Request.find({ fromUser: req.user.id })
      .populate("toUser", "name email avatar")
      .populate("fromSkill", "title description level")
      .populate("toSkill", "title description level")
      .sort({ createdAt: -1 });

    const receivedRequests = await Request.find({ toUser: req.user.id })
      .populate("fromUser", "name email avatar")
      .populate("fromSkill", "title description level")
      .populate("toSkill", "title description level")
      .sort({ createdAt: -1 });

    res.json({ sentRequests, receivedRequests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id/status", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await Request.findById(id).populate("fromUser toUser");
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.toUser._id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only receiver can update" });
    }

    request.status = status;
    await request.save();

    let chatRoomId = null;

    if (status === "accepted") {
      const existingChat = await ChatRoom.findOne({
        requestId: request._id,
      });

      if (!existingChat) {
        const chatRoom = new ChatRoom({
          participants: [request.fromUser._id, request.toUser._id],
          requestId: request._id,
          fromUser: request.fromUser._id,
          toUser: request.toUser._id,
          messages: [],
        });

        await chatRoom.save();
        chatRoomId = chatRoom._id;
      } else {
        chatRoomId = existingChat._id;
      }
    }

    res.json({
      success: true,
      message: `Request ${status}!`,
      chatRoomId,
      status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/active-chats", auth, async (req, res) => {
  try {
    const activeChats = await Request.find({
      $or: [
        { fromUser: req.user.id, status: "accepted" },
        { toUser: req.user.id, status: "accepted" },
      ],
    })
      .populate("fromUser toUser fromSkill toSkill")
      .sort({ updatedAt: -1 });

    res.json({ activeChats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;