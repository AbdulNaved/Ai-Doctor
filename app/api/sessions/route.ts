import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";

export async function GET(request: NextRequest) {
  try {
    console.log("📥 Sessions API called");

    const sessions = await db.session.findMany({
      include: {
        selectedDocter: true,
      },
      orderBy: {
        createdOn: "desc",
      },
    });

    console.log("✅ Found", sessions.length, "sessions");

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
