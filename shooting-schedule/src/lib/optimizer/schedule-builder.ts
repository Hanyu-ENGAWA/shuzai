import type { OptimizeInput, ScheduleItem, Schedule } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { hhmmToMinutes, minutesToHHmm, calcLocationTotalMinutes, calcEndTime } from './buffer-calculator';
import { insertAutoMeal } from './auto-meal-inserter';
import { solveTSP } from './tsp-solver';
import { fitToWorkHours } from './work-hours-fitter';

const DEFAULT_TRAVEL_BUFFER = 10; // 分

/**
 * Phase 1 基本スケジュールビルダー
 * - 入力順で地点を並べる
 * - 稼働時間制約に沿ってタイムテーブルを生成
 * - 昼食自動挿入
 */
export function buildSchedule(input: OptimizeInput): Omit<Schedule, 'id' | 'createdAt'> {
  const { project, locations, accommodations, meals, restStops, transports } = input;

  const travelBuffer =
    transports.length > 0 ? transports[0].defaultTravelBuffer : DEFAULT_TRAVEL_BUFFER;

  // 稼働時間の設定
  const workStart = project.workStartTime;
  const workEnd = project.workEndTime;
  const effectiveStart = project.allowEarlyMorning
    ? (project.earlyMorningStart ?? workStart)
    : workStart;
  const effectiveEnd = project.allowNightShooting
    ? (project.nightShootingEnd ?? workEnd)
    : workEnd;

  const effectiveStartMin = hhmmToMinutes(effectiveStart);
  const effectiveEndMin = hhmmToMinutes(effectiveEnd);

  // 日数計算
  let totalDays = 1;
  let startDate: string | null = null;
  if (project.durationMode === 'fixed' && project.startDate && project.endDate) {
    startDate = project.startDate;
    const s = new Date(project.startDate);
    const e = new Date(project.endDate);
    totalDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  } else {
    // 自動算出: 全地点を稼働時間内に収まるよう計算
    const totalMinutes = locations.reduce((sum, loc) => {
      return sum + calcLocationTotalMinutes(loc) + travelBuffer;
    }, 0);
    const dailyMinutes = effectiveEndMin - effectiveStartMin;
    totalDays = Math.max(1, Math.ceil(totalMinutes / dailyMinutes));
  }

  // 地点をdayに振り分け
  const scheduleId = uuidv4();
  const allItems: ScheduleItem[] = [];
  const locationQueue = [...locations].sort((a, b) => a.order - b.order);

  for (let day = 1; day <= totalDays; day++) {
    const date = startDate
      ? getDateString(startDate, day - 1)
      : null;

    let currentMin = effectiveStartMin;
    const dayItems: ScheduleItem[] = [];

    // 宿泊地からのチェックアウト（day 2以降）
    if (day > 1) {
      const prevAcc = accommodations.find((a) => {
        if (!a.checkInDate) return true;
        return true; // Phase 1: 簡略化
      });
      if (prevAcc && prevAcc.checkOutTime) {
        currentMin = hhmmToMinutes(prevAcc.checkOutTime);
      }
    }

    // 当日の地点を詰め込む
    while (locationQueue.length > 0) {
      const loc = locationQueue[0];
      const duration = calcLocationTotalMinutes(loc);
      const endMin = currentMin + duration;

      if (endMin > effectiveEndMin && dayItems.length > 0) break; // 翌日へ

      locationQueue.shift();

      // バッファ前
      if (loc.bufferBefore > 0) {
        dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.bufferBefore, 'buffer', null, `${loc.name} 準備`, null, dayItems.length));
        currentMin += loc.bufferBefore;
      }

      // 撮影
      dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.shootingDuration, 'shooting', loc.id, loc.name, loc.address, dayItems.length));
      currentMin += loc.shootingDuration;

      // バッファ後
      if (loc.bufferAfter > 0) {
        dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.bufferAfter, 'buffer', null, `${loc.name} 片付け`, null, dayItems.length));
        currentMin += loc.bufferAfter;
      }

      // 移動バッファ（最後でなければ）
      if (locationQueue.length > 0) {
        dayItems.push(makeItem(scheduleId, day, date, currentMin, travelBuffer, 'transport', null, '移動', null, dayItems.length));
        currentMin += travelBuffer;
      }
    }

    // 昼食自動挿入
    const dayItemsWithMeal = insertAutoMeal(dayItems, scheduleId, day, date, meals);

    // 宿泊チェックイン
    const acc = accommodations[day - 1];
    if (acc && day < totalDays) {
      const checkInStart = minutesToHHmm(currentMin);
      dayItemsWithMeal.push(makeItem(scheduleId, day, date, currentMin, 0, 'accommodation', acc.id, acc.name, acc.address, dayItemsWithMeal.length));
    }

    allItems.push(...dayItemsWithMeal);
  }

  return {
    projectId: project.id,
    generatedAt: new Date(),
    totalDays,
    notes: null,
    items: allItems,
  };
}

function makeItem(
  scheduleId: string,
  day: number,
  date: string | null,
  startMin: number,
  duration: number,
  type: ScheduleItem['type'],
  refId: string | null,
  name: string,
  address: string | null | undefined,
  order: number
): ScheduleItem {
  const startTime = minutesToHHmm(startMin);
  const endTime = duration > 0 ? calcEndTime(startTime, duration) : startTime;
  return {
    id: uuidv4(),
    scheduleId,
    day,
    date,
    startTime,
    endTime,
    type,
    refId,
    name,
    address: address ?? null,
    notes: null,
    order,
  };
}

// Haversine 距離計算（km）
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Haversine から移動時間（分）を概算（時速50km）
function haversineMin(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.round((haversineKm(lat1, lng1, lat2, lng2) / 50) * 60);
}

function getDateString(baseDate: string, offsetDays: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

/**
 * Phase 2 スケジュールビルダー
 * - optimizationType に基づき TSP → fitToWorkHours を実行
 */
export function buildScheduleV2(input: OptimizeInput): Omit<Schedule, 'id' | 'createdAt'> & {
  excludedLocations: import('@/types').ExcludedLocation[];
  totalDistanceKm: number;
  totalDurationMin: number;
  hasOvertimeWarning: boolean;
  calculatedDays: number;
} {
  const { project, locations, meals, transports, distanceMatrix, optimizationType = 'none' } = input;

  const sortedLocations = [...locations].sort((a, b) => a.order - b.order);
  const scheduleId = uuidv4();

  let orderedLocations = sortedLocations;
  let departureTravelMin: number | undefined;
  let departureTravelKm: number | undefined;

  // TSP で順序を決定
  if (optimizationType !== 'none' && distanceMatrix && sortedLocations.length > 1) {
    const hasDeparture = project.departureLat != null && project.departureLng != null;
    let costMatrix: number[][];

    if (optimizationType === 'shortest_time') {
      costMatrix = distanceMatrix.durationMin;
    } else if (optimizationType === 'shortest_distance') {
      costMatrix = distanceMatrix.distanceKm;
    } else {
      // balanced: 0.6 × 移動時間 + 0.4 × 移動距離（正規化なしの混合）
      const dur = distanceMatrix.durationMin;
      const dist = distanceMatrix.distanceKm;
      costMatrix = dur.map((row, i) =>
        row.map((d, j) => {
          const durVal = d >= 0 ? d : 99999;
          const distVal = dist[i]?.[j] >= 0 ? dist[i][j] : 99999;
          return 0.6 * durVal + 0.4 * distVal;
        })
      );
    }

    let tspNodes = sortedLocations.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng }));
    let tspMatrix = costMatrix;
    let fixedStartIndex: number | undefined;

    // 出発地を TSP のノード 0 として追加（固定開始ノード）
    if (hasDeparture) {
      const depLat = project.departureLat!;
      const depLng = project.departureLng!;
      const n = sortedLocations.length;

      // 出発地 → 各地点 / 各地点 → 出発地 のコストを Haversine で計算
      const depRow = sortedLocations.map((l) => {
        if (l.lat == null || l.lng == null) return 99999;
        return haversineMin(depLat, depLng, l.lat, l.lng);
      });
      // 出発地は終点にならないので大きなコストを設定（非対称 TSP の擬似対応）
      const depCol = Array(n).fill(0);

      // 拡張コスト行列: node 0 = 出発地, node 1..n = 撮影地
      const augSize = n + 1;
      const augMatrix: number[][] = Array.from({ length: augSize }, () => Array(augSize).fill(99999));
      // 出発地 → 撮影地
      for (let j = 0; j < n; j++) augMatrix[0][j + 1] = depRow[j];
      // 撮影地 → 撮影地
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          augMatrix[i + 1][j + 1] = costMatrix[i][j] >= 0 ? costMatrix[i][j] : 99999;
        }
      }
      // 撮影地 → 出発地（大きなコスト: 出発地を終点にしない）
      for (let i = 0; i < n; i++) augMatrix[i + 1][0] = 99999;

      tspNodes = [
        { id: '_departure', lat: depLat, lng: depLng },
        ...tspNodes,
      ];
      tspMatrix = augMatrix;
      fixedStartIndex = 0;
    }

    const tspResult = solveTSP({
      nodes: tspNodes,
      distanceMatrix: tspMatrix,
      fixedStartIndex,
    });

    if (hasDeparture) {
      // route[0] = 出発地ノード（除外）, route[1..] = 撮影地インデックス（1始まり → -1 で 0始まりに）
      const locationRoute = tspResult.route.slice(1).map((i) => sortedLocations[i - 1]);
      orderedLocations = locationRoute;
      // 出発地 → 最初の撮影地 の移動時間を Haversine から推定（Day1 表示用）
      if (orderedLocations.length > 0) {
        const first = orderedLocations[0];
        if (first.lat != null && first.lng != null) {
          const km = haversineKm(project.departureLat!, project.departureLng!, first.lat, first.lng);
          departureTravelKm = km;
          departureTravelMin = Math.round((km / 50) * 60); // 時速50kmで概算
        }
      }
    } else {
      orderedLocations = tspResult.route.map((i) => sortedLocations[i]);
    }
  }

  // 日別タイムテーブル生成
  const startDate = project.durationMode === 'fixed' ? (project.startDate ?? null) : null;
  const fitterResult = fitToWorkHours({
    orderedLocations,
    project,
    meals,
    travelDurationMatrix: distanceMatrix?.durationMin ?? null,
    travelDistanceMatrix: distanceMatrix?.distanceKm ?? null,
    scheduleId,
    startDate,
    departureTravelMin,
    departureTravelKm,
  });

  return {
    projectId: project.id,
    generatedAt: new Date(),
    totalDays: fitterResult.totalDays,
    notes: null,
    optimizationType,
    totalDistanceKm: fitterResult.totalDistanceKm,
    totalDurationMin: fitterResult.totalDurationMin,
    hasOvertimeWarning: fitterResult.hasOvertimeWarning,
    calculatedDays: fitterResult.calculatedDays,
    items: fitterResult.items.map((item) => ({ ...item, scheduleId })),
    excludedLocations: fitterResult.excludedLocations,
  };
}
