import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { initDatabase } from "./database.js";
import { startBot } from "./bot/index.js";
import authRoutes from "./routes/auth.js";
import settingsRoutes from "./routes/settings.js";
import profileRoutes from "./routes/profile.js";
import schedulesRoutes from "./routes/schedules.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

// Auth middleware (skip login route)
function authMiddleware(req, res, next) {
  if (req.path.startsWith("/api/auth")) return next();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ย้าย
app.use("/api/auth", authRoutes);

app.use("/api", authMiddleware);

// ─── Routes ───
app.use("/api/settings", settingsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/schedules", schedulesRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ─── Start ───
initDatabase();
startBot();

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Serve frontend build in production
const frontendDist = join(__dirname, "../frontend/dist");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(join(frontendDist, "index.html"));
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Dashboard API running on http://localhost:${PORT}`);
});
