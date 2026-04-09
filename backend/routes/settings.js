import { Router } from "express";
import db from "../database.js";

const router = Router();

// Get all API keys (masked)
router.get("/api-keys", (req, res) => {
  const keys = db.prepare("SELECT * FROM api_keys").all();
  const masked = keys.map((k) => ({
    ...k,
    // ยังคงซ่อน API Key ไว้เหมือนเดิม
    api_key: k.api_key.substring(0, 8) + "..." + k.api_key.slice(-4),
    // base_url ส่งกลับไปตรงๆ ได้เลยเพื่อให้ Dashboard แสดงผลได้
    base_url: k.base_url || "" 
  }));
  res.json(masked);
});

// Upsert API key
  router.post("/api-keys", (req, res) => {
  // 1. รับ base_url เพิ่มจาก req.body
  const { provider, api_key, model, base_url } = req.body; 
  
  if (!provider || !api_key) {
    return res.status(400).json({ error: "Provider and API key required" });
  }

// 2. ปรับคำสั่ง SQL ให้ INSERT และ UPDATE ค่า base_url ด้วย
  db.prepare(
    `INSERT INTO api_keys (provider, api_key, model, base_url) 
     VALUES (?, ?, ?, ?)
     ON CONFLICT(provider) DO UPDATE SET 
       api_key = excluded.api_key, 
       model = excluded.model,
       base_url = excluded.base_url, -- เพิ่มบรรทัดนี้
       updated_at = CURRENT_TIMESTAMP`
  ).run(provider, api_key, model || "", base_url || ""); // ส่งค่า base_url เข้าไป
    
  res.json({ success: true });
});

// Delete API key
router.delete("/api-keys/:provider", (req, res) => {
  db.prepare("DELETE FROM api_keys WHERE provider = ?").run(req.params.provider);
  res.json({ success: true });
});

// Toggle API key active status
router.patch("/api-keys/:provider/toggle", (req, res) => {
  db.prepare(
    "UPDATE api_keys SET is_active = NOT is_active WHERE provider = ?"
  ).run(req.params.provider);
  res.json({ success: true });
});

// Get settings
router.get("/settings", (req, res) => {
  const rows = db.prepare("SELECT * FROM settings").all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
});

// Update setting
router.put("/settings/:key", (req, res) => {
  const { value } = req.body;
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
  ).run(req.params.key, value);
  res.json({ success: true });
});

export default router;
