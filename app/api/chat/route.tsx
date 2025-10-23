import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

console.log("🔑 Chat API loaded - Key exists:", !!GROQ_API_KEY);

function createMedicalSystemPrompt(doctorInfo?: any): string {
  return `You are ${doctorInfo?.name || "Dr. Sarah"}, a ${
    doctorInfo?.specialty || "General Physician"
  }.

Ask ONE question at a time. Keep responses 1-2 sentences. Be warm and natural.

Flow:
1. "Hi! I'm Dr. Sarah. What's your name?"
2. "Nice to meet you, [Name]! How old are you?"
3. "Thanks! What's bothering you today?"
4. Ask follow-ups about symptoms (ONE at a time)
5. Give advice: medicine doses + home remedies`;
}

function getSmartFallback(messages: any[]) {
  const last = messages[messages.length - 1]?.content?.toLowerCase() || "";
  let content = "Hi! I'm Dr. Sarah. What's your name?";

  if (messages.length > 1) {
    if (last.match(/name is|i'm|i am/i)) {
      const name = last.match(/(?:name is|i'm|i am)\s+(\w+)/i)?.[1] || "";
      content = `Nice to meet you${name ? ", " + name : ""}! How old are you?`;
    } else if (/\d+/.test(last)) {
      content = "Thanks! What's bothering you today?";
    } else if (last.includes("not feeling well") || last.includes("sick")) {
      content =
        "I'm sorry to hear that. Can you tell me more about your symptoms?";
    } else if (
      last.includes("fever") ||
      last.includes("temperature") ||
      last.includes("cold") ||
      last.includes("body pain")
    ) {
      content =
        "I understand you have fever, cold, and body pain. When did these symptoms start?";
    } else if (last.includes("yesterday")) {
      content = "I see it started yesterday. Have you taken any medicine yet?";
    } else {
      content = "Tell me more about how you're feeling?";
    }
  }

  return NextResponse.json({ content, model: "fallback" });
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n📨 CHAT API CALLED");

    const body = await request.json();
    const { messages, doctorPrompt, doctorInfo } = body;

    console.log("📋 Messages:", JSON.stringify(messages, null, 2));
    console.log("🔢 Message count:", messages?.length);

    if (!messages?.length) {
      console.log("⚠️ No messages, sending initial greeting");
      return NextResponse.json({
        content: "Hi! I'm Dr. Sarah. What's your name?",
        model: "initial",
      });
    }

    if (!GROQ_API_KEY) {
      console.log("⚠️ No API key, using fallback");
      return getSmartFallback(messages);
    }

    const systemPrompt = doctorPrompt || createMedicalSystemPrompt(doctorInfo);

    console.log("🤖 Calling Groq API...");

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
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m: any) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.8,
          max_tokens: 200,
        }),
      }
    );

    console.log("📡 Groq response status:", response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("❌ Groq error:", error);
      return getSmartFallback(messages);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log("✅ Groq response:", content);

    if (!content) {
      console.log("⚠️ Empty response, using fallback");
      return getSmartFallback(messages);
    }

    return NextResponse.json({ content, model: "llama-3.3-70b" });
  } catch (error: any) {
    console.error("❌ Chat error:", error.message);
    return getSmartFallback([]);
  }
}

// we
// import { NextRequest, NextResponse } from "next/server";

// const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

// if (!XAI_API_KEY) {
//   console.error(
//     "❌ XAI_API_KEY missing - Get free key at https://console.x.ai"
//   );
// } else {
//   console.log("✅ XAI API key found");
// }

// function createMedicalSystemPrompt(doctorInfo?: any): string {
//   return `You are ${doctorInfo?.name || "Dr. Sarah"}, a warm and experienced ${
//     doctorInfo?.specialty || "General Physician"
//   }. You are having a real conversation with a patient.

// CRITICAL RULES:
// 1. Ask ONLY ONE question at a time
// 2. Keep responses SHORT (maximum 2 sentences)
// 3. Use simple, everyday language
// 4. Be warm, friendly, and empathetic
// 5. NEVER repeat the same question

// CONVERSATION FLOW:

// **FIRST MESSAGE:**
// "Hi there! I'm Dr. Sarah. What's your name?"

// **SECOND MESSAGE (after getting name):**
// "Nice to meet you, [Name]! How old are you?"

// **THIRD MESSAGE (after getting age):**
// "Thanks, [Name]. So what's bothering you today?"

// **THEN (ask ONE question at a time based on symptoms):**
// - "When did this start?"
// - "How bad is it on a scale of 1-10?"
// - "Have you taken anything for it?"
// - "Any other symptoms like fever or nausea?"

// **AFTER GATHERING INFO (give specific advice):**
// "Alright [Name], here's what will help:
// - Take [specific medicine with dose]
// - [Specific home remedy]
// - [Rest/hydration advice]

// You should feel better in [timeframe]. Go to ER if [red flag symptom]."

// HOME REMEDIES:
// - Fever: Cold compress, rest, drink lots of water
// - Headache: Dark quiet room, peppermint oil on temples
// - Sore throat: Warm salt water gargle, honey lemon tea
// - Cough: Honey, ginger tea, steam inhalation
// - Body pain: Warm compress, gentle stretching

// MEDICINES (with exact doses):
// - Fever/Pain: "Tylenol 500mg every 6 hours"
// - Cough: "Dextromethorphan cough syrup, 2 teaspoons every 6 hours"
// - Allergy: "Cetirizine 10mg once daily"

// RED FLAGS (when to say "Go to ER immediately"):
// - Fever above 103°F
// - Severe chest pain or breathing difficulty
// - Severe headache with neck stiffness
// - Continuous vomiting

// TONE:
// - Friendly and conversational (like talking to a friend)
// - Caring and reassuring
// - Use phrases like "I see", "Got it", "Alright", "No worries"
// - Sound natural, not robotic

// NEVER:
// - Ask multiple questions in one response
// - Use medical jargon
// - Give long explanations
// - Repeat questions already asked`;
// }

// function getSmartFallback(messages: any[]) {
//   const lastMessage =
//     messages[messages.length - 1]?.content?.toLowerCase() || "";
//   let content = "";

//   if (messages.length === 1) {
//     content = "Hi there! I'm Dr. Sarah. What's your name?";
//   } else if (lastMessage.match(/name is|i'm|i am|my name/i)) {
//     const nameMatch = lastMessage.match(
//       /(?:name is|i'm|i am|my name)\s+(\w+)/i
//     );
//     const name = nameMatch ? nameMatch[1] : "";
//     content = `Nice to meet you${name ? ", " + name : ""}! How old are you?`;
//   } else if (lastMessage.match(/\d+/)) {
//     content =
//       "Thanks! So what's bothering you today? What symptoms are you experiencing?";
//   } else if (lastMessage.includes("fever")) {
//     content = "I understand you have a fever. When did it start?";
//   } else if (lastMessage.includes("pain") || lastMessage.includes("hurt")) {
//     content = "I see you're in pain. Where exactly does it hurt?";
//   } else if (lastMessage.includes("headache")) {
//     content = "Got it. How severe is the headache on a scale of 1-10?";
//   } else if (lastMessage.includes("cough") || lastMessage.includes("cold")) {
//     content = "I hear you have cold symptoms. Any fever with it?";
//   } else if (
//     lastMessage.includes("not feeling well") ||
//     lastMessage.includes("sick")
//   ) {
//     content =
//       "I'm sorry to hear that. Can you describe what specific symptoms you're having?";
//   } else {
//     content = "I understand. Can you tell me more about your symptoms?";
//   }

//   return NextResponse.json({
//     content,
//     model: "fallback-smart",
//   });
// }

// export async function POST(request: NextRequest) {
//   try {
//     console.log("📨 Chat API called");

//     const body = await request.json();
//     const { messages, doctorPrompt, doctorInfo } = body;

//     console.log("Messages count:", messages?.length);

//     // Validate messages
//     if (!messages || !Array.isArray(messages) || messages.length === 0) {
//       return NextResponse.json({
//         content: "Hi there! I'm Dr. Sarah. What's your name?",
//         model: "fallback",
//       });
//     }

//     // If no API key, use smart fallback
//     if (!XAI_API_KEY) {
//       console.log("⚠️ No API key - using smart fallback");
//       return getSmartFallback(messages);
//     }

//     // Create system message
//     const systemPrompt = doctorPrompt || createMedicalSystemPrompt(doctorInfo);

//     // Format messages for Grok
//     const grokMessages = [
//       { role: "system", content: systemPrompt },
//       ...messages.map((msg: any) => ({
//         role: msg.role,
//         content: msg.content,
//       })),
//     ];

//     console.log("🤖 Calling FREE Grok API...");

//     try {
//       // Call X.AI's FREE Grok API
//       const response = await fetch("https://api.x.ai/v1/chat/completions", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${XAI_API_KEY}`,
//         },
//         body: JSON.stringify({
//           messages: grokMessages,
//           model: "grok-beta",
//           stream: false,
//           temperature: 0.85,
//           max_tokens: 250,
//           top_p: 0.9,
//           frequency_penalty: 0.7,
//           presence_penalty: 0.7,
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}));
//         console.error("❌ Grok API error:", response.status, errorData);
//         return getSmartFallback(messages);
//       }

//       const data = await response.json();
//       const content =
//         data.choices?.[0]?.message?.content ||
//         "Could you tell me more about that?";

//       console.log("✅ Grok response:", content.substring(0, 100));

//       return NextResponse.json({
//         content,
//         model: "grok-beta",
//         timestamp: new Date().toISOString(),
//       });
//     } catch (apiError: any) {
//       console.error("❌ Grok API error:", apiError.message);
//       return getSmartFallback(messages);
//     }
//   } catch (error: any) {
//     console.error("❌ Chat API Error:", error.message);
//     return getSmartFallback([]);
//   }
// }

// import { NextRequest, NextResponse } from "next/server";
// import OpenAI from "openai";

// // Validate API key
// const API_KEY = process.env.OPENROUTER_API_KEY;

// if (!API_KEY) {
//   console.error("❌ OPENROUTER_API_KEY missing in .env.local");
// }

// // Initialize Grok
// const grok = API_KEY
//   ? new OpenAI({
//       apiKey: API_KEY,
//       baseURL: "https://openrouter.ai/api/v1",
//       defaultHeaders: {
//         "HTTP-Referer":
//           process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
//         "X-Title": "Medical Voice Agent",
//       },
//     })
//   : null;

// function createMedicalSystemPrompt(doctorInfo?: any): string {
//   return `You are ${doctorInfo?.name || "Dr. Sarah"}, a warm ${
//     doctorInfo?.specialty || "General Physician"
//   }. Talk naturally like a caring doctor.

// RULES:
// - Ask ONE question at a time
// - Keep responses SHORT (1-2 sentences)
// - Be warm and friendly
// - NEVER repeat questions

// FLOW:
// 1st: "Hi! I'm Dr. Sarah. What's your name?"
// 2nd: "Nice to meet you, [Name]! How old are you?"
// 3rd: "Thanks! What's bothering you today?"
// Then: Ask ONE question about their symptom

// AFTER GATHERING INFO:
// "Alright [Name], here's what will help:
// - Take [medicine + dose]
// - [Home remedy]
// - [Rest advice]
// You'll feel better in [time]. Go to ER if [red flag]."

// HOME REMEDIES:
// - Fever: Cold compress, rest, fluids
// - Headache: Dark room, peppermint oil
// - Sore throat: Warm salt water, honey tea
// - Cough: Honey, ginger tea, steam

// MEDICINES:
// - Fever/Pain: "Tylenol 500mg every 6 hours"
// - Cough: "Cough syrup"
// - Allergy: "Cetirizine 10mg daily"

// Be conversational and caring!`;
// }

// export async function POST(request: NextRequest) {
//   try {
//     console.log("📨 Chat API called");

//     const body = await request.json();
//     const { messages, doctorPrompt, doctorInfo } = body;

//     console.log("Messages count:", messages?.length);

//     // Validate messages
//     if (!messages || !Array.isArray(messages) || messages.length === 0) {
//       console.log("⚠️ Invalid messages");
//       return NextResponse.json({
//         content: "Hi! I'm Dr. Sarah. What's your name?",
//         model: "fallback",
//       });
//     }

//     // Check if API key exists
//     if (!API_KEY || !grok) {
//       console.log("⚠️ No API key, using fallback");

//       // Smart fallback based on message count
//       const lastMessage = messages[messages.length - 1]?.content || "";
//       let fallbackContent = "";

//       if (messages.length === 1) {
//         fallbackContent = "Hi! I'm Dr. Sarah. What's your name?";
//       } else if (lastMessage.match(/name is|i'm|i am/i)) {
//         fallbackContent = "Nice to meet you! How old are you?";
//       } else if (lastMessage.match(/\d+/)) {
//         fallbackContent =
//           "Thanks! What's bothering you today? What symptoms are you experiencing?";
//       } else {
//         fallbackContent = "I see. When did this start?";
//       }

//       return NextResponse.json({
//         content: fallbackContent,
//         model: "fallback",
//       });
//     }

//     // Create system message
//     const systemMessage = {
//       role: "system",
//       content: doctorPrompt || createMedicalSystemPrompt(doctorInfo),
//     };

//     // Format messages
//     const apiMessages = [
//       systemMessage,
//       ...messages.map((msg: any) => ({
//         role: msg.role,
//         content: msg.content,
//       })),
//     ];

//     console.log("🤖 Calling Grok API...");

//     try {
//       // Call Grok API with timeout
//       const controller = new AbortController();
//       const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 sec timeout

//       const response = await grok.chat.completions.create({
//         model: "x-ai/grok-2-1212",
//         messages: apiMessages,
//         temperature: 0.85,
//         max_tokens: 250,
//         top_p: 0.9,
//         frequency_penalty: 0.7,
//         presence_penalty: 0.7,
//       });

//       clearTimeout(timeoutId);

//       let content =
//         response.choices[0]?.message?.content ||
//         "Could you tell me more about that?";

//       console.log("✅ Grok response:", content.substring(0, 100));

//       return NextResponse.json({
//         content,
//         model: "grok-2-1212",
//         timestamp: new Date().toISOString(),
//       });
//     } catch (apiError: any) {
//       console.error("❌ Grok API error:", apiError.message);

//       // Smart fallback
//       const lastMessage =
//         messages[messages.length - 1]?.content?.toLowerCase() || "";
//       let fallbackContent = "";

//       if (lastMessage.includes("fever")) {
//         fallbackContent = "I understand you have a fever. When did it start?";
//       } else if (lastMessage.includes("pain") || lastMessage.includes("hurt")) {
//         fallbackContent = "I see you're in pain. Where exactly does it hurt?";
//       } else if (lastMessage.includes("headache")) {
//         fallbackContent =
//           "Got it. How severe is the headache on a scale of 1-10?";
//       } else if (
//         lastMessage.includes("cough") ||
//         lastMessage.includes("cold")
//       ) {
//         fallbackContent = "I hear you have cold symptoms. Any fever with it?";
//       } else {
//         fallbackContent =
//           "I understand. Can you tell me more about your symptoms?";
//       }

//       return NextResponse.json({
//         content: fallbackContent,
//         model: "fallback-smart",
//       });
//     }
//   } catch (error: any) {
//     console.error("❌ Chat API Error:", error);
//     console.error("Error stack:", error.stack);

//     return NextResponse.json({
//       content: "I'm here to help. What's bothering you today?",
//       model: "fallback-error",
//     });
//   }
// }

// not accutre
// import { NextRequest, NextResponse } from "next/server";
// import OpenAI from "openai";

// // Validate OpenRouter API key exists
// if (!process.env.OPENROUTER_API_KEY) {
//   console.error("❌ CRITICAL: OPENROUTER_API_KEY is missing in .env.local");
//   console.log("Get your FREE API key at: https://openrouter.ai/keys");
// }

// // FREE Grok API via OpenRouter
// const grok = new OpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY || "",
//   baseURL: "https://openrouter.ai/api/v1",
//   defaultHeaders: {
//     "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
//     "X-Title": "Medical Voice Agent",
//   },
// });

// // Create REALISTIC medical system prompt
// function createMedicalSystemPrompt(doctorInfo?: any): string {
//   return `You are ${doctorInfo?.name || "Dr. Sarah Johnson"}, a compassionate ${
//     doctorInfo?.specialty || "General Physician"
//   } with 15 years of clinical experience. You are conducting a real medical consultation with a patient.

// GREETING (First Message Only):
// "Hello! I'm ${doctorInfo?.name || "Dr. Sarah Johnson"}, your ${
//     doctorInfo?.specialty || "General Physician"
//   } today. Before we begin, may I please have your name and age?"

// CONVERSATION FLOW:
// 1. **First Response**: Greet warmly and ask for name + age
// 2. **Second Response**: Thank them by name, then ask: "What brings you here today? What symptoms are you experiencing?"
// 3. **Follow-up Questions**: Ask detailed questions about their main complaint:
//    - "When did these symptoms start?"
//    - "On a scale of 1-10, how severe is the [symptom]?"
//    - "Does anything make it better or worse?"
//    - "Have you tried any medications or remedies?"
//    - "Any other symptoms like fever, nausea, or fatigue?"

// COMMUNICATION STYLE:
// - Speak naturally like a real doctor in a clinic
// - Use the patient's name frequently
// - Show empathy: "I understand that must be uncomfortable for you, [Name]"
// - Ask ONE clear question at a time
// - Keep responses conversational (2-3 sentences max)
// - Avoid medical jargon - use simple terms

// ASSESSMENT & RECOMMENDATIONS (After gathering info):
// - Explain what their symptoms suggest in simple terms
// - Provide specific, actionable advice:
//   ✓ "For your fever, take Acetaminophen 500mg every 6 hours"
//   ✓ "Apply a warm compress to the affected area for 15 minutes"
//   ✓ "Drink at least 8-10 glasses of water today"
//   ✓ "Get plenty of rest - try to sleep 7-8 hours"
// - Mention home remedies: "Try ginger tea for nausea" or "Honey and lemon in warm water for sore throat"
// - Give a realistic timeline: "Most cases improve in 3-5 days with proper care"

// RED FLAGS - When to emphasize urgency:
// "[Name], please go to the ER immediately if you experience:"
// - Fever above 103°F / 39.4°C
// - Difficulty breathing or chest pain
// - Severe persistent pain
// - Confusion or severe headache
// - Persistent vomiting

// REASSURANCE:
// - End with hope: "You're going to be fine, [Name]. Follow these steps and you should feel better soon."
// - "Call me back if symptoms worsen or don't improve in 2-3 days"
// - "You did the right thing by reaching out for help"

// NEVER:
// - Give generic responses
// - Use overly formal medical language
// - Provide long paragraphs
// - Skip asking for the patient's name
// - Diagnose definitively (say "suggests" or "likely")

// Remember: You're having a real conversation with a real person who needs your help. Be warm, professional, and genuinely caring.`;
// }

// export async function POST(request: NextRequest) {
//   try {
//     const { messages, doctorPrompt, doctorInfo } = await request.json();

//     console.log("📨 Chat request received:", {
//       messageCount: messages?.length,
//       doctor: doctorInfo?.name || "Dr. Sarah Johnson",
//       specialty: doctorInfo?.specialty || "General Physician",
//     });

//     // Validate input
//     if (!messages || !Array.isArray(messages)) {
//       return NextResponse.json(
//         { error: "Messages are required and must be an array" },
//         { status: 400 }
//       );
//     }

//     // Check API key
//     if (!process.env.OPENROUTER_API_KEY) {
//       console.error("❌ Missing OPENROUTER_API_KEY");
//       // Fallback for first message
//       if (messages.length === 1) {
//         return NextResponse.json({
//           content: `Hello! I'm ${
//             doctorInfo?.name || "Dr. Sarah Johnson"
//           }, your ${
//             doctorInfo?.specialty || "General Physician"
//           } today. Before we begin, may I please have your name and age?`,
//           model: "fallback",
//         });
//       }
//       return NextResponse.json({
//         content:
//           "I understand you're not feeling well. Could you tell me more about your symptoms? When did they start?",
//         model: "fallback",
//       });
//     }

//     // Create enhanced system message
//     const systemMessage = {
//       role: "system",
//       content: doctorPrompt || createMedicalSystemPrompt(doctorInfo),
//     };

//     // Format messages for API
//     const apiMessages = [
//       systemMessage,
//       ...messages.map((msg: any) => ({
//         role: msg.role,
//         content: msg.content,
//       })),
//     ];

//     console.log("🤖 Calling Grok API...");

//     try {
//       // Call Grok with optimized parameters for natural conversation
//       const response = await grok.chat.completions.create({
//         model: "x-ai/grok-2-1212",
//         messages: apiMessages,
//         temperature: 0.9, // Higher for more natural, varied responses
//         max_tokens: 400, // Shorter responses (like real doctor)
//         top_p: 0.95,
//         frequency_penalty: 0.5, // Reduce repetition
//         presence_penalty: 0.6, // Encourage new topics
//       });

//       let assistantResponse =
//         response.choices[0]?.message?.content ||
//         "I'm sorry, could you repeat that? I want to make sure I understand your symptoms correctly.";

//       console.log(
//         "✅ Doctor Response:",
//         assistantResponse.substring(0, 100) + "..."
//       );

//       return NextResponse.json({
//         content: assistantResponse,
//         model: "grok-2-1212",
//         timestamp: new Date().toISOString(),
//       });
//     } catch (openaiError: any) {
//       console.error("❌ Error calling Grok API:", {
//         message: openaiError.message,
//         status: openaiError.status,
//       });

//       // Smart fallback based on conversation stage
//       const lastMessage = messages[messages.length - 1]?.content || "";
//       let fallbackResponse = "";

//       // First message - greeting
//       if (messages.length === 1) {
//         fallbackResponse = `Hello! I'm ${
//           doctorInfo?.name || "Dr. Sarah Johnson"
//         }, your ${
//           doctorInfo?.specialty || "General Physician"
//         } today. Before we begin, may I please have your name and age?`;
//       }
//       // Has name, ask symptoms
//       else if (lastMessage.match(/name is|i'm|i am/i)) {
//         fallbackResponse =
//           "Thank you! What brings you here today? What symptoms are you experiencing?";
//       }
//       // Responding to symptoms
//       else {
//         const lower = lastMessage.toLowerCase();
//         if (lower.includes("fever") || lower.includes("temperature")) {
//           fallbackResponse =
//             "I understand you have a fever. On a scale of 1-10, how severe is it? And when did it start? Also, have you measured your temperature?";
//         } else if (lower.includes("headache") || lower.includes("head")) {
//           fallbackResponse =
//             "I see you have a headache. Can you describe it? Is it throbbing, sharp, or dull? Where exactly does it hurt? When did it start?";
//         } else if (lower.includes("pain") || lower.includes("hurt")) {
//           fallbackResponse =
//             "I understand you're in pain. Can you point to where it hurts? How would you rate the pain on a scale of 1-10? When did it start?";
//         } else if (lower.includes("cough") || lower.includes("cold")) {
//           fallbackResponse =
//             "I hear you have cold symptoms. Are you experiencing a runny nose, sore throat, or cough? Any fever? When did these symptoms begin?";
//         } else {
//           fallbackResponse =
//             "I understand. Can you tell me more about your symptoms? When did they start, and how severe are they?";
//         }
//       }

//       return NextResponse.json({
//         content: fallbackResponse,
//         model: "fallback-smart",
//       });
//     }
//   } catch (error: any) {
//     console.error("❌ Error in chat API:", error);

//     return NextResponse.json(
//       {
//         error: "Failed to process chat request",
//         details: error.message,
//         content:
//           "I apologize for the technical difficulty. Could you please try again? I'm here to help.",
//       },
//       { status: 500 }
//     );
//   }
// }

// import { NextRequest, NextResponse } from "next/server";
// import OpenAI from "openai";

// // Validate OpenRouter API key exists
// if (!process.env.OPENROUTER_API_KEY) {
//   console.error("❌ CRITICAL: OPENROUTER_API_KEY is missing in .env.local");
//   console.log("Get your FREE API key at: https://openrouter.ai/keys");
// }

// // FREE Grok API via OpenRouter (replaces OpenAI)
// const grok = new OpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY || "",
//   baseURL: "https://openrouter.ai/api/v1",
//   defaultHeaders: {
//     "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
//     "X-Title": "Medical Voice Agent",
//   },
// });

// // Realistic fallback responses with empathy
// function generateFallbackResponse(userMessage: string): string {
//   const responses = [
//     "I understand you're not feeling well. Based on common symptoms, I recommend staying hydrated, getting rest, and monitoring your temperature. If symptoms worsen, please seek immediate medical attention.",
//     "Thank you for sharing your symptoms with me. While I gather more information, I recommend keeping a symptom diary including when they occur and their severity. This will be very helpful for your doctor.",
//     "I hear your concerns and I'm here to help. Many of these symptoms can be managed with proper care. Let's work together to understand what's happening and get you the right support.",
//     "Your health is important. Based on what you've described, I recommend scheduling an appointment with a healthcare provider who can examine you properly and provide a personalized treatment plan.",
//   ];
//   return responses[Math.floor(Math.random() * responses.length)];
// }

// // Create comprehensive medical system prompt
// function createMedicalSystemPrompt(doctorInfo?: any): string {
//   return `You are Dr. AI Assistant, a compassionate and knowledgeable medical AI working alongside ${
//     doctorInfo?.name || "Dr. Smith"
//   }, specializing in ${doctorInfo?.specialty || "General Medicine"}.

// YOUR ROLE:
// - Conduct thorough patient interviews with empathy and professionalism
// - Gather comprehensive medical history (symptoms, duration, severity, triggers)
// - Provide evidence-based health recommendations and self-care guidance
// - Offer hope and reassurance while being medically accurate
// - Guide patients on when to seek immediate care vs. home management

// COMMUNICATION STYLE:
// - Warm, empathetic, and conversational (like talking to a caring doctor)
// - Use simple language that patients can understand
// - Ask ONE focused follow-up question at a time
// - Acknowledge patient concerns and validate their feelings
// - Balance professionalism with human warmth

// MEDICAL ASSESSMENT FRAMEWORK:
// 1. **Symptom Gathering**: Ask about onset, duration, severity (1-10 scale), triggers, and patterns
// 2. **Associated Symptoms**: Inquire about related symptoms (fever, nausea, fatigue, etc.)
// 3. **Medical Context**: Ask about relevant medical history, medications, allergies
// 4. **Impact Assessment**: How symptoms affect daily life and sleep
// 5. **Red Flags**: Identify any emergency warning signs

// RESPONSE STRUCTURE (keep responses 3-4 sentences):
// 1. **Empathetic Acknowledgment**: "I understand that [symptom] can be very uncomfortable..."
// 2. **Clinical Assessment**: "Based on what you've described, this could be related to [possible causes]..."
// 3. **Actionable Recommendations**:
//    - Immediate self-care steps (rest, hydration, OTC medications)
//    - Home remedies that are evidence-based
//    - When to seek medical attention (specific red flags)
// 4. **Hope & Reassurance**: "Most cases improve with [treatment]. You're taking the right step by seeking guidance."
// 5. **Next Question**: Ask ONE specific follow-up question to gather more information

// SAFETY GUIDELINES:
// - NEVER diagnose definitively (use "this suggests" or "commonly associated with")
// - ALWAYS recommend professional evaluation for serious/persistent symptoms
// - Identify RED FLAGS requiring immediate ER visit:
//   * Chest pain, severe shortness of breath
//   * Sudden severe headache, confusion, slurred speech
//   * High fever (>103°F/39.4°C) with stiff neck
//   * Severe abdominal pain, persistent vomiting
//   * Signs of allergic reaction (difficulty breathing, swelling)
//   * Severe bleeding, traumatic injury

// MEDICATION GUIDANCE:
// - Suggest appropriate OTC medications with proper dosing
// - Always mention checking with pharmacist/doctor for interactions
// - Provide non-medication alternatives (hydration, rest, warm compress, etc.)

// GIVE HOPE:
// - Emphasize that most common conditions are treatable
// - Provide realistic timelines for improvement
// - Offer practical coping strategies
// - Remind patient they're not alone and help is available

// Remember: You're gathering information for the doctor while providing immediate comfort and guidance. Be thorough, caring, and trustworthy.`;
// }

// export async function POST(request: NextRequest) {
//   try {
//     const { messages, doctorPrompt, doctorInfo } = await request.json();

//     console.log("📨 Chat request received:", {
//       messageCount: messages?.length,
//       doctor: doctorInfo?.name || "Unknown",
//       specialty: doctorInfo?.specialty || "General",
//     });

//     // Validate input
//     if (!messages || !Array.isArray(messages)) {
//       return NextResponse.json(
//         { error: "Messages are required and must be an array" },
//         { status: 400 }
//       );
//     }

//     // Check API key
//     if (!process.env.OPENROUTER_API_KEY) {
//       console.error("❌ Missing OPENROUTER_API_KEY");
//       return NextResponse.json({
//         content: generateFallbackResponse(
//           messages[messages.length - 1]?.content || ""
//         ),
//         error: "API key not configured. Using fallback response.",
//       });
//     }

//     // Create enhanced system message with medical context
//     const systemMessage = {
//       role: "system",
//       content: doctorPrompt || createMedicalSystemPrompt(doctorInfo),
//     };

//     // Format messages for API
//     const apiMessages = [
//       systemMessage,
//       ...messages.map((msg: any) => ({
//         role: msg.role,
//         content: msg.content,
//       })),
//     ];

//     console.log("🤖 Calling FREE Grok API via OpenRouter...");

//     try {
//       // Call FREE Grok 4 Fast model with optimized parameters
//       const response = await grok.chat.completions.create({
//         model: "x-ai/grok-4-fast:free", // FREE model - no cost!
//         messages: apiMessages,
//         temperature: 0.8, // Slightly higher for more natural, empathetic responses
//         max_tokens: 600, // Increased for comprehensive answers
//         top_p: 0.95,
//         frequency_penalty: 0.3, // Reduce repetition
//         presence_penalty: 0.4, // Encourage diverse vocabulary
//       });

//       let assistantResponse =
//         response.choices[0]?.message?.content ||
//         "I'm sorry, I couldn't generate a response. Please try again.";

//       // Add helpful disclaimer at the end for first response
//       if (messages.length === 1) {
//         assistantResponse +=
//           "\n\n*Note: I'm an AI assistant providing general health information. This is not a substitute for professional medical diagnosis or treatment.*";
//       }

//       console.log(
//         "✅ Grok Response:",
//         assistantResponse.substring(0, 150) + "..."
//       );

//       return NextResponse.json({
//         content: assistantResponse,
//         model: "grok-4-fast-free",
//         timestamp: new Date().toISOString(),
//       });
//     } catch (openaiError: any) {
//       console.error("❌ Error calling Grok API:", {
//         message: openaiError.message,
//         status: openaiError.status,
//         code: openaiError.code,
//       });

//       // Enhanced fallback with patient context
//       const lastMessage = messages[messages.length - 1]?.content || "";
//       let fallbackResponse = generateFallbackResponse(lastMessage);

//       // Add specific advice based on keywords
//       if (lastMessage.toLowerCase().includes("fever")) {
//         fallbackResponse +=
//           " For fever, rest and take acetaminophen (Tylenol) or ibuprofen (Advil) as directed. Drink plenty of fluids.";
//       } else if (lastMessage.toLowerCase().includes("headache")) {
//         fallbackResponse +=
//           " For headaches, try rest in a dark room, stay hydrated, and consider OTC pain relievers.";
//       } else if (lastMessage.toLowerCase().includes("pain")) {
//         fallbackResponse +=
//           " Apply ice or heat to the affected area, rest, and consider OTC pain medication. If pain is severe or persists, seek medical attention.";
//       }

//       return NextResponse.json({
//         content: fallbackResponse,
//         error: "Using enhanced fallback response",
//         model: "fallback-with-context",
//       });
//     }
//   } catch (error: any) {
//     console.error("❌ Error in chat API:", error);

//     return NextResponse.json(
//       {
//         error: "Failed to process chat request",
//         details: error.message,
//         content:
//           "I apologize for the technical difficulty. Please try again, or if this is urgent, consider calling your healthcare provider or visiting an urgent care facility.",
//       },
//       { status: 500 }
//     );
//   }
// }
