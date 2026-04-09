import { useState, useEffect } from "react";
import { API } from "../App.jsx";

export default function Scheduler() {
  const [schedules, setSchedules] = useState([]);
  const [guilds, setGuilds] = useState([]);
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    guild_id: "",
    channel_id: "",
    title: "",
    description: "",
    color: "#5865F2",
    is_recurring: false,
    cron_expression: "",
    recurring_type: "daily",
    recurring_time: "09:00",
    scheduled_at: new Date().toISOString(),
    once_date: new Date().toISOString().split('T')[0], // ค่าเริ่มต้นเป็นวันนี้
    once_time: "12:00",
    footer: "",
    thumbnail: "",
    image: "",
    fields: [],
  });

  const load = () => {
    API.get("/schedules").then((r) => setSchedules(r.data));
    API.get("/schedules/channels").then((r) => setGuilds(r.data));
  };

  useEffect(load, []);

  // สำหรับ One-time: รวมวันที่และเวลาเข้าด้วยกัน
  useEffect(() => {
    if (!form.is_recurring) {
      const combinedDate = new Date(`${form.once_date}T${form.once_time}`);
      setForm(prev => ({ ...prev, scheduled_at: combinedDate.toISOString() }));
    }
  }, [form.once_date, form.once_time, form.is_recurring]);

  const selectedGuild = guilds.find((g) => g.id === form.guild_id);

  const addField = () => {
    setForm({
      ...form,
      fields: [...form.fields, { name: "", value: "", inline: false }],
    });
  };

  const updateField = (index, key, value) => {
    const fields = [...form.fields];
    fields[index][key] = value;
    setForm({ ...form, fields });
  };

  const removeField = (index) => {
    setForm({ ...form, fields: form.fields.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await API.post("/schedules", form);
    setMsg("✅ สร้าง Schedule เรียบร้อย!");
    setShowForm(false);
    setForm({
      guild_id: "",
      channel_id: "",
      title: "",
      description: "",
      color: "#5865F2",
      is_recurring: false,
      cron_expression: "",
      scheduled_at: "",
      footer: "",
      thumbnail: "",
      image: "",
      fields: [],
    });
    load();
    setTimeout(() => setMsg(""), 3000);
  };

  const handleDelete = async (id) => {
    if (!confirm("ลบ Schedule นี้?")) return;
    await API.delete(`/schedules/${id}`);
    load();
  };

  const toggleActive = async (schedule) => {
    await API.put(`/schedules/${schedule.id}`, {
      ...schedule,
      fields: JSON.parse(schedule.fields || "[]"),
      is_active: !schedule.is_active,
    });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>📅 Scheduler</h1>
        <p>ตั้งเวลาส่ง Embed อัตโนมัติ</p>
      </div>

      {msg && <div className="success-msg">{msg}</div>}

      <div style={{ marginBottom: "1.5rem" }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "➕ New Schedule"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">สร้าง Schedule ใหม่</div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Server</label>
                <select
                  value={form.guild_id}
                  onChange={(e) => setForm({ ...form, guild_id: e.target.value, channel_id: "" })}
                  required
                >
                  <option value="">เลือก Server</option>
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Channel</label>
                <select
                  value={form.channel_id}
                  onChange={(e) => setForm({ ...form, channel_id: e.target.value })}
                  required
                >
                  <option value="">เลือก Channel</option>
                  {selectedGuild?.channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Embed Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="📢 ประกาศสำคัญ"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="รายละเอียด..."
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  style={{ height: 40 }}
                />
              </div>
              <div className="form-group">
                <label>Footer</label>
                <input
                  type="text"
                  value={form.footer}
                  onChange={(e) => setForm({ ...form, footer: e.target.value })}
                  placeholder="Footer text"
                />
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Fields */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "#a1a1aa" }}>
                Embed Fields
              </label>
              {form.fields.map((field, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={field.name}
                    onChange={(e) => updateField(i, "name", e.target.value)}
                    style={{ flex: 1, padding: "0.5rem", background: "#0f0f14", border: "1px solid #3f3f46", borderRadius: 6, color: "#e4e4e7" }}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={field.value}
                    onChange={(e) => updateField(i, "value", e.target.value)}
                    style={{ flex: 1, padding: "0.5rem", background: "#0f0f14", border: "1px solid #3f3f46", borderRadius: 6, color: "#e4e4e7" }}
                  />
                  <label style={{ fontSize: "0.75rem", color: "#a1a1aa", whiteSpace: "nowrap" }}>
                    <input
                      type="checkbox"
                      checked={field.inline}
                      onChange={(e) => updateField(i, "inline", e.target.checked)}
                    /> Inline
                  </label>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeField(i)}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-outline btn-sm" onClick={addField} style={{ marginTop: "0.5rem" }}>
                + Add Field
              </button>
            </div>

{/* Schedule Type Group */}
<div className="form-group" style={{ background: "#18181b", padding: "1rem", borderRadius: "8px", border: "1px solid #27272a" }}>
  <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "1rem" }}>
    <input
      type="checkbox"
      checked={form.is_recurring}
      onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
      style={{ marginRight: "0.75rem", width: "18px", height: "18px" }}
    />
    <span style={{ fontWeight: 600 }}>ตั้งเวลาแบบทำซ้ำ (Recurring)</span>
  </label>

  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
    {form.is_recurring ? (
      // --- แบบทำซ้ำ (Recurring) ---
      <>
        <div>
          <label style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>ทำซ้ำทุกๆ</label>
          <select
            value={form.recurring_type}
            onChange={(e) => setForm({ ...form, recurring_type: e.target.value })}
          >
            <option value="daily">ทุกวัน (Daily)</option>
            <option value="weekly">ทุกสัปดาห์ (วันจันทร์)</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>ในเวลา</label>
          <input
            type="time"
            value={form.recurring_time}
            onChange={(e) => setForm({ ...form, recurring_time: e.target.value })}
          />
        </div>
      </>
    ) : (
      // --- แบบครั้งเดียว (One-time) เปลี่ยนเป็น Dropdown ---
      <>
        <div>
          <label style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>เลือกวันที่ส่ง</label>
          <select
            value={form.once_date}
            onChange={(e) => setForm({ ...form, once_date: e.target.value })}
          >
            <option value={new Date().toISOString().split('T')[0]}>วันนี้</option>
            <option value={new Date(Date.now() + 86400000).toISOString().split('T')[0]}>พรุ่งนี้</option>
            {[...Array(5)].map((_, i) => {
              const d = new Date(Date.now() + (i + 2) * 86400000);
              const dateStr = d.toISOString().split('T')[0];
              return <option key={dateStr} value={dateStr}>{d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' })}</option>
            })}
            {/* คุณสามารถเพิ่ม input date ปกติไว้เป็นทางเลือกสุดท้ายได้ถ้าต้องการ */}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>เวลาที่ส่ง</label>
          <input
            type="time"
            value={form.once_time}
            onChange={(e) => setForm({ ...form, once_time: e.target.value })}
          />
        </div>
      </>
    )}
  </div>
  
  <div style={{ marginTop: "0.75rem", textAlign: "right" }}>
    <small style={{ color: "#5865F2", fontStyle: "italic" }}>
      🔔 กำหนดส่ง: {form.is_recurring ? `Cron [${form.cron_expression}]` : new Date(form.scheduled_at).toLocaleString('th-TH')}
    </small>
  </div>
</div>

            <button className="btn btn-primary" type="submit">📅 Create Schedule</button>

            {/* Preview */}
            {form.title && (
              <div className="embed-preview" style={{ borderLeftColor: form.color }}>
                <div className="embed-title">{form.title}</div>
                {form.description && <div className="embed-desc">{form.description}</div>}
                {form.fields.map((f, i) => (
                  <div key={i} className="embed-field" style={{ display: f.inline ? "inline-block" : "block", width: f.inline ? "33%" : "100%" }}>
                    <div className="embed-field-name">{f.name}</div>
                    <div className="embed-field-value">{f.value}</div>
                  </div>
                ))}
                {form.footer && <div className="embed-footer">{form.footer}</div>}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Schedule List */}
      <div className="card">
        <div className="card-title">Schedules ({schedules.length})</div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.title}</td>
                  <td>
                    <span className={`badge ${s.is_recurring ? "badge-blue" : "badge-green"}`}>
                      {s.is_recurring ? "Recurring" : "One-time"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>
                    {s.is_recurring
                      ? s.cron_expression
                      : new Date(s.scheduled_at).toLocaleString("th-TH")}
                  </td>
                  <td>
                    <span className={`badge ${s.is_active ? "badge-green" : "badge-red"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="btn-group" style={{ margin: 0 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => toggleActive(s)}
                      >
                        {s.is_active ? "Pause" : "Resume"}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(s.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#71717a" }}>
                    ยังไม่มี Schedule
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
