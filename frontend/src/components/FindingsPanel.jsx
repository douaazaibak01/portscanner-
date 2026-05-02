import React, { useState } from "react";

const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/**
 * FindingsPanel — security risk findings, sorted by severity.
 */
export default function FindingsPanel({ findings }) {
  const [expanded, setExpanded] = useState(null);

  if (findings.length === 0) {
    return (
      <div className="card p-6 mb-5 text-center">
        <div className="font-mono text-[10px] tracking-[.18em] uppercase mb-4 text-left"
          style={{ color: "#5a6a7e" }}>// Security Findings</div>
        <div className="py-6">
          <div className="text-4xl mb-2">✓</div>
          <div className="font-bold text-[#00ff88] mb-1">No Insecure Protocols Detected</div>
          <div className="font-mono text-xs" style={{ color: "#5a6a7e" }}>
            All scanned ports passed security review.
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...findings].sort(
    (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)
  );

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono text-[10px] tracking-[.18em] uppercase"
          style={{ color: "#ff2d78" }}>// Security Findings</div>
        <span
          className="font-mono text-[11px] px-2 py-0.5 rounded"
          style={{ background: "rgba(255,45,120,.08)", border: "1px solid rgba(255,45,120,.2)", color: "#ff2d78" }}
        >
          {findings.length} {findings.length === 1 ? "issue" : "issues"}
        </span>
      </div>

      <div className="space-y-2">
        {sorted.map((f, i) => (
          <FindingCard
            key={i}
            f={f}
            open={expanded === i}
            onToggle={() => setExpanded(expanded === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}

function FindingCard({ f, open, onToggle }) {
  const scoreColor =
    f.severity === "CRITICAL" ? "#ff3355" :
    f.severity === "HIGH"     ? "#ff7433" :
    f.severity === "MEDIUM"   ? "#ffe033" : "#00ff88";

  return (
    <div className="finding-card cursor-pointer" onClick={onToggle}>
      <div className="flex items-start gap-3">
        {/* Severity badge */}
        <div className="flex-shrink-0 pt-0.5">
          <span className={`badge-${f.severity} font-mono text-[11px] font-bold px-2 py-0.5 rounded`}>
            {f.severity}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-[13px]">{f.name}</span>
            <span className="font-mono text-[11px]" style={{ color: "#ff2d78" }}>:{f.port}</span>
            {f.host && (
              <span className="font-mono text-[10px]" style={{ color: "#5a6a7e" }}>{f.host}</span>
            )}
          </div>
          <div className="font-mono text-[12px] leading-relaxed" style={{ color: "#5a6a7e" }}>
            {f.reason}
          </div>

          {open && (
            <div className="mt-2 space-y-1 animate-fade-up">
              <div className="font-mono text-[12px]" style={{ color: "#00ff88" }}>
                → {f.replace}
              </div>
              {f.banner && (
                <div className="font-mono text-[11px] break-all" style={{ color: "#5a6a7e" }}>
                  Banner: {f.banner.substring(0, 100)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Risk score */}
        <div className="flex-shrink-0 text-right">
          <div className="font-mono font-bold text-xl leading-none"
            style={{ color: scoreColor, textShadow: `0 0 10px ${scoreColor}55` }}>
            {f.risk}
          </div>
          <div className="font-mono text-[10px]" style={{ color: "#5a6a7e" }}>/10</div>
        </div>

        {/* Expand arrow */}
        <div className="flex-shrink-0 mt-0.5" style={{ color: "#5a6a7e" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
            <path d="M6 8L1 3h10L6 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
