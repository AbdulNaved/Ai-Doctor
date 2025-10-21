import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch session details
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        selectedDocter: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session", details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, docterId, sessionId, notes } = body;

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: "User ID and Session ID are required" },
        { status: 400 }
      );
    }

    const session = await prisma.session.create({
      data: {
        userId,
        docterId,
        sessionId,
        notes: notes || "",
        report: {},
      },
    });

    return NextResponse.json({
      success: true,
      message: "Session created successfully",
      data: session,
    });
  } catch (error: any) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session", details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update session with report
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, report, notes } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Build update data object dynamically
    const updateData: any = {};

    if (report) {
      updateData.report = {
        report,
        generatedAt: new Date().toISOString(),
      };
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No data provided to update" },
        { status: 400 }
      );
    }

    console.log("Updating session:", sessionId, "with data:", updateData);

    const updatedSession = await prisma.session.update({
      where: { sessionId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Report saved successfully",
      data: updatedSession,
    });
  } catch (error: any) {
    console.error("Error saving report:", error);

    // Check if session doesn't exist
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Session not found", details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save report", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete session (optional)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    await prisma.session.delete({
      where: { sessionId },
    });

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting session:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete session", details: error.message },
      { status: 500 }
    );
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import { v4 as uuidv4 } from 'uuid';
// import { PrismaClient } from "@/lib/generated/prisma";
// import { currentUser } from "@clerk/nextjs/server";

// declare global {
//   var prisma: PrismaClient | undefined;
// }

// let prisma: PrismaClient;

// if (process.env.NODE_ENV === 'production') {
//   prisma = new PrismaClient();
// } else {
//   if (!global.prisma) {
//     global.prisma = new PrismaClient();
//   }
//   prisma = global.prisma;
// }

// export async function POST(request: NextRequest) {
//   const user = await currentUser();
//   const { notes, selectedDoctor } = await request.json();

//   try {
//     const sessionId = uuidv4()
//     const result = await prisma.session.create({
//       data: {
//         sessionId,
//         createdBy: user?.emailAddresses[0]?.emailAddress || 'unknown',
//         notes: notes || "",
//         createdOn: new Date().toString(),
//         selectedDocter: selectedDoctor || null,
//       }
//     })

//     return NextResponse.json(result)
//   } catch (e) {
//     console.error("Error creating session:", e);
//     return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
//   }
// }

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url)
//     const sessionId = searchParams.get('sessionId')

//     if (!sessionId) {
//       return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
//     }

//     const user = await currentUser()
//     const userEmail = user?.emailAddresses[0]?.emailAddress || 'unknown';

//     const result = await prisma.session.findFirst({
//       where: {
//         sessionId: sessionId,

//         ...(userEmail !== 'unknown' ? { createdBy: userEmail } : {})
//       },
//     })

//     if (!result) {
//       return NextResponse.json({ error: "Session not found" }, { status: 404 });
//     }

//     return NextResponse.json(result)
//   } catch (error) {
//     console.error("Error fetching session:", error);
//     return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
//   }
// }

// // Add this new PUT endpoint to your existing session-chat route
// export async function PUT(request: NextRequest) {
//   try {
//     const { sessionId, report } = await request.json();

//     if (!sessionId || !report) {
//       return NextResponse.json(
//         { error: "Session ID and report are required" },
//         { status: 400 }
//       );
//     }

//     const result = await prisma.session.update({
//       where: { sessionId },
//       data: {
//         report: { report, generatedAt: new Date().toISOString() },
//         updatedAt: new Date(),
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       message: "Report saved successfully",
//       data: result,
//     });

//   } catch (error: any) {
//     console.error("Error saving report:", error);
//     return NextResponse.json(
//       { error: "Failed to save report", details: error.message },
//       { status: 500 }
//     );
//   }
// }
