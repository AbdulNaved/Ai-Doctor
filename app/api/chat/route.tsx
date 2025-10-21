import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Validate OpenRouter API key exists
if (!process.env.OPENROUTER_API_KEY) {
  console.error("❌ CRITICAL: OPENROUTER_API_KEY is missing in .env.local");
  console.log("Get your FREE API key at: https://openrouter.ai/keys");
}

// FREE Grok API via OpenRouter (replaces OpenAI)
const grok = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Medical Voice Agent",
  },
});

// Realistic fallback responses with empathy
function generateFallbackResponse(userMessage: string): string {
  const responses = [
    "I understand you're not feeling well. Based on common symptoms, I recommend staying hydrated, getting rest, and monitoring your temperature. If symptoms worsen, please seek immediate medical attention.",
    "Thank you for sharing your symptoms with me. While I gather more information, I recommend keeping a symptom diary including when they occur and their severity. This will be very helpful for your doctor.",
    "I hear your concerns and I'm here to help. Many of these symptoms can be managed with proper care. Let's work together to understand what's happening and get you the right support.",
    "Your health is important. Based on what you've described, I recommend scheduling an appointment with a healthcare provider who can examine you properly and provide a personalized treatment plan.",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Create comprehensive medical system prompt
function createMedicalSystemPrompt(doctorInfo?: any): string {
  return `You are Dr. AI Assistant, a compassionate and knowledgeable medical AI working alongside ${
    doctorInfo?.name || "Dr. Smith"
  }, specializing in ${doctorInfo?.specialty || "General Medicine"}.

YOUR ROLE:
- Conduct thorough patient interviews with empathy and professionalism
- Gather comprehensive medical history (symptoms, duration, severity, triggers)
- Provide evidence-based health recommendations and self-care guidance
- Offer hope and reassurance while being medically accurate
- Guide patients on when to seek immediate care vs. home management

COMMUNICATION STYLE:
- Warm, empathetic, and conversational (like talking to a caring doctor)
- Use simple language that patients can understand
- Ask ONE focused follow-up question at a time
- Acknowledge patient concerns and validate their feelings
- Balance professionalism with human warmth

MEDICAL ASSESSMENT FRAMEWORK:
1. **Symptom Gathering**: Ask about onset, duration, severity (1-10 scale), triggers, and patterns
2. **Associated Symptoms**: Inquire about related symptoms (fever, nausea, fatigue, etc.)
3. **Medical Context**: Ask about relevant medical history, medications, allergies
4. **Impact Assessment**: How symptoms affect daily life and sleep
5. **Red Flags**: Identify any emergency warning signs

RESPONSE STRUCTURE (keep responses 3-4 sentences):
1. **Empathetic Acknowledgment**: "I understand that [symptom] can be very uncomfortable..."
2. **Clinical Assessment**: "Based on what you've described, this could be related to [possible causes]..."
3. **Actionable Recommendations**: 
   - Immediate self-care steps (rest, hydration, OTC medications)
   - Home remedies that are evidence-based
   - When to seek medical attention (specific red flags)
4. **Hope & Reassurance**: "Most cases improve with [treatment]. You're taking the right step by seeking guidance."
5. **Next Question**: Ask ONE specific follow-up question to gather more information

SAFETY GUIDELINES:
- NEVER diagnose definitively (use "this suggests" or "commonly associated with")
- ALWAYS recommend professional evaluation for serious/persistent symptoms
- Identify RED FLAGS requiring immediate ER visit:
  * Chest pain, severe shortness of breath
  * Sudden severe headache, confusion, slurred speech
  * High fever (>103°F/39.4°C) with stiff neck
  * Severe abdominal pain, persistent vomiting
  * Signs of allergic reaction (difficulty breathing, swelling)
  * Severe bleeding, traumatic injury

MEDICATION GUIDANCE:
- Suggest appropriate OTC medications with proper dosing
- Always mention checking with pharmacist/doctor for interactions
- Provide non-medication alternatives (hydration, rest, warm compress, etc.)

GIVE HOPE:
- Emphasize that most common conditions are treatable
- Provide realistic timelines for improvement
- Offer practical coping strategies
- Remind patient they're not alone and help is available

Remember: You're gathering information for the doctor while providing immediate comfort and guidance. Be thorough, caring, and trustworthy.`;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, doctorPrompt, doctorInfo } = await request.json();

    console.log("📨 Chat request received:", {
      messageCount: messages?.length,
      doctor: doctorInfo?.name || "Unknown",
      specialty: doctorInfo?.specialty || "General",
    });

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages are required and must be an array" },
        { status: 400 }
      );
    }

    // Check API key
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("❌ Missing OPENROUTER_API_KEY");
      return NextResponse.json({
        content: generateFallbackResponse(
          messages[messages.length - 1]?.content || ""
        ),
        error: "API key not configured. Using fallback response.",
      });
    }

    // Create enhanced system message with medical context
    const systemMessage = {
      role: "system",
      content: doctorPrompt || createMedicalSystemPrompt(doctorInfo),
    };

    // Format messages for API
    const apiMessages = [
      systemMessage,
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    console.log("🤖 Calling FREE Grok API via OpenRouter...");

    try {
      // Call FREE Grok 4 Fast model with optimized parameters
      const response = await grok.chat.completions.create({
        model: "x-ai/grok-4-fast:free", // FREE model - no cost!
        messages: apiMessages,
        temperature: 0.8, // Slightly higher for more natural, empathetic responses
        max_tokens: 600, // Increased for comprehensive answers
        top_p: 0.95,
        frequency_penalty: 0.3, // Reduce repetition
        presence_penalty: 0.4, // Encourage diverse vocabulary
      });

      let assistantResponse =
        response.choices[0]?.message?.content ||
        "I'm sorry, I couldn't generate a response. Please try again.";

      // Add helpful disclaimer at the end for first response
      if (messages.length === 1) {
        assistantResponse +=
          "\n\n*Note: I'm an AI assistant providing general health information. This is not a substitute for professional medical diagnosis or treatment.*";
      }

      console.log(
        "✅ Grok Response:",
        assistantResponse.substring(0, 150) + "..."
      );

      return NextResponse.json({
        content: assistantResponse,
        model: "grok-4-fast-free",
        timestamp: new Date().toISOString(),
      });
    } catch (openaiError: any) {
      console.error("❌ Error calling Grok API:", {
        message: openaiError.message,
        status: openaiError.status,
        code: openaiError.code,
      });

      // Enhanced fallback with patient context
      const lastMessage = messages[messages.length - 1]?.content || "";
      let fallbackResponse = generateFallbackResponse(lastMessage);

      // Add specific advice based on keywords
      if (lastMessage.toLowerCase().includes("fever")) {
        fallbackResponse +=
          " For fever, rest and take acetaminophen (Tylenol) or ibuprofen (Advil) as directed. Drink plenty of fluids.";
      } else if (lastMessage.toLowerCase().includes("headache")) {
        fallbackResponse +=
          " For headaches, try rest in a dark room, stay hydrated, and consider OTC pain relievers.";
      } else if (lastMessage.toLowerCase().includes("pain")) {
        fallbackResponse +=
          " Apply ice or heat to the affected area, rest, and consider OTC pain medication. If pain is severe or persists, seek medical attention.";
      }

      return NextResponse.json({
        content: fallbackResponse,
        error: "Using enhanced fallback response",
        model: "fallback-with-context",
      });
    }
  } catch (error: any) {
    console.error("❌ Error in chat API:", error);

    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error.message,
        content:
          "I apologize for the technical difficulty. Please try again, or if this is urgent, consider calling your healthcare provider or visiting an urgent care facility.",
      },
      { status: 500 }
    );
  }
}


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

// // Fallback response if API fails
// function generateFallbackResponse(userMessage: string): string {
//   const responses = [
//     "I understand you're experiencing some symptoms. Could you tell me more about how you're feeling?",
//     "Thank you for sharing that. Can you describe when these symptoms started?",
//     "I'm here to help. Could you provide more details about your condition?",
//     "Based on what you've told me, I recommend consulting with a healthcare professional for a proper evaluation.",
//   ];
//   return responses[Math.floor(Math.random() * responses.length)];
// }

// export async function POST(request: NextRequest) {
//   try {
//     const { messages, doctorPrompt } = await request.json();

//     console.log("📨 Chat request received:", {
//       messageCount: messages?.length,
//       hasPrompt: !!doctorPrompt,
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

//     // Create system message with medical context
//     const systemMessage = {
//       role: "system",
//       content:
//         doctorPrompt ||
//         `You are a helpful AI medical assistant.

// Guidelines:
// - Be empathetic, professional, and conversational
// - Ask relevant follow-up questions about symptoms
// - Provide concise, accurate medical information (2-3 sentences)
// - Recommend professional medical advice for serious concerns
// - Remember you are not a replacement for professional diagnosis

// Respond naturally to the patient's input.`,
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
//       // Call FREE Grok 4 Fast model
//       const response = await grok.chat.completions.create({
//         model: "x-ai/grok-4-fast:free", // FREE model - no cost!
//         messages: apiMessages,
//         temperature: 0.7,
//         max_tokens: 500,
//         top_p: 1,
//         frequency_penalty: 0,
//         presence_penalty: 0,
//       });

//       const assistantResponse =
//         response.choices[0]?.message?.content ||
//         "I'm sorry, I couldn't generate a response.";

//       console.log(
//         "✅ Grok Response:",
//         assistantResponse.substring(0, 100) + "..."
//       );

//       return NextResponse.json({
//         content: assistantResponse,
//         model: "grok-4-fast-free",
//       });
//     } catch (openaiError: any) {
//       console.error("❌ Error calling Grok API:", {
//         message: openaiError.message,
//         status: openaiError.status,
//         code: openaiError.code,
//       });

//       // Use fallback response
//       const fallbackResponse = generateFallbackResponse(
//         messages[messages.length - 1]?.content || ""
//       );

//       return NextResponse.json({
//         content: fallbackResponse,
//         error: "Using fallback response due to API error",
//         details: openaiError.message,
//       });
//     }
//   } catch (error: any) {
//     console.error("❌ Error in chat API:", error);

//     return NextResponse.json(
//       {
//         error: "Failed to process chat request",
//         details: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }
