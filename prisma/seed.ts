import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "projectbarnlab@gmail.com";
  const password = await hash("ChangeMe123!", 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists");
    return;
  }
  await prisma.user.create({
    data: {
      email,
      name: "Admin",
      passwordHash: password,
      role: "ADMIN",
    },
  });
  console.log("Seeded initial admin user:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
