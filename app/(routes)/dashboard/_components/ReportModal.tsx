"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Printer, X } from "lucide-react";
import { Session } from "@/types/session";

interface ReportModalProps {
  report: string;
  session: Session;
  onClose: () => void;
  onDownload: () => void;
}

function ReportModal({
  report,
  session,
  onClose,
  onDownload,
}: ReportModalProps) {
  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Medical Report - ${session.sessionId}</title>
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 40px;
                line-height: 1.8;
                max-width: 900px;
                margin: 0 auto;
                color: #333;
              }
              pre { 
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: inherit;
                font-size: 14px;
                background: #f8f9fa;
                padding: 24px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
              }
              h1 { 
                color: #2563eb;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 12px;
                margin-bottom: 8px;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px;
                border-radius: 10px;
                color: white;
              }
              .header h1 {
                color: white;
                border: none;
                margin: 0;
              }
              .metadata {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
                border-left: 4px solid #2563eb;
              }
              .metadata p {
                margin: 8px 0;
                font-size: 14px;
              }
              .metadata strong {
                color: #2563eb;
              }
              .footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 2px solid #e9ecef;
                text-align: center;
              }
              .footer p {
                font-size: 12px;
                color: #6c757d;
                margin: 8px 0;
              }
              .disclaimer {
                background: #fff3cd;
                border: 1px solid #ffc107;
                padding: 15px;
                border-radius: 6px;
                margin-top: 20px;
              }
              @media print {
                body { padding: 20px; }
                .header { background: #2563eb !important; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📋 Medical Consultation Report</h1>
            </div>
            
            <div class="metadata">
              <p><strong>Session ID:</strong> ${session.sessionId}</p>
              <p><strong>Patient:</strong> ${
                session.patientName || "Not provided"
              }</p>
              <p><strong>Date:</strong> ${new Date(
                session.createdOn
              ).toLocaleString()}</p>
              <p><strong>Doctor:</strong> ${
                session.selectedDocter?.specialist || "AI Medical Assistant"
              }</p>
              ${
                session.callDuration
                  ? `<p><strong>Duration:</strong> ${Math.floor(
                      session.callDuration / 60
                    )}m ${session.callDuration % 60}s</p>`
                  : ""
              }
            </div>
            
            <pre>${report}</pre>
            
            <div class="footer">
              <div class="disclaimer">
                <p><strong>⚠️ Important Disclaimer</strong></p>
                <p>This is an AI-generated consultation summary for informational purposes only.</p>
                <p>Not a substitute for professional medical diagnosis or treatment.</p>
              </div>
              <p style="margin-top: 20px;">Generated on ${new Date().toLocaleString()}</p>
              <p>© ${new Date().getFullYear()} Medical Voice Agent</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Medical Consultation Report
                </h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span>Session: {session.sessionId.substring(0, 12)}...</span>
                  <span>•</span>
                  <span>
                    {new Date(session.createdOn).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Patient Info Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Patient:</span>
            <span className="ml-2 font-medium text-gray-900">
              {session.patientName || "Not provided"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Doctor:</span>
            <span className="ml-2 font-medium text-gray-900">
              {session.selectedDocter?.specialist || "AI Doctor"}
            </span>
          </div>
          {session.callDuration && (
            <div>
              <span className="text-gray-500">Duration:</span>
              <span className="ml-2 font-medium text-gray-900">
                {Math.floor(session.callDuration / 60)}m{" "}
                {session.callDuration % 60}s
              </span>
            </div>
          )}
        </div>

        {/* Report Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)] bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
              {report}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Generated on {new Date().toLocaleDateString()}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={printReport}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button
              onClick={onDownload}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;
