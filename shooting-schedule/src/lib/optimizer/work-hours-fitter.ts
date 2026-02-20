import type { Location, Project, Meal, ScheduleItem, ExcludedLocation } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { hhmmToMinutes, minutesToHHmm, calcLocationTotalMinutes, calcEndTime } from './buffer-calculator';
import { insertAutoMeal } from './auto-meal-inserter';

const DEFAULT_TRAVEL_MIN = 10;

export interface FitterInput {
  orderedLocations: Location[];
  project: Project;
  meals: Meal[];
  travelDurationMatrix?: number[][] | null; // orderedLocations 間の移動時間（分）
  travelDistanceMatrix?: number[][] | null; // orderedLocations 間の移動距離（km）
  scheduleId: string;
  startDate?: string | null;
}

export interface FitterOutput {
  items: ScheduleItem[];
  excludedLocations: ExcludedLocation[];
  totalDays: number;
  totalDistanceKm: number;
  totalDurationMin: number;
  hasOvertimeWarning: boolean;
  calculatedDays: number;
}

export function fitToWorkHours(input: FitterInput): FitterOutput {
  const {
    orderedLocations,
    project,
    meals,
    travelDurationMatrix,
    travelDistanceMatrix,
    scheduleId,
    startDate,
  } = input;

  const workStartMin = hhmmToMinutes(project.workStartTime);
  const workEndMin = hhmmToMinutes(project.workEndTime);
  const effectiveStartMin = project.allowEarlyMorning
    ? hhmmToMinutes(project.earlyMorningStart ?? project.workStartTime)
    : workStartMin;
  const effectiveEndMin = project.allowNightShooting
    ? hhmmToMinutes(project.nightShootingEnd ?? project.workEndTime)
    : workEndMin;

  // 日数上限を計算
  let totalDays = 1;
  let fixedMode = false;
  if (project.durationMode === 'fixed' && project.startDate && project.endDate) {
    const s = new Date(project.startDate);
    const e = new Date(project.endDate);
    totalDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    fixedMode = true;
  }

  const allItems: ScheduleItem[] = [];
  const excludedLocs: ExcludedLocation[] = [];
  let hasOvertimeWarning = false;

  // 処理対象の地点キュー（fixed モードでは除外可能）
  const locationQueue = [...orderedLocations];

  let calculatedDays = 1;
  let day = 1;
  let totalDistanceKm = 0;
  let totalDurationMin = 0;

  while (locationQueue.length > 0 && (fixedMode ? day <= totalDays : true)) {
    const date = startDate ? getDateString(startDate, day - 1) : null;
    let currentMin = effectiveStartMin;

    // 宿泊地からのチェックアウト（day 2以降は workStart から）
    if (day > 1) {
      currentMin = workStartMin;
    }

    const dayItems: ScheduleItem[] = [];
    let prevLocIndex = -1; // orderedLocations 内の前の地点インデックス

    while (locationQueue.length > 0) {
      const loc = locationQueue[0];
      const locOrigIndex = orderedLocations.indexOf(loc);

      // 移動時間を取得
      let travelMin = DEFAULT_TRAVEL_MIN;
      let travelKm = 0;
      if (prevLocIndex >= 0 && travelDurationMatrix) {
        const rawTravel = travelDurationMatrix[prevLocIndex]?.[locOrigIndex] ?? -1;
        travelMin = rawTravel >= 0 ? rawTravel : DEFAULT_TRAVEL_MIN;
      } else if (dayItems.length === 0) {
        travelMin = 0; // 当日最初の地点は移動なし
      }
      if (prevLocIndex >= 0 && travelDistanceMatrix) {
        const rawDist = travelDistanceMatrix[prevLocIndex]?.[locOrigIndex] ?? 0;
        travelKm = rawDist >= 0 ? rawDist : 0;
      }

      // 当日の開始時刻を考慮（早朝・夜間時間帯）
      let locationStart = currentMin + travelMin;

      // 時間帯制約のチェック
      if (loc.timeSlot === 'early_morning' && loc.timeSlotStart) {
        const slotStart = hhmmToMinutes(loc.timeSlotStart);
        locationStart = Math.min(locationStart, slotStart);
      }

      const locDuration = calcLocationTotalMinutes(loc);
      const mealAddition = loc.hasMeal ? loc.mealDurationMin : 0;
      const locEndMin = locationStart + locDuration + mealAddition;

      // 稼働時間内に収まるか確認
      if (locEndMin > effectiveEndMin && dayItems.length > 0) {
        // fixed モードかつ低優先度なら除外
        if (fixedMode && (loc.priority === 'low' || loc.priority === 'medium')) {
          locationQueue.shift();
          excludedLocs.push({
            locationId: loc.id,
            name: loc.name,
            reason: '稼働時間不足による除外',
            priority: loc.priority,
          });
          continue;
        }
        // auto モード or 必須・高優先度 → 翌日へ
        break;
      }

      if (locEndMin > effectiveEndMin) {
        // 1日に1地点も入れられない場合（稼働時間が極端に短い）
        hasOvertimeWarning = true;
      }

      locationQueue.shift();

      // 移動アイテムを追加（dayItems が空でなく、travelMin > 0 の場合）
      if (dayItems.length > 0 && travelMin > 0) {
        const travelItem = makeItem(
          scheduleId, day, date, currentMin, travelMin, 'transport', null,
          '移動', null, dayItems.length
        );
        travelItem.travelFromPreviousMin = travelMin;
        travelItem.travelFromPreviousKm = travelKm;
        dayItems.push(travelItem);
        currentMin += travelMin;
        totalDistanceKm += travelKm;
      } else if (dayItems.length === 0 && travelMin > 0) {
        // 当日最初でも移動がある場合（前日の宿泊地から）
        const travelItem = makeItem(
          scheduleId, day, date, currentMin, travelMin, 'transport', null,
          '移動', null, dayItems.length
        );
        travelItem.travelFromPreviousMin = travelMin;
        travelItem.travelFromPreviousKm = travelKm;
        dayItems.push(travelItem);
        currentMin += travelMin;
        totalDistanceKm += travelKm;
      }

      // バッファ前
      if (loc.bufferBefore > 0) {
        dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.bufferBefore, 'buffer', null, `${loc.name} 準備`, null, dayItems.length));
        currentMin += loc.bufferBefore;
      }

      // 稼働時間外チェック
      const isOutside = currentMin + loc.shootingDuration > effectiveEndMin;
      if (isOutside) hasOvertimeWarning = true;

      // 撮影
      const shootItem = makeItem(
        scheduleId, day, date, currentMin, loc.shootingDuration, 'location', loc.id,
        loc.name, loc.address, dayItems.length
      );
      shootItem.isOutsideWorkHours = isOutside;
      shootItem.bufferBeforeMin = loc.bufferBefore;
      shootItem.bufferAfterMin = loc.bufferAfter;
      shootItem.includesMeal = loc.hasMeal;
      shootItem.mealDurationMin = loc.hasMeal ? loc.mealDurationMin : null;
      dayItems.push(shootItem);
      currentMin += loc.shootingDuration;
      totalDurationMin += loc.shootingDuration;

      // バッファ後
      if (loc.bufferAfter > 0) {
        dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.bufferAfter, 'buffer', null, `${loc.name} 片付け`, null, dayItems.length));
        currentMin += loc.bufferAfter;
      }

      prevLocIndex = locOrigIndex;
    }

    // 昼食自動挿入
    const dayItemsWithMeal = insertAutoMeal(dayItems, scheduleId, day, date, meals);
    allItems.push(...dayItemsWithMeal);

    calculatedDays = day;
    day++;

    if (!fixedMode && locationQueue.length === 0) break;
    if (fixedMode && day > totalDays && locationQueue.length > 0) {
      // fixed モードで収まりきらない地点は除外
      for (const loc of locationQueue) {
        excludedLocs.push({
          locationId: loc.id,
          name: loc.name,
          reason: '日程超過による除外',
          priority: loc.priority,
        });
      }
      locationQueue.length = 0;
    }
  }

  return {
    items: allItems,
    excludedLocations: excludedLocs,
    totalDays: fixedMode ? totalDays : calculatedDays,
    totalDistanceKm,
    totalDurationMin,
    hasOvertimeWarning,
    calculatedDays,
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
    travelFromPreviousMin: null,
    travelFromPreviousKm: null,
    transportMode: null,
    bufferBeforeMin: null,
    bufferAfterMin: null,
    includesMeal: false,
    mealDurationMin: null,
    isOutsideWorkHours: false,
    isAutoInserted: false,
  };
}

function getDateString(baseDate: string, offsetDays: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}
