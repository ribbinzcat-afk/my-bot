import { Router } from "express";
import { getClient } from "../bot/index.js";
import db from "../database.js";
import multer from "multer";
import { readFileSync } from "fs";

const router = Router();
const upload = multer({ dest: "uploads/", limits: { fileSize: 8_000_000 } });

// Get current bot profile
router.get("/", (req, res) => {
  const client = getClient();
  if (!client?.user) {
    return res.status(503).json({ error: "Bot not connected" });
  }

  const bio =
    db.prepare("SELECT value FROM settings WHERE key = 'bot_bio'").get()
      ?.value || "";

  res.json({
    username: client.user.username,
    displayName: client.user.displayName,
    avatar: client.user.displayAvatarURL({ size: 256 }),
    bio,
    id: client.user.id,
  });
});

// Update bot username
router.put("/username", async (req, res) => {
  const client = getClient();
  if (!client?.user) return res.status(503).json({ error: "Bot not connected" });

  try {
    await client.user.setUsername(req.body.username);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update bot avatar
router.put("/avatar", upload.single("avatar"), async (req, res) => {
  const client = getClient();
  if (!client?.user) return res.status(503).json({ error: "Bot not connected" });

  try {
    const buffer = readFileSync(req.file.path);
    await client.user.setAvatar(buffer);
    res.json({ success: true, avatar: client.user.displayAvatarURL({ size: 256 }) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update bot bio (stored in DB — Discord bots can't set "About Me" via API)
router.put("/bio", (req, res) => {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    "bot_bio",
    req.body.bio
  );
  res.json({ success: true });
});

export default router;
