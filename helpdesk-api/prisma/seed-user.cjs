/* eslint-disable */
// prisma/seed-user.cjs

const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@example.com";
  const plainPassword = "password123";

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},          // no update for now
    create: {
      email,
      name: "Admin User",
      role: UserRole.admin,
      passwordHash,
    },
  });

  console.log("Seeded user:", user.email, "password:", plainPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
