import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ApiKeys from "./pages/ApiKeys.jsx";
import SystemPrompt from "./pages/SystemPrompt.jsx";
import BotProfile from "./pages/BotProfile.jsx";
import Scheduler from "./pages/Scheduler.jsx";
import Sidebar from "./components/Sidebar.jsx";

// Axios defaults
const API = axios.create({
  baseURL: "https://discord-ai-bot-tvv7.onrender.com" || "/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      // window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export { API };

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("token"));

  const handleLogin = (token) => {
    localStorage.setItem("token", token);
    setAuthed(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setAuthed(false);
  };

  if (!authed) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={handleLogin} />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/system-prompt" element={<SystemPrompt />} />
          <Route path="/bot-profile" element={<BotProfile />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
