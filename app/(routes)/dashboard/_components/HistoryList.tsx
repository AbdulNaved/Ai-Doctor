"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Session } from "../types/session";
import { generateMedicalReportPDF } from "@/utils/generateMedicalReportPDF";

function HistoryList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showAll, setShowAll] = useState(false); // NEW: Show more state

  useEffect(() => {
    fetchSessions();
  }, []);

  // Component remains mostly the same, but ensure this part exists:

  const fetchSessions = async () => {
    try {
      console.log("🔄 Fetching sessions from API...");

      const response = await axios.get("/api/sessions");

      console.log("✅ API Response:", response.data);
      console.log("📊 Number of sessions:", response.data?.length || 0);

      // Set sessions even if empty array
      setSessions(response.data || []);
      setError(null);
    } catch (error: any) {
      console.error("❌ Error fetching sessions:", error);

      // Only set error for non-401 errors (401 means not logged in)
      if (error.response?.status !== 401) {
        setError(error.response?.data?.error || "Failed to load sessions");
      } else {
        // For 401, show empty state instead of error
        setSessions([]);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const viewReport = (session: Session) => {
    if (session.report) {
      setSelectedReport(session.report);
      setSelectedSession(session);
    }
  };

  const downloadPDF = (session: Session) => {
    if (!session.report) return;

    const duration = session.callDuration
      ? `${Math.floor(session.callDuration / 60)}m ${
          session.callDuration % 60
        }s`
      : "N/A";

    generateMedicalReportPDF(session.report, {
      name: session.patientName,
      age: session.patientAge,
      gender: session.patientGender,
      sessionId: session.sessionId,
      doctorName: session.selectedDocter?.specialist || "AI Doctor",
      date: new Date(session.createdOn).toLocaleDateString(),
      time: new Date(session.createdOn).toLocaleTimeString(),
      duration: duration,
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  // NEW: Calculate displayed sessions
  const displayedSessions = showAll ? sessions : sessions.slice(0, 3);
  const hasMore = sessions.length > 3;

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4">Consultation History</h3>
        <div className="flex items-center justify-center p-12 bg-white rounded-lg border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4">Consultation History</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Error Loading Sessions
          </h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <Button onClick={fetchSessions} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Consultation History</h3>
        <span className="text-sm text-gray-500">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No consultations yet
          </h3>
          <p className="text-gray-500 mb-4">
            Start your first consultation to see reports here
          </p>
        </div>
      ) : (
        <>
          {/* Sessions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all p-5"
              >
                {/* Session Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-mono text-gray-500">
                        {session.sessionId.substring(0, 12)}...
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(session.createdOn)}
                      </span>
                    </div>
                  </div>
                  {session.reportGenerated ? (
                    <span className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                      <CheckCircle className="w-3 h-3" />
                      Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs px-2 py-1 rounded-full font-semibold">
                      <AlertCircle className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                </div>

                {/* Session Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 truncate">
                      {session.patientName || "Not provided"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">
                      {new Date(session.createdOn).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">
                      {formatDuration(session.callDuration)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.selectedDocter?.specialist || "AI Doctor"}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                {session.reportGenerated && session.report ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => viewReport(session)}
                      className="flex-1 flex items-center justify-center gap-2 h-9"
                      variant="outline"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      onClick={() => downloadPDF(session)}
                      className="flex-1 flex items-center justify-center gap-2 h-9"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </Button>
                  </div>
                ) : (
                  <Button disabled className="w-full h-9" variant="secondary">
                    No Report Available
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Show More/Less Button */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => setShowAll(!showAll)}
                variant="outline"
                className="px-6 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                {showAll ? (
                  <>
                    <span>Show Less</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Show More ({sessions.length - 3} more)</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Report Modal */}
      {selectedReport && selectedSession && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedReport(null);
            setSelectedSession(null);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
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
                      <span>
                        Session: {selectedSession.sessionId.substring(0, 16)}...
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(
                          selectedSession.createdOn
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setSelectedSession(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Patient Info Bar */}
            <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-6 text-sm flex-wrap">
              <div>
                <span className="text-gray-500">Patient:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {selectedSession.patientName || "Not provided"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Doctor:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {selectedSession.selectedDocter?.specialist || "AI Doctor"}
                </span>
              </div>
              {selectedSession.callDuration && (
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {Math.floor(selectedSession.callDuration / 60)}m{" "}
                    {selectedSession.callDuration % 60}s
                  </span>
                </div>
              )}
            </div>

            {/* Report Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)] bg-gray-50">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                  {selectedReport}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-gray-50 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-gray-500">
                Generated on {new Date().toLocaleDateString()}
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => downloadPDF(selectedSession)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button
                  onClick={() => {
                    setSelectedReport(null);
                    setSelectedSession(null);
                  }}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryList;
