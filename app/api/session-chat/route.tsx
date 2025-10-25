import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { auth, currentUser } from "@clerk/nextjs/server";

// GET - Fetch session details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    console.log("📥 GET session-chat called with sessionId:", sessionId);

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await db.session.findUnique({
      where: { sessionId },
      include: {
        selectedDocter: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    console.log("✅ Session found:", session.sessionId);

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("❌ GET session-chat error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch session",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Create new session
export async function POST(request: NextRequest) {
  try {
    console.log("📥 POST session-chat called");

    // ✅ CHECK AUTHENTICATION
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // ✅ CHECK SUBSCRIPTION STATUS FROM DATABASE (More reliable than metadata)
    let hasSubscription = false;

    try {
      const userSubscription = await db.subscription.findUnique({
        where: { userId: userId },
      });

      hasSubscription =
        userSubscription?.status === "active" &&
        new Date(userSubscription.currentPeriodEnd) > new Date();

      console.log("💳 Subscription from DB:", userSubscription);
    } catch (error) {
      console.log("⚠️ Subscription table not found, falling back to metadata");
      // Fallback to Clerk metadata if subscription table doesn't exist
      hasSubscription = user?.publicMetadata?.subscriptionStatus === "active";
    }

    // ✅ COUNT EXISTING SESSIONS FOR THIS USER
    const sessionCount = await db.session.count({
      where: {
        createdBy: userId,
      },
    });

    console.log("📊 User stats:", {
      userId,
      hasSubscription,
      sessionCount,
      email: user.emailAddresses[0]?.emailAddress,
    });

    // ✅ ENFORCE 2 FREE CONSULTATION LIMIT
    if (!hasSubscription && sessionCount >= 2) {
      console.log("🚫 Free consultation limit reached");
      return NextResponse.json(
        {
          error: "Free consultation limit reached",
          message:
            "You have used all 2 free consultations. Please subscribe to continue.",
          redirectTo: "/Pricing",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("📦 Request body:", body);

    const { notes, selectedDoctor } = body;

    // ✅ FIX: Use default doctor if selectedDoctor is missing
    const doctor = selectedDoctor || {
      id: 1,
      specialist: "General Physician",
      image: "/doctor1.png",
      voiceId: "marcus",
      agentPrompt:
        "You are a friendly General Physician AI. Greet the user and quickly ask what symptoms they're experiencing. Keep responses short and helpful.",
    };

    if (!doctor.id) {
      return NextResponse.json(
        { error: "Invalid doctor data" },
        { status: 400 }
      );
    }

    // Generate unique session ID
    const sessionId = `session-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log("🔧 Creating session with:", {
      sessionId,
      createdBy: userId,
      doctorId: doctor.id,
      notes: notes || "",
    });

    // First, ensure doctor exists in database
    let dbDoctor = await db.doctor.findUnique({
      where: { id: doctor.id },
    });

    // If doctor doesn't exist, create it
    if (!dbDoctor) {
      console.log("👨‍⚕️ Creating doctor in database...");
      dbDoctor = await db.doctor.create({
        data: {
          id: doctor.id,
          name: doctor.specialist || "AI Doctor",
          specialist: doctor.specialist || "General Physician",
          image: doctor.image || "/doctor1.png",
          voiceId: doctor.voiceId || "alloy",
          agentPrompt: doctor.agentPrompt || "",
        },
      });
      console.log("✅ Doctor created:", dbDoctor.specialist);
    }

    // Create session
    const newSession = await db.session.create({
      data: {
        sessionId,
        createdBy: userId,
        notes: notes || "",
        doctorId: doctor.id,
        reportGenerated: false,
        callDuration: 0,
      },
      include: {
        selectedDocter: true,
      },
    });

    console.log("✅ Session created:", newSession.sessionId);
    console.log(
      `🎯 Remaining consultations: ${
        hasSubscription ? "unlimited" : 2 - sessionCount - 1
      }`
    );

    return NextResponse.json(
      {
        ...newSession,
        remainingConsultations: hasSubscription ? -1 : 2 - sessionCount - 1,
        hasSubscription,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ POST session-chat error:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
    });

    return NextResponse.json(
      {
        error: "Failed to create session",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

// PUT - Update session (for saving reports)
export async function PUT(request: NextRequest) {
  try {
    console.log("📥 PUT session-chat called");

    const body = await request.json();
    console.log("📦 Update body:", JSON.stringify(body, null, 2));

    const {
      sessionId,
      report,
      conversationHistory,
      patientName,
      patientAge,
      patientGender,
      callDuration,
      notes,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Check if session exists
    const existingSession = await db.session.findUnique({
      where: { sessionId },
    });

    if (!existingSession) {
      console.error("❌ Session not found:", sessionId);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    console.log("✅ Session found, updating...");

    // Prepare update data
    const updateData: any = {};

    if (report !== undefined) {
      updateData.report = report;
      updateData.reportGenerated = true;
      console.log("📝 Setting report (length:", report.length, "chars)");
    }

    if (conversationHistory !== undefined) {
      updateData.conversationHistory =
        typeof conversationHistory === "string"
          ? conversationHistory
          : JSON.stringify(conversationHistory);
      console.log("💬 Setting conversation history");
    }

    if (patientName !== undefined) {
      updateData.patientName = patientName;
      console.log("👤 Setting patient name:", patientName);
    }

    if (patientAge !== undefined) {
      updateData.patientAge = patientAge;
      console.log("🎂 Setting patient age:", patientAge);
    }

    if (patientGender !== undefined) {
      updateData.patientGender = patientGender;
      console.log("⚧ Setting patient gender:", patientGender);
    }

    if (callDuration !== undefined) {
      updateData.callDuration = callDuration;
      console.log("⏱️ Setting call duration:", callDuration);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    console.log("🔧 Updating session with fields:", Object.keys(updateData));

    // Update session
    const updatedSession = await db.session.update({
      where: { sessionId },
      data: updateData,
      include: {
        selectedDocter: true,
      },
    });

    console.log("✅ Session updated successfully!");
    console.log("Report generated status:", updatedSession.reportGenerated);

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error: any) {
    console.error("❌ PUT session-chat error:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
    });

    return NextResponse.json(
      {
        error: "Failed to update session",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

// most best
// import { NextRequest, NextResponse } from "next/server";
// import { db } from "@/utils/db";

// // GET - Fetch session details
// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const sessionId = searchParams.get("sessionId");

//     console.log("📥 GET session-chat called with sessionId:", sessionId);

//     if (!sessionId) {
//       return NextResponse.json(
//         { error: "Session ID is required" },
//         { status: 400 }
//       );
//     }

//     const session = await db.session.findUnique({
//       where: { sessionId },
//       include: {
//         selectedDocter: true,
//       },
//     });

//     if (!session) {
//       return NextResponse.json({ error: "Session not found" }, { status: 404 });
//     }

//     console.log("✅ Session found:", session.sessionId);

//     return NextResponse.json(session);
//   } catch (error: any) {
//     console.error("❌ GET session-chat error:", error);
//     return NextResponse.json(
//       {
//         error: "Failed to fetch session",
//         details: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }

// // POST - Create new session
// export async function POST(request: NextRequest) {
//   try {
//     console.log("📥 POST session-chat called");

//     const body = await request.json();
//     console.log("📦 Request body:", body);

//     const { notes, selectedDoctor } = body;

//     // Use anonymous user for now
//     const userId = "user-" + Date.now();

//     // ✅ FIX: Use default doctor if selectedDoctor is missing
//     const doctor = selectedDoctor || {
//       id: 1,
//       specialist: "General Physician",
//       image: "/doctor1.png",
//       voiceId: "marcus",
//       agentPrompt:
//         "You are a friendly General Physician AI. Greet the user and quickly ask what symptoms they're experiencing. Keep responses short and helpful.",
//     };

//     if (!doctor.id) {
//       return NextResponse.json(
//         { error: "Invalid doctor data" },
//         { status: 400 }
//       );
//     }

//     // Generate unique session ID
//     const sessionId = `session-${Date.now()}-${Math.random()
//       .toString(36)
//       .substr(2, 9)}`;

//     console.log("🔧 Creating session with:", {
//       sessionId,
//       createdBy: userId,
//       doctorId: doctor.id,
//       notes: notes || "",
//     });

//     // First, ensure doctor exists in database
//     let dbDoctor = await db.doctor.findUnique({
//       where: { id: doctor.id },
//     });

//     // If doctor doesn't exist, create it
//     if (!dbDoctor) {
//       console.log("👨‍⚕️ Creating doctor in database...");
//       dbDoctor = await db.doctor.create({
//         data: {
//           id: doctor.id,
//           name: doctor.specialist || "AI Doctor",
//           specialist: doctor.specialist || "General Physician",
//           image: doctor.image || "/doctor1.png",
//           voiceId: doctor.voiceId || "alloy",
//           agentPrompt: doctor.agentPrompt || "",
//         },
//       });
//       console.log("✅ Doctor created:", dbDoctor.specialist);
//     }

//     // Create session
//     const newSession = await db.session.create({
//       data: {
//         sessionId,
//         createdBy: userId,
//         notes: notes || "",
//         doctorId: doctor.id,
//         reportGenerated: false,
//         callDuration: 0,
//       },
//       include: {
//         selectedDocter: true,
//       },
//     });

//     console.log("✅ Session created:", newSession.sessionId);

//     return NextResponse.json(newSession, { status: 201 });
//   } catch (error: any) {
//     console.error("❌ POST session-chat error:", error);
//     console.error("Error details:", {
//       name: error.name,
//       message: error.message,
//       code: error.code,
//     });

//     return NextResponse.json(
//       {
//         error: "Failed to create session",
//         details: error.message,
//         code: error.code,
//       },
//       { status: 500 }
//     );
//   }
// }

// // PUT - Update session (for saving reports)
// export async function PUT(request: NextRequest) {
//   try {
//     console.log("📥 PUT session-chat called");

//     const body = await request.json();
//     console.log("📦 Update body:", JSON.stringify(body, null, 2));

//     const {
//       sessionId,
//       report,
//       conversationHistory,
//       patientName,
//       patientAge,
//       patientGender,
//       callDuration,
//       notes,
//     } = body;

//     if (!sessionId) {
//       return NextResponse.json(
//         { error: "sessionId is required" },
//         { status: 400 }
//       );
//     }

//     // Check if session exists
//     const existingSession = await db.session.findUnique({
//       where: { sessionId },
//     });

//     if (!existingSession) {
//       console.error("❌ Session not found:", sessionId);
//       return NextResponse.json({ error: "Session not found" }, { status: 404 });
//     }

//     console.log("✅ Session found, updating...");

//     // Prepare update data
//     const updateData: any = {};

//     if (report !== undefined) {
//       updateData.report = report;
//       updateData.reportGenerated = true;
//       console.log("📝 Setting report (length:", report.length, "chars)");
//     }

//     if (conversationHistory !== undefined) {
//       updateData.conversationHistory =
//         typeof conversationHistory === "string"
//           ? conversationHistory
//           : JSON.stringify(conversationHistory);
//       console.log("💬 Setting conversation history");
//     }

//     if (patientName !== undefined) {
//       updateData.patientName = patientName;
//       console.log("👤 Setting patient name:", patientName);
//     }

//     if (patientAge !== undefined) {
//       updateData.patientAge = patientAge;
//       console.log("🎂 Setting patient age:", patientAge);
//     }

//     if (patientGender !== undefined) {
//       updateData.patientGender = patientGender;
//       console.log("⚧ Setting patient gender:", patientGender);
//     }

//     if (callDuration !== undefined) {
//       updateData.callDuration = callDuration;
//       console.log("⏱️ Setting call duration:", callDuration);
//     }

//     if (notes !== undefined) {
//       updateData.notes = notes;
//     }

//     console.log("🔧 Updating session with fields:", Object.keys(updateData));

//     // Update session
//     const updatedSession = await db.session.update({
//       where: { sessionId },
//       data: updateData,
//       include: {
//         selectedDocter: true,
//       },
//     });

//     console.log("✅ Session updated successfully!");
//     console.log("Report generated status:", updatedSession.reportGenerated);

//     return NextResponse.json({
//       success: true,
//       session: updatedSession,
//     });
//   } catch (error: any) {
//     console.error("❌ PUT session-chat error:", error);
//     console.error("Error details:", {
//       name: error.name,
//       message: error.message,
//       code: error.code,
//     });

//     return NextResponse.json(
//       {
//         error: "Failed to update session",
//         details: error.message,
//         code: error.code,
//       },
//       { status: 500 }
//     );
//   }
// }
