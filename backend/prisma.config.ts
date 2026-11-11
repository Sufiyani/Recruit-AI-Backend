import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://recruituser:recruitpassword@localhost:5432/recruitdb?schema=public',
  },
});
