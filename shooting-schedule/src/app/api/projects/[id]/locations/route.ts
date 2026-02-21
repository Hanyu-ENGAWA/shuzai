export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { ok, err, getAuthAndDb } from '@/lib/api-helpers';
import { schema } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';



type Params = { params: Promise<{ id: string }> };

const locationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  placeId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  shootingDuration: z.number().int().min(1).default(60),
  bufferBefore: z.number().int().min(0).default(10),
  bufferAfter: z.number().int().min(0).default(10),
  hasMeal: z.boolean().default(false),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']).optional(),
  mealDurationMin: z.number().int().min(0).default(60),
  priority: z.enum(['required', 'high', 'medium', 'low']).default('medium'),
  timeSlot: z.enum(['normal', 'early_morning', 'night', 'flexible']).default('normal'),
  timeSlotStart: z.string().optional(),
  timeSlotEnd: z.string().optional(),
  preferredTimeStart: z.string().optional(),
  preferredTimeEnd: z.string().optional(),
  notes: z.string().optional(),
  order: z.number().int().default(0),
});

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const { id } = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(schema.projects.id, id), eq(schema.projects.userId, session.user.id)),
  });
  if (!project) return err('Not found', 404);

  const locations = await db.query.locations.findMany({
    where: eq(schema.locations.projectId, id),
    orderBy: [asc(schema.locations.order), asc(schema.locations.createdAt)],
  });
  return ok(locations);
}

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const { id } = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(schema.projects.id, id), eq(schema.projects.userId, session.user.id)),
  });
  if (!project) return err('Not found', 404);

  const body = await req.json();
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) return err('Invalid input', 400);

  const now = new Date();
  const [location] = await db.insert(schema.locations).values({
    id: uuidv4(),
    projectId: id,
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return ok(location, 201);
}
