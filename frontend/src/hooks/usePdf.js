/**
 * usePdf.js
 * Generates a styled PDF report from scan results using jsPDF + autoTable.
 */

import { useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SEV_COLORS = {
  CRITICAL: [255, 51, 85],
  HIGH:     [255, 116, 51],
  MEDIUM:   [255, 224, 51],
  LOW:      [0, 255, 136],
};

export function usePdf() {
  const generatePdf = useCallback((target, ports, openPorts, findings, stats, elapsed) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleString();

    // ── Page background (light mode) ─────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, 297, "F");

    // ── Header bar ───────────────────────────────────────────
    doc.setFillColor(245, 246, 248);
    doc.rect(0, 0, W, 28, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(28, 36, 48);
    doc.text("PORTSCAN PRO", 14, 12);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 92, 108);
    doc.text("Network Security Scanner & Insecure Protocol Detector", 14, 19);

    doc.setTextColor(80, 92, 108);
    doc.text(`Generated: ${now}`, W - 14, 19, { align: "right" });

    // ── Scan metadata box ────────────────────────────────────
    let y = 36;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, y, W - 20, 22, 3, 3, "F");
    doc.setDrawColor(220, 225, 230);
    doc.roundedRect(10, y, W - 20, 22, 3, 3, "S");

    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(110, 120, 130);
    doc.text("TARGET", 16, y + 7);
    doc.text("PORT RANGE", 70, y + 7);
    doc.text("OPEN PORTS", 120, y + 7);
    doc.text("ELAPSED", 165, y + 7);

    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    doc.setTextColor(28, 36, 48);
    doc.text(target, 16, y + 16);
    doc.text(ports, 70, y + 16);
    doc.text(String(openPorts.length), 120, y + 16);
    doc.text(`${elapsed}s`, 165, y + 16);

    // ── Summary stats ────────────────────────────────────────
    y += 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(80, 92, 108);
    doc.text("// SECURITY FINDINGS SUMMARY", 14, y);

    y += 6;
    const statItems = [
      { label: "CRITICAL", value: stats?.critical ?? 0, color: [255, 51, 85] },
      { label: "HIGH",     value: stats?.high     ?? 0, color: [255, 116, 51] },
      { label: "MEDIUM",   value: stats?.medium   ?? 0, color: [255, 224, 51] },
      { label: "LOW",      value: stats?.low      ?? 0, color: [0, 200, 100] },
    ];

    const boxW = (W - 28) / 4;
    statItems.forEach((s, i) => {
      const x = 14 + i * (boxW + 2.5);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, boxW, 18, 2, 2, "F");
      doc.setDrawColor(235, 236, 238);
      doc.roundedRect(x, y, boxW, 18, 2, 2, "S");
      doc.setFillColor(...s.color.map(c => Math.min(255, c + 30)));
      doc.roundedRect(x, y + 16, boxW, 2, 0, 0, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...s.color);
      doc.text(String(s.value), x + boxW / 2, y + 11, { align: "center" });

      doc.setFontSize(7);
      doc.setTextColor(110, 120, 130);
      doc.text(s.label, x + boxW / 2, y + 17, { align: "center" });
    });

    // ── Findings table ───────────────────────────────────────
    y += 26;
    if (findings.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(90, 106, 126);
      doc.text("// SECURITY FINDINGS", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["SEV", "PORT", "PROTOCOL", "RISK", "REASON", "RECOMMENDATION"]],
        body: findings.map(f => [
          f.severity,
          `:${f.port}`,
          f.name,
          `${f.risk}/10`,
          f.reason,
          f.replace,
        ]),
        theme: "plain",
        styles: {
          font: "courier",
          fontSize: 7.5,
          textColor: [28, 36, 48],
          cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
          lineColor: [220, 225, 230],
          lineWidth: 0.3,
          fillColor: [255, 255, 255],
          overflow: "ellipsize",
        },
        headStyles: {
          fillColor: [245, 245, 246],
          textColor: [80, 92, 108],
          fontSize: 7,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 30, overflow: 'ellipsize', halign: 'center' },
          1: { cellWidth: 14 },
          2: { cellWidth: 22 },
          3: { cellWidth: 12 },
          4: { cellWidth: 60 },
          5: { cellWidth: "auto" },
        },
        didParseCell: (hookData) => {
          if (hookData.section === "body" && hookData.column.index === 0) {
            const sev = hookData.cell.raw;
            const c = SEV_COLORS[sev] || [100, 100, 100];
            hookData.cell.styles.textColor = c;
            hookData.cell.styles.fontStyle = "bold";
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, y, W - 28, 16, 3, 3, "F");
      doc.setDrawColor(220, 225, 230);
      doc.roundedRect(14, y, W - 28, 16, 3, 3, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 150, 80);
      doc.text("✓  No insecure protocols detected — all scanned ports passed.", W / 2, y + 10, { align: "center" });
      y += 22;
    }

    // ── Open ports table ─────────────────────────────────────
    if (openPorts.length > 0) {
      if (y > 240) { doc.addPage(); doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, 297, "F"); y = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(90, 106, 126);
      doc.text("// OPEN PORTS", 14, y);
      y += 4;

      const COMMON_SERVICES = {
        21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
        80: "HTTP", 110: "POP3", 143: "IMAP", 161: "SNMP", 389: "LDAP",
        443: "HTTPS", 445: "SMB", 587: "SMTP-TLS", 993: "IMAPS",
        995: "POP3S", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL",
        5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt", 27017: "MongoDB",
      };

      autoTable(doc, {
        startY: y,
        head: [["PORT", "SERVICE", "HOST", "BANNER"]],
        body: openPorts.map(p => [
          `:${p.port}`,
          COMMON_SERVICES[p.port] || "—",
          p.host,
          (p.banner || "").substring(0, 60),
        ]),
        theme: "plain",
        styles: {
          font: "courier",
          fontSize: 7.5,
          textColor: [28, 36, 48],
          cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
          lineColor: [220, 225, 230],
          lineWidth: 0.3,
          fillColor: [255, 255, 255],
        },
        headStyles: {
          fillColor: [245, 245, 246],
          textColor: [80, 92, 108],
          fontSize: 7,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 16, textColor: [255, 45, 120] },
          1: { cellWidth: 24 },
          2: { cellWidth: 30 },
          3: { cellWidth: "auto" },
        },
        margin: { left: 14, right: 14 },
      });
    }

    // ── Footer on every page ─────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(245, 245, 246);
      doc.rect(0, 284, W, 13, "F");
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(80, 92, 108);
      doc.text("PortScan Pro — Network Security Report — For authorized use only", 14, 291);
      doc.text(`Page ${i} / ${pageCount}`, W - 14, 291, { align: "right" });
    }

    doc.save(`portscan_${target.replace(/[./]/g, "_")}_${Date.now()}.pdf`);
  }, []);

  return { generatePdf };
}
