"use client";
import axios from "axios";
import { useParams } from "next/navigation";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Circle,
  PhoneCall,
  StopCircle,
  FileText,
  Download,
  Printer,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Doctor } from "../../_components/DoctorsList";
import AudioProcessor from "../components/AudioProcessor";
import TextToSpeech, { TextToSpeechRef } from "../components/TextToSpeech";
import ConversationDisplay from "../components/ConversationDisplay";
import ConversationManager, {
  Message,
  ConversationManagerRef,
} from "../components/ConversationManager";
import VoiceRecordButton from "../components/VoiceRecordButton";
import TranscriptionLoading from "../components/TranscriptionLoading";
import { convertAudioToText } from "../services/speechToText";

type Session = {
  id: number;
  notes: string;
  sessionId: string;
  report: Record<string, unknown>;
  selectedDocter: Doctor | null;
  createdOn: string;
};

function MedicalVoiceAgent() {
  const { sesstionId } = useParams();

  const [session, setSession] = useState<Session>();
  const [doctorImage, setDoctorImage] = useState<string | null>(null);
  const [doctorSpecialist, setDoctorSpecialist] = useState<string>("");
  const [doctorPrompt, setDoctorPrompt] = useState<string>("");
  const [doctorId, setDoctorId] = useState<number | undefined>(undefined);

  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [userCaption, setUserCaption] = useState<string>("");
  const [assistantCaption, setAssistantCaption] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAssistantText, setCurrentAssistantText] = useState<string>("");

  const [showDebugTools, setShowDebugTools] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Report generation states
  const [generatingReport, setGeneratingReport] = useState(false);
  const [medicalReport, setMedicalReport] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const conversationManagerRef = useRef<ConversationManagerRef>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const textToSpeechRef = useRef<TextToSpeechRef>(null);

  useEffect(() => {
    if (sesstionId) {
      getSessionDetails();
    }

    return () => {
      cleanupCall();
    };
  }, [sesstionId]);

  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive]);

  const getSessionDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(
        `/api/session-chat?sessionId=${sesstionId}`
      );
      setSession(response.data);

      if (response.data?.selectedDocter) {
        const doctorData = response.data.selectedDocter;
        setDoctorImage(doctorData.image || null);
        setDoctorSpecialist(doctorData.specialist || "AI Medical Agent");
        setDoctorPrompt(doctorData.agentPrompt || "");
        setDoctorId(doctorData.id);

        console.log(
          `Doctor ID: ${doctorData.id}, Voice ID: ${
            doctorData.voiceId || "default"
          }`
        );
      }

      setIsLoading(false);
    } catch (error: unknown) {
      console.error("Error fetching session details:", error);
      setError("Failed to load session details. Using default settings.");
      setIsLoading(false);

      setDoctorSpecialist("AI Medical Agent");
      setDoctorImage("/doctor1.png");
      setDoctorId(1);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const startCall = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsCallActive(true);
      setMessages([]); // Clear previous messages

      setIsLoading(false);
    } catch (error: unknown) {
      console.error("Error starting call:", error);
      setError("Could not start call. Please try again.");
      setIsLoading(false);
    }
  };

  // Cleanup function without report generation
  const cleanupCall = () => {
    console.log("Cleaning up call resources...");

    if (textToSpeechRef.current) {
      textToSpeechRef.current.stopSpeaking();
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = "";
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Main stop call function with report generation
  const stopCall = async () => {
    console.log("Stopping call and generating medical report...");

    setIsCallActive(false);
    cleanupCall();

    // Reset listening/speaking states immediately
    setIsListening(false);
    setIsSpeaking(false);
    setIsTranscribing(false);

    // Generate medical report if conversation happened
    if (messages.length > 1) {
      setGeneratingReport(true);

      try {
        console.log(
          "📋 Generating medical report from",
          messages.length,
          "messages..."
        );

        const reportResponse = await axios.post("/api/generate-report", {
          conversationHistory: messages,
          patientInfo: {
            doctorName: doctorSpecialist,
            sessionId: sesstionId,
          },
          sessionId: sesstionId,
        });

        const report = reportResponse.data.report;
        setMedicalReport(report);

        // Save report to database
        await axios.put("/api/session-chat", {
          sessionId: sesstionId,
          report: report,
        });

        console.log("✅ Medical report generated and saved");

        // Show report modal
        setShowReportModal(true);
      } catch (error) {
        console.error("❌ Error generating report:", error);
        setError("Failed to generate medical report. Please try again.");
      } finally {
        setGeneratingReport(false);
      }
    } else {
      console.log("No conversation to generate report from");
    }

    // Reset UI state
    setUserCaption("");
    setAssistantCaption("");
    setCurrentAssistantText("");
    setCallDuration(0);

    console.log("Call stopped successfully");
  };

  const handleTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      setUserCaption(transcript);

      if (conversationManagerRef.current) {
        conversationManagerRef.current.handleTranscript(transcript, isFinal);
      }
    },
    []
  );

  const handleNewMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      const exists = prev.some(
        (m) =>
          m.role === message.role &&
          m.content === message.content &&
          Math.abs(m.timestamp - message.timestamp) < 1000
      );

      if (exists) return prev;
      return [...prev, message];
    });

    if (message.role === "assistant") {
      setAssistantCaption(message.content);
      setCurrentAssistantText(message.content);

      console.log(
        `AI response received (${message.content.length} chars). Sending to TTS...`
      );
    }
  }, []);

  const handleSpeakingStart = useCallback(() => {
    console.log("AI speaking started");
    setIsSpeaking(true);
    setIsListening(false);
  }, []);

  const handleSpeakingEnd = useCallback(() => {
    console.log("AI speaking ended");
    setIsSpeaking(false);

    setTimeout(() => {
      if (isCallActive) {
        setIsListening(true);
      }
    }, 500);
  }, [isCallActive]);

  const handleError = useCallback((errorMessage: string) => {
    console.error(errorMessage);
    setError(errorMessage);
  }, []);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true);
      setError(null);

      console.log("Processing recorded audio...");

      const transcript = await convertAudioToText(audioBlob);

      console.log("Transcription result:", transcript);

      setUserCaption(transcript);

      if (conversationManagerRef.current) {
        conversationManagerRef.current.handleTranscript(transcript, true);
      }
    } catch (error: unknown) {
      console.error("Error processing recording:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(`Recording error: ${errorMessage}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Report download functionality
  const downloadReport = () => {
    if (!medicalReport) return;

    const blob = new Blob([medicalReport], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical-report-${sesstionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Report print functionality
  const printReport = () => {
    if (!medicalReport) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Medical Report - ${sesstionId}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 40px; 
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
              }
              pre { 
                white-space: pre-wrap; 
                font-size: 14px;
                background: #f5f5f5;
                padding: 20px;
                border-radius: 8px;
              }
              h1 { 
                color: #2563eb;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 10px;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                text-align: center;
                font-size: 12px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Medical Consultation Report</h1>
              <p>Session ID: ${sesstionId}</p>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
            <pre>${medicalReport}</pre>
            <div class="footer">
              <p>This is an AI-generated consultation summary for informational purposes.</p>
              <p>Not a substitute for professional medical diagnosis.</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="p-5 border-2 rounded-xl bg-secondary">
      <div className="flex items-center justify-between">
        <h2 className="p-1 px-2 border rounded-md flex items-center gap-2">
          {isCallActive ? (
            <>
              <Circle className="text-green-500 animate-pulse" /> Connected
            </>
          ) : (
            <>
              <Circle /> Not Connected
            </>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-500">
            {formatTime(callDuration)}
          </h2>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-10 justify-center">
        {doctorImage ? (
          <Image
            src={doctorImage}
            alt={doctorSpecialist || "AI Doctor"}
            width={120}
            height={120}
            className="w-[100px] h-[100px] object-cover rounded-full"
          />
        ) : (
          <div className="w-[100px] h-[100px] bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-gray-400">No Image</span>
          </div>
        )}
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold mt-2">{doctorSpecialist}</h2>
          <p className="text-sm text-gray-500">AI Medical Agent</p>

          <ConversationDisplay
            messages={messages}
            userCaption={userCaption}
            assistantCaption={assistantCaption}
            isCallActive={isCallActive}
            isListening={isListening}
            isSpeaking={isSpeaking}
          />

          {!isCallActive ? (
            <Button
              className="mt-6 flex items-center justify-center"
              onClick={startCall}
              disabled={isLoading}
            >
              {isLoading ? (
                "Loading..."
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 mr-2" /> Start Call
                </>
              )}
            </Button>
          ) : (
            <Button
              className="mt-6 flex items-center justify-center bg-red-500 hover:bg-red-600"
              onClick={stopCall}
              disabled={isLoading || generatingReport}
            >
              <StopCircle className="w-4 h-4 mr-2" />
              {generatingReport ? "Generating Report..." : "End Call"}
            </Button>
          )}
        </div>
      </div>

      {isCallActive && (
        <>
          <AudioProcessor
            isCallActive={isCallActive}
            isListening={isListening}
            onTranscriptReceived={handleTranscript}
            onError={handleError}
          />

          <TextToSpeech
            ref={textToSpeechRef}
            text={currentAssistantText}
            voiceId={session?.selectedDocter?.voiceId}
            doctorId={doctorId}
            onSpeakingStart={handleSpeakingStart}
            onSpeakingEnd={handleSpeakingEnd}
            onError={handleError}
          />

          <ConversationManager
            ref={conversationManagerRef}
            isCallActive={isCallActive}
            doctorPrompt={doctorPrompt}
            onNewMessage={handleNewMessage}
            onError={handleError}
          />

          <div className="mt-4 flex justify-center">
            <VoiceRecordButton
              isCallActive={isCallActive}
              onRecordingComplete={handleRecordingComplete}
            />
          </div>

          <TranscriptionLoading isLoading={isTranscribing} />
        </>
      )}

      {/* Loading Modal for Report Generation */}
      {generatingReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600" />
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">
                  Generating Medical Report
                </h3>
                <p className="text-gray-600">
                  Analyzing conversation and creating comprehensive symptom
                  diary...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medical Report Modal */}
      {showReportModal && medicalReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-blue-50">
              <div className="flex items-center gap-3">
                <FileText className="w-7 h-7 text-blue-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Medical Consultation Report
                  </h2>
                  <p className="text-sm text-gray-600">
                    Session ID: {sesstionId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-white p-6 rounded-lg shadow-inner">
                {medicalReport}
              </pre>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end bg-gray-50">
              <Button
                onClick={downloadReport}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
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
              <Button
                onClick={() => setShowReportModal(false)}
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

export default MedicalVoiceAgent;

// "use client"
// import axios from 'axios'
// import { useParams } from 'next/navigation'
// import React, { useState, useEffect, useRef, useCallback } from 'react'
// import { Circle, PhoneCall, StopCircle, Bug } from 'lucide-react'
// import Image from 'next/image'
// import { Button } from '@/components/ui/button'
// import { Doctor } from '../../_components/DoctorsList'
// import AudioProcessor from '../components/AudioProcessor'
// import TextToSpeech, { TextToSpeechRef } from '../components/TextToSpeech'
// import ConversationDisplay from '../components/ConversationDisplay'
// import ConversationManager, { Message, ConversationManagerRef } from '../components/ConversationManager'
// import VoiceRecordButton from '../components/VoiceRecordButton'
// import TranscriptionLoading from '../components/TranscriptionLoading'
// import { convertAudioToText } from '../services/speechToText'

// type Session = {
//   id: number
//   notes: string
//   sessionId: string
//   report: Record<string, unknown>
//   selectedDocter: Doctor | null
//   createdOn: string
// }

// function MedicalVoiceAgent() {
//   const { sesstionId } = useParams();

//   const [session, setSession] = useState<Session>();
//   const [doctorImage, setDoctorImage] = useState<string | null>(null);
//   const [doctorSpecialist, setDoctorSpecialist] = useState<string>("");
//   const [doctorPrompt, setDoctorPrompt] = useState<string>("");
//   const [doctorId, setDoctorId] = useState<number | undefined>(undefined);

//   const [isCallActive, setIsCallActive] = useState(false);
//   const [callDuration, setCallDuration] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const [messages, setMessages] = useState<Message[]>([]);
//   const [userCaption, setUserCaption] = useState<string>("");
//   const [assistantCaption, setAssistantCaption] = useState<string>("");
//   const [isListening, setIsListening] = useState(false);
//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [currentAssistantText, setCurrentAssistantText] = useState<string>("");

//   const [showDebugTools, setShowDebugTools] = useState(false);

//   const timerRef = useRef<NodeJS.Timeout | null>(null);

//   const conversationManagerRef = useRef<ConversationManagerRef>(null);

//   const [isTranscribing, setIsTranscribing] = useState(false);

//   const audioElementRef = useRef<HTMLAudioElement | null>(null);

//   const textToSpeechRef = useRef<TextToSpeechRef>(null);

//   useEffect(() => {
//     if (sesstionId) {
//       getSessionDetails();
//     }

//     return () => {
//       stopCall();
//     };
//   }, [sesstionId]);

//   useEffect(() => {
//     if (isCallActive) {
//       timerRef.current = setInterval(() => {
//         setCallDuration((prev) => prev + 1);
//       }, 1000);
//     } else if (timerRef.current) {
//       clearInterval(timerRef.current);
//     }

//     return () => {
//       if (timerRef.current) clearInterval(timerRef.current);
//     };
//   }, [isCallActive]);

//   const getSessionDetails = async () => {
//     try {
//       setIsLoading(true);
//       setError(null);

//       const response = await axios.get(
//         `/api/session-chat?sessionId=${sesstionId}`
//       );
//       setSession(response.data);

//       if (response.data?.selectedDocter) {
//         const doctorData = response.data.selectedDocter;
//         setDoctorImage(doctorData.image || null);
//         setDoctorSpecialist(doctorData.specialist || "AI Medical Agent");
//         setDoctorPrompt(doctorData.agentPrompt || "");
//         setDoctorId(doctorData.id);

//         console.log(
//           `Doctor ID: ${doctorData.id}, Voice ID: ${
//             doctorData.voiceId || "default"
//           }`
//         );
//       }

//       setIsLoading(false);
//     } catch (error: unknown) {
//       console.error("Error fetching session details:", error);
//       setError("Failed to load session details. Using default settings.");
//       setIsLoading(false);

//       setDoctorSpecialist("AI Medical Agent");
//       setDoctorImage("/doctor1.png");
//       setDoctorId(1);
//     }
//   };

//   const formatTime = (seconds: number): string => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, "0")}:${secs
//       .toString()
//       .padStart(2, "0")}`;
//   };

//   const startCall = async () => {
//     try {
//       setIsLoading(true);
//       setError(null);
//       setIsCallActive(true);

//       setIsLoading(false);
//     } catch (error: unknown) {
//       console.error("Error starting call:", error);
//       setError("Could not start call. Please try again.");
//       setIsLoading(false);
//     }
//   };

//   const stopCall = () => {
//     console.log("Stopping call and resetting all components...");

//     setIsCallActive(false);

//     if (textToSpeechRef.current) {
//       console.log("Stopping TTS speech...");
//       textToSpeechRef.current.stopSpeaking();
//     }

//     if (audioElementRef.current) {
//       console.log("Stopping audio playback...");
//       audioElementRef.current.pause();
//       audioElementRef.current.src = "";
//     }

//     if (window.speechSynthesis) {
//       console.log("Cancelling speech synthesis...");
//       window.speechSynthesis.cancel();
//     }

//     if (timerRef.current) {
//       console.log("Clearing timer...");
//       clearInterval(timerRef.current);
//       timerRef.current = null;
//     }

//     setIsListening(false);
//     setIsSpeaking(false);
//     setIsTranscribing(false);
//     setUserCaption("");
//     setAssistantCaption("");
//     setCurrentAssistantText("");
//     setCallDuration(0);

//     setMessages([]);

//     console.log("Call stopped and all components reset");
//   };

//   const handleTranscript = useCallback(
//     (transcript: string, isFinal: boolean) => {
//       setUserCaption(transcript);

//       if (conversationManagerRef.current) {
//         conversationManagerRef.current.handleTranscript(transcript, isFinal);
//       }
//     },
//     []
//   );

//   const handleNewMessage = useCallback((message: Message) => {
//     setMessages((prev) => {
//       const exists = prev.some(
//         (m) =>
//           m.role === message.role &&
//           m.content === message.content &&
//           Math.abs(m.timestamp - message.timestamp) < 1000
//       );

//       if (exists) return prev;
//       return [...prev, message];
//     });

//     if (message.role === "assistant") {
//       setAssistantCaption(message.content);
//       setCurrentAssistantText(message.content);

//       console.log(
//         `AI response received (${message.content.length} chars). Sending to TTS...`
//       );
//     }
//   }, []);

//   const handleSpeakingStart = useCallback(() => {
//     console.log("AI speaking started");
//     setIsSpeaking(true);
//     setIsListening(false);
//   }, []);

//   const handleSpeakingEnd = useCallback(() => {
//     console.log("AI speaking ended");
//     setIsSpeaking(false);

//     setTimeout(() => {
//       if (isCallActive) {
//         setIsListening(true);
//       }
//     }, 500);
//   }, [isCallActive]);

//   const handleError = useCallback((errorMessage: string) => {
//     console.error(errorMessage);
//     setError(errorMessage);
//   }, []);

//   const handleRecordingComplete = async (audioBlob: Blob) => {
//     try {
//       setIsTranscribing(true);
//       setError(null);

//       console.log("Processing recorded audio...");

//       const transcript = await convertAudioToText(audioBlob);

//       console.log("Transcription result:", transcript);

//       setUserCaption(transcript);

//       if (conversationManagerRef.current) {
//         conversationManagerRef.current.handleTranscript(transcript, true);
//       }
//     } catch (error: unknown) {
//       console.error("Error processing recording:", error);
//       const errorMessage =
//         error instanceof Error ? error.message : "Unknown error";
//       setError(`Recording error: ${errorMessage}`);
//     } finally {
//       setIsTranscribing(false);
//     }
//   };
//   // Add this to your MedicalVoiceAgent component

//   const [generatingReport, setGeneratingReport] = useState(false);
//   const [medicalReport, setMedicalReport] = useState<string | null>(null);

//   const stopCall = async () => {
//     console.log("Stopping call and generating medical report...");

//     setIsCallActive(false);
//     setGeneratingReport(true);

//     // Stop all audio/TTS
//     if (textToSpeechRef.current) {
//       textToSpeechRef.current.stopSpeaking();
//     }
//     if (audioElementRef.current) {
//       audioElementRef.current.pause();
//       audioElementRef.current.src = "";
//     }
//     if (window.speechSynthesis) {
//       window.speechSynthesis.cancel();
//     }
//     if (timerRef.current) {
//       clearInterval(timerRef.current);
//       timerRef.current = null;
//     }

//     // Generate medical report if conversation happened
//     if (messages.length > 1) {
//       try {
//         console.log("📋 Generating medical report...");

//         const reportResponse = await axios.post("/api/generate-report", {
//           conversationHistory: messages,
//           patientInfo: {
//             doctorName: doctorSpecialist,
//             sessionId: sesstionId,
//           },
//           sessionId: sesstionId,
//         });

//         const report = reportResponse.data.report;
//         setMedicalReport(report);

//         // Save report to database
//         await axios.put("/api/session-chat", {
//           sessionId: sesstionId,
//           report: report,
//         });

//         console.log("✅ Medical report generated and saved");

//         // Show report to user
//         alert(
//           "Consultation complete! Your medical report has been generated and saved."
//         );
//       } catch (error) {
//         console.error("Error generating report:", error);
//         setError("Failed to generate medical report");
//       }
//     }

//     // Reset state
//     setIsListening(false);
//     setIsSpeaking(false);
//     setIsTranscribing(false);
//     setUserCaption("");
//     setAssistantCaption("");
//     setCurrentAssistantText("");
//     setCallDuration(0);
//     setGeneratingReport(false);

//     console.log("Call stopped and report generated");
//   };

//   return (
//     <div className="p-5 border-2 rounded-xl bg-secondary">
//       <div className="flex items-center justify-between">
//         <h2 className="p-1 px-2 border rounded-md flex items-center gap-2">
//           {isCallActive ? (
//             <>
//               <Circle className="text-green-500 animate-pulse" /> Connected
//             </>
//           ) : (
//             <>
//               <Circle /> Not Connected
//             </>
//           )}
//         </h2>
//         <div className="flex items-center gap-2">
//           <h2 className="text-xl font-bold text-gray-500">
//             {formatTime(callDuration)}
//           </h2>
//         </div>
//       </div>

//       <div className="flex flex-col items-center gap-2 mt-10 justify-center">
//         {doctorImage ? (
//           <Image
//             src={doctorImage}
//             alt={doctorSpecialist || "AI Doctor"}
//             width={120}
//             height={120}
//             className="w-[100px] h-[100px] object-cover rounded-full"
//           />
//         ) : (
//           <div className="w-[100px] h-[100px] bg-gray-200 rounded-full flex items-center justify-center">
//             <span className="text-gray-400">No Image</span>
//           </div>
//         )}
//         <div className="flex flex-col items-center justify-center">
//           <h2 className="text-lg font-bold mt-2">{doctorSpecialist}</h2>
//           <p className="text-sm text-gray-500">AI Medical Agent</p>

//           <ConversationDisplay
//             messages={messages}
//             userCaption={userCaption}
//             assistantCaption={assistantCaption}
//             isCallActive={isCallActive}
//             isListening={isListening}
//             isSpeaking={isSpeaking}
//           />

//           {!isCallActive ? (
//             <Button
//               className="mt-6 flex items-center justify-center"
//               onClick={startCall}
//               disabled={isLoading}
//             >
//               {isLoading ? (
//                 "Loading..."
//               ) : (
//                 <>
//                   <PhoneCall className="w-4 h-4 mr-2" /> Start Call
//                 </>
//               )}
//             </Button>
//           ) : (
//             <Button
//               className="mt-6 flex items-center justify-center bg-red-500 hover:bg-red-600"
//               onClick={stopCall}
//               disabled={isLoading}
//             >
//               <StopCircle className="w-4 h-4 mr-2" /> End Call
//             </Button>
//           )}
//         </div>
//       </div>

//       {isCallActive && (
//         <>
//           <AudioProcessor
//             isCallActive={isCallActive}
//             isListening={isListening}
//             onTranscriptReceived={handleTranscript}
//             onError={handleError}
//           />

//           <TextToSpeech
//             ref={textToSpeechRef}
//             text={currentAssistantText}
//             voiceId={session?.selectedDocter?.voiceId}
//             doctorId={doctorId}
//             onSpeakingStart={handleSpeakingStart}
//             onSpeakingEnd={handleSpeakingEnd}
//             onError={handleError}
//           />

//           <ConversationManager
//             ref={conversationManagerRef}
//             isCallActive={isCallActive}
//             doctorPrompt={doctorPrompt}
//             onNewMessage={handleNewMessage}
//             onError={handleError}
//           />

//           <div className="mt-4 flex justify-center">
//             <VoiceRecordButton
//               isCallActive={isCallActive}
//               onRecordingComplete={handleRecordingComplete}
//             />
//           </div>

//           <TranscriptionLoading isLoading={isTranscribing} />
//         </>
//       )}
//     </div>
//   );
// }

// export default MedicalVoiceAgent
