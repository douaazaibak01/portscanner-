/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        // Core palette — deep black backgrounds + pink/magenta neon
        void:    "#050709",
        surface: "#0a0d12",
        panel:   "#0f1419",
        border:  "#1a2332",
        pink: {
          neon:  "#ff2d78",
          glow:  "#ff006e",
          soft:  "#ff6ba8",
          dim:   "#cc2060",
        },
        cyan: {
          neon:  "#00e5ff",
          soft:  "#67eeff",
        },
        red:  { neon: "#ff3355" },
        orange: { neon: "#ff7433" },
        yellow: { neon: "#ffe033" },
        green: { neon: "#00ff88" },
        muted: "#5a6a7e",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Syne'", "sans-serif"],
      },
      boxShadow: {
        "pink-glow":  "0 0 20px rgba(255,45,120,.4)",
        "pink-glow-sm": "0 0 10px rgba(255,45,120,.3)",
        "cyan-glow":  "0 0 20px rgba(0,229,255,.3)",
        "green-glow": "0 0 16px rgba(0,255,136,.3)",
        "red-glow":   "0 0 16px rgba(255,51,85,.35)",
      },
      animation: {
        "pulse-pink":  "pulse-pink 2s cubic-bezier(.4,0,.6,1) infinite",
        "scan-line":   "scan-line 2s ease-in-out infinite",
        "fade-up":     "fade-up .3s ease forwards",
        "spin-slow":   "spin 3s linear infinite",
        "glitch":      "glitch .3s ease infinite alternate",
      },
      keyframes: {
        "pulse-pink": {
          "0%,100%": { boxShadow: "0 0 8px rgba(255,45,120,.4)" },
          "50%":      { boxShadow: "0 0 24px rgba(255,45,120,.8)" },
        },
        "scan-line": {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "glitch": {
          "0%":   { clipPath: "inset(0 0 95% 0)" },
          "20%":  { clipPath: "inset(30% 0 50% 0)" },
          "40%":  { clipPath: "inset(70% 0 10% 0)" },
          "60%":  { clipPath: "inset(10% 0 80% 0)" },
          "80%":  { clipPath: "inset(50% 0 30% 0)" },
          "100%": { clipPath: "inset(90% 0 5% 0)" },
        },
      },
    },
  },
  plugins: [],
};
