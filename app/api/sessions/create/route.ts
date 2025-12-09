// app/api/sessions/create/route.ts
import { db } from "@/utils/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// Helper function to generate unique session ID
function generateSessionId(): string {
  return `session-${randomUUID()}`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const session = await db.session.create({
      data: {
        sessionId: body.sessionId || generateSessionId(),
        createdBy: userId, // ✅ CRITICAL: Store Clerk userId here
        patientName: body.patientName,
        patientAge: body.patientAge,
        patientGender: body.patientGender,
        doctorId: body.doctorId,
        conversationHistory: body.conversationHistory,
        callDuration: body.callDuration || 0,
        reportGenerated: false,
        notes: body.notes,
        conversation: body.conversation,
        report: body.report,
      },
    });

    console.log(`✅ Session created for user: ${userId}`);
    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session", details: error.message },
      { status: 500 }
    );
  }
}
