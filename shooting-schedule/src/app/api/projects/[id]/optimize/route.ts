import { NextRequest } from 'next/server';
import { ok, err, getAuthAndDb } from '@/lib/api-helpers';
import { schema } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { buildScheduleV2 } from '@/lib/optimizer/schedule-builder';
import type { OptimizeInput, OptimizationType, DistanceMatrix } from '@/types';

export const runtime = 'edge';

type Params = { params: Promise<{ id: string }> };

async function fetchDistanceMatrix(
  locations: OptimizeInput['locations'],
  apiKey: string,
  baseUrl: string
): Promise<DistanceMatrix | null> {
  const withCoords = locations.filter((l) => l.lat != null && l.lng != null);
  if (withCoords.length < 2) return null;

  const n = withCoords.length;
  const durationMin: number[][] = Array.from({ length: n }, () => Array(n).fill(-1));
  const distanceKm: number[][] = Array.from({ length: n }, () => Array(n).fill(-1));

  // 10地点以下: 1回、11〜25地点: バッチ分割（origins 5件ずつ）
  const BATCH_SIZE = 10;
  for (let batchStart = 0; batchStart < n; batchStart += BATCH_SIZE) {
    const batchOrigins = withCoords.slice(batchStart, batchStart + BATCH_SIZE);
    const originsStr = batchOrigins.map((l) => `${l.lat},${l.lng}`).join('|');
    const destinationsStr = withCoords.map((l) => `${l.lat},${l.lng}`).join('|');

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', originsStr);
    url.searchParams.set('destinations', destinationsStr);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', 'ja');
    url.searchParams.set('mode', 'driving');

    const res = await fetch(url.toString());
    const data = await res.json() as {
      status: string;
      rows: Array<{
        elements: Array<{
          status: string;
          duration?: { value: number };
          distance?: { value: number };
        }>;
      }>;
    };

    if (data.status !== 'OK') continue;

    data.rows.forEach((row, rowIdx) => {
      const origIdx = batchStart + rowIdx;
      row.elements.forEach((el, destIdx) => {
        if (el.status === 'OK') {
          durationMin[origIdx][destIdx] = el.duration ? Math.round(el.duration.value / 60) : -1;
          distanceKm[origIdx][destIdx] = el.distance ? Math.round(el.distance.value / 100) / 10 : -1;
        }
      });
    });
  }

  // 座標なし地点のインデックス対応（-1 のまま残す）
  // withCoords のインデックスを全 locations のインデックスにマッピング
  const n2 = locations.length;
  const fullDuration: number[][] = Array.from({ length: n2 }, () => Array(n2).fill(-1));
  const fullDistance: number[][] = Array.from({ length: n2 }, () => Array(n2).fill(-1));

  const coordsMap = new Map<string, number>();
  withCoords.forEach((l, i) => coordsMap.set(l.id, i));

  for (let i = 0; i < n2; i++) {
    for (let j = 0; j < n2; j++) {
      const ci = coordsMap.get(locations[i].id);
      const cj = coordsMap.get(locations[j].id);
      if (ci !== undefined && cj !== undefined) {
        fullDuration[i][j] = durationMin[ci][cj];
        fullDistance[i][j] = distanceKm[ci][cj];
      }
    }
  }

  return { durationMin: fullDuration, distanceKm: fullDistance };
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

  const body = await req.json().catch(() => ({})) as { optimizationType?: OptimizationType };
  const optimizationType: OptimizationType = body.optimizationType ?? 'none';

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

  // Distance Matrix 取得（最適化が必要な場合）
  let distanceMatrix: DistanceMatrix | null = null;
  if (optimizationType !== 'none') {
    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
    if (apiKey) {
      const baseUrl = req.nextUrl.origin;
      distanceMatrix = await fetchDistanceMatrix(
        locations as OptimizeInput['locations'],
        apiKey,
        baseUrl
      ).catch(() => null);
    }
  }

  const input: OptimizeInput = {
    project: project as OptimizeInput['project'],
    locations: locations as OptimizeInput['locations'],
    accommodations: accommodations as OptimizeInput['accommodations'],
    meals: meals as OptimizeInput['meals'],
    restStops: restStops as OptimizeInput['restStops'],
    transports: transports as OptimizeInput['transports'],
    optimizationType,
    distanceMatrix: distanceMatrix ?? undefined,
  };

  const scheduleData = buildScheduleV2(input);

  // DB保存
  const scheduleId = uuidv4();
  const now = new Date();

  const [savedSchedule] = await db.insert(schema.schedules).values({
    id: scheduleId,
    projectId: id,
    generatedAt: scheduleData.generatedAt,
    totalDays: scheduleData.totalDays,
    notes: scheduleData.notes,
    optimizationType: scheduleData.optimizationType ?? null,
    totalDistanceKm: scheduleData.totalDistanceKm,
    totalDurationMin: scheduleData.totalDurationMin,
    hasOvertimeWarning: scheduleData.hasOvertimeWarning,
    calculatedDays: scheduleData.calculatedDays,
    createdAt: now,
  }).returning();

  // アイテムを保存
  if (scheduleData.items.length > 0) {
    await db.insert(schema.scheduleItems).values(
      scheduleData.items.map((item) => ({
        id: item.id,
        scheduleId,
        day: item.day,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        type: item.type,
        refId: item.refId,
        name: item.name,
        address: item.address,
        notes: item.notes,
        order: item.order,
        travelFromPreviousMin: item.travelFromPreviousMin ?? null,
        travelFromPreviousKm: item.travelFromPreviousKm ?? null,
        transportMode: item.transportMode ?? null,
        bufferBeforeMin: item.bufferBeforeMin ?? null,
        bufferAfterMin: item.bufferAfterMin ?? null,
        includesMeal: item.includesMeal ?? false,
        mealDurationMin: item.mealDurationMin ?? null,
        isOutsideWorkHours: item.isOutsideWorkHours ?? false,
        isAutoInserted: item.isAutoInserted ?? false,
      }))
    );
  }

  // 除外撮影地を保存
  if (scheduleData.excludedLocations.length > 0) {
    await db.insert(schema.excludedLocations).values(
      scheduleData.excludedLocations.map((ex) => ({
        id: uuidv4(),
        scheduleId,
        locationId: ex.locationId,
        date: null,
        reason: ex.reason ?? null,
        priority: ex.priority ?? null,
      }))
    );
  }

  const result = {
    ...savedSchedule,
    items: scheduleData.items.map((item) => ({ ...item, scheduleId })),
    excludedLocations: scheduleData.excludedLocations,
  };

  return ok(result, 201);
}
