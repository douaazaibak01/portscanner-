import React, { useState } from "react";
import Header from "./components/Header";
import ScanForm from "./components/ScanForm";
import ScanProgress from "./components/ScanProgress";
import StatsBar from "./components/StatsBar";
import FindingsPanel from "./components/FindingsPanel";
import PortsTable from "./components/PortsTable";
import ProtocolRef from "./components/ProtocolRef";
import { useScan } from "./hooks/useScan";
import { usePdf } from "./hooks/usePdf";

export default function App() {
  const { state, startScan, abortScan } = useScan();
  const { generatePdf } = usePdf();

  // Track the last scan params for the PDF
  const [lastParams, setLastParams] = useState({ target: "", ports: "" });

  function handleScan(target, ports, timeout, threads) {
    setLastParams({ target, ports });
    startScan(target, ports, timeout, threads);
  }

  function handleDownloadPdf() {
    generatePdf(
      lastParams.target,
      lastParams.ports,
      state.openPorts,
      state.findings,
      state.stats,
      state.elapsed ?? "?"
    );
  }

  const scanning = state.phase === "scanning";
  const done     = state.phase === "done";
  const hasError = state.phase === "error";

  return (
    <div className="grid-bg radial-pink min-h-screen">
      <div className="max-w-3xl mx-auto px-4 pb-16">

        {/* ── Header ────────────────────────────────────── */}
        <Header />

        {/* ── Scan Form ─────────────────────────────────── */}
        <ScanForm
          onScan={handleScan}
          onAbort={abortScan}
          scanning={scanning}
        />

        {/* ── Error ─────────────────────────────────────── */}
        {hasError && (
          <div
            className="rounded-xl px-5 py-4 mb-5 font-mono text-sm animate-fade-up"
            style={{
              background: "rgba(255,51,85,.07)",
              border: "1px solid rgba(255,51,85,.3)",
              color: "#ff3355",
            }}
          >
            ✕ {state.error}
          </div>
        )}

        {/* ── Progress ───────────────────────────────────── */}
        {scanning && (
          <ScanProgress
            progress={state.progress}
            progressLabel={state.progressLabel}
            statusMsg={state.statusMsg}
            logLines={state.logLines}
          />
        )}

        {/* ── Results ────────────────────────────────────── */}
        {done && (
          <>
            {/* Stats row */}
            <StatsBar stats={state.stats} openCount={state.openPorts.length} />

            {/* Actions bar */}
            <div className="flex items-center justify-between mb-5">
              <div className="font-mono text-[11px]" style={{ color: "#5a6a7e" }}>
                ✓ Scan completed in <span style={{ color: "#ff2d78" }}>{state.elapsed}s</span>
                {" · "}{state.openPorts.length} ports open
              </div>
              <button className="btn-pdf" onClick={handleDownloadPdf}>
                ↓ Download PDF Report
              </button>
            </div>

            {/* Security findings */}
            <FindingsPanel findings={state.findings} />

            {/* Open ports table */}
            <PortsTable ports={state.openPorts} />
          </>
        )}

        {/* ── Protocol reference ─────────────────────────── */}
        <ProtocolRef />

        {/* ── Footer ─────────────────────────────────────── */}
        <footer className="text-center font-mono text-[11px] pb-4" style={{ color: "#3a4a5e" }}>
          PortScan Pro v2.0 — Running locally on your machine
        </footer>

      </div>
    </div>
  );
}
