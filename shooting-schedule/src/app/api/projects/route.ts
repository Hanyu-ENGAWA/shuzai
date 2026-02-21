import { NextRequest } from 'next/server';
import { ok, err, getAuthAndDb } from '@/lib/api-helpers';
import { schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const runtime = 'edge';

const createProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  durationMode: z.enum(['fixed', 'auto']).default('fixed'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  workStartTime: z.string().default('09:00'),
  workEndTime: z.string().default('18:00'),
  allowEarlyMorning: z.boolean().default(false),
  earlyMorningStart: z.string().optional(),
  allowNightShooting: z.boolean().default(false),
  nightShootingEnd: z.string().optional(),
  departureLocation: z.string().optional(),
  departureLat: z.number().optional(),
  departureLng: z.number().optional(),
  departurePlaceId: z.string().optional(),
  returnLocation: z.string().optional(),
  returnLat: z.number().optional(),
  returnLng: z.number().optional(),
  returnPlaceId: z.string().optional(),
  returnSameAsDeparture: z.boolean().default(true),
  transportModeToLocation: z.enum(['transit', 'car', 'other']).default('car'),
  defaultTransportMode: z.enum(['driving', 'transit', 'walking', 'bicycling']).default('driving'),
});

export async function GET(req: NextRequest) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const projects = await db.query.projects.findMany({
    where: eq(schema.projects.userId, session.user.id),
    orderBy: [desc(schema.projects.updatedAt)],
  });

  return ok(projects);
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return err('Invalid input', 400);

  const now = new Date();
  const project = await db.insert(schema.projects).values({
    id: uuidv4(),
    userId: session.user.id,
    ...parsed.data,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }).returning();

  return ok(project[0], 201);
}
