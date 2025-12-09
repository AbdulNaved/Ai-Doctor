// app/api/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    console.log("📥 Sessions API called");

    // Get authenticated user ID from Clerk
    const { userId } = await auth();

    console.log("🔐 Auth check - userId:", userId);

    // If no userId, user is not authenticated
    if (!userId) {
      console.log("❌ No userId found - user not authenticated");
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    console.log("✅ Authenticated user:", userId);

    // Fetch sessions filtered by the authenticated user's ID
    const sessions = await db.session.findMany({
      where: {
        createdBy: userId, // Filter by Clerk userId
      },
      include: {
        selectedDocter: true,
      },
      orderBy: {
        createdOn: "desc",
      },
    });

    console.log(`✅ Found ${sessions.length} session(s) for user: ${userId}`);

    // Return empty array if no sessions (not an error)
    return NextResponse.json(sessions);

  } catch (error: any) {
    console.error("❌ Sessions API Error:", error.message);
    console.error("Full error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch sessions",
        details: error.message,
      },
      { status: 500 }
    );
  }
}



// import { NextRequest, NextResponse } from "next/server";
// import { db } from "@/utils/db";

// // ✅ ADD THESE EXPORTS TO FIX BUILD ERROR
// export const dynamic = "force-dynamic";
// export const runtime = "nodejs";

// export async function GET(request: NextRequest) {
//   try {
//     console.log("📥 Sessions API called");

//     const sessions = await db.session.findMany({
//       include: {
//         selectedDocter: true,
//       },
//       orderBy: {
//         createdOn: "desc",
//       },
//     });

//     console.log("✅ Found", sessions.length, "sessions");

//     return NextResponse.json(sessions);
//   } catch (error: any) {
//     console.error("❌ Sessions API Error:", error.message);
//     console.error("Full error:", error);

//     return NextResponse.json(
//       {
//         error: "Failed to fetch sessions",
//         details: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }

// // import { NextRequest, NextResponse } from "next/server";
// // import { db } from "@/utils/db";

// // export async function GET(request: NextRequest) {
// //   try {
// //     console.log("📥 Sessions API called");

// //     const sessions = await db.session.findMany({
// //       include: {
// //         selectedDocter: true,
// //       },
// //       orderBy: {
// //         createdOn: "desc",
// //       },
// //     });

// //     console.log("✅ Found", sessions.length, "sessions");

// //     return NextResponse.json(sessions);
// //   } catch (error: any) {
// //     console.error("❌ Sessions API Error:", error.message);
// //     console.error("Full error:", error);

// //     return NextResponse.json(
// //       {
// //         error: "Failed to fetch sessions",
// //         details: error.message,
// //       },
// //       { status: 500 }
// //     );
// //   }
// // }
