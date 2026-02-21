export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { ok, err, getAuthAndDb } from '@/lib/api-helpers';
import { schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';



type Params = { params: Promise<{ id: string; scheduleId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const { id, scheduleId } = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(schema.projects.id, id), eq(schema.projects.userId, session.user.id)),
  });
  if (!project) return err('Not found', 404);

  const schedule = await db.query.schedules.findFirst({
    where: and(eq(schema.schedules.id, scheduleId), eq(schema.schedules.projectId, id)),
    with: { items: true },
  });
  if (!schedule) return err('Not found', 404);

  return ok(schedule);
}
