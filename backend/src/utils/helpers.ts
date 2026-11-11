import slugify from 'slugify';
import { prisma } from '../config/database';

export function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, trim: true });
}

export async function generateUniqueJobSlug(title: string, companyId: string): Promise<string> {
  const base = generateSlug(`${title}`);
  let slug = base;
  let counter = 1;
  while (true) {
    const existing = await prisma.job.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${base}-${counter++}`;
  }
  return slug;
}

export async function generateUniqueCompanySlug(name: string): Promise<string> {
  const base = generateSlug(name);
  let slug = base;
  let counter = 1;
  while (true) {
    const existing = await prisma.company.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${base}-${counter++}`;
  }
  return slug;
}

export function omitFields<T extends object, K extends keyof T>(
  obj: T,
  fields: K[]
): Omit<T, K> {
  const result = { ...obj };
  fields.forEach((field) => delete result[field]);
  return result as Omit<T, K>;
}

export function formatApiResponse<T>(
  data: T,
  message = 'Success',
  statusCode = 200
) {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}
