import { useState, useEffect } from "react";
import { API } from "../App.jsx";

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState({});
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    Promise.all([
      API.get("/profile").catch(() => ({ data: null })),
      API.get("/settings/settings").catch(() => ({ data: {} })),
      API.get("/schedules").catch(() => ({ data: [] })),
    ]).then(([p, s, sc]) => {

      console.log("Profile Data:", p.data);
      console.log("Settings Data:", s.data);
      console.log("Schedules Data:", sc.data); // <--- เช็กตัวนี้เป็นพิเศษ!
      
      setProfile(p.data);
      setSettings(s.data);
      setSchedules(sc.data);
    });
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>📊 Dashboard</h1>
        <p>ภาพรวมของ AI Bot</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Status</div>
          <div className="value" style={{ color: "#34d399" }}>
            {profile ? "Online" : "Offline"}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">AI Provider</div>
          <div className="value" style={{ fontSize: "1.25rem" }}>
            {settings.active_provider || "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Schedules</div>
          <div className="value">{schedules.filter((s) => s.is_active).length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Bot Name</div>
          <div className="value" style={{ fontSize: "1.25rem" }}>
            {profile?.username || "—"}
          </div>
        </div>
      </div>

      {profile && (
        <div className="card">
          <div className="card-title">Bot Info</div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <img
              src={profile.avatar}
              alt="avatar"
              style={{ width: 64, height: 64, borderRadius: "50%" }}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{profile.displayName || profile.username}</div>
              <div style={{ color: "#71717a", fontSize: "0.85rem" }}>ID: {profile.id}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
