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
  departureTravelMin?: number; // 出発地 → Day1 最初の撮影地 の移動時間（分）
  departureTravelKm?: number;  // 出発地 → Day1 最初の撮影地 の移動距離（km）
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
    departureTravelMin,
    departureTravelKm,
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

  const locationQueue = [...orderedLocations];

  let calculatedDays = 1;
  let day = 1;
  let totalDistanceKm = 0;
  let totalDurationMin = 0;

  while (locationQueue.length > 0 && (fixedMode ? day <= totalDays : true)) {
    const date = startDate ? getDateString(startDate, day - 1) : null;

    // Day 1 は早朝開始、Day 2 以降は workStartMin から
    let currentMin = day === 1 ? effectiveStartMin : workStartMin;

    const dayItems: ScheduleItem[] = [];
    const nightQueue: Location[] = []; // 当日の夜間撮影地
    let prevLocIndex = -1;

    // ── 通常稼働フェーズ（early_morning / normal / flexible）──────────
    while (locationQueue.length > 0) {
      const loc = locationQueue[0];
      const locOrigIndex = orderedLocations.indexOf(loc);

      // 夜間撮影地は後回し（nightQueue へ）
      if (loc.timeSlot === 'night') {
        nightQueue.push(locationQueue.shift()!);
        continue;
      }

      // 移動時間を取得
      const { travelMin, travelKm } = getTravelInfo(
        prevLocIndex, locOrigIndex, dayItems, day,
        travelDurationMatrix, travelDistanceMatrix,
        departureTravelMin, departureTravelKm
      );

      // 早朝撮影: 指定時刻に開始（当日冒頭のみ）
      if (loc.timeSlot === 'early_morning' && loc.timeSlotStart) {
        const slotStart = hhmmToMinutes(loc.timeSlotStart);
        currentMin = Math.min(currentMin, slotStart);
      }

      const locationStart = currentMin + (dayItems.length > 0 ? travelMin : (day === 1 && departureTravelMin ? travelMin : 0));

      const locDuration = calcLocationTotalMinutes(loc);
      const mealAddition = loc.hasMeal ? loc.mealDurationMin : 0;
      const locEndMin = locationStart + locDuration + mealAddition;

      // 通常稼働終了（workEndMin）を超えるか確認
      // 早朝地点は workStartMin を上限、その他は workEndMin を上限とする
      const normalEnd = loc.timeSlot === 'early_morning' ? workStartMin : workEndMin;
      if (locEndMin > normalEnd && dayItems.length > 0) {
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
        break; // 翌日へ
      }

      if (locEndMin > normalEnd) {
        hasOvertimeWarning = true;
      }

      locationQueue.shift();

      // 移動アイテム追加
      if (travelMin > 0) {
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

      // 撮影
      const isOutside = loc.timeSlot !== 'early_morning' && currentMin + loc.shootingDuration > workEndMin;
      if (isOutside) hasOvertimeWarning = true;

      const shootItem = makeItem(
        scheduleId, day, date, currentMin, loc.shootingDuration, 'shooting', loc.id,
        loc.name, loc.address, dayItems.length
      );
      shootItem.isOutsideWorkHours = isOutside;
      shootItem.timeSlot = loc.timeSlot;
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

      // 早朝撮影後は workStartMin まで進める（通常稼働開始まで待機）
      if (loc.timeSlot === 'early_morning') {
        currentMin = Math.max(currentMin, workStartMin);
      }

      prevLocIndex = locOrigIndex;
    }

    // ── 夜間撮影フェーズ ──────────────────────────────────────────────
    if (nightQueue.length > 0) {
      // 通常稼働終了後から夜間撮影を開始
      currentMin = Math.max(currentMin, workEndMin);

      for (const loc of nightQueue) {
        const locOrigIndex = orderedLocations.indexOf(loc);

        // timeSlotStart が指定されていればその時刻まで待つ
        if (loc.timeSlotStart) {
          currentMin = Math.max(currentMin, hhmmToMinutes(loc.timeSlotStart));
        }

        // 移動時間
        const { travelMin, travelKm } = getTravelInfo(
          prevLocIndex, locOrigIndex, dayItems, day,
          travelDurationMatrix, travelDistanceMatrix,
          undefined, undefined
        );

        if (travelMin > 0) {
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

        // 夜間撮影（effectiveEndMin を超える場合は overtime 警告）
        const locDuration = calcLocationTotalMinutes(loc);
        const locEndMin = currentMin + locDuration;
        const isOvertime = locEndMin > effectiveEndMin;
        if (isOvertime) hasOvertimeWarning = true;

        const shootItem = makeItem(
          scheduleId, day, date, currentMin, loc.shootingDuration, 'shooting', loc.id,
          loc.name, loc.address, dayItems.length
        );
        shootItem.isOutsideWorkHours = false; // 夜間撮影は意図的なので outside 扱いしない
        shootItem.timeSlot = loc.timeSlot;
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
    }

    // 昼食自動挿入
    const dayItemsWithMeal = insertAutoMeal(dayItems, scheduleId, day, date, meals);
    allItems.push(...dayItemsWithMeal);

    calculatedDays = day;
    day++;

    if (!fixedMode && locationQueue.length === 0) break;
    if (fixedMode && day > totalDays && locationQueue.length > 0) {
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

/** 移動時間・距離を取得するヘルパー */
function getTravelInfo(
  prevLocIndex: number,
  locOrigIndex: number,
  dayItems: ScheduleItem[],
  day: number,
  travelDurationMatrix: number[][] | null | undefined,
  travelDistanceMatrix: number[][] | null | undefined,
  departureTravelMin: number | undefined,
  departureTravelKm: number | undefined,
): { travelMin: number; travelKm: number } {
  let travelMin = DEFAULT_TRAVEL_MIN;
  let travelKm = 0;

  if (prevLocIndex >= 0 && travelDurationMatrix) {
    const raw = travelDurationMatrix[prevLocIndex]?.[locOrigIndex] ?? -1;
    travelMin = raw >= 0 ? raw : DEFAULT_TRAVEL_MIN;
  } else if (dayItems.length === 0 && day === 1 && departureTravelMin != null && departureTravelMin > 0) {
    travelMin = departureTravelMin;
    travelKm = departureTravelKm ?? 0;
  } else if (dayItems.length === 0) {
    travelMin = 0;
  }

  if (prevLocIndex >= 0 && travelDistanceMatrix) {
    const raw = travelDistanceMatrix[prevLocIndex]?.[locOrigIndex] ?? 0;
    travelKm = raw >= 0 ? raw : 0;
  }

  return { travelMin, travelKm };
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
