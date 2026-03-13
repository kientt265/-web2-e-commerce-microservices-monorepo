import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data in dev (optional – comment out if you want to keep)
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.authUser.deleteMany();

  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  const users = await prisma.authUser.createMany({
    data: [
      {
        email: 'user1@example.com',
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
      },
      {
        email: 'user2@example.com',
        passwordHash,
        emailVerified: false,
        status: 'SUSPENDED',
      },
    ],
  });

  console.log(`Seeded ${users.count} users with password "${password}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

