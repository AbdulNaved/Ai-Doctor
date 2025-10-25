"use server";

import { Webhook } from "svix";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/utils/db";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("❌ CLERK_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("❌ Missing svix headers");
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload, null, 2);
  console.log("📥 Webhook payload:", body);

  const wh = new Webhook(WEBHOOK_SECRET);

  // ✅ Allow both Clerk’s default events and custom billing events
  type ExtendedWebhookEvent = WebhookEvent | { type: string; data: any };
  let evt: ExtendedWebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ExtendedWebhookEvent;
  } catch (err) {
    console.error("❌ Webhook verification failed:", err);
    return new Response("Error: Invalid signature", { status: 400 });
  }

  const eventType = evt.type;
  console.log("🎉 Webhook event type:", eventType);

  try {
    // 🟢 Handle subscription created or updated
    if (
      eventType === "subscription.created" ||
      eventType === "subscription.updated"
    ) {
      const subscriptionData = evt.data as any;
      const userId = subscriptionData.user_id;

      console.log("📝 Processing subscription for user:", userId);
      console.log("📦 Subscription data:", subscriptionData);

      const dbSubscription = await db.subscription.upsert({
        where: { userId },
        update: {
          status: subscriptionData.status || "active",
          subscriptionId: subscriptionData.id,
          planId: subscriptionData.plan?.id || "default",
          currentPeriodEnd: new Date(
            subscriptionData.current_period_end
              ? subscriptionData.current_period_end * 1000
              : Date.now() + 30 * 24 * 60 * 60 * 1000
          ),
          updatedAt: new Date(),
        },
        create: {
          userId,
          status: subscriptionData.status || "active",
          subscriptionId: subscriptionData.id,
          planId: subscriptionData.plan?.id || "default",
          currentPeriodEnd: new Date(
            subscriptionData.current_period_end
              ? subscriptionData.current_period_end * 1000
              : Date.now() + 30 * 24 * 60 * 60 * 1000
          ),
        },
      });

      console.log("✅ Database subscription upserted:", dbSubscription);

      // 🟢 Update Clerk metadata
      try {
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            subscriptionStatus: subscriptionData.status || "active",
            subscriptionId: subscriptionData.id,
            planId: subscriptionData.plan?.id,
            updatedAt: new Date().toISOString(),
          },
        });
        console.log("✅ Clerk metadata updated");
      } catch (metadataError) {
        console.error("⚠️ Failed to update Clerk metadata:", metadataError);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🔴 Handle subscription deleted/canceled
    if (eventType === "subscription.deleted") {
      const subscriptionData = evt.data as any;
      const userId = subscriptionData.user_id;

      console.log("❌ Canceling subscription for user:", userId);

      await db.subscription.update({
        where: { userId },
        data: {
          status: "canceled",
          updatedAt: new Date(),
        },
      });

      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          subscriptionStatus: "canceled",
          updatedAt: new Date().toISOString(),
        },
      });

      console.log("✅ Subscription canceled");

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🟡 Unknown event
    console.log("ℹ️ Unhandled event type:", eventType);
    return new Response("Event type not handled", { status: 200 });
  } catch (error: any) {
    console.error("❌ Error processing webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// import { Webhook } from "svix";
// import { headers } from "next/headers";
// import { WebhookEvent } from "@clerk/nextjs/server";
// import { db } from "@/utils/db";
// import { clerkClient } from "@clerk/nextjs/server";

// export async function POST(req: Request) {
//   const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

//   if (!WEBHOOK_SECRET) {
//     console.error("❌ CLERK_WEBHOOK_SECRET not configured");
//     return new Response("Webhook secret not configured", { status: 500 });
//   }

//   const headerPayload = await headers();
//   const svix_id = headerPayload.get("svix-id");
//   const svix_timestamp = headerPayload.get("svix-timestamp");
//   const svix_signature = headerPayload.get("svix-signature");

//   if (!svix_id || !svix_timestamp || !svix_signature) {
//     console.error("❌ Missing svix headers");
//     return new Response("Error: Missing svix headers", { status: 400 });
//   }

//   const payload = await req.json();
//   const body = JSON.stringify(payload);

//   console.log("📥 Webhook payload:", JSON.stringify(payload, null, 2));

//   const wh = new Webhook(WEBHOOK_SECRET);
//   let evt: WebhookEvent;

//   try {
//     evt = wh.verify(body, {
//       "svix-id": svix_id,
//       "svix-timestamp": svix_timestamp,
//       "svix-signature": svix_signature,
//     }) as WebhookEvent;
//   } catch (err) {
//     console.error("❌ Webhook verification failed:", err);
//     return new Response("Error: Invalid signature", { status: 400 });
//   }

//   const eventType = evt.type;
//   console.log("🎉 Webhook event type:", eventType);

//   try {
//     // Handle subscription created/updated
//     if (
//       eventType === "subscription.created" ||
//       eventType === "subscription.updated"
//     ) {
//       const subscriptionData = evt.data as any;
//       const userId = subscriptionData.user_id;

//       console.log("📝 Processing subscription for user:", userId);
//       console.log("📦 Subscription data:", subscriptionData);

//       // Update database
//       const dbSubscription = await db.subscription.upsert({
//         where: { userId: userId },
//         update: {
//           status: subscriptionData.status || "active",
//           subscriptionId: subscriptionData.id,
//           planId: subscriptionData.plan?.id || "default",
//           currentPeriodEnd: new Date(
//             subscriptionData.current_period_end
//               ? subscriptionData.current_period_end * 1000
//               : Date.now() + 30 * 24 * 60 * 60 * 1000
//           ),
//           updatedAt: new Date(),
//         },
//         create: {
//           userId: userId,
//           status: subscriptionData.status || "active",
//           subscriptionId: subscriptionData.id,
//           planId: subscriptionData.plan?.id || "default",
//           currentPeriodEnd: new Date(
//             subscriptionData.current_period_end
//               ? subscriptionData.current_period_end * 1000
//               : Date.now() + 30 * 24 * 60 * 60 * 1000
//           ),
//         },
//       });

//       console.log("✅ Database subscription updated:", dbSubscription);

//       // Update Clerk metadata for immediate access
//       try {
//         const client = await clerkClient();
//         await client.users.updateUserMetadata(userId, {
//           publicMetadata: {
//             subscriptionStatus: subscriptionData.status || "active",
//             subscriptionId: subscriptionData.id,
//             planId: subscriptionData.plan?.id,
//             updatedAt: new Date().toISOString(),
//           },
//         });
//         console.log("✅ Clerk metadata updated");
//       } catch (metadataError) {
//         console.error("⚠️ Failed to update Clerk metadata:", metadataError);
//       }

//       return new Response(JSON.stringify({ success: true }), {
//         status: 200,
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     // Handle subscription deleted/canceled
//     if (eventType === "subscription.deleted") {
//       const subscriptionData = evt.data as any;
//       const userId = subscriptionData.user_id;

//       console.log("❌ Canceling subscription for user:", userId);

//       await db.subscription.update({
//         where: { userId: userId },
//         data: {
//           status: "canceled",
//           updatedAt: new Date(),
//         },
//       });

//       const client = await clerkClient();
//       await client.users.updateUserMetadata(userId, {
//         publicMetadata: {
//           subscriptionStatus: "canceled",
//           updatedAt: new Date().toISOString(),
//         },
//       });

//       console.log("✅ Subscription canceled");
//       return new Response(JSON.stringify({ success: true }), { status: 200 });
//     }

//     console.log("ℹ️ Unhandled event type:", eventType);
//     return new Response("Event type not handled", { status: 200 });
//   } catch (error: any) {
//     console.error("❌ Error processing webhook:", error);
//     return new Response(JSON.stringify({ error: error.message }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }
