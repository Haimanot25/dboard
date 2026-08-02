import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL || "admin@dbboard.dev";
  const password = process.env.SEED_PASSWORD;
  if (!password) {
    console.error("SEED_PASSWORD environment variable is required. Generate a strong password and set it.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { password: hashPassword(password), role: "admin" },
    });
    console.log(`Updated password for ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: "Admin",
      role: "admin",
      password: hashPassword(password),
    },
  });

  console.log(`Created admin user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
