import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create doctors
  const doctors = await Promise.all([
    prisma.doctor.create({
      data: {
        name: "Dr. Sarah Johnson",
        specialist: "General Practitioner",
        image: "/doctor1.png",
        voiceId: "alloy",
        agentPrompt:
          "You are Dr. Sarah Johnson, a compassionate general practitioner...",
      },
    }),
    prisma.doctor.create({
      data: {
        name: "Dr. Michael Chen",
        specialist: "Internal Medicine",
        image: "/doctor2.png",
        voiceId: "echo",
        agentPrompt:
          "You are Dr. Michael Chen, an experienced internal medicine specialist...",
      },
    }),
    prisma.doctor.create({
      data: {
        name: "Dr. Emily Roberts",
        specialist: "Pediatrician",
        image: "/doctor3.png",
        voiceId: "nova",
        agentPrompt: "You are Dr. Emily Roberts, a caring pediatrician...",
      },
    }),
  ]);

  console.log("✅ Created", doctors.length, "doctors");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
