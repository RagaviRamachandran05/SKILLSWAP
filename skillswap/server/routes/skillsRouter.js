const express = require("express");
const jwt = require("jsonwebtoken");
const Skill = require("../models/Skill");

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

router.get("/public", async (req, res) => {
  try {
    const { search, page = 1, limit = 12 } = req.query;
    const query = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const skills = await Skill.find(query)
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const skills = await Skill.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const skill = new Skill({
      ...req.body,
      userId: req.user.id,
    });

    await skill.save();
    res.status(201).json(skill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/smart-match", auth, async (req, res) => {
  try {
    const mySkills = await Skill.find({ userId: req.user.id });

    const skillTitles = mySkills.map((s) => s.title);

    if (!skillTitles.length) {
      return res.json([]);
    }

    const matches = await Skill.find({
      userId: { $ne: req.user.id },
      title: { $in: skillTitles },
    })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const skill = await Skill.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    res.json(skill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const skill = await Skill.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    res.json({ message: "Skill deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;