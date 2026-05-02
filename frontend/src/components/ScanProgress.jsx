import React, { useEffect, useRef } from "react";

/**
 * ScanProgress — live progress bar + log feed shown while scanning.
 */
export default function ScanProgress({ progress, progressLabel, statusMsg, logLines }) {
  const logRef = useRef(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  return (
    <div className="card p-5 mb-5 animate-fade-up">
      <div className="font-mono text-[10px] tracking-[.18em] uppercase mb-4"
        style={{ color: "#ff2d78" }}>// Scanning…</div>

      {/* Progress bar */}
      <div className="progress-track mb-2">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Progress meta */}
      <div className="flex justify-between font-mono text-[11px] mb-1" style={{ color: "#5a6a7e" }}>
        <span>{progressLabel || "Initialising…"}</span>
        <span>{progress}%</span>
      </div>

      {/* Status message */}
      <div className="font-mono text-[12px] mb-3" style={{ color: "#ff2d78" }}>
        ▶ {statusMsg}
      </div>

      {/* Radar animation */}
      <div className="flex items-center justify-center mb-3">
        <RadarPulse />
      </div>

      {/* Live log */}
      <div className="live-log" ref={logRef}>
        {logLines.map((line, i) => (
          <div key={i} className={`log-entry ${line.cls || "log-info"}`}>
            {line.text}
          </div>
        ))}
        {logLines.length === 0 && (
          <div className="log-entry log-info opacity-40">Waiting for results…</div>
        )}
      </div>
    </div>
  );
}

function RadarPulse() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" style={{ opacity: .6 }}>
      <circle cx="30" cy="30" r="28" stroke="rgba(255,45,120,.15)" strokeWidth="1" fill="none" />
      <circle cx="30" cy="30" r="20" stroke="rgba(255,45,120,.2)" strokeWidth="1" fill="none" />
      <circle cx="30" cy="30" r="12" stroke="rgba(255,45,120,.3)" strokeWidth="1" fill="none" />
      <circle cx="30" cy="30" r="3" fill="#ff2d78" />
      <line x1="30" y1="30" x2="54" y2="6" stroke="#ff2d78" strokeWidth="1.5" strokeLinecap="round"
        style={{ transformOrigin: "30px 30px", animation: "spin 2s linear infinite" }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
