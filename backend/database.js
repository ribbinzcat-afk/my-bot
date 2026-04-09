import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- ปรับปรุงส่วนการเลือก Path ของ Database ---
let dbPath;

if (process.env.RENDER) {
  // เมื่อรันบน Render ให้ใช้ Disk ก้อนนอกที่ Mount ไว้ที่ /data
  dbPath = "/data/bot.db";
  
  // ตรวจสอบเผื่อโฟลเดอร์ /data ยังไม่ถูกสร้าง (Render มักจะจัดการให้แต่เช็คไว้ชัวร์กว่า)
  if (!fs.existsSync("/data")) {
    fs.mkdirSync("/data", { recursive: true });
  }
} else {
  // เมื่อรันในเครื่องตัวเอง (Local) ให้เก็บไว้ในโฟลเดอร์เดิม (backend/bot.db)
  dbPath = join(__dirname, "bot.db");
}

const db = new Database(dbPath);
// ------------------------------------------

ragmapragma("journal_mode = WAL");

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL UNIQUE,
      api_key TEXT NOT NULL,
      model TEXT DEFAULT '',
      base_url TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      color TEXT DEFAULT '#5865F2',
      cron_expression TEXT,
      scheduled_at DATETIME,
      is_recurring INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      fields TEXT DEFAULT '[]',
      footer TEXT DEFAULT '',
      thumbnail TEXT DEFAULT '',
      image TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_conversation_channel 
      ON conversation_history(channel_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_active 
      ON scheduled_messages(is_active);
  `);

  // Migration: add base_url column if not exists
  try {
    db.exec(`ALTER TABLE api_keys ADD COLUMN base_url TEXT DEFAULT ''`);
    console.log("✅ Migrated: added base_url column");
  } catch {
    // Column already exists — ignore
  }

  // Set defaults
  const defaults = {
    system_prompt:
      "You are a helpful AI assistant in a Discord server. Be friendly, concise, and helpful. Respond in the same language the user is using.",
    active_provider: "openai",
    bot_name: "AI Assistant",
    bot_bio: "Your friendly AI assistant",
    max_history: "20",
  };

  const upsert = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  for (const [key, value] of Object.entries(defaults)) {
    upsert.run(key, value);
  }

  console.log("✅ Database initialized");
}

export default db;
