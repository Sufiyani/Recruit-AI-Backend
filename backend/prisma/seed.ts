import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Seed Super Admin
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@recruit.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';
  const superAdminHashedPassword = await bcrypt.hash(superAdminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { password: superAdminHashedPassword },
    create: {
      email: superAdminEmail,
      password: superAdminHashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`✅ Super Admin created: ${superAdmin.email} (${superAdmin.id})`);

  // 2. Seed Demo Company
  const company = await prisma.company.upsert({
    where: { slug: 'techcorp-inc' },
    update: { name: 'TechCorp Inc' },
    create: {
      name: 'TechCorp Inc',
      slug: 'techcorp-inc',
      website: 'https://techcorp.example.com',
      industry: 'Software & Technology',
      size: '51-200',
      description: 'Building next-generation SaaS products.',
    },
  });

  console.log(`✅ Demo Company created: ${company.name} (${company.id})`);

  // 3. Seed Company Admin (HR)
  const hrEmail = 'hr@techcorp.com';
  const hrPassword = await bcrypt.hash('HR@123456', 12);

  const hrUser = await prisma.user.upsert({
    where: { email: hrEmail },
    update: { companyId: company.id, password: hrPassword },
    create: {
      email: hrEmail,
      password: hrPassword,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      role: 'COMPANY_ADMIN',
      companyId: company.id,
    },
  });

  console.log(`✅ HR Admin created: ${hrUser.email} (${hrUser.id})`);

  // 4. Seed Candidate
  const candidateEmail = 'john@candidate.com';
  const candidatePassword = await bcrypt.hash('Candidate@123', 12);

  const candidateUser = await prisma.user.upsert({
    where: { email: candidateEmail },
    update: { password: candidatePassword },
    create: {
      email: candidateEmail,
      password: candidatePassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'CANDIDATE',
    },
  });

  // Candidate Profile
  await prisma.candidateProfile.upsert({
    where: { userId: candidateUser.id },
    update: {},
    create: {
      userId: candidateUser.id,
      headline: 'Full Stack Software Engineer (React / Node.js)',
      bio: 'Passionate developer with 4 years experience building web applications.',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
      location: 'San Francisco, CA',
    },
  });

  console.log(`✅ Candidate created: ${candidateUser.email} (${candidateUser.id})`);

  // 5. Seed Sample Job
  const existingJob = await prisma.job.findFirst({ where: { slug: 'senior-full-stack-engineer' } });
  if (!existingJob) {
    const job = await prisma.job.create({
      data: {
        title: 'Senior Full Stack Engineer',
        slug: 'senior-full-stack-engineer',
        description: 'We are looking for a Senior Full Stack Engineer to join our core team and build high-performance web applications.',
        requirements: '- 5+ years experience with React and Node.js\n- Experience with PostgreSQL and Prisma\n- Strong TypeScript background',
        benefits: '- Competitive salary\n- Remote-first work culture\n- Health & dental insurance',
        location: 'Remote',
        type: 'FULL_TIME',
        salaryMin: 120000,
        salaryMax: 160000,
        currency: 'USD',
        status: 'PUBLISHED',
        openings: 2,
        companyId: company.id,
        createdById: hrUser.id,
      },
    });
    console.log(`✅ Sample Job created: ${job.title}`);
  } else {
    console.log(`✅ Sample Job already exists: ${existingJob.title}`);
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
