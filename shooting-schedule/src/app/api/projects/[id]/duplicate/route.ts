import { NextRequest } from 'next/server';
import { ok, err, getAuthAndDb } from '@/lib/api-helpers';
import { schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';



type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const { id } = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(schema.projects.id, id), eq(schema.projects.userId, session.user.id)),
    with: { locations: true, accommodations: true, meals: true, restStops: true, transports: true },
  });
  if (!project) return err('Not found', 404);

  const now = new Date();
  const newId = uuidv4();

  const [newProject] = await db.insert(schema.projects).values({
    ...project,
    id: newId,
    title: `${project.title} (コピー)`,
    createdAt: now,
    updatedAt: now,
  }).returning();

  // コピー: locations
  for (const loc of project.locations) {
    await db.insert(schema.locations).values({ ...loc, id: uuidv4(), projectId: newId, createdAt: now, updatedAt: now });
  }
  // コピー: accommodations
  for (const acc of project.accommodations) {
    await db.insert(schema.accommodations).values({ ...acc, id: uuidv4(), projectId: newId, createdAt: now, updatedAt: now });
  }
  // コピー: meals
  for (const meal of project.meals) {
    await db.insert(schema.meals).values({ ...meal, id: uuidv4(), projectId: newId, createdAt: now, updatedAt: now });
  }
  // コピー: restStops
  for (const rs of project.restStops) {
    await db.insert(schema.restStops).values({ ...rs, id: uuidv4(), projectId: newId, createdAt: now, updatedAt: now });
  }
  // コピー: transports
  for (const t of project.transports) {
    await db.insert(schema.transports).values({ ...t, id: uuidv4(), projectId: newId, createdAt: now, updatedAt: now });
  }

  return ok(newProject, 201);
}
