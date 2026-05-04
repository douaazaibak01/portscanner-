/**
 * useScan.js
 * Custom React hook that manages the scan lifecycle via Server-Sent Events.
 * Talks to the FastAPI backend's GET /scan/stream endpoint.
 */

import { useState, useRef, useCallback } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "";

/** Initial empty state */
const INIT_STATE = {
  phase: "idle",           // idle | scanning | done | error
  progress: 0,
  progressLabel: "",
  statusMsg: "",
  openPorts: [],           // [{host, port, banner}]
  findings: [],            // [{host, port, name, severity, risk, reason, replace, banner}]
  stats: null,             // {total, critical, high, medium, low}
  logLines: [],            // raw text lines for live log
  error: null,
  elapsed: null,
};

export function useScan() {
  const [state, setState] = useState(INIT_STATE);
  const esRef = useRef(null);   // EventSource ref

  /** Append a line to the live log */
  const addLog = useCallback((text, cls = "log-info") => {
    setState(s => ({
      ...s,
      logLines: [...s.logLines.slice(-199), { text, cls }],
    }));
  }, []);

  /** Patch state (partial update) */
  const patch = useCallback((updates) => {
    setState(s => ({ ...s, ...updates }));
  }, []);

  /** Start a scan */
  const startScan = useCallback((target, ports, threads) => {
    // Close any existing connection
    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    // Reset state
    setState({ ...INIT_STATE, phase: "scanning", statusMsg: "Connecting…" });

    const params = new URLSearchParams({ target, ports, threads });
    const url = `${API_BASE}/scan/stream?${params}`;
    const es = new EventSource(url);
    esRef.current = es;

    const startTime = Date.now();

    es.onmessage = (evt) => {
      let d;
      try { d = JSON.parse(evt.data); } catch { return; }

      switch (d.type) {

        case "connected":
          patch({ statusMsg: "Connected — sending scan request…" });
          break;

        case "status":
          patch({ statusMsg: d.message });
          addLog(`• ${d.message}`);
          break;

        case "init":
          addLog(`» Target: ${d.hosts.join(", ")}  |  Ports: ${d.port_start}–${d.port_end}`);
          break;

        case "host_start":
          addLog(`\n» Scanning ${d.host}…`);
          patch({ statusMsg: `Scanning ${d.host}…` });
          break;

        case "progress":
          patch({
            progress: d.pct,
            progressLabel: `${d.host} — ${d.scanned}/${d.total} ports`,
          });
          break;

        case "port_open":
          setState(s => ({
            ...s,
            openPorts: [
              ...s.openPorts,
              { host: d.host, port: d.port, banner: d.banner || "" },
            ],
          }));
          addLog(
            `  ↳ OPEN :${d.port}${d.banner ? `  ["${d.banner.substring(0, 50)}"]` : ""}`,
            "log-open"
          );
          break;

        case "host_done":
          // Merge risk findings
          setState(s => ({
            ...s,
            findings: [...s.findings, ...d.risk_results],
          }));
          addLog(`✓ ${d.host}: ${d.open_ports.length} open, ${d.risk_results.length} findings`, "log-ok");
          break;

        case "host_error":
          addLog(`✕ Error on ${d.host}: ${d.message}`);
          break;

        case "complete": {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          patch({
            stats: d.stats,
            progress: 100,
            progressLabel: `Complete in ${elapsed}s`,
            statusMsg: `Scan finished in ${elapsed}s`,
            elapsed,
          });
          addLog(`\n✓ Done in ${elapsed}s`, "log-ok");
          break;
        }

        case "done":
          es.close();
          patch({ phase: "done" });
          break;

        case "error":
          es.close();
          patch({ phase: "error", error: d.message, statusMsg: d.message });
          break;

        default:
          break;
      }
    };

    es.onerror = () => {
      es.close();
      patch({
        phase: "error",
        error: "Connection lost. Is the backend running on port 8000?",
      });
    };
  }, [addLog, patch]);

  /** Abort a running scan */
  const abortScan = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    patch({ phase: "idle", statusMsg: "Scan aborted." });
  }, [patch]);

  return { state, startScan, abortScan };
}
