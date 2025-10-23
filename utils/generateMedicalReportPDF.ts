import jsPDF from "jspdf";

interface PatientInfo {
  name?: string;
  age?: string;
  gender?: string;
  sessionId: string;
  doctorName: string;
  date: string;
  time: string;
  duration?: string;
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
    if (yPosition + height > pageHeight - margin - 20) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // HEADER with gradient effect
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 55, "F");

  // Add medical cross icon
  doc.setFillColor(255, 255, 255);
  doc.rect(pageWidth / 2 - 3, 8, 6, 15, "F");
  doc.rect(pageWidth / 2 - 7.5, 12.5, 15, 6, "F");

  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("MEDICAL CONSULTATION REPORT", pageWidth / 2, 32, {
    align: "center",
  });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Assisted Medical Documentation", pageWidth / 2, 40, {
    align: "center",
  });

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 47, {
    align: "center",
  });

  yPosition = 65;

  // PATIENT INFO BOX
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition, contentWidth, 50, "FD");

  yPosition += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("📋 PATIENT INFORMATION", margin + 5, yPosition);

  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  const col1X = margin + 5;
  const col2X = pageWidth / 2 + 5;

  // Left column
  doc.setFont("helvetica", "bold");
  doc.text("Patient Name:", col1X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.name || "Not provided", col1X + 30, yPosition);

  doc.setFont("helvetica", "bold");
  doc.text("Session ID:", col2X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.sessionId.substring(0, 20), col2X + 25, yPosition);

  yPosition += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Age:", col1X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.age || "Not provided", col1X + 30, yPosition);

  doc.setFont("helvetica", "bold");
  doc.text("Date:", col2X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.date, col2X + 25, yPosition);

  yPosition += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Gender:", col1X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.gender || "Not specified", col1X + 30, yPosition);

  doc.setFont("helvetica", "bold");
  doc.text("Time:", col2X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.time, col2X + 25, yPosition);

  yPosition += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Attending Doctor:", col1X, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(patientInfo.doctorName, col1X + 35, yPosition);

  if (patientInfo.duration) {
    doc.setFont("helvetica", "bold");
    doc.text("Duration:", col2X, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(patientInfo.duration, col2X + 25, yPosition);
  }

  yPosition += 18;

  // REPORT CONTENT
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  const lines = report.split("\n");

  lines.forEach((line) => {
    // Skip decorative lines
    if (line.includes("═══") || line.includes("━━━") || line.trim() === "") {
      yPosition += 2;
      return;
    }

    // Main section headers
    if (
      line.match(/^[0-9]+\.\s+[A-Z\s]{10,}/) ||
      line.match(/^[A-Z\s]{15,}:?$/)
    ) {
      checkPageBreak(15);
      yPosition += 5;

      doc.setFillColor(37, 99, 235);
      doc.rect(margin, yPosition - 6, contentWidth, 10, "F");

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(line.trim(), margin + 3, yPosition);

      yPosition += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      return;
    }

    // Subsection headers
    if (line.match(/^[\-\•\*]\s*[A-Z]/)) {
      checkPageBreak(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      const wrappedLines = doc.splitTextToSize(line.trim(), contentWidth - 10);
      wrappedLines.forEach((l: string) => {
        doc.text(l, margin + 5, yPosition);
        yPosition += 5;
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      return;
    }

    // Regular content
    if (line.trim()) {
      checkPageBreak(6);
      const wrappedLines = doc.splitTextToSize(line.trim(), contentWidth - 12);
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
    doc.setTextColor(100, 100, 100);

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    doc.setFont("helvetica", "italic");
    doc.text(
      "⚠️ This is an AI-generated medical consultation summary for informational purposes only.",
      pageWidth / 2,
      pageHeight - 13,
      { align: "center" }
    );
    doc.text(
      "Not a substitute for professional medical diagnosis. Please consult a licensed healthcare provider.",
      pageWidth / 2,
      pageHeight - 9,
      { align: "center" }
    );

    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5, {
      align: "right",
    });
  }

  // Generate filename
  const fileName = `Medical_Report_${
    patientInfo.name?.replace(/\s+/g, "_") || "Patient"
  }_${patientInfo.sessionId.substring(0, 12)}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  doc.save(fileName);

  console.log("✅ PDF downloaded:", fileName);
}
