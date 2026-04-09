import { useState, useEffect } from "react";
import { API } from "../App.jsx";

export default function SystemPrompt() {
  const [prompt, setPrompt] = useState("");
  const [maxHistory, setMaxHistory] = useState("20");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    API.get("/settings/settings").then((r) => {
      setPrompt(r.data.system_prompt || "");
      setMaxHistory(r.data.max_history || "20");
    });
  }, []);

  const handleSave = async () => {
    await API.put("/settings/settings/system_prompt", { value: prompt });
    await API.put("/settings/settings/max_history", { value: maxHistory });
    setMsg("✅ บันทึก System Prompt เรียบร้อย!");
    setTimeout(() => setMsg(""), 3000);
  };

  const presets = [
    {
      name: "🤖 General Assistant",
      prompt: "You are a helpful AI assistant. Be friendly and concise. Respond in the same language the user uses.",
    },
    {
      name: "🎮 Gaming Buddy",
      prompt: "You are a fun gaming buddy in a Discord server. Use gaming slang, be enthusiastic, and help with game-related questions. Use emojis frequently.",
    },
    {
      name: "📚 Study Helper",
      prompt: "You are a patient tutor. Explain concepts step-by-step, use examples, and encourage learning. Always respond in the same language as the question.",
    },
    {
      name: "🇹🇭 Thai Assistant",
      prompt: "คุณเป็นผู้ช่วย AI ที่พูดภาษาไทย ตอบอย่างเป็นมิตร กระชับ และช่วยเหลือเต็มที่ ใช้ภาษาไทยเสมอ",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>💬 System Prompt</h1>
        <p>กำหนดบุคลิกและพฤติกรรมของ AI Bot</p>
      </div>

      {msg && <div className="success-msg">{msg}</div>}

      <div className="card">
        <div className="card-title">Presets</div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {presets.map((p) => (
            <button
              key={p.name}
              className="btn btn-outline btn-sm"
              onClick={() => setPrompt(p.prompt)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">System Prompt</div>
        <div className="form-group">
          <label>Prompt (คำสั่งที่กำหนดพฤติกรรม AI)</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            placeholder="You are a helpful AI assistant..."
          />
        </div>

        <div className="form-group">
          <label>Max Conversation History (จำนวนข้อความที่เก็บไว้ต่อแชนเนล)</label>
          <input
            type="number"
            value={maxHistory}
            onChange={(e) => setMaxHistory(e.target.value)}
            min="1"
            max="100"
          />
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          💾 Save Changes
        </button>
      </div>
    </div>
  );
}
