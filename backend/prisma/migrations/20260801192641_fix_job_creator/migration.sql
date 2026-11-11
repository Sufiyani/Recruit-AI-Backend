-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_createdById_fkey";

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
