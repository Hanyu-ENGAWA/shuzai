import type { Location, Accommodation, Meal, RestStop, ScheduleItem } from '@/types';
import { hhmmToMinutes, minutesToHHmm, calcEndTime } from './buffer-calculator';
import { insertAutoMeal } from './auto-meal-inserter';
import { v4 as uuidv4 } from 'uuid';
import { getTimeSlotGroup } from './tsp-solver';

/**
 * work-hours-fitter: 稼働時間フィッティングモジュール
 *
 * MEMORY.md:
 * - 夜間地点は nightQueue に分離し通常稼働後に配置する設計
 * - work-hours-fitter: 夜間撮影の nightQueue 分離
 *
 * 各日のタイムテーブルを構築:
 *   a. 早朝撮影（あれば）→ バッファ → 通常稼働開始
 *   b. 通常稼働枠内で撮影・移動・食事・休憩を配置
 *   c. 通常稼働終了 → バッファ → 夜間撮影（あれば）
 *   d. 宿泊先/解散場所への移動
 */

const DEFAULT_TRAVEL_BUFFER = 10; // 分

export interface DayScheduleResult {
  items: ScheduleItem[];
  nextLocationQueue: Location[]; // 翌日に繰り越した地点
  isOvertime: boolean;           // 稼働時間超過フラグ
}

export interface WorkHoursFitterConfig {
  scheduleId: string;
  day: number;
  date: string | null;
  workStartMin: number;  // 稼働開始（分）
  workEndMin: number;    // 稼働終了（分）
  earlyMorningStartMin?: number; // 早朝開始（分）
  nightShootingEndMin?: number;  // 夜間終了（分）
  travelBufferMin: number;
  locationQueue: Location[];  // 当日割り当てる地点（early_morning / night も含む）
  accommodations: Accommodation[];
  meals: Meal[];
  restStops: RestStop[];
  isLastDay: boolean;
  checkoutMin?: number; // 前日の宿泊チェックアウト時間（分）
}

/**
 * 1日分のスケジュールアイテムを構築する
 */
export function fitWorkHours(config: WorkHoursFitterConfig): DayScheduleResult {
  const {
    scheduleId, day, date,
    workStartMin, workEndMin,
    earlyMorningStartMin, nightShootingEndMin,
    travelBufferMin,
    locationQueue,
    accommodations, meals,
    isLastDay, checkoutMin,
  } = config;

  const dayItems: ScheduleItem[] = [];
  let isOvertime = false;

  // 地点を time_slot グループで分類
  const earlyQueue: Location[] = [];   // グループ0: early_morning
  const normalQueue: Location[] = [];   // グループ1: normal / flexible
  const nightQueue: Location[] = [];    // グループ2: night
  for (const loc of locationQueue) {
    const g = getTimeSlotGroup(loc.timeSlot);
    if (g === 0) earlyQueue.push(loc);
    else if (g === 2) nightQueue.push(loc);
    else normalQueue.push(loc);
  }

  // --- Phase A: 早朝撮影 ---
  let currentMin = checkoutMin ?? workStartMin;
  if (earlyQueue.length > 0 && earlyMorningStartMin != null) {
    currentMin = earlyMorningStartMin;
    for (const loc of earlyQueue) {
      if (loc.bufferBefore > 0) {
        dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.bufferBefore, 'buffer', loc.timeSlot, null, `${loc.name} 準備`, null, dayItems.length));
        currentMin += loc.bufferBefore;
      }
      dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.shootingDuration, 'shooting', loc.timeSlot, loc.id, loc.name, loc.address, dayItems.length));
      currentMin += loc.shootingDuration;
      if (loc.bufferAfter > 0) {
        dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.bufferAfter, 'buffer', loc.timeSlot, null, `${loc.name} 片付け`, null, dayItems.length));
        currentMin += loc.bufferAfter;
      }
    }
    // 早朝終了後、通常稼働開始まで待機
    currentMin = Math.max(currentMin + travelBufferMin, workStartMin);
  } else {
    currentMin = checkoutMin ?? workStartMin;
  }

  // --- Phase B: 通常稼働 ---
  const nextLocationQueue: Location[] = [];
  const normalEnd = workEndMin; // 通常稼働終了

  while (normalQueue.length > 0) {
    const loc = normalQueue[0];
    const totalDuration = loc.bufferBefore + loc.shootingDuration + (loc.hasMeal ? loc.mealDuration : 0) + loc.bufferAfter;
    const projectedEnd = currentMin + totalDuration;

    // 稼働時間を超過するか確認（最低1件は入れる）
    if (projectedEnd > normalEnd && dayItems.filter(i => i.type === 'shooting').length > 0) {
      // 翌日へ繰り越し
      nextLocationQueue.push(...normalQueue);
      isOvertime = projectedEnd > normalEnd;
      break;
    }

    normalQueue.shift();

    if (loc.bufferBefore > 0) {
      dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.bufferBefore, 'buffer', 'normal', null, `${loc.name} 準備`, null, dayItems.length));
      currentMin += loc.bufferBefore;
    }

    dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.shootingDuration, 'shooting', 'normal', loc.id, loc.name, loc.address, dayItems.length));
    currentMin += loc.shootingDuration;

    // 食事兼用
    if (loc.hasMeal && loc.mealType) {
      dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.mealDuration, 'meal', 'normal', null, `食事（${loc.name}）`, loc.address, dayItems.length));
      currentMin += loc.mealDuration;
    }

    if (loc.bufferAfter > 0) {
      dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.bufferAfter, 'buffer', 'normal', null, `${loc.name} 片付け`, null, dayItems.length));
      currentMin += loc.bufferAfter;
    }

    // 移動バッファ（次がある場合）
    if (normalQueue.length > 0 || nightQueue.length > 0) {
      dayItems.push(makeItem(scheduleId, day, date, currentMin, travelBufferMin, 'transport', 'normal', null, '移動', null, dayItems.length));
      currentMin += travelBufferMin;
    }
  }

  // 昼食自動挿入（通常稼働後に実行）
  const dayItemsWithMeal = insertAutoMeal(
    dayItems.filter(i => i.type !== 'accommodation'),
    scheduleId, day, date, meals
  );

  const resultItems = [...dayItemsWithMeal];

  // --- Phase C: 夜間撮影 ---
  if (nightQueue.length > 0) {
    // 通常稼働終了後に夜間撮影へ移動
    const nightStart = Math.max(currentMin + travelBufferMin, nightShootingEndMin ? nightShootingEndMin - 120 : workEndMin + 60);
    currentMin = nightStart;

    for (const loc of nightQueue) {
      if (loc.bufferBefore > 0) {
        resultItems.push(makeItem(scheduleId, day, date, currentMin, loc.bufferBefore, 'buffer', 'night', null, `${loc.name} 準備`, null, resultItems.length));
        currentMin += loc.bufferBefore;
      }
      resultItems.push(makeItem(scheduleId, day, date, currentMin, loc.shootingDuration, 'shooting', 'night', loc.id, loc.name, loc.address, resultItems.length));
      currentMin += loc.shootingDuration;
      if (loc.bufferAfter > 0) {
        resultItems.push(makeItem(scheduleId, day, date, currentMin, loc.bufferAfter, 'buffer', 'night', null, `${loc.name} 片付け`, null, resultItems.length));
        currentMin += loc.bufferAfter;
      }
    }
  }

  // --- Phase D: 宿泊チェックイン（最終日以外） ---
  if (!isLastDay) {
    const acc = accommodations[day - 1];
    if (acc) {
      resultItems.push(makeItem(scheduleId, day, date, currentMin, 0, 'accommodation', 'normal', acc.id, acc.name ?? '宿泊', acc.address, resultItems.length));
    }
  }

  return {
    items: resultItems.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    nextLocationQueue,
    isOvertime,
  };
}

function makeItem(
  scheduleId: string,
  day: number,
  date: string | null,
  startMin: number,
  duration: number,
  type: ScheduleItem['type'],
  timeSlot: string | null | undefined,
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
    timeSlot: (timeSlot as ScheduleItem['timeSlot']) ?? 'normal',
    refId,
    name,
    address: address ?? null,
    notes: null,
    order,
  };
}
