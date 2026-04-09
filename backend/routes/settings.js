import { Router } from "express";
import db from "../database.js";

const router = Router();

// Get all API keys (masked)
router.get("/api-keys", (req, res) => {
  const keys = db.prepare("SELECT * FROM api_keys").all();
  const masked = keys.map((k) => ({
    ...k,
    api_key: k.api_key.substring(0, 8) + "..." + k.api_key.slice(-4),
  }));
  res.json(masked);
});

// Upsert API key
router.post("/api-keys", (req, res) => {
  const { provider, api_key, model } = req.body;
  if (!provider || !api_key) {
    return res.status(400).json({ error: "Provider and API key required" });
  }

  db.prepare(
    `INSERT INTO api_keys (provider, api_key, model) 
     VALUES (?, ?, ?)
     ON CONFLICT(provider) DO UPDATE SET 
       api_key = excluded.api_key, 
       model = excluded.model,
       updated_at = CURRENT_TIMESTAMP`
  ).run(provider, api_key, model || "");

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

// Test API Key
router.post("/api-keys/test", async (req, res) => {
  const { provider, api_key, model, base_url } = req.body;

  if (!api_key) {
    return res.status(400).json({ error: "API key is required" });
  }

  try {
    // 🛠️ Logic สำหรับจัดการ Base URL (สำหรับ Reverse Proxy)
    // 1. ตัดช่องว่างออก
    let finalBaseUrl = base_url?.trim(); 
    
    // 2. ถ้าไม่มีการระบุมา ให้ใช้ Default ของ OpenAI
    if (!finalBaseUrl) {
      finalBaseUrl = 'https://api.openai.com/v1';
    }

    // 3. ปรับแต่ง URL: ตัด / ตัวสุดท้ายออก (ถ้ามี) เพื่อไม่ให้ Path ซ้ำซ้อนตอนต่อ String
    finalBaseUrl = finalBaseUrl.replace(/\/+$/, "");

    // 🚀 เริ่มการทดสอบเชื่อมต่อ
    // หมายเหตุ: ส่วนใหญ่ Reverse Proxy จะใช้โครงสร้างเดียวกับ OpenAI (/models หรือ /chat/completions)
    const testEndpoint = `${finalBaseUrl}/models`;

    console.log(`Testing connection to: ${testEndpoint}`); // ดูใน Render Log ว่ายิงไปถูกที่ไหม

    const response = await fetch(testEndpoint, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Proxy Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    res.json({ 
      success: true, 
      message: `Successfully connected to ${provider} via Proxy!`,
      details: `Found ${data.data?.length || 0} models available.` 
    });

  } catch (error) {
    console.error("Test API Error:", error.message);
    res.status(500).json({ 
      error: error.message || "Failed to connect through reverse proxy" 
    });
  }
});

export default router;
