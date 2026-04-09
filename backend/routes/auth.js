import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();

// Simple admin auth
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // 1. ลอง Console log ดูใน Render Logs
  console.log("Login Attempt:", { username, password });
  console.log("ENV Expected:", { 
    u: process.env.ADMIN_USERNAME, 
    p: process.env.ADMIN_PASSWORD 
  });

  // 2. ตรวจสอบว่าค่า Env มีตัวตนไหม
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
     return res.status(500).json({ error: "Server missing Env variables" });
  }

  if (
    username === "admin" &&
    password === "gam31tara10aum2543"
  ) {
    const token = jwt.sign({ username, role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ token, username });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

router.get("/verify", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, username: decoded.username });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
