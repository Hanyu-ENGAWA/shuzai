import { NextRequest } from 'next/server';
import { ok, err, getAuthAndDb } from '@/lib/api-helpers';
import { schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';



const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  durationMode: z.enum(['fixed', 'auto']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  workStartTime: z.string().optional(),
  workEndTime: z.string().optional(),
  allowEarlyMorning: z.boolean().optional(),
  earlyMorningStart: z.string().optional(),
  allowNightShooting: z.boolean().optional(),
  nightShootingEnd: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const { id } = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(schema.projects.id, id), eq(schema.projects.userId, session.user.id)),
    with: {
      locations: true,
      accommodations: true,
      meals: true,
      restStops: true,
      transports: true,
    },
  });

  if (!project) return err('Not found', 404);
  return ok(project);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return err('Invalid input', 400);

  const updated = await db.update(schema.projects)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, session.user.id)))
    .returning();

  if (!updated.length) return err('Not found', 404);
  return ok(updated[0]);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const { id } = await params;
  const deleted = await db.delete(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, session.user.id)))
    .returning();

  if (!deleted.length) return err('Not found', 404);
  return ok({ id });
}
