import { prisma } from './src/config/database';

async function main() {
  const candidateUser = await prisma.user.findUnique({
    where: { email: 'john@candidate.com' },
    include: {
      candidateProfile: {
        include: {
          applications: {
            include: {
              job: true,
              interviews: true,
            },
          },
        },
      },
    },
  });

  if (!candidateUser || !candidateUser.candidateProfile) {
    console.log('No candidate found');
    return;
  }

  console.log('Candidate ID:', candidateUser.id);
  console.log('Applications count:', candidateUser.candidateProfile.applications.length);

  for (const app of candidateUser.candidateProfile.applications) {
    console.log(`App ID: ${app.id}, Job: ${app.job.title}`);
    console.log(`Interviews count: ${app.interviews.length}`);
    for (const intv of app.interviews) {
      console.log(`  Interview ID: ${intv.id}, Status: ${intv.status}, Score: ${intv.aiScore}`);
    }
  }

  // Find or create an application to schedule a new fresh interview for John Doe
  let application = candidateUser.candidateProfile.applications[0];
  if (!application) {
    // find a published job
    const job = await prisma.job.findFirst({ where: { status: 'PUBLISHED' } });
    if (!job) {
      console.log('No published job found');
      return;
    }
    application = await prisma.application.create({
      data: {
        jobId: job.id,
        candidateId: candidateUser.candidateProfile.id,
        status: 'SHORTLISTED',
      },
      include: { job: true, interviews: true },
    });
  }

  // Create a brand new fresh interview with status SCHEDULED, null aiQuestions, null aiSummary, null aiScore
  const newInterview = await prisma.interview.create({
    data: {
      applicationId: application.id,
      title: `AI Technical Interview (${new Date().toLocaleTimeString()})`,
      scheduledAt: new Date(),
      duration: 45,
      status: 'SCHEDULED',
      aiQuestions: null,
      aiSummary: null,
      aiScore: null,
      feedback: null,
      notes: 'New live demo interview with Anti-Cheat & Body Language Proctoring',
    },
  });

  console.log('🎉 Created New Interview:');
  console.log(`Interview ID: ${newInterview.id}`);
  console.log(`Status: ${newInterview.status}`);
  console.log(`URL: http://localhost:3000/candidate/interviews/${newInterview.id}`);

  // Also reset existing completed interviews or update the latest one if needed
}

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
