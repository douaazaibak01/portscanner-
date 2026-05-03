/**
 * usePdf.js  — Light mode PDF report
 * Matches the layout shown in the screenshot:
 * white background, pink header bar, clean tables.
 */

import { useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SEV_COLORS = {
  CRITICAL: [220, 38,  57],
  HIGH:     [220, 100, 30],
  MEDIUM:   [180, 140,  0],
  LOW:      [22,  160,  80],
};

const COMMON_SERVICES = {
  21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
  80: "HTTP", 110: "POP3", 143: "IMAP", 161: "SNMP", 389: "LDAP",
  443: "HTTPS", 445: "SMB", 587: "SMTP-TLS", 993: "IMAPS",
  995: "POP3S", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL",
  5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt", 27017: "MongoDB",
};

export function usePdf() {
  const generatePdf = useCallback((target, ports, openPorts, findings, stats, elapsed) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W   = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleString();

    // ── White background ──────────────────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, 297, "F");

    // ── Pink header bar ───────────────────────────────────────
    doc.setFillColor(220, 38, 100);
    doc.rect(0, 0, W, 30, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("PortScan Pro", 14, 13);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 200, 220);
    doc.text("Network Security Scanner & Insecure Protocol Detector", 14, 21);
    doc.text(`Generated: ${now}`, W - 14, 21, { align: "right" });

    // ── Scan metadata box ─────────────────────────────────────
    let y = 38;
    doc.setDrawColor(220, 220, 225);
    doc.setFillColor(248, 248, 250);
    doc.roundedRect(10, y, W - 20, 24, 3, 3, "FD");

    const cols = [
      { label: "TARGET",     value: target },
      { label: "PORT RANGE", value: ports },
      { label: "OPEN PORTS", value: String(openPorts.length) },
      { label: "ELAPSED",    value: `${elapsed}s` },
    ];
    const colW = (W - 20) / cols.length;
    cols.forEach((c, i) => {
      const x = 14 + i * colW;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 150);
      doc.text(c.label, x, y + 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 40);
      doc.text(c.value, x, y + 18);
    });

    // ── Section heading helper ────────────────────────────────
    const sectionHeading = (label, yPos) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 40);
      doc.text(label, 14, yPos);
      doc.setDrawColor(220, 38, 100);
      doc.setLineWidth(0.8);
      doc.line(14, yPos + 1.5, 14 + doc.getTextWidth(label), yPos + 1.5);
      doc.setLineWidth(0.2);
    };

    // ── Summary stats ─────────────────────────────────────────
    y += 32;
    sectionHeading("SECURITY FINDINGS SUMMARY", y);
    y += 8;

    const statItems = [
      { label: "CRITICAL", value: stats?.critical ?? 0, color: [220, 38,  57]  },
      { label: "HIGH",     value: stats?.high     ?? 0, color: [220, 100, 30]  },
      { label: "MEDIUM",   value: stats?.medium   ?? 0, color: [180, 140,  0]  },
      { label: "LOW",      value: stats?.low      ?? 0, color: [22,  160,  80] },
    ];

    const boxW = (W - 28) / 4;
    statItems.forEach((s, i) => {
      const x = 14 + i * (boxW + 2.5);

      // top colour bar
      doc.setFillColor(...s.color);
      doc.rect(x, y, boxW, 2, "F");

      // card body
      doc.setDrawColor(220, 220, 225);
      doc.setFillColor(250, 250, 252);
      doc.rect(x, y + 2, boxW, 20, "FD");

      // number
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...s.color);
      doc.text(String(s.value), x + boxW / 2, y + 16, { align: "center" });

      // label
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 130);
      doc.text(s.label, x + boxW / 2, y + 21, { align: "center" });
    });

    // ── Findings table ────────────────────────────────────────
    y += 30;
    sectionHeading("SECURITY FINDINGS", y);
    y += 5;

    if (findings.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Severity", "Port", "Protocol", "Risk", "Reason", "Recommendation"]],
        body: findings.map(f => [
          f.severity,
          f.port,
          f.name,
          `${f.risk}/10`,
          f.reason,
          f.replace,
        ]),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8,
          textColor: [40, 40, 50],
          cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
          lineColor: [210, 210, 220],
          lineWidth: 0.25,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [40, 40, 50],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [247, 247, 250] },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: "bold" },
          1: { cellWidth: 14 },
          2: { cellWidth: 24 },
          3: { cellWidth: 14 },
          4: { cellWidth: 58 },
          5: { cellWidth: "auto" },
        },
        didParseCell: (hookData) => {
          if (hookData.section === "body" && hookData.column.index === 0) {
            const c = SEV_COLORS[hookData.cell.raw] || [80, 80, 80];
            hookData.cell.styles.textColor = c;
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFillColor(235, 250, 240);
      doc.setDrawColor(150, 220, 170);
      doc.setLineWidth(0.4);
      doc.roundedRect(14, y, W - 28, 18, 3, 3, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(22, 140, 70);
      doc.text("\u2713  No Insecure Protocols Detected", W / 2, y + 8, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(60, 140, 80);
      doc.text("All scanned ports passed security review.", W / 2, y + 14, { align: "center" });
      y += 26;
    }

    // ── Open ports table ──────────────────────────────────────
    if (openPorts.length > 0) {
      if (y > 240) { doc.addPage(); doc.setFillColor(255,255,255); doc.rect(0,0,W,297,"F"); y = 20; }

      sectionHeading("OPEN PORTS", y);
      y += 5;

      autoTable(doc, {
        startY: y,
        head: [["Port", "Service", "Host", "Banner / Info"]],
        body: openPorts.map(p => [
          p.port,
          COMMON_SERVICES[p.port] || "—",
          p.host,
          (p.banner || "—").substring(0, 70),
        ]),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8,
          textColor: [40, 40, 50],
          cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
          lineColor: [210, 210, 220],
          lineWidth: 0.25,
        },
        headStyles: {
          fillColor: [40, 40, 50],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [247, 247, 250] },
        columnStyles: {
          0: { cellWidth: 18, textColor: [220, 38, 100], fontStyle: "bold" },
          1: { cellWidth: 28 },
          2: { cellWidth: 36 },
          3: { cellWidth: "auto" },
        },
        margin: { left: 14, right: 14 },
      });
    }

    // ── Footer on every page ──────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(220, 220, 225);
      doc.setLineWidth(0.3);
      doc.line(14, 285, W - 14, 285);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 170);
      doc.text("PortScan Pro — Network Security Report — For authorized use only", 14, 290);
      doc.text(`Page ${i} / ${pageCount}`, W - 14, 290, { align: "right" });
    }

    doc.save(`portscan_${target.replace(/[./]/g, "_")}_${Date.now()}.pdf`);
  }, []);

  return { generatePdf };
}
