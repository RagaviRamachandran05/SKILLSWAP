const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Request = require("../models/Request");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

const auth = (req, res, next) => {
  const header = req.header("Authorization");
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/profile/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("name email avatar bio createdAt rating isTrainer");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const totalSwaps = await Request.countDocuments({
      status: "accepted",
      $or: [{ fromUser: userId }, { toUser: userId }],
    });

    const skillsTaught = await Request.countDocuments({
      fromUser: userId,
      status: "accepted",
    });

    const skillsLearned = await Request.countDocuments({
      toUser: userId,
      status: "accepted",
    });

    res.json({
      ...user.toObject(),
      totalSwaps,
      skillsTaught,
      skillsLearned,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/update-profile", auth, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const updates = {};

    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (typeof bio === "string") updates.bio = bio.trim();
    if (typeof avatar === "string") updates.avatar = avatar.trim();

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;