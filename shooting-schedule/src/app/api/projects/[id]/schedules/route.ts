import { NextRequest } from 'next/server';
import { ok, err, getAuthAndDb } from '@/lib/api-helpers';
import { schema } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'edge';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const { id } = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(schema.projects.id, id), eq(schema.projects.userId, session.user.id)),
  });
  if (!project) return err('Not found', 404);

  const schedules = await db.query.schedules.findMany({
    where: eq(schema.schedules.projectId, id),
    orderBy: [desc(schema.schedules.generatedAt)],
    with: { items: true },
  });
  return ok(schedules);
}
