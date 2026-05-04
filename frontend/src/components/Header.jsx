import React from "react";

/**
 * Header — animated top bar with logo and tagline.
 */
export default function Header() {
  return (
    <header className="relative z-10 text-center pt-12 pb-8">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(255,45,120,.12)",
            border: "1.5px solid rgba(255,45,120,.5)",
            boxShadow: "0 0 20px rgba(255,45,120,.3)",
          }}
        >
          {/* Radar icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill="#ff2d78" />
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
              stroke="#ff2d78" strokeWidth="1.2" fill="none" opacity=".35" />
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"
              stroke="#ff2d78" strokeWidth="1.2" fill="none" opacity=".6" />
            <line x1="12" y1="12" x2="20" y2="4"
              stroke="#ff2d78" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight font-sans">
          Port<span className="text-neon-pink">Scan</span>
          <span className="ml-2 text-sm font-mono text-muted align-top mt-2 inline-block
            border border-[#1a2332] rounded px-1.5 py-0.5 text-[10px] tracking-widest">
            PRO
          </span>
        </h1>
      </div>

      <p
        className="font-mono text-[11px] tracking-[.2em] uppercase"
        style={{ color: "#5a6a7e" }}
      >
        Network Security Scanner &amp; Insecure Protocol Detector
      </p>

      {/* Local badge */}
      <div className="mt-3 flex items-center justify-center">
        <span
          className="font-mono text-[10px] tracking-widest px-3 py-1 rounded-full"
          style={{
            background: "rgba(0,229,255,.06)",
            border: "1px solid rgba(0,229,255,.2)",
            color: "#00e5ff",
          }}
        >
          ⬡ Running locally — scans your own network
        </span>
      </div>

      {/* Animated scan line decoration */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="h-px w-16" style={{ background: "linear-gradient(90deg, transparent, rgba(255,45,120,.4))" }} />
        <span className="font-mono text-[10px] tracking-widest" style={{ color: "rgba(255,45,120,.5)" }}>
          ◈ READY
        </span>
        <div className="h-px w-16" style={{ background: "linear-gradient(90deg, rgba(255,45,120,.4), transparent)" }} />
      </div>
    </header>
  );
}
