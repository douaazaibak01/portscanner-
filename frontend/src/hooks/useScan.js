/**
 * useScan.js
 * Manages the scan lifecycle via Server-Sent Events.
 * Now accepts a JWT token and passes it as a query param to the backend.
 * Also forwards the declaredOwner flag required by the secured API.
 */

import { useState, useRef, useCallback } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "";

const INIT_STATE = {
  phase: "idle",
  progress: 0,
  progressLabel: "",
  statusMsg: "",
  openPorts: [],
  findings: [],
  stats: null,
  logLines: [],
  error: null,
  elapsed: null,
};

export function useScan(token) {
  const [state, setState] = useState(INIT_STATE);
  const esRef = useRef(null);

  const addLog = useCallback((text, cls = "log-info") => {
    setState(s => ({ ...s, logLines: [...s.logLines.slice(-199), { text, cls }] }));
  }, []);

  const patch = useCallback((updates) => {
    setState(s => ({ ...s, ...updates }));
  }, []);

  const startScan = useCallback((target, ports, timeout, threads, declaredOwner) => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setState({ ...INIT_STATE, phase: "scanning", statusMsg: "Connecting…" });

    const params = new URLSearchParams({
      target, ports, timeout, threads,
      declared_owner: declaredOwner ? "true" : "false",
      // Pass JWT as query param so EventSource can authenticate
      // (EventSource doesn't support custom headers)
      token,
    });

    // Note: backend must accept ?token= as an alternative to Bearer header
    // for SSE connections. See backend auth note below.
    const url = `${API_BASE}/scan/stream?${params}`;
    const es  = new EventSource(url);
    esRef.current = es;
    const startTime = Date.now();

    es.onmessage = (evt) => {
      let d;
      try { d = JSON.parse(evt.data); } catch { return; }

      switch (d.type) {
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
          patch({ progress: d.pct, progressLabel: `${d.host} — ${d.scanned}/${d.total} ports` });
          break;
        case "port_open":
          setState(s => ({
            ...s,
            openPorts: [...s.openPorts, { host: d.host, port: d.port, banner: d.banner || "" }],
          }));
          addLog(
            `  ↳ OPEN :${d.port}${d.banner ? `  ["${d.banner.substring(0, 50)}"]` : ""}`,
            "log-open"
          );
          break;
        case "host_done":
          setState(s => ({ ...s, findings: [...s.findings, ...d.risk_results] }));
          addLog(`✓ ${d.host}: ${d.open_ports.length} open, ${d.risk_results.length} findings`, "log-ok");
          break;
        case "host_error":
          addLog(`✕ Error on ${d.host}: ${d.message}`);
          break;
        case "complete": {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          patch({ stats: d.stats, progress: 100,
            progressLabel: `Complete in ${elapsed}s`,
            statusMsg: `Scan finished in ${elapsed}s`, elapsed });
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
        error: "Connection lost or unauthorized. Check your session and try again.",
      });
    };
  }, [addLog, patch, token]);

  const abortScan = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    patch({ phase: "idle", statusMsg: "Scan aborted." });
  }, [patch]);

  return { state, startScan, abortScan };
}
