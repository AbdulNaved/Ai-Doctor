import jsPDF from "jspdf";

interface PatientInfo {
  name?: string;
  age?: string;
  gender?: string;
  sessionId: string;
  doctorName: string;
  date: string;
  time: string;
}

export function generateMedicalReportPDF(
  report: string,
  patientInfo: PatientInfo
) {
  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;

  const checkPageBreak = (height: number) => {
    if (yPosition + height > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // HEADER
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("MEDICAL CONSULTATION REPORT", pageWidth / 2, 20, {
    align: "center",
  });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Assisted Medical Documentation", pageWidth / 2, 28, {
    align: "center",
  });

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 35, {
    align: "center",
  });

  yPosition = 60;

  // PATIENT INFO BOX
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, yPosition, contentWidth, 45, "F");
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin, yPosition, contentWidth, 45, "S");

  yPosition += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("PATIENT INFORMATION", margin + 5, yPosition);

  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  const col1X = margin + 5;
  const col2X = pageWidth / 2 + 5;

  doc.setFont("helvetica", "bold");
  doc.text("Name:", col1X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.name || "Not provided", col1X + 25, yPosition);

  doc.setFont("helvetica", "bold");
  doc.text("Session ID:", col2X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.sessionId, col2X + 25, yPosition);

  yPosition += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Age:", col1X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.age || "Not provided", col1X + 25, yPosition);

  doc.setFont("helvetica", "bold");
  doc.text("Date:", col2X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.date, col2X + 25, yPosition);

  yPosition += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Gender:", col1X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.gender || "Not specified", col1X + 25, yPosition);

  doc.setFont("helvetica", "bold");
  doc.text("Time:", col2X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.time, col2X + 25, yPosition);

  yPosition += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Doctor:", col1X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.doctorName, col1X + 25, yPosition);

  yPosition += 15;

  // REPORT CONTENT
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  const lines = report.split("\n");

  lines.forEach((line) => {
    if (line.includes("═══") || line.includes("━━━")) return;

    if (line.match(/^[0-9]+\.\s+[A-Z\s]+$/) || line.match(/^[A-Z\s]{10,}$/)) {
      checkPageBreak(15);
      yPosition += 5;
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, yPosition - 5, contentWidth, 8, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(line.trim(), margin + 3, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);
      return;
    }

    if (line.trim()) {
      checkPageBreak(6);
      doc.setFontSize(9);
      const wrappedLines = doc.splitTextToSize(line.trim(), contentWidth - 10);
      wrappedLines.forEach((l: string) => {
        doc.text(l, margin + 8, yPosition);
        yPosition += 4.5;
      });
    } else {
      yPosition += 3;
    }
  });

  // FOOTER
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.text(
      "AI-generated report for informational purposes only.",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: "right" }
    );
  }

  const fileName = `Medical_Report_${
    patientInfo.name?.replace(/\s+/g, "_") || "Patient"
  }_${patientInfo.sessionId}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
