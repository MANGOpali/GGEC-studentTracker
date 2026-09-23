import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up test data...");

  // Delete in dependency order
  await prisma.notification.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.lead.deleteMany();

  // Remove all users except keep admin — we'll reset admin password too
  await prisma.user.deleteMany({ where: { role: { in: ["COUNSELLOR", "RECEPTIONIST"] } } });

  // Reset admin to clean state
  const adminPassword = await bcrypt.hash("Admin@123456", 10);
  await prisma.user.upsert({
    where: { email: "admin@globalgate.edu" },
    update: { name: "Admin", password: adminPassword },
    create: {
      email: "admin@globalgate.edu",
      name: "Admin",
      password: adminPassword,
      role: "ADMIN",
      isActive: true,
      branch: { connect: { id: (await prisma.branch.findFirst())!.id } },
    },
  });

  console.log("✓ All leads and activities deleted");
  console.log("✓ All counsellor/reception accounts deleted");
  console.log("✓ Admin account kept: admin@globalgate.edu / Admin@123456");
  console.log("✓ Reference data (countries, sources, intakes, branches) untouched");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
