import React, { useState } from "react";

const COMMON_SERVICES = {
  21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
  80: "HTTP", 110: "POP3", 143: "IMAP", 161: "SNMP", 389: "LDAP",
  443: "HTTPS", 445: "SMB", 512: "rexec", 513: "rlogin",
  587: "SMTP-TLS", 993: "IMAPS", 995: "POP3S",
  3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL",
  5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt",
  27017: "MongoDB",
};

/**
 * PortsTable — sortable table of all open ports found.
 */
export default function PortsTable({ ports }) {
  const [sortKey, setSortKey] = useState("port");
  const [sortAsc, setSortAsc] = useState(true);

  function toggleSort(key) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  const sorted = [...ports].sort((a, b) => {
    const va = sortKey === "port" ? a.port : (COMMON_SERVICES[a.port] || "");
    const vb = sortKey === "port" ? b.port : (COMMON_SERVICES[b.port] || "");
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ k }) => (
    <span className="ml-1 opacity-40 text-[10px]">
      {sortKey === k ? (sortAsc ? "▲" : "▼") : "↕"}
    </span>
  );

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono text-[10px] tracking-[.18em] uppercase"
          style={{ color: "#5a6a7e" }}>// Open Ports</div>
        <span
          className="font-mono text-[11px] px-2 py-0.5 rounded"
          style={{ background: "rgba(0,229,255,.06)", border: "1px solid rgba(0,229,255,.15)", color: "#00e5ff" }}
        >
          {ports.length} ports
        </span>
      </div>

      {ports.length === 0 ? (
        <div className="font-mono text-sm text-center py-6" style={{ color: "#5a6a7e" }}>
          No open ports found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="ports-table">
            <thead>
              <tr>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("port")}>
                  Port <SortIcon k="port" />
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort("service")}>
                  Service <SortIcon k="service" />
                </th>
                <th>Host</th>
                <th>Banner / Info</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={i}>
                  <td>
                    <span className="font-mono font-bold" style={{ color: "#ff2d78" }}>
                      {p.port}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-[12px]" style={{ color: "#e6edf3" }}>
                      {COMMON_SERVICES[p.port] || (
                        <span style={{ color: "#5a6a7e" }}>—</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-[12px]" style={{ color: "#5a6a7e" }}>
                      {p.host || "—"}
                    </span>
                  </td>
                  <td>
                    <span
                      className="font-mono text-[11px] block max-w-xs overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{ color: p.banner ? "#7d8fa0" : "#5a6a7e" }}
                      title={p.banner}
                    >
                      {p.banner || <span className="opacity-30">—</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
