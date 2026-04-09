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

// เพิ่มส่วนนี้ลงไปเพื่อรองรับปุ่ม Test
router.post("/api-keys/test", async (req, res) => {
  const { provider, api_key, model, base_url } = req.body;

  if (!api_key) {
    return res.status(400).json({ error: "ต้องระบุ API Key เพื่อทดสอบ" });
  }

  try {
    // เลือก URL ที่จะยิงไปทดสอบ (ถ้ามี base_url ให้ใช้ตัวนั้น ถ้าไม่มีให้ใช้ของ OpenAI เป็นค่าเริ่มต้น)
    const targetUrl = base_url || "https://api.openai.com/v1/chat/completions";

    // จำลองการยิงทดสอบไปยัง AI Provider (ยิงแค่สั้นๆ เพื่อเช็คสิทธิ์)
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "gpt-3.5-turbo", // หรือโมเดลพื้นฐานอื่นๆ
        messages: [{ role: "user", content: "say hi" }],
        max_tokens: 5,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      res.json({ success: true, message: `✅ เชื่อมต่อ ${provider} สำเร็จ!` });
    } else {
      // ถ้า API ตอบกลับมาว่า Error (เช่น Key ผิด)
      res.status(response.status).json({ 
        error: data.error?.message || "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบ Key หรือ URL" 
      });
    }
  } catch (err) {
    // ถ้าเซิร์ฟเวอร์ยิงไปหา URL ไม่ได้เลย (เช่น URL ผิด หรือไม่มีเน็ต)
    res.status(500).json({ error: "ไม่สามารถเชื่อมต่อกับ Provider ได้: " + err.message });
  }
});

export default router;
