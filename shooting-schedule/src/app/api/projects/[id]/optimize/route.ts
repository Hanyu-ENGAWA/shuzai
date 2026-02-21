import { NextRequest } from 'next/server';
import { ok, err, getAuthAndDb } from '@/lib/api-helpers';
import { schema } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { buildSchedule } from '@/lib/optimizer/schedule-builder';
import type { OptimizeInput } from '@/types';



type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getAuthAndDb(req);
  if (!ctx) return err('Unauthorized', 401);
  const { session, db } = ctx;

  const { id } = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(schema.projects.id, id), eq(schema.projects.userId, session.user.id)),
  });
  if (!project) return err('Not found', 404);

  const [locations, accommodations, meals, restStops, transports] = await Promise.all([
    db.query.locations.findMany({
      where: eq(schema.locations.projectId, id),
      orderBy: [asc(schema.locations.order), asc(schema.locations.createdAt)],
    }),
    db.query.accommodations.findMany({ where: eq(schema.accommodations.projectId, id) }),
    db.query.meals.findMany({ where: eq(schema.meals.projectId, id) }),
    db.query.restStops.findMany({ where: eq(schema.restStops.projectId, id) }),
    db.query.transports.findMany({ where: eq(schema.transports.projectId, id) }),
  ]);

  if (locations.length === 0) {
    return err('撮影地が登録されていません', 400);
  }

  const input: OptimizeInput = {
    project: project as OptimizeInput['project'],
    locations: locations as OptimizeInput['locations'],
    accommodations: accommodations as OptimizeInput['accommodations'],
    meals: meals as OptimizeInput['meals'],
    restStops: restStops as OptimizeInput['restStops'],
    transports: transports as OptimizeInput['transports'],
  };

  const scheduleData = buildSchedule(input);

  // バージョン番号: 既存スケジュール数 + 1
  const existingSchedules = await db.query.schedules.findMany({
    where: eq(schema.schedules.projectId, id),
  });
  const nextVersion = existingSchedules.length + 1;

  const scheduleId = uuidv4();
  const now = new Date();

  const [savedSchedule] = await db.insert(schema.schedules).values({
    id: scheduleId,
    projectId: id,
    version: nextVersion,
    scheduleMode: scheduleData.scheduleMode,
    generatedAt: scheduleData.generatedAt,
    totalDays: scheduleData.totalDays,
    notes: scheduleData.notes,
    createdAt: now,
  }).returning();

  // アイテムを保存
  if (scheduleData.items.length > 0) {
    await db.insert(schema.scheduleItems).values(
      scheduleData.items.map((item) => ({
        ...item,
        scheduleId,
      }))
    );
  }

  const result = {
    ...savedSchedule,
    items: scheduleData.items.map((item) => ({ ...item, scheduleId })),
    excludedLocations: [],
  };

  return ok(result, 201);
}
