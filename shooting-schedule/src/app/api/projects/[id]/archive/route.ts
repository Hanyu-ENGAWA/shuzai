export const runtime = 'edge';

import { NextRequest } from 'next/server';
import { ok, err, getAuthAndDb } from '@/lib/api-helpers';
import { schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';



type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const { id } = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(schema.projects.id, id), eq(schema.projects.userId, session.user.id)),
  });
  if (!project) return err('Not found', 404);

  const newStatus = project.status === 'archived' ? 'draft' : 'archived';
  const [updated] = await db.update(schema.projects)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(schema.projects.id, id))
    .returning();

  return ok(updated);
}
