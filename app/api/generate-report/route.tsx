import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  console.error("❌ Report API: OPENROUTER_API_KEY missing");
} else {
  console.log("✅ Report API: OpenRouter key found");
}

const grok = new OpenAI({
  apiKey: API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Medical Voice Agent - Report",
  },
});

function generateFallbackReport(sessionId: string, messages: any[]): string {
  const timestamp = new Date().toLocaleString();
  const patientMsgs = messages.filter((m) => m.role === "user");
  const aiMsgs = messages.filter((m) => m.role === "assistant");

  return `
═══════════════════════════════════════════════════════════
              MEDICAL CONSULTATION REPORT
═══════════════════════════════════════════════════════════

Session ID: ${sessionId}
Date & Time: ${timestamp}
Consultation Type: AI Medical Assistant

CONVERSATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Messages: ${messages.length}
Patient Messages: ${patientMsgs.length}
AI Responses: ${aiMsgs.length}

PATIENT STATEMENTS:
${patientMsgs.map((m, i) => `${i + 1}. ${m.content}`).join("\n")}

AI DOCTOR RESPONSES:
${aiMsgs.map((m, i) => `${i + 1}. ${m.content}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTE: Full AI-generated analysis unavailable. Please review 
conversation above for patient information and symptoms discussed.

For comprehensive evaluation, patient should consult healthcare professional.

═══════════════════════════════════════════════════════════
Generated: ${timestamp}
═══════════════════════════════════════════════════════════
`;
}

export async function POST(request: NextRequest) {
  let sessionId = "unknown";

  try {
    console.log("\n=== REPORT GENERATION ===");

    const body = await request.json();
    const { conversationHistory, patientInfo, sessionId: reqSessionId } = body;

    sessionId = reqSessionId || "unknown";

    console.log("📊 Data:", {
      hasConversation: !!conversationHistory,
      messageCount: conversationHistory?.length || 0,
      sessionId,
    });

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return NextResponse.json({
        report: generateFallbackReport(sessionId, []),
        warning: "No conversation history",
      });
    }

    if (conversationHistory.length === 0) {
      return NextResponse.json({
        report: generateFallbackReport(sessionId, []),
        warning: "Empty conversation",
      });
    }

    if (!API_KEY) {
      console.error("❌ No API key");
      return NextResponse.json({
        report: generateFallbackReport(sessionId, conversationHistory),
        warning: "API key not configured",
      });
    }

    const formattedConversation = conversationHistory
      .map((msg: any, idx: number) => {
        const role = msg.role === "user" ? "PATIENT" : "AI DOCTOR";
        const time = msg.timestamp
          ? new Date(msg.timestamp).toLocaleTimeString()
          : `[${idx + 1}]`;
        return `[${time}] ${role}: ${msg.content}`;
      })
      .join("\n\n");

    const reportPrompt = `Generate a medical consultation report from this conversation:

**CONVERSATION:**
${formattedConversation}

**SESSION:** ${sessionId}
**DATE:** ${new Date().toLocaleDateString()}
**DOCTOR:** ${patientInfo?.doctorName || "AI Medical Assistant"}

Generate a structured report with these sections:

1. PATIENT INFORMATION
   - Name, age (from conversation)
   - Session ID: ${sessionId}
   - Date: ${new Date().toLocaleDateString()}

2. CHIEF COMPLAINT
   - Main symptoms

3. SYMPTOM DETAILS
   - What, when, severity, duration

4. ASSESSMENT
   - Possible conditions
   - Reasoning

5. RECOMMENDATIONS
   - Home remedies given
   - OTC medications suggested
   - Self-care instructions

6. FOLLOW-UP
   - When to see doctor
   - Red flags
   - Expected recovery

Be thorough and extract exact information from conversation.`;

    console.log("🤖 Calling Grok for report...");

    const response = await grok.chat.completions.create({
      model: "x-ai/grok-4-fast:free",
      messages: [{ role: "user", content: reportPrompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const report = response.choices[0]?.message?.content;

    if (!report) {
      throw new Error("Empty report");
    }

    console.log("✅ Report generated:", report.length, "chars");

    return NextResponse.json({
      report,
      generatedAt: new Date().toISOString(),
      sessionId,
      success: true,
    });
  } catch (error: any) {
    console.error("❌ Error:", error.message);

    return NextResponse.json({
      report: generateFallbackReport(sessionId, []),
      error: error.message,
      warning: "Using fallback report",
    });
  }
}
