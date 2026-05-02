import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import ScanForm from "./components/ScanForm";
import ScanProgress from "./components/ScanProgress";
import StatsBar from "./components/StatsBar";
import FindingsPanel from "./components/FindingsPanel";
import PortsTable from "./components/PortsTable";
import ProtocolRef from "./components/ProtocolRef";
import AuthPanel from "./components/AuthPanel";
import { useScan } from "./hooks/useScan";
import { usePdf } from "./hooks/usePdf";

export default function App() {
  const [token, setToken]   = useState(() => localStorage.getItem("ps_token") || "");
  const [user, setUser]     = useState(() => localStorage.getItem("ps_user")  || "");

  const { state, startScan, abortScan } = useScan(token);
  const { generatePdf } = usePdf();
  const [lastParams, setLastParams] = useState({ target: "", ports: "" });

  function handleLogin(tok, username) {
    localStorage.setItem("ps_token", tok);
    localStorage.setItem("ps_user",  username);
    setToken(tok);
    setUser(username);
  }

  function handleLogout() {
    localStorage.removeItem("ps_token");
    localStorage.removeItem("ps_user");
    setToken("");
    setUser("");
  }

  function handleScan(target, ports, timeout, threads, declaredOwner) {
    setLastParams({ target, ports });
    startScan(target, ports, timeout, threads, declaredOwner);
  }

  function handleDownloadPdf() {
    generatePdf(lastParams.target, lastParams.ports,
      state.openPorts, state.findings, state.stats, state.elapsed ?? "?");
  }

  const scanning = state.phase === "scanning";
  const done     = state.phase === "done";
  const hasError = state.phase === "error";

  // Not logged in — show auth screen
  if (!token) {
    return (
      <div className="grid-bg radial-pink min-h-screen">
        <div className="max-w-3xl mx-auto px-4 pb-16">
          <Header />
          <AuthPanel onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid-bg radial-pink min-h-screen">
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <Header />

        {/* ── Logged-in bar ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="font-mono text-[11px]" style={{ color: "#5a6a7e" }}>
            Logged in as <span style={{ color: "#ff2d78" }}>{user}</span>
          </span>
          <button
            onClick={handleLogout}
            className="font-mono text-[11px] px-3 py-1 rounded-md transition-all"
            style={{ border: "1px solid #1a2332", color: "#5a6a7e", background: "transparent" }}
          >
            Log out
          </button>
        </div>

        <ScanForm onScan={handleScan} onAbort={abortScan} scanning={scanning} />

        {hasError && (
          <div className="rounded-xl px-5 py-4 mb-5 font-mono text-sm animate-fade-up"
            style={{ background: "rgba(255,51,85,.07)", border: "1px solid rgba(255,51,85,.3)", color: "#ff3355" }}>
            ✕ {state.error}
          </div>
        )}

        {scanning && (
          <ScanProgress progress={state.progress} progressLabel={state.progressLabel}
            statusMsg={state.statusMsg} logLines={state.logLines} />
        )}

        {done && (
          <>
            <StatsBar stats={state.stats} openCount={state.openPorts.length} />
            <div className="flex items-center justify-between mb-5">
              <div className="font-mono text-[11px]" style={{ color: "#5a6a7e" }}>
                ✓ Scan completed in <span style={{ color: "#ff2d78" }}>{state.elapsed}s</span>
                {" · "}{state.openPorts.length} ports open
              </div>
              <button className="btn-pdf" onClick={handleDownloadPdf}>
                ↓ Download PDF Report
              </button>
            </div>
            <FindingsPanel findings={state.findings} />
            <PortsTable ports={state.openPorts} />
          </>
        )}

        <ProtocolRef />
        <footer className="text-center font-mono text-[11px] pb-4" style={{ color: "#3a4a5e" }}>
          PortScan Pro v3.0 — For authorized use only
        </footer>
      </div>
    </div>
  );
}
