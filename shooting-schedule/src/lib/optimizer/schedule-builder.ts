import type { OptimizeInput, ScheduleItem, Schedule } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { hhmmToMinutes, minutesToHHmm, calcLocationTotalMinutes, calcEndTime } from './buffer-calculator';
import { insertAutoMeal } from './auto-meal-inserter';

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
      dayItems.push(makeItem(scheduleId, day, date, currentMin, loc.shootingDuration, 'location', loc.id, loc.name, loc.address, dayItems.length));
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

function getDateString(baseDate: string, offsetDays: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}
