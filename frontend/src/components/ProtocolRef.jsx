import React, { useState } from "react";

const PROTOCOLS = [
  { port: 23,   name: "Telnet",    risk: 10, sev: "CRITICAL" },
  { port: 512,  name: "rexec",     risk: 10, sev: "CRITICAL" },
  { port: 513,  name: "rlogin",    risk: 10, sev: "CRITICAL" },
  { port: 21,   name: "FTP",       risk: 9,  sev: "CRITICAL" },
  { port: 110,  name: "POP3",      risk: 8,  sev: "HIGH" },
  { port: 143,  name: "IMAP",      risk: 8,  sev: "HIGH" },
  { port: 69,   name: "TFTP",      risk: 8,  sev: "HIGH" },
  { port: 80,   name: "HTTP",      risk: 7,  sev: "HIGH" },
  { port: 161,  name: "SNMP",      risk: 7,  sev: "HIGH" },
  { port: 389,  name: "LDAP",      risk: 7,  sev: "HIGH" },
  { port: 25,   name: "SMTP",      risk: 6,  sev: "MEDIUM" },
  { port: 2049, name: "NFS",       risk: 6,  sev: "MEDIUM" },
];

/**
 * ProtocolRef — collapsible reference table of insecure protocols.
 */
export default function ProtocolRef() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden mb-8"
      style={{ border: "1px solid #1a2332" }}
    >
      <button
        className="w-full flex items-center justify-between px-5 py-3 font-mono text-[11px]
          uppercase tracking-widest transition-colors duration-150"
        style={{ background: "#0f1419", color: "#5a6a7e" }}
        onClick={() => setOpen(o => !o)}
      >
        <span>// Insecure Protocol Reference</span>
        <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
      </button>

      {open && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-4"
          style={{ background: "#0a0d12" }}
        >
          {PROTOCOLS.map(p => (
            <div
              key={p.port}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-[12px]"
              style={{ background: "#0f1419", border: "1px solid #1a2332" }}
            >
              <span style={{ color: "#ff2d78", fontWeight: 700, minWidth: 38 }}>:{p.port}</span>
              <span style={{ color: "#e6edf3", flex: 1 }}>{p.name}</span>
              <span className={`badge-${p.sev} text-[10px] px-1.5 py-0.5 rounded font-bold`}>
                {p.risk}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
