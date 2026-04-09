import { NavLink } from "react-router-dom";

export default function Sidebar({ onLogout }) {
  const links = [
    { to: "/", icon: "📊", label: "Dashboard" },
    { to: "/api-keys", icon: "🔑", label: "API Keys" },
    { to: "/system-prompt", icon: "💬", label: "System Prompt" },
    { to: "/bot-profile", icon: "🤖", label: "Bot Profile" },
    { to: "/scheduler", icon: "📅", label: "Scheduler" },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <span>🤖</span>
        <span>AI Bot Panel</span>
      </div>

      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <span>{link.icon}</span>
          <span>{link.label}</span>
        </NavLink>
      ))}

      <div className="sidebar-bottom">
        <button onClick={onLogout}>🚪 Logout</button>
      </div>
    </nav>
  );
}
