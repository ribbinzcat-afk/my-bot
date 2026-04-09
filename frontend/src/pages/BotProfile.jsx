import { useState, useEffect } from "react";
import { API } from "../App.jsx";

export default function BotProfile() {
  const [profile, setProfile] = useState(null);
  const [newName, setNewName] = useState("");
  const [bio, setBio] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    API.get("/profile").then((r) => {
      setProfile(r.data);
      setNewName(r.data.username);
      setBio(r.data.bio);
    });
  };

  useEffect(load, []);

  const handleNameChange = async () => {
    setError("");
    try {
      await API.put("/profile/username", { username: newName });
      setMsg("✅ เปลี่ยนชื่อบอทเรียบร้อย!");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change name");
    }
    setTimeout(() => { setMsg(""); setError(""); }, 4000);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const { data } = await API.put("/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMsg("✅ เปลี่ยนรูปโปรไฟล์เรียบร้อย!");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change avatar");
    }
    setTimeout(() => { setMsg(""); setError(""); }, 4000);
  };

  const handleBioSave = async () => {
    await API.put("/profile/bio", { bio });
    setMsg("✅ บันทึก Bio เรียบร้อย!");
    setTimeout(() => setMsg(""), 3000);
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>🤖 Bot Profile</h1>
        <p>แก้ไขโปรไฟล์ของบอท</p>
      </div>

      {msg && <div className="success-msg">{msg}</div>}
      {error && <div className="error-msg">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div className="card">
          <div className="card-title">Avatar</div>
          <div style={{ textAlign: "center" }}>
            <img
              src={profile.avatar}
              alt="bot avatar"
              style={{ width: 128, height: 128, borderRadius: "50%", marginBottom: "1rem" }}
            />
            <div>
              <label className="btn btn-outline" style={{ cursor: "pointer" }}>
                📷 Change Avatar
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Bot Info</div>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <small style={{ color: "#71717a", fontSize: "0.75rem" }}>
              ⚠️ Discord จำกัดการเปลี่ยนชื่อ 2 ครั้ง/ชม.
            </small>
          </div>
          <button className="btn btn-primary" onClick={handleNameChange}>
            Save Name
          </button>

          <div className="form-group" style={{ marginTop: "1.5rem" }}>
            <label>Bio / About</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="บอกเล่าเกี่ยวกับบอทของคุณ..."
            />
            <small style={{ color: "#71717a", fontSize: "0.75rem" }}>
              ℹ️ Bio จะเก็บไว้ใน Dashboard (Discord Bot API ไม่รองรับ About Me)
            </small>
          </div>
          <button className="btn btn-primary" onClick={handleBioSave}>
            Save Bio
          </button>
        </div>
      </div>
    </div>
  );
}
