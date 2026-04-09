import { useState, useEffect } from "react";
import { API } from "../App.jsx";

const PROVIDERS = [
  {
    value: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    icon: "🟢",
    type: "native",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-sonnet-4-20250514",
    icon: "🟠",
    type: "native",
  },
  {
    value: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-1.5-flash",
    icon: "🔵",
    type: "native",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    defaultModel: "openai/gpt-4o-mini",
    defaultUrl: "https://openrouter.ai/api/v1",
    icon: "🌐",
    type: "proxy",
  },
  {
    value: "together",
    label: "Together AI",
    defaultModel: "meta-llama/Llama-3-70b-chat-hf",
    defaultUrl: "https://api.together.xyz/v1",
    icon: "🤝",
    type: "proxy",
  },
  {
    value: "groq",
    label: "Groq",
    defaultModel: "llama-3.1-70b-versatile",
    defaultUrl: "https://api.groq.com/openai/v1",
    icon: "⚡",
    type: "proxy",
  },
  {
    value: "local",
    label: "Local (LM Studio / Ollama)",
    defaultModel: "default",
    defaultUrl: "http://localhost:1234/v1",
    icon: "🖥️",
    type: "proxy",
  },
  {
    value: "custom",
    label: "Custom Reverse Proxy",
    defaultModel: "",
    defaultUrl: "",
    icon: "🔧",
    type: "proxy",
  },
];

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({
    provider: "openai",
    api_key: "",
    model: "",
    base_url: "",
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const load = () => {
    API.get("/settings/api-keys").then((r) => setKeys(r.data));
    API.get("/settings/settings").then((r) => setSettings(r.data));
  };

  useEffect(load, []);

  const selectedProvider = PROVIDERS.find((p) => p.value === form.provider);
  const isProxy = selectedProvider?.type === "proxy";

  // Auto-fill defaults when provider changes
  const handleProviderChange = (providerValue) => {
    const provider = PROVIDERS.find((p) => p.value === providerValue);
    setForm({
      provider: providerValue,
      api_key: "",
      model: "",
      base_url: provider?.defaultUrl || "",
    });
    setTestResult(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    const model = form.model || selectedProvider?.defaultModel || "";
    const base_url = form.base_url || selectedProvider?.defaultUrl || "";

    // Validate reverse proxy
    if (isProxy && form.provider === "custom" && !base_url) {
      setError("❌ Custom provider ต้องระบุ Base URL");
      return;
    }

    try {
      await API.post("/settings/api-keys", {
        provider: form.provider,
        api_key: form.api_key,
        model,
        base_url,
      });
      setForm({ provider: "openai", api_key: "", model: "", base_url: "" });
      setMsg("✅ บันทึกเรียบร้อย!");
      setTestResult(null);
      load();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const model = form.model || selectedProvider?.defaultModel || "gpt-4o-mini";
      const base_url = form.base_url || selectedProvider?.defaultUrl || "";

      const { data } = await API.post("/settings/api-keys/test", {
        provider: form.provider,
        api_key: form.api_key,
        model,
        base_url,
      });

      setTestResult({ success: true, message: data.message });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.error || "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSetActive = async (provider) => {
    await API.put("/settings/settings/active_provider", { value: provider });
    setMsg(`✅ เปลี่ยน provider เป็น ${provider}`);
    load();
    setTimeout(() => setMsg(""), 3000);
  };

  const handleDelete = async (provider) => {
    if (!confirm(`ลบ API Key ของ ${provider}?`)) return;
    await API.delete(`/settings/api-keys/${provider}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>🔑 API Keys</h1>
        <p>จัดการ API Key — รองรับทั้ง Native API และ Reverse Proxy</p>
      </div>

      {msg && <div className="success-msg">{msg}</div>}
      {error && <div className="error-msg">{error}</div>}

      {/* ─── Add/Update Form ─── */}
      <div className="card">
        <div className="card-title">เพิ่ม / อัพเดต API Provider</div>
        <form onSubmit={handleSave}>
          {/* Provider Selection as Cards */}
          <div className="form-group">
            <label>Provider</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleProviderChange(p.value)}
                  style={{
                    padding: "0.75rem",
                    background:
                      form.provider === p.value ? "#8b5cf6" : "#0f0f14",
                    border: `1px solid ${form.provider === p.value ? "#8b5cf6" : "#3f3f46"}`,
                    borderRadius: "8px",
                    color: form.provider === p.value ? "white" : "#a1a1aa",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: "1.2rem" }}>{p.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>
                    {p.type === "proxy" ? "Reverse Proxy" : "Native API"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="form-group">
            <label>
              API Key
              {form.provider === "local" && (
                <span style={{ color: "#71717a", fontWeight: 400 }}>
                  {" "}(ไม่จำเป็นสำหรับ local — ใส่ dummy ก็ได้)
                </span>
              )}
            </label>
            <input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              placeholder={form.provider === "local" ? "not-needed" : "sk-..."}
              required
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isProxy ? "1fr 1fr" : "1fr",
              gap: "1rem",
            }}
          >
            {/* Base URL — show for proxy providers */}
            {isProxy && (
              <div className="form-group">
                <label>
                  Base URL
                  <span style={{ color: "#8b5cf6", fontWeight: 400 }}> *Reverse Proxy</span>
                </label>
                <input
                  type="url"
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  placeholder={selectedProvider?.defaultUrl || "https://your-proxy.com/v1"}
                  required={form.provider === "custom"}
                />
                {selectedProvider?.defaultUrl && (
                  <small style={{ color: "#71717a", fontSize: "0.75rem" }}>
                    Default: {selectedProvider.defaultUrl}
                  </small>
                )}
              </div>
            )}

            {/* Model */}
            <div className="form-group">
              <label>Model</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder={selectedProvider?.defaultModel || "model-name"}
              />
              {selectedProvider?.defaultModel && (
                <small style={{ color: "#71717a", fontSize: "0.75rem" }}>
                  Default: {selectedProvider.defaultModel}
                </small>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="btn-group">
            <button className="btn btn-primary" type="submit">
              💾 Save
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={handleTest}
              disabled={!form.api_key || testing}
            >
              {testing ? "⏳ Testing..." : "🧪 Test Connection"}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={testResult.success ? "success-msg" : "error-msg"}
              style={{ marginTop: "1rem" }}
            >
              {testResult.message}
            </div>
          )}
        </form>
      </div>

      {/* ─── Saved Keys Table ─── */}
      <div className="card">
        <div className="card-title">API Keys ที่บันทึกไว้</div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Type</th>
                <th>API Key</th>
                <th>Model</th>
                <th>Base URL</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const providerInfo = PROVIDERS.find((p) => p.value === k.provider);
                return (
                  <tr key={k.provider}>
                    <td style={{ fontWeight: 600 }}>
                      {providerInfo?.icon || "🔧"} {providerInfo?.label || k.provider}
                    </td>
                    <td>
                      <span
                        className={`badge ${providerInfo?.type === "proxy" ? "badge-blue" : "badge-green"}`}
                      >
                        {providerInfo?.type === "proxy" ? "Proxy" : "Native"}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>{k.api_key}</code>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>{k.model || "default"}</td>
                    <td style={{ fontSize: "0.8rem", color: "#71717a", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {k.base_url || "—"}
                    </td>
                    <td>
                      {settings.active_provider === k.provider ? (
                        <span className="badge badge-green">✓ Active</span>
                      ) : (
                        <span className="badge badge-red">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="btn-group" style={{ margin: 0 }}>
                        {settings.active_provider !== k.provider && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleSetActive(k.provider)}
                          >
                            Activate
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(k.provider)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "#71717a" }}>
                    ยังไม่มี API Key — เพิ่มข้างบนเลย!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Guide Card ─── */}
      <div className="card" style={{ borderColor: "#3b3b5c" }}>
        <div className="card-title">📚 Reverse Proxy Guide</div>
        <div style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "#a1a1aa" }}>
          <p style={{ marginBottom: "0.75rem" }}>
            Reverse Proxy ให้คุณเข้าถึง AI models จากหลายผู้ให้บริการผ่าน API endpoint เดียว
            ส่วนใหญ่ใช้ <strong>OpenAI-compatible format</strong> ทำให้ใช้ร่วมกันได้:
          </p>
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Base URL</th>
                <th>Models ตัวอย่าง</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>⚡ Groq</td>
                <td><code>https://api.groq.com/openai/v1</code></td>
                <td>llama-3.1-70b-versatile, mixtral-8x7b</td>
              </tr>
              <tr>
                <td>🌐 OpenRouter</td>
                <td><code>https://openrouter.ai/api/v1</code></td>
                <td>openai/gpt-4o, anthropic/claude-3.5-sonnet</td>
              </tr>
              <tr>
                <td>🤝 Together</td>
                <td><code>https://api.together.xyz/v1</code></td>
                <td>meta-llama/Llama-3-70b-chat-hf</td>
              </tr>
              <tr>
                <td>🖥️ LM Studio</td>
                <td><code>http://localhost:1234/v1</code></td>
                <td>(ขึ้นกับ model ที่โหลด)</td>
              </tr>
              <tr>
                <td>🦙 Ollama</td>
                <td><code>http://localhost:11434/v1</code></td>
                <td>llama3, mistral, codellama</td>
              </tr>
              <tr>
                <td>🔧 Custom</td>
                <td>URL ของคุณเอง</td>
                <td>ใช้ได้กับทุก OpenAI-compatible API</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
