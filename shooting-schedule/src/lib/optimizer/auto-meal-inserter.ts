import type { ScheduleItem, Meal } from '@/types';
import { hhmmToMinutes, minutesToHHmm, calcEndTime } from './buffer-calculator';
import { v4 as uuidv4 } from 'uuid';

const LUNCH_START = 11 * 60;   // 11:00
const LUNCH_END = 13 * 60;     // 13:00
const LUNCH_DURATION = 60;     // 60分

/**
 * アイテムリストにランチタイムを自動挿入する。
 * 11:00〜13:00 の間に昼食がなければ挿入。
 */
export function insertAutoMeal(
  items: ScheduleItem[],
  scheduleId: string,
  day: number,
  date: string | null,
  existingMeals: Meal[],
  lunchName = '昼食'
): ScheduleItem[] {
  // すでに昼食がある場合はスキップ
  const hasLunch = items.some(
    (item) =>
      item.type === 'meal' &&
      hhmmToMinutes(item.startTime) >= LUNCH_START &&
      hhmmToMinutes(item.startTime) < LUNCH_END
  );
  if (hasLunch) return items;

  // 既存のMealデータからランチを探す
  const mealRef = existingMeals.find((m) => m.mealType === 'lunch');

  // 挿入ポイントを探す: 11:00〜13:00 の間にある空き時間
  const sortedItems = [...items].sort(
    (a, b) => hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime)
  );

  // 11:00 〜 13:00 の間に空きがあるか確認
  let insertAt = minutesToHHmm(LUNCH_START); // デフォルト: 11:00
  let canInsert = false;

  // アイテム間の空き時間を確認
  let prevEnd = 0;
  for (const item of sortedItems) {
    const itemStart = hhmmToMinutes(item.startTime);
    const itemEnd = hhmmToMinutes(item.endTime);

    // 前のアイテム終了〜現在のアイテム開始の間に11:00〜13:00の空き
    if (prevEnd <= LUNCH_START && itemStart >= LUNCH_START + LUNCH_DURATION) {
      insertAt = minutesToHHmm(Math.max(prevEnd, LUNCH_START));
      canInsert = true;
      break;
    }
    prevEnd = itemEnd;
  }

  // ループ後のスペースチェック
  if (!canInsert && prevEnd <= LUNCH_START) {
    insertAt = minutesToHHmm(Math.max(prevEnd, LUNCH_START));
    canInsert = true;
  }

  if (!canInsert) return items;

  const lunchItem: ScheduleItem = {
    id: uuidv4(),
    scheduleId,
    day,
    date,
    startTime: insertAt,
    endTime: calcEndTime(insertAt, LUNCH_DURATION),
    type: 'meal',
    refId: mealRef?.id ?? null,
    name: mealRef?.name ?? lunchName,
    address: mealRef?.address ?? null,
    notes: '自動挿入',
    order: 0,
  };

  return [...items, lunchItem].sort(
    (a, b) => hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime)
  );
}
