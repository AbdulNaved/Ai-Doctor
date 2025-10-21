"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";

interface VoiceRecordButtonProps {
  isCallActive: boolean;
  onRecordingComplete: (audioBlob: Blob) => void;
}

const VoiceRecordButton = ({
  isCallActive,
  onRecordingComplete,
}: VoiceRecordButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  const cleanup = () => {
    console.log("Cleaning up recording resources...");

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping media recorder:", e);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("Audio track stopped:", track.label);
      });
      streamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  };

  const startRecording = async () => {
    try {
      console.log("Starting voice recording...");
      setError(null);
      audioChunksRef.current = [];

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio recording not supported in this browser");
      }

      // Request microphone access with optimized settings
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1, // Mono audio for speech
        },
      });

      console.log("Microphone access granted");

      // Determine best supported MIME type
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      console.log("Using MIME type:", mimeType);

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`Audio chunk collected: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("Recording stopped, processing audio...");
        console.log(`Total chunks collected: ${audioChunksRef.current.length}`);

        if (audioChunksRef.current.length === 0) {
          console.error("No audio data collected");
          setError("No audio recorded. Please try again.");
          cleanup();
          return;
        }

        // Create blob with the same MIME type used for recording
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log(
          `Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`
        );

        if (audioBlob.size === 0) {
          console.error("Audio blob is empty");
          setError("Recording failed. Please try again.");
          cleanup();
          return;
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Clear chunks
        audioChunksRef.current = [];
        setIsRecording(false);

        // Send to parent component
        onRecordingComplete(audioBlob);
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording error occurred");
        cleanup();
      };

      // Start recording - collect data every 100ms for better responsiveness
      mediaRecorder.start(100);
      setIsRecording(true);
      console.log("Voice recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          setError("Microphone permission denied. Please allow access.");
        } else if (error.name === "NotFoundError") {
          setError("No microphone found. Please connect a microphone.");
        } else {
          setError(error.message);
        }
      } else {
        setError("Could not start recording");
      }

      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("Stopping voice recording...");

      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.error("Error stopping recording:", error);
        cleanup();
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!isCallActive) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {isRecording ? (
          <>
            <span className="text-sm text-red-500 animate-pulse font-medium">
              🔴 Recording {formatTime(recordingTime)}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              className="flex items-center gap-1"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={startRecording}
            className="flex items-center gap-1"
          >
            <Mic className="h-4 w-4" />
            Record Voice
          </Button>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceRecordButton;
