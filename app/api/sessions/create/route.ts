// app/api/sessions/create/route.ts (or wherever you create sessions)
import { db } from "@/utils/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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
        // ... other fields
      },
    });

    console.log(`✅ Session created for user: ${userId}`);
    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
