import type { OptimizeInput, ScheduleItem, Schedule } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { hhmmToMinutes, calcLocationTotalMinutes } from './buffer-calculator';
import { solveTsp } from './tsp-solver';
import { fitWorkHours } from './work-hours-fitter';

/**
 * スケジュールビルダー
 *
 * Phase 1: Nearest Neighbor + 2-opt で地点順序を最適化（tsp-solver）
 * Phase 2: 稼働時間フィッティング（work-hours-fitter, nightQueue分離）
 * Phase 3: 日数計算・昼食自動挿入・宿泊チェックイン配置
 */
export function buildSchedule(input: OptimizeInput): Omit<Schedule, 'id' | 'createdAt'> {
  const { project, locations, accommodations, meals, restStops, transports } = input;

  const travelBuffer =
    transports.length > 0 ? transports[0].defaultTravelBuffer : 10;

  // 稼働時間の設定
  const workStartMin = hhmmToMinutes(project.workStartTime);
  const workEndMin = hhmmToMinutes(project.workEndTime);
  const earlyMorningStartMin = project.allowEarlyMorning
    ? hhmmToMinutes(project.earlyMorningStart ?? '05:00')
    : undefined;
  const nightShootingEndMin = project.allowNightShooting
    ? hhmmToMinutes(project.nightShootingEnd ?? '22:00')
    : undefined;

  // Phase 1: TSP で最適順序を決定
  const sortedByOrder = [...locations].sort((a, b) => a.order - b.order);
  const optimizedLocations = solveTsp(sortedByOrder);

  // 日数計算
  let totalDays = 1;
  let startDate: string | null = null;
  const scheduleMode = project.durationMode;

  if (project.durationMode === 'fixed' && project.startDate && project.endDate) {
    startDate = project.startDate;
    const s = new Date(project.startDate);
    const e = new Date(project.endDate);
    totalDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  } else {
    // 自動算出: 全地点の総所要時間から日数を計算
    const dailyMinutes = workEndMin - workStartMin;
    const totalMinutes = optimizedLocations.reduce((sum, loc) => {
      return sum + calcLocationTotalMinutes(loc) + travelBuffer;
    }, 0);
    totalDays = Math.max(1, Math.ceil(totalMinutes / dailyMinutes));
  }

  const scheduleId = uuidv4();
  const allItems: ScheduleItem[] = [];

  // 地点キューを準備
  let locationQueue = [...optimizedLocations];

  for (let day = 1; day <= totalDays; day++) {
    const date = startDate ? getDateString(startDate, day - 1) : null;

    // 当日分の地点を切り出す（work-hours-fitter が自動的に翌日繰り越し）
    // ここでは全残地点を渡し、fitWorkHours が nextLocationQueue を返す
    const checkoutMin = day > 1
      ? accommodations[day - 2]?.checkOutTime
        ? hhmmToMinutes(accommodations[day - 2].checkOutTime!)
        : workStartMin
      : workStartMin;

    const result = fitWorkHours({
      scheduleId,
      day,
      date,
      workStartMin,
      workEndMin,
      earlyMorningStartMin,
      nightShootingEndMin,
      travelBufferMin: travelBuffer,
      locationQueue: locationQueue,
      accommodations,
      meals,
      restStops,
      isLastDay: day === totalDays,
      checkoutMin,
    });

    allItems.push(...result.items);

    // 繰り越し地点を次の日のキューに
    locationQueue = result.nextLocationQueue;

    // 最終日で残地点がある場合は日数を延長（autoモード）
    if (day === totalDays && locationQueue.length > 0 && project.durationMode === 'auto') {
      totalDays++;
    }
  }

  return {
    projectId: project.id,
    version: 1,
    scheduleMode,
    generatedAt: new Date(),
    totalDays,
    notes: null,
    items: allItems,
  };
}

function getDateString(baseDate: string, offsetDays: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}
