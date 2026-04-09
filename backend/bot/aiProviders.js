import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import db from "../database.js";

// ─── Helper ───
function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row?.value || "";
}

function getApiKey(provider) {
  const row = db
    .prepare("SELECT * FROM api_keys WHERE provider = ? AND is_active = 1")
    .get(provider);
  return row;
}

function getConversationHistory(channelId, limit = 20) {
  const maxHistory = parseInt(getSetting("max_history")) || 20;
  const rows = db
    .prepare(
      `SELECT role, content FROM conversation_history 
       WHERE channel_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(channelId, Math.min(limit, maxHistory));
  return rows.reverse();
}

function saveMessage(guildId, channelId, userId, role, content) {
  db.prepare(
    `INSERT INTO conversation_history (guild_id, channel_id, user_id, role, content)
     VALUES (?, ?, ?, ?, ?)`
  ).run(guildId, channelId, userId, role, content);
}

// ─── Providers ───
async function callOpenAI(messages, config) {
  const client = new OpenAI({ apiKey: config.api_key });
  const response = await client.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages,
    max_tokens: 2048,
  });
  return response.choices[0].message.content;
}

async function callCustom(messages, config) {
  // 1. ตรวจสอบก่อนว่ามีค่า base_url มาจริงไหม
  const finalBaseUrl = config.base_url || "https://api.devdove.site/v1"; 
  // ^^^ ใส่ URL ของ Proxy คุณลงไปตรงๆ เป็นค่า Default แทนของ OpenAI

  console.log("🚀 กำลังส่งไปที่ URL:", finalBaseUrl);

  const client = new OpenAI({ 
    apiKey: config.api_key,
    baseURL: finalBaseUrl, // บังคับใช้ตัวแปรที่เราประกาศไว้ด้านบน
    defaultHeaders: {
  "Content-Type": "application/json",
  "Accept": "application/json, */*",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
    }
  });

  const response = await client.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: messages,
  });

  return response.choices[0].message.content;
}

async function callAnthropic(messages, config) {
  const client = new Anthropic({ apiKey: config.api_key });
  // Anthropic uses system separately
  const systemMsg = messages.find((m) => m.role === "system")?.content || "";
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const response = await client.messages.create({
    model: config.model || "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemMsg,
    messages: chatMessages,
  });
  return response.content[0].text;
}

async function callGemini(messages, config) {
  const genAI = new GoogleGenerativeAI(config.api_key);
  const model = genAI.getGenerativeModel({
    model: config.model || "gemini-1.5-flash",
  });

  const systemMsg = messages.find((m) => m.role === "system")?.content || "";
  const chatMessages = messages.filter((m) => m.role !== "system");

  const history = chatMessages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history,
    systemInstruction: systemMsg || undefined,
  });

  const lastMsg = chatMessages[chatMessages.length - 1];
  const result = await chat.sendMessage(lastMsg.content);
  return result.response.text();
}

const providers = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
  custom: callCustom,
};

// ─── Main Export ───
export async function getAIResponse(
  guildId,
  channelId,
  userId,
  userMessage
) {
  const activeProvider = getSetting("active_provider") || "openai";
  const config = getApiKey(activeProvider);

  if (!config) {
    return `❌ ไม่พบ API Key สำหรับ **${activeProvider}** กรุณาตั้งค่าใน Dashboard`;
  }

  const providerFn = providers[activeProvider];
  if (!providerFn) {
    return `❌ Provider **${activeProvider}** ไม่รองรับ`;
  }

  // Save user message
  saveMessage(guildId, channelId, userId, "user", userMessage);

  // Build messages array
  const systemPrompt = getSetting("system_prompt");
  const history = getConversationHistory(channelId);
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
  ];

  try {
    const reply = await providerFn(messages, config);

    // Save assistant reply
    saveMessage(guildId, channelId, "bot", "assistant", reply);

    return reply;
  } catch (err) {
    console.error(`AI Error (${activeProvider}):`, err.message);
    return `❌ เกิดข้อผิดพลาดจาก ${activeProvider}: ${err.message}`;
  }
}

export function clearHistory(channelId) {
  db.prepare("DELETE FROM conversation_history WHERE channel_id = ?").run(
    channelId
  );
}
