/**
 * usePdf.js — Light mode PDF report
 * Matches the layout shown in the screenshot:
 * white background, pink header bar, clean tables.
 */

import { useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SEV_COLORS = {
  CRITICAL: [220, 38, 57],
  HIGH: [220, 100, 30],
  MEDIUM: [180, 140, 0],
  LOW: [22, 160, 80],
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
    const W = doc.internal.pageSize.getWidth();
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
      { label: "TARGET", value: target },
      { label: "PORT RANGE", value: ports },
      { label: "OPEN PORTS", value: String(openPorts.length) },
      { label: "ELAPSED", value: `${elapsed}s` },
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
      doc.line(14, yPos + 2, 14 + doc.getTextWidth(label), yPos + 2);
      doc.setLineWidth(0.2);
    };

    // ── Summary stats ─────────────────────────────────────────
    y += 32;
    sectionHeading("SECURITY FINDINGS SUMMARY", y);
    y += 8;

    const statItems = [
      { label: "CRITICAL", value: stats?.critical ?? 0, color: [220, 38, 57] },
      { label: "HIGH", value: stats?.high ?? 0, color: [220, 100, 30] },
      { label: "MEDIUM", value: stats?.medium ?? 0, color: [180, 140, 0] },
      { label: "LOW", value: stats?.low ?? 0, color: [22, 160, 80] },
    ];

    const boxW = (W - 35) / 4;
    statItems.forEach((s, i) => {
      const x = 14 + i * (boxW + 3);

      doc.setFillColor(...s.color);
      doc.rect(x, y, boxW, 1.5, "F");

      doc.setDrawColor(230, 230, 235);
      doc.setFillColor(252, 252, 254);
      doc.rect(x, y + 1.5, boxW, 18, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...s.color);
      doc.text(String(s.value), x + boxW / 2, y + 12, { align: "center" });

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 110);
      doc.text(s.label, x + boxW / 2, y + 17, { align: "center" });
    });

    // ── Findings table ────────────────────────────────────────
    y += 28;
    sectionHeading("SECURITY FINDINGS", y);
    y += 6;

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
          fontSize: 7.5,
          textColor: [50, 50, 60],
          cellPadding: 3,
          lineColor: [220, 220, 230],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [50, 50, 60],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: "bold" },
          1: { cellWidth: 15 },
          2: { cellWidth: 22 },
          3: { cellWidth: 15 },
          4: { cellWidth: 55 },
          5: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const sev = String(data.cell.raw).toUpperCase();
            if (SEV_COLORS[sev]) {
              data.cell.styles.textColor = SEV_COLORS[sev];
            }
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 12;
    } else {
      // Success Message Box
      doc.setFillColor(240, 250, 240);
      doc.setDrawColor(180, 220, 180);
      doc.roundedRect(14, y, W - 28, 15, 2, 2, "FD");
      doc.setFontSize(9);
      doc.setTextColor(30, 120, 60);
      doc.text("No security risks identified. All protocols appear secure.", W / 2, y + 9, { align: "center" });
      y += 25;
    }

    // ── Open ports table ──────────────────────────────────────
    if (openPorts.length > 0) {
      if (y > 230) { doc.addPage(); y = 20; }

      sectionHeading("OPEN PORTS LIST", y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Port", "Service", "Host", "Banner / Info"]],
        body: openPorts.map(p => [
          p.port,
          COMMON_SERVICES[p.port] || "Unknown",
          p.host,
          (p.banner || "No banner retrieved").substring(0, 80),
        ]),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8,
          textColor: [60, 60, 70],
          lineColor: [220, 220, 230],
        },
        headStyles: {
          fillColor: [220, 38, 100], // Match header pink for variety
          textColor: [255, 255, 255],
        },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: "bold", textColor: [220, 38, 100] },
          1: { cellWidth: 30 },
          2: { cellWidth: 40 },
        },
        margin: { left: 14, right: 14 },
      });
    }

    // ── Footer ────────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(170, 170, 180);
      doc.text(`PortScan Pro Confidential — Target: ${target}`, 14, 290);
      doc.text(`Page ${i} of ${pageCount}`, W - 14, 290, { align: "right" });
    }

    doc.save(`Security_Report_${target.replace(/[^a-z0-9]/gi, "_")}.pdf`);
  }, []);

  return { generatePdf };
}