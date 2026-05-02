import React from "react";

/**
 * StatsBar — 4-card summary row displayed after scan completes.
 */
export default function StatsBar({ stats, openCount }) {
  const cards = [
    { cls: "stat-open",   num: openCount,        label: "Open Ports",  color: "#ff2d78" },
    { cls: "stat-crit",   num: stats?.critical ?? 0, label: "Critical", color: "#ff3355" },
    { cls: "stat-high",   num: stats?.high ?? 0,     label: "High",     color: "#ff7433" },
    { cls: "stat-medium", num: stats?.medium ?? 0,   label: "Medium",   color: "#ffe033" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {cards.map((c) => (
        <div key={c.cls} className={`stat-card ${c.cls}`}>
          <div
            className="text-3xl font-extrabold leading-none mb-1"
            style={{ color: c.color, textShadow: `0 0 14px ${c.color}55` }}
          >
            {c.num}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#5a6a7e" }}>
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
