import React, { useState } from "react";

const PRESETS = [
  { label: "Top 1K",       value: "1-1024" },
  { label: "FTP/Telnet",   value: "21-23" },
  { label: "Web",          value: "80-443" },
  { label: "Quick 1-100",  value: "1-100" },
];

/**
 * ScanForm — takes target, port range, threads.
 * Calls onScan(target, ports, threads) on submit.
 */
export default function ScanForm({ onScan, onAbort, scanning }) {
  const [target,  setTarget]  = useState("");
  const [ports,   setPorts]   = useState("1-1024");
  const [threads, setThreads] = useState("150");
  const [err, setErr] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!target.trim()) { setErr("Please enter a target IP address or CIDR range."); return; }
    const portMatch = ports.match(/^(\d+)-(\d+)$/);
    if (!portMatch) { setErr("Port range must be in format start-end (e.g. 1-1024)."); return; }
    const [, s, en] = portMatch.map(Number);
    if (s < 1 || en > 65535 || s > en) { setErr("Port range must be 1–65535 with start ≤ end."); return; }
    if (en - s > 9999) { setErr("Maximum 10 000 ports per scan."); return; }

    onScan(target.trim(), ports.trim(), parseInt(threads));
  }

  return (
    <div className="card p-6 mb-5">
      {/* Section label */}
      <div className="font-mono text-[10px] tracking-[.18em] uppercase mb-5"
        style={{ color: "#ff2d78" }}>// Configure Scan</div>

      <form onSubmit={handleSubmit}>
        {/* Target */}
        <div className="mb-4">
          <label className="block font-mono text-[11px] uppercase tracking-widest mb-2"
            style={{ color: "#5a6a7e" }}>Target IP / CIDR Range</label>
          <input
            className="input-field"
            type="text"
            placeholder="e.g. 192.168.1.1  or  10.0.0.0/24"
            value={target}
            onChange={e => setTarget(e.target.value)}
            disabled={scanning}
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Port range */}
        <div className="mb-4">
          <label className="block font-mono text-[11px] uppercase tracking-widest mb-2"
            style={{ color: "#5a6a7e" }}>Port Range</label>
          <input
            className="input-field"
            type="text"
            value={ports}
            onChange={e => setPorts(e.target.value)}
            disabled={scanning}
            spellCheck="false"
          />
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PRESETS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPorts(p.value)}
                disabled={scanning}
                className="font-mono text-[11px] px-2.5 py-1 rounded-md transition-all duration-150"
                style={{
                  border: "1px solid #1a2332",
                  background: "transparent",
                  color: ports === p.value ? "#ff2d78" : "#5a6a7e",
                  borderColor: ports === p.value ? "rgba(255,45,120,.4)" : "#1a2332",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Threads */}
        <div className="mb-5">
          <label className="block font-mono text-[11px] uppercase tracking-widest mb-2"
            style={{ color: "#5a6a7e" }}>Thread Count</label>
          <select
            className="input-field"
            value={threads}
            onChange={e => setThreads(e.target.value)}
            disabled={scanning}
            style={{ cursor: "pointer" }}
          >
            <option value="50">50 — Careful (slow networks)</option>
            <option value="100">100 — Balanced</option>
            <option value="150">150 — Fast (default)</option>
            <option value="200">200 — Aggressive</option>
            <option value="300">300 — Maximum</option>
          </select>
        </div>

        {/* Error message */}
        {err && (
          <div className="mb-4 px-4 py-3 rounded-lg font-mono text-sm"
            style={{ background: "rgba(255,51,85,.08)", border: "1px solid rgba(255,51,85,.3)", color: "#ff3355" }}>
            ✕ {err}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="btn-scan flex-1"
            disabled={scanning}
          >
            {scanning ? (
              <span className="flex items-center justify-center gap-2">
                <SpinIcon /> Scanning…
              </span>
            ) : "⬡ Launch Scan"}
          </button>

          {scanning && (
            <button
              type="button"
              onClick={onAbort}
              className="font-mono text-sm px-4 rounded-lg transition-all"
              style={{ border: "1px solid rgba(255,51,85,.3)", color: "#ff3355", background: "transparent" }}
            >
              Abort
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function SpinIcon() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="15" />
    </svg>
  );
}
