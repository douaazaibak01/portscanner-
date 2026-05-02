import React, { useState } from "react";

const API = process.env.REACT_APP_API_URL || "";

export default function AuthPanel({ onLogin }) {
  const [mode, setMode]       = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]           = useState("");
  const [info, setInfo]         = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(""); setInfo("");
    if (!username.trim() || !password.trim()) {
      setErr("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "register") {
        const res = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Registration failed.");
        setInfo("Account created! You can now log in.");
        setMode("login");
      } else {
        const res = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Login failed.");
        onLogin(data.access_token, username.trim());
      }
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 mb-5">
      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {["login", "register"].map(m => (
          <button key={m} onClick={() => { setMode(m); setErr(""); setInfo(""); }}
            className="font-mono text-[11px] uppercase tracking-widest px-4 py-2 rounded-lg transition-all"
            style={{
              background: mode === m ? "rgba(255,45,120,.12)" : "transparent",
              border: `1px solid ${mode === m ? "rgba(255,45,120,.4)" : "#1a2332"}`,
              color: mode === m ? "#ff2d78" : "#5a6a7e",
            }}>
            {m === "login" ? "Log In" : "Register"}
          </button>
        ))}
      </div>

      <div className="font-mono text-[10px] tracking-[.18em] uppercase mb-5"
        style={{ color: "#ff2d78" }}>
        // {mode === "login" ? "Sign in to your account" : "Create a new account"}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block font-mono text-[11px] uppercase tracking-widest mb-2"
            style={{ color: "#5a6a7e" }}>Username</label>
          <input className="input-field" type="text" autoComplete="username"
            placeholder="your_username" value={username}
            onChange={e => setUsername(e.target.value)} disabled={loading} />
        </div>
        <div className="mb-5">
          <label className="block font-mono text-[11px] uppercase tracking-widest mb-2"
            style={{ color: "#5a6a7e" }}>Password</label>
          <input className="input-field" type="password" autoComplete="current-password"
            placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)} disabled={loading} />
          {mode === "register" && (
            <p className="font-mono text-[10px] mt-1" style={{ color: "#3a4a5e" }}>
              Minimum 6 characters.
            </p>
          )}
        </div>

        {err && (
          <div className="mb-4 px-4 py-3 rounded-lg font-mono text-sm"
            style={{ background: "rgba(255,51,85,.08)", border: "1px solid rgba(255,51,85,.3)", color: "#ff3355" }}>
            ✕ {err}
          </div>
        )}
        {info && (
          <div className="mb-4 px-4 py-3 rounded-lg font-mono text-sm"
            style={{ background: "rgba(0,255,136,.06)", border: "1px solid rgba(0,255,136,.2)", color: "#00ff88" }}>
            ✓ {info}
          </div>
        )}

        <button type="submit" className="btn-scan w-full" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
        </button>
      </form>

      <p className="font-mono text-[10px] text-center mt-5" style={{ color: "#3a4a5e" }}>
        PortScan Pro is for authorized network testing only.
      </p>
    </div>
  );
}
