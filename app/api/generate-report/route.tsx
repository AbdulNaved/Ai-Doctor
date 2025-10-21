import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const grok = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Medical Voice Agent",
  },
});

export async function POST(request: NextRequest) {
  try {
    const { conversationHistory, patientInfo, sessionId } =
      await request.json();

    console.log("📋 Generating medical report for session:", sessionId);

    // Create report generation prompt
    const reportPrompt = `You are a medical documentation AI. Based on the following patient conversation, generate a comprehensive SYMPTOM DIARY and MEDICAL REPORT that will be helpful for the doctor.

**CONVERSATION HISTORY:**
${conversationHistory
  .map(
    (msg: any, idx: number) =>
      `${msg.role === "user" ? "Patient" : "AI Assistant"}: ${msg.content}`
  )
  .join("\n\n")}

**GENERATE A STRUCTURED MEDICAL REPORT WITH THE FOLLOWING SECTIONS:**

1. **PATIENT INFORMATION**
   - Name: [Extract from conversation]
   - Age: [Extract from conversation]
   - Date of Consultation: ${new Date().toLocaleDateString()}
   - Session ID: ${sessionId}

2. **CHIEF COMPLAINT**
   - Primary symptoms mentioned by patient
   - Duration of symptoms

3. **SYMPTOM DIARY** (Detailed Timeline)
   - When symptoms started (date/time if mentioned)
   - Symptom progression over time
   - Severity ratings (if mentioned, use 1-10 scale)
   - Triggering factors (if any mentioned)
   - Relieving factors (if any mentioned)

4. **ASSOCIATED SYMPTOMS**
   - All secondary symptoms mentioned
   - Pattern of occurrence (constant, intermittent, etc.)

5. **MEDICAL HISTORY GATHERED**
   - Previous conditions mentioned
   - Current medications (if any)
   - Allergies (if mentioned)
   - Recent exposures or travel

6. **SYMPTOM ASSESSMENT**
   - Severity: [Mild / Moderate / Severe based on description]
   - Impact on daily activities: [Description]
   - Sleep disturbance: [Yes/No and details]

7. **RED FLAGS IDENTIFIED**
   - Any emergency warning signs present
   - Urgent care recommendations made

8. **AI PRELIMINARY ASSESSMENT**
   - Possible differential diagnoses suggested during conversation
   - Rationale for each possibility

9. **RECOMMENDATIONS PROVIDED**
   - Self-care measures advised
   - OTC medications suggested (with dosages)
   - Home remedies mentioned
   - Follow-up timeline suggested

10. **DOCTOR'S ATTENTION POINTS**
    - Key symptoms requiring clinical evaluation
    - Suggested diagnostic tests (if any were mentioned)
    - Concerns requiring immediate attention

11. **PATIENT QUESTIONS & CONCERNS**
    - Specific questions patient asked
    - Areas of concern patient expressed

Format the report professionally, use medical terminology appropriately, and make it clear, organized, and easy for a doctor to review quickly. Use bullet points and structured formatting for easy scanning.`;

    const response = await grok.chat.completions.create({
      model: "x-ai/grok-4-fast:free",
      messages: [{ role: "user", content: reportPrompt }],
      temperature: 0.3, // Lower for more consistent, factual reporting
      max_tokens: 1500,
    });

    const report =
      response.choices[0]?.message?.content || "Unable to generate report";

    console.log("✅ Report generated successfully");

    return NextResponse.json({
      report,
      generatedAt: new Date().toISOString(),
      sessionId,
    });
  } catch (error: any) {
    console.error("❌ Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report", details: error.message },
      { status: 500 }
    );
  }
}
