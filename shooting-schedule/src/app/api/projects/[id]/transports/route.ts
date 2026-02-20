import { NextRequest } from 'next/server';
import { ok, err, getAuthAndDb } from '@/lib/api-helpers';
import { schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const runtime = 'edge';

type Params = { params: Promise<{ id: string }> };

const transportSchema = z.object({
  type: z.enum(['car', 'train', 'bus', 'walk', 'other']).default('car'),
  notes: z.string().optional(),
  defaultTravelBuffer: z.number().int().min(0).default(10),
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

  const items = await db.query.transports.findMany({
    where: eq(schema.transports.projectId, id),
  });
  return ok(items);
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
  const parsed = transportSchema.safeParse(body);
  if (!parsed.success) return err('Invalid input', 400);

  const now = new Date();
  const [item] = await db.insert(schema.transports).values({
    id: uuidv4(),
    projectId: id,
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return ok(item, 201);
}
