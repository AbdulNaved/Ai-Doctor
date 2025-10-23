import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function extractPatientInfo(messages: any[]) {
  let name = "Not provided";
  let age = "Not provided";
  let gender = "Not provided";

  for (const msg of messages) {
    if (msg.role !== "user") continue;

    const nameMatch = msg.content.match(
      /(?:name is|i'm|i am|my name)\s+([A-Z][a-z]+)/i
    );
    if (nameMatch) name = nameMatch[1];

    const ageMatch = msg.content.match(/(?:age.*?|i'm |i am )(\d{1,3})/i);
    if (ageMatch) age = ageMatch[1];

    if (/\b(male|man|boy)\b/i.test(msg.content)) gender = "Male";
    if (/\b(female|woman|girl)\b/i.test(msg.content)) gender = "Female";
  }

  return { name, age, gender };
}

function generateFallbackReport(
  sessionId: string,
  messages: any[],
  callDuration: number,
  patientInfo: any
) {
  const timestamp = new Date().toLocaleString();
  const extracted = extractPatientInfo(messages);
  const duration = `${Math.floor(callDuration / 60)}m ${callDuration % 60}s`;

  const conversationText = messages
    .map((msg, idx) => {
      const role = msg.role === "user" ? "PATIENT" : "DOCTOR";
      const time = msg.timestamp
        ? new Date(msg.timestamp).toLocaleTimeString()
        : `${idx + 1}`;
      return `[${time}] ${role}: ${msg.content}`;
    })
    .join("\n\n");

  return `
═══════════════════════════════════════════════════════════
              MEDICAL CONSULTATION REPORT
═══════════════════════════════════════════════════════════

SESSION INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Session ID: ${sessionId}
Date & Time: ${timestamp}
Duration: ${duration}
Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}

PATIENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${extracted.name}
Age: ${extracted.age}
Gender: ${extracted.gender}

COMPLETE CONSULTATION TRANSCRIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${conversationText || "No conversation recorded"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLINICAL SUMMARY
Review the conversation above for chief complaints, symptoms, 
recommendations, and follow-up instructions.

DISCLAIMER
This is an AI-assisted consultation for informational purposes only.
Not a substitute for professional medical diagnosis.

═══════════════════════════════════════════════════════════
Generated: ${timestamp}
═══════════════════════════════════════════════════════════
`;
}

export async function POST(request: NextRequest) {
  let sessionId = "unknown";

  try {
    const body = await request.json();
    const {
      conversationHistory,
      patientInfo,
      sessionId: reqSessionId,
      callDuration,
    } = body;

    sessionId = reqSessionId || "unknown";

    console.log("📊 Report - Messages:", conversationHistory?.length || 0);

    if (!conversationHistory?.length) {
      return NextResponse.json({
        report: generateFallbackReport(sessionId, [], 0, patientInfo),
        success: true,
      });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({
        report: generateFallbackReport(
          sessionId,
          conversationHistory,
          callDuration || 0,
          patientInfo
        ),
        success: true,
      });
    }

    const fullConversation = conversationHistory
      .map((msg: any, idx: number) => {
        const role = msg.role === "user" ? "PATIENT" : "DOCTOR";
        const time = msg.timestamp
          ? new Date(msg.timestamp).toLocaleTimeString()
          : `${idx + 1}`;
        return `[${time}] ${role}: ${msg.content}`;
      })
      .join("\n");

    const reportPrompt = `Create a detailed medical report from this conversation:

${fullConversation}

Include:
1. PATIENT INFO (extract name, age, gender)
2. CHIEF COMPLAINT (main reason)
3. SYMPTOMS REPORTED (all symptoms)
4. ASSESSMENT (likely diagnosis)
5. RECOMMENDATIONS (medicines with doses + home remedies)
6. RED FLAGS (warning signs)
7. FOLLOW-UP PLAN
8. COMPLETE CONVERSATION TRANSCRIPT

Format professionally.`;

    console.log("🤖 Calling Groq...");

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: reportPrompt }],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        report: generateFallbackReport(
          sessionId,
          conversationHistory,
          callDuration || 0,
          patientInfo
        ),
        success: true,
      });
    }

    const data = await response.json();
    let report = data.choices?.[0]?.message?.content;

    if (!report) {
      return NextResponse.json({
        report: generateFallbackReport(
          sessionId,
          conversationHistory,
          callDuration || 0,
          patientInfo
        ),
        success: true,
      });
    }

    // Add conversation if not included
    if (!report.includes("TRANSCRIPT") && !report.includes("CONVERSATION")) {
      report += `\n\n${"═".repeat(63)}\n`;
      report += `         COMPLETE CONVERSATION TRANSCRIPT\n`;
      report += `${"═".repeat(63)}\n\n`;
      report += fullConversation;
      report += `\n\n${"═".repeat(63)}\n`;
      report += `Generated: ${new Date().toLocaleString()}\n`;
      report += `${"═".repeat(63)}`;
    }

    console.log("✅ Report generated");

    return NextResponse.json({
      report,
      success: true,
    });
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    return NextResponse.json({
      report: generateFallbackReport(sessionId, [], 0, {}),
      success: true,
    });
  }
}

//b
// import { NextRequest, NextResponse } from "next/server";

// const GROQ_API_KEY = process.env.GROQ_API_KEY;

// function extractPatientInfo(messages: any[]) {
//   let name = "Not provided";
//   let age = "Not provided";
//   let gender = "Not provided";

//   for (const msg of messages) {
//     if (msg.role !== "user") continue;

//     const nameMatch = msg.content.match(
//       /(?:name is|i'm|i am|my name)\s+([A-Z][a-z]+)/i
//     );
//     if (nameMatch) name = nameMatch[1];

//     const ageMatch = msg.content.match(/(?:age.*?|i'm |i am )(\d{1,3})/i);
//     if (ageMatch) age = ageMatch[1];

//     if (/\b(male|man|boy)\b/i.test(msg.content)) gender = "Male";
//     if (/\b(female|woman|girl)\b/i.test(msg.content)) gender = "Female";
//   }

//   return { name, age, gender };
// }

// function generateFallbackReport(
//   sessionId: string,
//   messages: any[],
//   callDuration: number,
//   patientInfo: any
// ) {
//   const timestamp = new Date().toLocaleString();
//   const extracted = extractPatientInfo(messages);
//   const patientMsgs = messages.filter((m) => m.role === "user");
//   const aiMsgs = messages.filter((m) => m.role === "assistant");
//   const duration = `${Math.floor(callDuration / 60)}m ${callDuration % 60}s`;

//   return `
// ═══════════════════════════════════════════════════════════
//               MEDICAL CONSULTATION REPORT
// ═══════════════════════════════════════════════════════════

// SESSION INFORMATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Session ID: ${sessionId}
// Date & Time: ${timestamp}
// Duration: ${duration}
// Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}

// PATIENT INFORMATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Name: ${extracted.name}
// Age: ${extracted.age}
// Gender: ${extracted.gender}

// COMPLETE CONSULTATION TRANSCRIPT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ${messages
//   .map((msg, idx) => {
//     const role = msg.role === "user" ? "PATIENT" : "DOCTOR";
//     const time = msg.timestamp
//       ? new Date(msg.timestamp).toLocaleTimeString()
//       : `${idx + 1}`;
//     return `[${time}] ${role}: ${msg.content}`;
//   })
//   .join("\n\n")}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// CLINICAL SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Review the above conversation for:
// - Chief complaints and symptoms
// - Onset, duration, and severity
// - Recommendations provided
// - Follow-up instructions

// DISCLAIMER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This is an AI-assisted consultation for informational purposes only.
// Not a substitute for professional medical diagnosis.

// ═══════════════════════════════════════════════════════════
// Generated: ${timestamp}
// ═══════════════════════════════════════════════════════════
// `;
// }

// export async function POST(request: NextRequest) {
//   let sessionId = "unknown";

//   try {
//     const body = await request.json();
//     const {
//       conversationHistory,
//       patientInfo,
//       sessionId: reqSessionId,
//       callDuration,
//     } = body;

//     sessionId = reqSessionId || "unknown";

//     console.log(
//       "📊 Report generation - Messages:",
//       conversationHistory?.length || 0
//     );

//     if (!conversationHistory?.length) {
//       return NextResponse.json({
//         report: generateFallbackReport(sessionId, [], 0, patientInfo),
//         success: true,
//       });
//     }

//     if (!GROQ_API_KEY) {
//       return NextResponse.json({
//         report: generateFallbackReport(
//           sessionId,
//           conversationHistory,
//           callDuration || 0,
//           patientInfo
//         ),
//         success: true,
//       });
//     }

//     // Format full conversation
//     const fullConversation = conversationHistory
//       .map((msg: any, idx: number) => {
//         const role = msg.role === "user" ? "PATIENT" : "DOCTOR";
//         const time = msg.timestamp
//           ? new Date(msg.timestamp).toLocaleTimeString()
//           : `${idx + 1}`;
//         return `[${time}] ${role}: ${msg.content}`;
//       })
//       .join("\n");

//     const reportPrompt = `Create a detailed medical report from this conversation:

// ${fullConversation}

// Include these sections:

// 1. PATIENT INFORMATION (extract name, age, gender from conversation)
// 2. CHIEF COMPLAINT (main reason for visit)
// 3. SYMPTOMS REPORTED (list all symptoms with details)
// 4. MEDICAL HISTORY (if mentioned)
// 5. ASSESSMENT (likely diagnosis based on symptoms)
// 6. RECOMMENDATIONS GIVEN
//    - Medicines with exact doses
//    - Home remedies
//    - Rest and hydration advice
// 7. RED FLAGS (warning signs to watch)
// 8. FOLLOW-UP PLAN

// Also include the COMPLETE CONVERSATION TRANSCRIPT at the end.

// Format professionally with clear sections.`;

//     console.log("🤖 Calling Groq for report...");

//     const response = await fetch(
//       "https://api.groq.com/openai/v1/chat/completions",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${GROQ_API_KEY}`,
//         },
//         body: JSON.stringify({
//           model: "llama-3.3-70b-versatile",
//           messages: [{ role: "user", content: reportPrompt }],
//           temperature: 0.3,
//           max_tokens: 4000,
//         }),
//       }
//     );

//     if (!response.ok) {
//       console.error("❌ Groq error:", response.status);
//       return NextResponse.json({
//         report: generateFallbackReport(
//           sessionId,
//           conversationHistory,
//           callDuration || 0,
//           patientInfo
//         ),
//         success: true,
//       });
//     }

//     const data = await response.json();
//     let report = data.choices?.[0]?.message?.content;

//     if (!report) {
//       return NextResponse.json({
//         report: generateFallbackReport(
//           sessionId,
//           conversationHistory,
//           callDuration || 0,
//           patientInfo
//         ),
//         success: true,
//       });
//     }

//     // Add conversation transcript if not included
//     if (!report.includes("TRANSCRIPT") && !report.includes("CONVERSATION")) {
//       report += `\n\n${"═".repeat(63)}\n`;
//       report += `              COMPLETE CONVERSATION TRANSCRIPT\n`;
//       report += `${"═".repeat(63)}\n\n`;
//       report += fullConversation;
//       report += `\n\n${"═".repeat(63)}\n`;
//       report += `Generated: ${new Date().toLocaleString()}\n`;
//       report += `${"═".repeat(63)}`;
//     }

//     console.log("✅ Report generated successfully");

//     return NextResponse.json({
//       report,
//       success: true,
//     });
//   } catch (error: any) {
//     console.error("❌ Report error:", error.message);
//     return NextResponse.json({
//       report: generateFallbackReport(sessionId, [], 0, {}),
//       success: true,
//     });
//   }
// }

//we
// import { NextRequest, NextResponse } from "next/server";

// const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

// if (!XAI_API_KEY) {
//   console.error("❌ XAI_API_KEY missing in .env");
// } else {
//   console.log("✅ Report API: XAI key found");
// }

// function extractPatientInfo(messages: any[]) {
//   let name = "Not provided";
//   let age = "Not provided";
//   let gender = "Not provided";

//   for (const msg of messages) {
//     if (msg.role !== "user") continue;

//     // Extract name
//     const nameMatch = msg.content.match(
//       /(?:my name is|i'm|i am|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
//     );
//     if (nameMatch) name = nameMatch[1];

//     // Extract age
//     const ageMatch = msg.content.match(
//       /(?:i'm|i am|age is|my age)\s+(\d{1,3})(?:\s+years?\s+old)?/i
//     );
//     if (ageMatch) age = ageMatch[1];

//     // Extract gender
//     if (/\b(male|man|boy)\b/i.test(msg.content)) gender = "Male";
//     if (/\b(female|woman|girl)\b/i.test(msg.content)) gender = "Female";
//   }

//   return { name, age, gender };
// }

// function generateFallbackReport(
//   sessionId: string,
//   messages: any[],
//   callDuration: number,
//   patientInfo: any
// ) {
//   const timestamp = new Date().toLocaleString();
//   const extracted = extractPatientInfo(messages);
//   const patientMsgs = messages.filter((m) => m.role === "user");
//   const aiMsgs = messages.filter((m) => m.role === "assistant");
//   const duration = `${Math.floor(callDuration / 60)} minutes ${
//     callDuration % 60
//   } seconds`;

//   return `
// ═══════════════════════════════════════════════════════════
//               MEDICAL CONSULTATION REPORT
// ═══════════════════════════════════════════════════════════

// SESSION INFORMATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Session ID: ${sessionId}
// Date & Time: ${timestamp}
// Consultation Duration: ${duration}
// Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}

// PATIENT INFORMATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Name: ${extracted.name}
// Age: ${extracted.age}
// Gender: ${extracted.gender}

// CONVERSATION SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Total Messages: ${messages.length}
// Patient Statements: ${patientMsgs.length}
// AI Responses: ${aiMsgs.length}

// PATIENT STATEMENTS:
// ${patientMsgs
//   .map((m, i) => {
//     const time = m.timestamp
//       ? new Date(m.timestamp).toLocaleTimeString()
//       : `[${i + 1}]`;
//     return `[${time}] ${m.content}`;
//   })
//   .join("\n")}

// AI DOCTOR RESPONSES:
// ${aiMsgs
//   .map((m, i) => {
//     const time = m.timestamp
//       ? new Date(m.timestamp).toLocaleTimeString()
//       : `[${i + 1}]`;
//     return `[${time}] ${m.content}`;
//   })
//   .join("\n")}

// CLINICAL NOTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This is a consultation transcript. A healthcare professional should
// review to extract chief complaints, assess severity, and provide
// appropriate recommendations.

// IMPORTANT NOTICE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This is an AI-assisted consultation for informational purposes only.
// Not a substitute for professional medical diagnosis.
// Please consult a licensed healthcare provider.

// ═══════════════════════════════════════════════════════════
// Generated: ${timestamp}
// ═══════════════════════════════════════════════════════════
// `;
// }

// export async function POST(request: NextRequest) {
//   let sessionId = "unknown";

//   try {
//     console.log("\n=== REPORT GENERATION ===");

//     const body = await request.json();
//     const {
//       conversationHistory,
//       patientInfo,
//       sessionId: reqSessionId,
//       callDuration,
//     } = body;

//     sessionId = reqSessionId || "unknown";

//     console.log("📊 Data:", {
//       hasConversation: !!conversationHistory,
//       messageCount: conversationHistory?.length || 0,
//       sessionId,
//       callDuration,
//     });

//     // Return fallback if no conversation
//     if (!conversationHistory || !Array.isArray(conversationHistory)) {
//       return NextResponse.json({
//         report: generateFallbackReport(sessionId, [], 0, patientInfo),
//         success: true,
//       });
//     }

//     if (conversationHistory.length === 0) {
//       return NextResponse.json({
//         report: generateFallbackReport(sessionId, [], 0, patientInfo),
//         success: true,
//       });
//     }

//     // Use fallback if no API key
//     if (!XAI_API_KEY) {
//       console.log("⚠️ No API key - using fallback report");
//       return NextResponse.json({
//         report: generateFallbackReport(
//           sessionId,
//           conversationHistory,
//           callDuration || 0,
//           patientInfo
//         ),
//         success: true,
//       });
//     }

//     // Format conversation
//     const formattedConversation = conversationHistory
//       .map((msg: any, idx: number) => {
//         const role = msg.role === "user" ? "PATIENT" : "DOCTOR";
//         const time = msg.timestamp
//           ? new Date(msg.timestamp).toLocaleTimeString()
//           : `[${idx + 1}]`;
//         return `[${time}] ${role}: ${msg.content}`;
//       })
//       .join("\n\n");

//     const duration = callDuration
//       ? `${Math.floor(callDuration / 60)} minutes ${callDuration % 60} seconds`
//       : "Not recorded";

//     const reportPrompt = `Generate a comprehensive medical consultation report from this conversation.

// CONVERSATION:
// ${formattedConversation}

// SESSION DETAILS:
// - Session ID: ${sessionId}
// - Date: ${new Date().toLocaleDateString()}
// - Time: ${new Date().toLocaleTimeString()}
// - Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}
// - Duration: ${duration}

// Create a detailed report with these sections:

// ═══════════════════════════════════════════════════════════
//               MEDICAL CONSULTATION REPORT
// ═══════════════════════════════════════════════════════════

// 1. PATIENT INFORMATION
//    - Extract name, age, gender from conversation
//    - Session ID: ${sessionId}
//    - Date: ${new Date().toLocaleDateString()}
//    - Time: ${new Date().toLocaleTimeString()}
//    - Duration: ${duration}
//    - Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}

// 2. CHIEF COMPLAINT
//    - Main reason for consultation
//    - Primary symptoms reported

// 3. HISTORY OF PRESENT ILLNESS
//    - When symptoms started
//    - How long they've lasted
//    - Severity (if mentioned)
//    - What makes it better/worse
//    - Any medications tried

// 4. SYMPTOMS REPORTED
//    List all symptoms mentioned:
//    - Main symptom
//    - Associated symptoms
//    - Severity ratings

// 5. CLINICAL ASSESSMENT
//    - Likely diagnosis or condition
//    - Reasoning based on symptoms

// 6. RECOMMENDATIONS PROVIDED
//    - Medications suggested (with doses)
//    - Home remedies recommended
//    - Rest and hydration advice
//    - Expected recovery time

// 7. RED FLAGS DISCUSSED
//    - Warning signs to watch for
//    - When to seek emergency care

// 8. FOLLOW-UP PLAN
//    - When to follow up
//    - What to monitor
//    - When improvement is expected

// 9. SUMMARY
//    - Key points from consultation
//    - Next steps for patient

// ═══════════════════════════════════════════════════════════
// DISCLAIMER: AI-assisted consultation for informational purposes.
// Not a substitute for professional medical diagnosis.
// ═══════════════════════════════════════════════════════════
// Generated: ${new Date().toLocaleString()}
// ═══════════════════════════════════════════════════════════

// Extract EXACT information from conversation. If info is missing, write "Not discussed".`;

//     console.log("🤖 Calling FREE Grok API for report...");

//     // Call X.AI's FREE Grok API
//     const response = await fetch("https://api.x.ai/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${XAI_API_KEY}`,
//       },
//       body: JSON.stringify({
//         messages: [{ role: "user", content: reportPrompt }],
//         model: "grok-beta",
//         temperature: 0.3,
//         max_tokens: 4000,
//       }),
//     });

//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({}));
//       console.error("❌ Grok API error:", response.status, errorData);
//       throw new Error(`Grok API error: ${response.status}`);
//     }

//     const data = await response.json();
//     const report = data.choices?.[0]?.message?.content;

//     if (!report) {
//       throw new Error("Empty report generated");
//     }

//     console.log("✅ Report generated (", report.length, "characters)");

//     return NextResponse.json({
//       report,
//       generatedAt: new Date().toISOString(),
//       sessionId,
//       success: true,
//     });
//   } catch (error: any) {
//     console.error("❌ Report generation error:", error.message);

//     // Return fallback report on error
//     return NextResponse.json({
//       report: generateFallbackReport(sessionId, [], 0, {}),
//       warning: `Error: ${error.message}. Using fallback report.`,
//       success: true,
//     });
//   }
// }

// import { NextRequest, NextResponse } from "next/server";
// import OpenAI from "openai";

// const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

// if (!GROK_API_KEY) {
//   console.error("❌ Report API: GROK_API_KEY missing in .env");
// } else {
//   console.log("✅ Report API: Grok key found");
// }

// const grok = new OpenAI({
//   apiKey: GROK_API_KEY || "",
//   baseURL: "https://openrouter.ai/api/v1",
//   defaultHeaders: {
//     "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
//     "X-Title": "Medical Voice Agent - Report",
//   },
// });
// function extractPatientInfo(messages) {
//   let name = "Not provided";
//   let age = "Not provided";
//   let gender = "Not provided";

//   for (const msg of messages) {
//     // Get patient name
//     const nameMatch = msg.content.match(
//       /(?:my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
//     );
//     if (nameMatch) name = nameMatch[1];

//     // Get age
//     const ageMatch = msg.content.match(
//       /(?:i'm|i am|age)\s+(\d{1,3})(?:\s+years?\s+old)?/i
//     );
//     if (ageMatch) age = ageMatch[1];

//     // Get gender
//     if (/\b(male|man|boy)\b/i.test(msg.content)) gender = "Male";
//     if (/\b(female|woman|girl)\b/i.test(msg.content)) gender = "Female";
//   }

//   return { name, age, gender };
// }

// function generateFallbackReport(
//   sessionId,
//   messages,
//   callDuration,
//   patientInfo
// ) {
//   const timestamp = new Date().toLocaleString();
//   const extracted = extractPatientInfo(messages);
//   const patientMsgs = messages.filter((m) => m.role === "user");
//   const aiMsgs = messages.filter((m) => m.role === "assistant");
//   const duration = `${Math.floor(callDuration / 60)} minutes ${
//     callDuration % 60
//   } seconds`;

//   return `
// ═══════════════════════════════════════════════════════════
//               MEDICAL CONSULTATION REPORT
// ═══════════════════════════════════════════════════════════

// SESSION INFORMATION
// Session ID: ${sessionId}
// Date & Time: ${timestamp}
// Consultation Duration: ${duration}
// Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}

// PATIENT INFORMATION
// Name: ${extracted.name}
// Age: ${extracted.age}
// Gender: ${extracted.gender}

// CONVERSATION SUMMARY
// Total Messages: ${messages.length}
// Patient Statements: ${patientMsgs.length}
// AI Responses: ${aiMsgs.length}

// PATIENT STATEMENTS:
// ${patientMsgs
//   .map((m, i) => {
//     const time = m.timestamp
//       ? new Date(m.timestamp).toLocaleTimeString()
//       : `[${i + 1}]`;
//     return `[${time}] ${m.content}`;
//   })
//   .join("\n")}

// AI DOCTOR RESPONSES:
// ${aiMsgs
//   .map((m, i) => {
//     const time = m.timestamp
//       ? new Date(m.timestamp).toLocaleTimeString()
//       : `[${i + 1}]`;
//     return `[${time}] ${m.content}`;
//   })
//   .join("\n")}

// ═══════════════════════════════════════════════════════════
// Generated: ${timestamp}
// ═══════════════════════════════════════════════════════════
// `;
// }

// function generateFallbackReport(
//   sessionId: string,
//   messages: any[],
//   callDuration: number,
//   patientInfo: any
// ): string {
//   const timestamp = new Date().toLocaleString();
//   const patientMsgs = messages.filter((m) => m.role === "user");
//   const aiMsgs = messages.filter((m) => m.role === "assistant");

//   const duration = `${Math.floor(callDuration / 60)} minutes ${
//     callDuration % 60
//   } seconds`;

//   return `
// ═══════════════════════════════════════════════════════════
//               MEDICAL CONSULTATION REPORT
// ═══════════════════════════════════════════════════════════

// SESSION INFORMATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Session ID: ${sessionId}
// Date & Time: ${timestamp}
// Consultation Duration: ${duration}
// Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}

// PATIENT INFORMATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Name: Not extracted
// Age: Not extracted
// Gender: Not extracted

// CONVERSATION SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Total Messages: ${messages.length}
// Patient Statements: ${patientMsgs.length}
// AI Responses: ${aiMsgs.length}

// PATIENT STATEMENTS:
// ${patientMsgs
//   .map((m, i) => {
//     const time = m.timestamp
//       ? new Date(m.timestamp).toLocaleTimeString()
//       : `[${i + 1}]`;
//     return `[${time}] ${m.content}`;
//   })
//   .join("\n")}

// AI DOCTOR RESPONSES:
// ${aiMsgs
//   .map((m, i) => {
//     const time = m.timestamp
//       ? new Date(m.timestamp).toLocaleTimeString()
//       : `[${i + 1}]`;
//     return `[${time}] ${m.content}`;
//   })
//   .join("\n")}

// CLINICAL NOTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This is a preliminary consultation transcript.
// A healthcare professional should review this conversation to:
// - Extract chief complaints
// - Identify all symptoms
// - Assess severity and timeline
// - Provide appropriate recommendations
// - Determine follow-up needs

// IMPORTANT NOTICE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This is an AI-assisted consultation transcript for informational
// purposes only. Not a substitute for professional medical diagnosis.
// Please consult a licensed healthcare provider.

// ═══════════════════════════════════════════════════════════
// Generated: ${timestamp}
// ═══════════════════════════════════════════════════════════
// `;
// }

// export async function POST(request: NextRequest) {
//   let sessionId = "unknown";

//   try {
//     console.log("\n=== REPORT GENERATION ===");

//     const body = await request.json();
//     const {
//       conversationHistory,
//       patientInfo,
//       sessionId: reqSessionId,
//       callDuration,
//     } = body;

//     sessionId = reqSessionId || "unknown";

//     console.log("📊 Data:", {
//       hasConversation: !!conversationHistory,
//       messageCount: conversationHistory?.length || 0,
//       sessionId,
//       callDuration,
//     });

//     if (!conversationHistory || !Array.isArray(conversationHistory)) {
//       return NextResponse.json({
//         report: generateFallbackReport(sessionId, [], 0, patientInfo),
//         warning: "No conversation history provided",
//         success: true,
//       });
//     }

//     if (conversationHistory.length === 0) {
//       return NextResponse.json({
//         report: generateFallbackReport(sessionId, [], 0, patientInfo),
//         warning: "Empty conversation",
//         success: true,
//       });
//     }

//     if (!API_KEY) {
//       console.error("❌ No API key - using fallback report");
//       return NextResponse.json({
//         report: generateFallbackReport(
//           sessionId,
//           conversationHistory,
//           callDuration || 0,
//           patientInfo
//         ),
//         warning: "API key not configured - using conversation transcript",
//         success: true,
//       });
//     }

//     // Format conversation with timestamps
//     const formattedConversation = conversationHistory
//       .map((msg: any, idx: number) => {
//         const role = msg.role === "user" ? "PATIENT" : "AI DOCTOR";
//         const time = msg.timestamp
//           ? new Date(msg.timestamp).toLocaleTimeString()
//           : `[${idx + 1}]`;
//         return `[${time}] ${role}: ${msg.content}`;
//       })
//       .join("\n\n");

//     const duration = callDuration
//       ? `${Math.floor(callDuration / 60)} minutes ${callDuration % 60} seconds`
//       : "Not recorded";

//     const reportPrompt = `Generate a comprehensive medical consultation report from this conversation.

// **CONVERSATION TRANSCRIPT:**
// ${formattedConversation}

// **SESSION DETAILS:**
// - Session ID: ${sessionId}
// - Date: ${new Date().toLocaleDateString()}
// - Time: ${new Date().toLocaleTimeString()}
// - Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}
// - Consultation Duration: ${duration}

// **INSTRUCTIONS:**
// Create a detailed, structured medical report with these sections:

// ═══════════════════════════════════════════════════════════
//               MEDICAL CONSULTATION REPORT
// ═══════════════════════════════════════════════════════════

// 1. PATIENT INFORMATION
//    - Extract patient name from conversation (if mentioned)
//    - Extract age (if mentioned)
//    - Extract gender (if mentioned)
//    - Session ID: ${sessionId}
//    - Date: ${new Date().toLocaleDateString()}
//    - Time: ${new Date().toLocaleTimeString()}
//    - Consultation Duration: ${duration}
//    - Attending Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}

// 2. CHIEF COMPLAINT
//    - Main reason for consultation
//    - Primary symptoms reported
//    - Patient's main concern

// 3. HISTORY OF PRESENT ILLNESS
//    - Onset: When did symptoms start?
//    - Duration: How long have symptoms lasted?
//    - Progression: Getting better/worse/same?
//    - Severity: Rate on 1-10 scale if mentioned
//    - Character: Description of symptoms
//    - Associated symptoms: Other symptoms mentioned
//    - Aggravating factors: What makes it worse?
//    - Relieving factors: What makes it better?
//    - Previous treatment: Any medications tried?

// 4. SYMPTOM TIMELINE
//    Create a chronological timeline of symptoms:
//    - Day 1: [First symptom]
//    - Day 2: [Progression]
//    - Current: [Present state]

// 5. RELEVANT MEDICAL HISTORY
//    - Pre-existing conditions mentioned
//    - Current medications mentioned
//    - Allergies mentioned
//    - Previous similar episodes

// 6. REVIEW OF SYSTEMS
//    List all body systems discussed:
//    - Constitutional: Fever, chills, fatigue
//    - Respiratory: Cough, breathing issues
//    - Cardiovascular: Chest pain, palpitations
//    - Gastrointestinal: Nausea, vomiting, appetite
//    - Musculoskeletal: Pain, weakness
//    - Neurological: Headache, dizziness
//    - Other relevant systems

// 7. CLINICAL ASSESSMENT
//    - Differential diagnoses discussed
//    - Most likely diagnosis
//    - Clinical reasoning
//    - Severity assessment (mild/moderate/severe)

// 8. RECOMMENDATIONS PROVIDED
//    a) Immediate Care:
//       - Rest and activity modifications
//       - Hydration and nutrition advice
//       - Symptom monitoring

//    b) Medications Suggested:
//       - Over-the-counter medications (name, dose, frequency)
//       - When to take them
//       - Expected effects

//    c) Home Remedies:
//       - Natural treatments suggested
//       - Lifestyle modifications
//       - Comfort measures

// 9. RED FLAGS & WARNING SIGNS
//    List specific symptoms that require immediate medical attention:
//    - Emergency symptoms (e.g., fever >103°F, difficulty breathing)
//    - When to go to ER
//    - When to call doctor
//    - Symptoms indicating worsening condition

// 10. FOLLOW-UP PLAN
//     - Timeline for expected improvement
//     - When to follow up if not improving
//     - Self-monitoring instructions
//     - Red flags to watch for
//     - When to seek in-person medical care

// 11. PATIENT EDUCATION
//     - Explanation of likely condition
//     - Expected course of illness
//     - Prevention tips
//     - When to return to normal activities

// 12. SUMMARY & NEXT STEPS
//     - Brief summary of consultation
//     - Key action items for patient
//     - Timeline for reassessment
//     - Prognosis

// ═══════════════════════════════════════════════════════════
// DISCLAIMER: This is an AI-assisted medical consultation
// for informational purposes only. Not a substitute for
// professional medical diagnosis. Patient should consult a
// licensed healthcare provider for definitive care.
// ═══════════════════════════════════════════════════════════
// Generated: ${new Date().toLocaleString()}
// ═══════════════════════════════════════════════════════════

// IMPORTANT:
// - Extract EXACT information from the conversation
// - Use direct quotes when relevant
// - If information is missing, write "Not discussed" or "Not mentioned"
// - Include ALL symptoms mentioned, even minor ones
// - Include specific times/durations mentioned
// - Be thorough and detailed
// - Format clearly with proper sections and bullets`;

//     console.log("🤖 Calling Grok API for report generation...");

//     const response = await grok.chat.completions.create({
//       model: "x-ai/grok-2-1212",
//       messages: [{ role: "user", content: reportPrompt }],
//       temperature: 0.3,
//       max_tokens: 4000,
//     });

//     const report = response.choices[0]?.message?.content;

//     if (!report) {
//       throw new Error("Empty report generated");
//     }

//     console.log(
//       "✅ Report generated successfully (",
//       report.length,
//       "characters)"
//     );

//     return NextResponse.json({
//       report,
//       generatedAt: new Date().toISOString(),
//       sessionId,
//       success: true,
//     });
//   } catch (error: any) {
//     console.error("❌ Report generation error:", error.message);

//     // Return fallback report instead of error
//     return NextResponse.json({
//       report: generateFallbackReport(sessionId, [], 0, {}),
//       warning: `API Error: ${error.message}. Using conversation transcript instead.`,
//       success: true,
//     });
//   }
//}

// import { NextRequest, NextResponse } from "next/server";
// import OpenAI from "openai";

// const API_KEY = process.env.OPENROUTER_API_KEY;

// if (!API_KEY) {
//   console.error("❌ Report API: OPENROUTER_API_KEY missing");
// } else {
//   console.log("✅ Report API: OpenRouter key found");
// }

// const grok = new OpenAI({
//   apiKey: API_KEY || "",
//   baseURL: "https://openrouter.ai/api/v1",
//   defaultHeaders: {
//     "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
//     "X-Title": "Medical Voice Agent - Report",
//   },
// });

// export async function POST(request: NextRequest) {
//   try {
//     console.log("\n=== REPORT GENERATION ===");

//     const body = await request.json();
//     const { conversationHistory, patientInfo, sessionId, callDuration } = body;

//     console.log("📊 Data:", {
//       hasConversation: !!conversationHistory,
//       messageCount: conversationHistory?.length || 0,
//       sessionId,
//       callDuration,
//     });

//     if (!conversationHistory || !Array.isArray(conversationHistory)) {
//       return NextResponse.json(
//         {
//           error: "No conversation history provided",
//           success: false,
//         },
//         { status: 400 }
//       );
//     }

//     if (conversationHistory.length === 0) {
//       return NextResponse.json(
//         {
//           error: "Empty conversation history",
//           success: false,
//         },
//         { status: 400 }
//       );
//     }

//     if (!API_KEY) {
//       console.error("❌ No API key");
//       return NextResponse.json(
//         {
//           error: "API key not configured",
//           success: false,
//         },
//         { status: 500 }
//       );
//     }

//     // Format conversation with timestamps
//     const formattedConversation = conversationHistory
//       .map((msg: any, idx: number) => {
//         const role = msg.role === "user" ? "PATIENT" : "AI DOCTOR";
//         const time = msg.timestamp
//           ? new Date(msg.timestamp).toLocaleTimeString()
//           : `[${idx + 1}]`;
//         return `[${time}] ${role}: ${msg.content}`;
//       })
//       .join("\n\n");

//     const reportPrompt = `Generate a comprehensive medical consultation report from this conversation:

// **CONVERSATION:**
// ${formattedConversation}

// **SESSION DETAILS:**
// - Session ID: ${sessionId}
// - Date: ${new Date().toLocaleDateString()}
// - Time: ${new Date().toLocaleTimeString()}
// - Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}
// - Duration: ${Math.floor((callDuration || 0) / 60)} minutes ${
//       (callDuration || 0) % 60
//     } seconds

// **FORMAT THE REPORT WITH THESE SECTIONS:**

// ═══════════════════════════════════════════════════════════
//               MEDICAL CONSULTATION REPORT
// ═══════════════════════════════════════════════════════════

// 1. PATIENT INFORMATION
//    - Extract name, age, gender from conversation (if mentioned)
//    - Session ID: ${sessionId}
//    - Date: ${new Date().toLocaleDateString()}
//    - Doctor: ${patientInfo?.doctorName || "AI Medical Assistant"}

// 2. CHIEF COMPLAINT
//    - Primary reason for consultation
//    - Main symptoms reported

// 3. HISTORY OF PRESENT ILLNESS
//    - When symptoms started (onset)
//    - How symptoms developed (progression)
//    - Severity (mild/moderate/severe or 1-10 scale)
//    - Duration and frequency
//    - Aggravating factors
//    - Relieving factors
//    - Associated symptoms

// 4. SYMPTOM TIMELINE
//    - Chronological order of symptom appearance
//    - Key events or triggers mentioned

// 5. MEDICAL ASSESSMENT
//    - Possible differential diagnoses discussed
//    - Clinical reasoning
//    - Risk factors identified

// 6. RECOMMENDATIONS PROVIDED
//    - Self-care instructions given
//    - Over-the-counter medications suggested (with dosages)
//    - Home remedies recommended
//    - Lifestyle modifications advised

// 7. RED FLAGS DISCUSSED
//    - Warning signs mentioned
//    - When to seek immediate medical attention
//    - Emergency symptoms to watch for

// 8. FOLLOW-UP PLAN
//    - When to see a doctor
//    - Expected recovery timeline
//    - Symptoms that warrant follow-up

// 9. SUMMARY
//    - Key points from consultation
//    - Next steps for patient

// ═══════════════════════════════════════════════════════════
// Generated: ${new Date().toLocaleString()}
// ═══════════════════════════════════════════════════════════

// Extract EXACT information from the conversation. If information is missing, note "Not discussed" or "Not provided". Be thorough and professional.`;

//     console.log("🤖 Calling Grok API for report generation...");

//     const response = await grok.chat.completions.create({
//       model: "x-ai/grok-2-1212",
//       messages: [{ role: "user", content: reportPrompt }],
//       temperature: 0.3,
//       max_tokens: 3000,
//     });

//     const report = response.choices[0]?.message?.content;

//     if (!report) {
//       throw new Error("Empty report generated");
//     }

//     console.log(
//       "✅ Report generated successfully (",
//       report.length,
//       "characters)"
//     );

//     return NextResponse.json({
//       report,
//       generatedAt: new Date().toISOString(),
//       sessionId,
//       success: true,
//     });
//   } catch (error: any) {
//     console.error("❌ Report generation error:", error.message);

//     return NextResponse.json(
//       {
//         error: error.message,
//         success: false,
//       },
//       { status: 500 }
//     );
//   }
// }
