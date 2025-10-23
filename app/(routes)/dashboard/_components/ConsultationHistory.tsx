"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false); // New state

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show only 3 sessions or all based on state
  const displayedSessions = showAll ? sessions : sessions.slice(0, 3);
  const hasMore = sessions.length > 3;

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-center">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 ">
            My History of Consultations
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your medical consultations
          </p>
        </div>

        {/* New Consultation Button */}
        {/* <div className="mb-8">
          <button
            onClick={() => router.push("/dashboard/new-consultation")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            + New Consultation
          </button>
        </div> */}

        {/* Consultation History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Consultation History
            </h2>
            <span className="text-sm text-gray-500">
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">
                No consultation history yet
              </p>
              <p className="text-gray-400 text-sm">
                Start your first consultation to see it here
              </p>
            </div>
          ) : (
            <>
              {/* Sessions Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Session ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Patient
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Doctor
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayedSessions.map((session) => (
                      <tr key={session.sessionId} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {session.sessionId.split("-")[1].substring(0, 8)}...
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {new Date(session.createdOn).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          {session.reportGenerated ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⏳ Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {session.patientName || "Not provided"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {session.callDuration
                            ? `${Math.floor(session.callDuration / 60)}m ${
                                session.callDuration % 60
                              }s`
                            : "N/A"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {session.selectedDocter?.specialist ||
                            "General Physician"}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex gap-2">
                            {session.reportGenerated && session.report ? (
                              <>
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/dashboard/report/${session.sessionId}`
                                    )
                                  }
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => downloadPDF(session)}
                                  className="text-green-600 hover:text-green-800 font-medium"
                                >
                                  PDF
                                </button>
                              </>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                No report
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Show More Button */}
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    {showAll ? (
                      <>
                        <span>Show Less</span>
                        <svg
                          className="inline-block ml-2 w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Show More ({sessions.length - 3} more)</span>
                        <svg
                          className="inline-block ml-2 w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to download PDF
function downloadPDF(session: any) {
  const element = document.createElement("a");
  const file = new Blob([session.report], { type: "text/plain" });
  element.href = URL.createObjectURL(file);
  element.download = `medical-report-${session.sessionId}.txt`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// import React from 'react'
// import HistoryList from './_components/HistoryList'
// import DoctorsList from './_components/DoctorsList'
// import AddNewSession from './_components/AddNewSession'

// function Dashboard() {
//   return (
//     <div>
//       <div className="flex justify-between items-center">
//         <h2 className="text-2xl font-bold">My Dashboard</h2>
//         <AddNewSession />
//       </div>
//       <HistoryList />
//       <DoctorsList />
//     </div>
//   )
// }

// export default Dashboard
