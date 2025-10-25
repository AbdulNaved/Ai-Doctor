import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/utils/db";

// ✅ Move these to the TOP before the GET function
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔍 Checking subscription for user:", userId);
    console.log("📋 Clerk metadata:", user?.publicMetadata);

    // Check subscription from database first (most reliable)
    let hasSubscription = false;
    let userSubscription = null;

    try {
      userSubscription = await db.subscription.findUnique({
        where: { userId: userId },
      });

      console.log("💾 Database subscription:", userSubscription);

      if (userSubscription) {
        hasSubscription =
          userSubscription.status === "active" &&
          new Date(userSubscription.currentPeriodEnd) > new Date();
      }
    } catch (error) {
      console.log("⚠️ Database check failed, using Clerk metadata:", error);
    }

    // Fallback to Clerk metadata if database check fails
    if (!hasSubscription) {
      hasSubscription = user?.publicMetadata?.subscriptionStatus === "active";
    }

    // Get consultation count
    let consultationCount = 0;
    try {
      consultationCount = await db.session.count({
        where: {
          createdBy: userId,
        },
      });
    } catch (error) {
      console.log("⚠️ Failed to count consultations:", error);
    }

    console.log("📊 Final subscription status:", {
      userId,
      hasSubscription,
      consultationCount,
    });

    return NextResponse.json({
      hasSubscription,
      consultationCount,
      remainingConsultations: hasSubscription
        ? -1
        : Math.max(0, 2 - consultationCount),
      metadata: user?.publicMetadata,
    });
  } catch (error: any) {
    console.error("❌ Error checking subscription:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


// import { auth, currentUser } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";
// import { db } from "@/utils/db";

// export async function GET() {
//   try {
//     const { userId } = await auth();
//     const user = await currentUser();

//     if (!userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     console.log("🔍 Checking subscription for user:", userId);
//     console.log("📋 Clerk metadata:", user?.publicMetadata);

//     // Check subscription from database first (most reliable)
//     let hasSubscription = false;

//     try {
//       const userSubscription = await db.subscription.findUnique({
//         where: { userId: userId },
//       });

//       console.log("💾 Database subscription:", userSubscription);

//       if (userSubscription) {
//         hasSubscription =
//           userSubscription.status === "active" &&
//           new Date(userSubscription.currentPeriodEnd) > new Date();
//       }
//     } catch (error) {
//       console.log("⚠️ Database check failed, using Clerk metadata");
//     }

//     // Fallback to Clerk metadata if database check fails
//     if (!hasSubscription) {
//       hasSubscription = user?.publicMetadata?.subscriptionStatus === "active";
//     }

//     // Get consultation count
//     const consultationCount = await db.session.count({
//       where: {
//         createdBy: userId,
//       },
//     });

//     console.log("📊 Final subscription status:", {
//       userId,
//       hasSubscription,
//       consultationCount,
//     });

//     return NextResponse.json({
//       hasSubscription,
//       consultationCount,
//       remainingConsultations: hasSubscription
//         ? -1
//         : Math.max(0, 2 - consultationCount),
//       metadata: user?.publicMetadata,
//     });
//   } catch (error: any) {
//     console.error("❌ Error checking subscription:", error);
//     return NextResponse.json(
//       { error: "Internal server error", details: error.message },
//       { status: 500 }
//     );
//   }
// }
