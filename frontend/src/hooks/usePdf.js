import { useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = {
  PRIMARY: [214, 51, 108],    // Berry Red/Pink from your UI
  DARK_TEXT: [28, 36, 48],    // Deep Navy
  MUTED_TEXT: [110, 120, 130], // Slate Gray
  BORDER: [235, 236, 238],    // Light Gray
  TABLE_HEADER: [43, 44, 54], // Dark Slate for headers
};

const SEV_COLORS = {
  CRITICAL: [255, 51, 85],
  HIGH:     [255, 116, 51],
  MEDIUM:   [255, 224, 51],
  LOW:      [0, 200, 100],
};

export function usePdf() {
  const generatePdf = useCallback((target, ports, openPorts, findings, stats, elapsed) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleString();

    // 1. Header Section
    doc.setFillColor(...COLORS.PRIMARY);
    doc.rect(0, 0, W, 40, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("PortScan Pro", 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Network Security Scanner & Insecure Protocol Detector", 14, 28);
    doc.text(`Generated: ${now}`, W - 14, 28, { align: "right" });

    // 2. Metadata Box (The "Card")
    let y = 48;
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(10, y, W - 20, 28, 4, 4, "F");
    doc.setDrawColor(...COLORS.BORDER);
    doc.roundedRect(10, y, W - 20, 28, 4, 4, "S");

    const metaCols = [
      { label: "TARGET", value: target, x: 18 },
      { label: "PORT RANGE", value: ports, x: 65 },
      { label: "OPEN PORTS", value: String(openPorts.length), x: 110 },
      { label: "ELAPSED", value: `${elapsed}s`, x: 155 }
    ];

    metaCols.forEach(col => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.MUTED_TEXT);
      doc.text(col.label, col.x, y + 8);
      
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.DARK_TEXT);
      doc.text(col.value, col.x, y + 18);
    });

    // 3. Security Summary Title
    y += 42;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.DARK_TEXT);
    doc.text("SECURITY FINDINGS SUMMARY", 14, y);
    doc.setFillColor(...COLORS.PRIMARY);
    doc.rect(14, y + 2, 55, 1.5, "F"); // Colored underline

    // 4. Severity Cards
    y += 12;
    const boxW = (W - 34) / 4;
    const statItems = [
      { label: "CRITICAL", value: stats?.critical ?? 0, color: SEV_COLORS.CRITICAL },
      { label: "HIGH",     value: stats?.high     ?? 0, color: SEV_COLORS.HIGH },
      { label: "MEDIUM",   value: stats?.medium   ?? 0, color: SEV_COLORS.MEDIUM },
      { label: "LOW",      value: stats?.low      ?? 0, color: SEV_COLORS.LOW },
    ];

    statItems.forEach((s, i) => {
      const x = 14 + i * (boxW + 2);
      // Card Background
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(x, y, boxW, 25, 1, 1, "F");
      // Top Accent Line
      doc.setFillColor(...s.color);
      doc.rect(x, y, boxW, 1.5, "F");
      
      // Value
      doc.setFontSize(20);
      doc.setTextColor(...s.color);
      doc.text(String(s.value), x + boxW/2, y + 14, { align: "center" });
      
      // Label
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.MUTED_TEXT);
      doc.text(s.label, x + boxW/2, y + 21, { align: "center" });
    });

    // 5. Findings Table
    y += 38;
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.DARK_TEXT);
    doc.text("SECURITY FINDINGS", 14, y);
    doc.setFillColor(...COLORS.PRIMARY);
    doc.rect(14, y + 2, 35, 1.5, "F");

    autoTable(doc, {
      startY: y + 8,
      head: [["Severity", "Port", "Protocol", "Risk", "Reason", "Recommendation"]],
      body: findings.map(f => [f.severity, f.port, f.name, `${f.risk}/10`, f.reason, f.replace]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4, lineColor: [230, 230, 230] },
      headStyles: { fillColor: COLORS.TABLE_HEADER, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 25 },
        1: { cellWidth: 15 },
        3: { halign: 'center', cellWidth: 15 },
        5: { cellWidth: 45 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          data.cell.styles.textColor = SEV_COLORS[data.cell.raw] || [0,0,0];
        }
      }
    });

    // 6. Open Ports Table
    y = doc.lastAutoTable.finalY + 15;
    if (y > 250) { doc.addPage(); y = 20; }
    
    doc.setFontSize(11);
    doc.text("OPEN PORTS", 14, y);
    doc.setFillColor(...COLORS.PRIMARY);
    doc.rect(14, y + 2, 23, 1.5, "F");

    autoTable(doc, {
      startY: y + 8,
      head: [["Port", "Service", "Host", "Banner / Info"]],
      body: openPorts.map(p => [p.port, p.service || "—", p.host, p.banner || "No banner"]),
      theme: "grid",
      headStyles: { fillColor: COLORS.TABLE_HEADER, textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`Security_Report_${target}.pdf`);
  }, []);

  return { generatePdf };
}
