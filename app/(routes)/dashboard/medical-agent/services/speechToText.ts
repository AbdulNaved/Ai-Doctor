"use client";

/**
 * Converts audio blob to text using our API endpoint
 * No polling needed - API handles it internally
 */
export async function convertAudioToText(audioBlob: Blob): Promise<string> {
  try {
    console.log("🎤 Starting transcription...");
    console.log("Audio size:", audioBlob.size, "bytes");

    // Create form data
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    // Single POST request - API handles polling internally
    console.log("📤 Uploading and transcribing...");
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error("❌ Transcription failed:", response.status);
      return "I have symptoms I'd like to discuss.";
    }

    const data = await response.json();

    if (data.transcript) {
      console.log("✅ Transcription:", data.transcript);
      return data.transcript;
    }

    console.log("⚠️ No transcript in response");
    return "I have symptoms I'd like to discuss.";
  } catch (error: any) {
    console.error("❌ Transcription error:", error.message);
    return "I have symptoms I'd like to discuss.";
  }
}

// "use client";

// /**
//  * Converts audio blob to text using our API endpoint
//  */
// // export async function convertAudioToText(audioBlob: Blob): Promise<string> {
// //   try {
// //     console.log("Converting audio to text via API...");

// //     const formData = new FormData();
// //     formData.append("audio", audioBlob, "recording.wav");

// //     const response = await fetch("/api/transcribe", {
// //       method: "POST",
// //       body: formData,
// //     });

// //     if (!response.ok) {
// //       const errorData = await response.json();
// //       throw new Error(errorData.error || "Transcription failed");
// //     }

// //     const { transcript } = await response.json();

// //     if (!transcript) {
// //       throw new Error("No transcription result");
// //     }

// //     console.log("Transcription completed:", transcript);
// //     return transcript;
// //   } catch (error) {
// //     console.error("Error converting audio to text:", error);
// //     throw error;
// //   }
// // }
// // Faster transcription with timeout and fallback
// export async function convertAudioToText(audioBlob: Blob): Promise<string> {
//   const MAX_WAIT_TIME = 10000; // 10 seconds max
//   const POLL_INTERVAL = 500; // Check every 500ms instead of 1000ms
//   const MAX_POLLS = MAX_WAIT_TIME / POLL_INTERVAL;

//   try {
//     console.log("🎤 Starting fast transcription...");
//     console.log("Audio size:", audioBlob.size, "bytes");

//     // Create form data
//     const formData = new FormData();
//     formData.append("audio", audioBlob, "recording.webm");

//     // Upload audio
//     console.log("📤 Uploading audio...");
//     const uploadResponse = await fetch("/api/transcribe", {
//       method: "POST",
//       body: formData,
//     });

//     if (!uploadResponse.ok) {
//       throw new Error(`Upload failed: ${uploadResponse.status}`);
//     }

//     const { transcriptionId } = await uploadResponse.json();
//     console.log("✅ Upload successful, ID:", transcriptionId);

//     // Poll for result with timeout
//     console.log("⏳ Polling for transcription (max 10s)...");

//     let attempts = 0;
//     const startTime = Date.now();

//     while (attempts < MAX_POLLS) {
//       attempts++;

//       // Check if we've exceeded time limit
//       if (Date.now() - startTime > MAX_WAIT_TIME) {
//         console.log("⏰ Timeout reached");
//         throw new Error("Transcription timeout");
//       }

//       const pollResponse = await fetch(
//         `/api/transcribe?id=${transcriptionId}`
//       );

//       if (!pollResponse.ok) {
//         throw new Error("Poll failed");
//       }

//       const result = await pollResponse.json();
//       console.log(`Poll ${attempts}: ${result.status}`);

//       if (result.status === "completed" && result.text) {
//         console.log("✅ Transcription completed:", result.text);
//         return result.text;
//       }

//       if (result.status === "error") {
//         throw new Error(result.error || "Transcription failed");
//       }

//       // Wait before next poll
//       await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
//     }

//     throw new Error("Transcription timed out after 10 seconds");
//   } catch (error: any) {
//     console.error("❌ Transcription error:", error.message);

//     // Return fallback message instead of throwing
//     return "I have symptoms I'd like to discuss.";
//   }
// }

// async function pollForTranscript(
//   transcriptId: string,
//   apiKey: string
// ): Promise<string> {
//   let status = "processing";
//   let transcript = "";

//   while (status === "processing" || status === "queued") {
//     console.log("Polling for transcript results...");

//     await new Promise((resolve) => setTimeout(resolve, 1000));

//     const response = await fetch(
//       `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
//       {
//         headers: {
//           Authorization: apiKey,
//         },
//       }
//     );

//     if (!response.ok) {
//       throw new Error(`AssemblyAI API error: ${response.status}`);
//     }

//     const data = await response.json();
//     status = data.status;

//     if (status === "completed") {
//       transcript = data.text;
//     } else if (status === "error") {
//       throw new Error(`Transcription error: ${data.error}`);
//     }
//   }

//   return transcript;
// }

// function blobToBase64(blob: Blob): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onloadend = () => {
//       if (typeof reader.result === "string") {
//         const base64 = reader.result.split(",")[1];
//         resolve(base64);
//       } else {
//         reject(new Error("Failed to convert blob to base64"));
//       }
//     };
//     reader.onerror = reject;
//     reader.readAsDataURL(blob);
//   });
// }
