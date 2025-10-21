import React from "react";
import { FileText, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportDisplayProps {
  report: string;
  sessionId: string;
  onClose: () => void;
}

const ReportDisplay: React.FC<ReportDisplayProps> = ({
  report,
  sessionId,
  onClose,
}) => {
  const downloadReport = () => {
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical-report-${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Medical Report - ${sessionId}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              pre { white-space: pre-wrap; line-height: 1.6; }
              h1 { color: #2563eb; }
            </style>
          </head>
          <body>
            <h1>Medical Consultation Report</h1>
            <pre>${report}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Medical Consultation Report</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
            {report}
          </pre>
        </div>

        <div className="p-6 border-t flex gap-3 justify-end">
          <Button onClick={downloadReport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Report
          </Button>
          <Button
            onClick={printReport}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </Button>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportDisplay;
