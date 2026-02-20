import type { Location } from '@/types';

/** 分を "HH:mm" 文字列に変換 */
export function minutesToHHmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "HH:mm" を分に変換 */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 撮影地の総所要時間（バッファ含む）を計算 */
export function calcLocationTotalMinutes(loc: Location): number {
  return loc.bufferBefore + loc.shootingDuration + loc.bufferAfter;
}

/** 終了時刻を計算（開始時刻 + 所要分） */
export function calcEndTime(startHHmm: string, durationMinutes: number): string {
  const startMin = hhmmToMinutes(startHHmm);
  return minutesToHHmm(startMin + durationMinutes);
}

/** 2つの時刻の差（分）を計算（end - start） */
export function timeDiffMinutes(startHHmm: string, endHHmm: string): number {
  return hhmmToMinutes(endHHmm) - hhmmToMinutes(startHHmm);
}

/** 時刻が稼働時間内かチェック */
export function isWithinWorkHours(
  timeHHmm: string,
  workStart: string,
  workEnd: string,
  allowEarlyMorning = false,
  earlyStart = '05:00',
  allowNight = false,
  nightEnd = '22:00'
): boolean {
  const t = hhmmToMinutes(timeHHmm);
  const ws = hhmmToMinutes(workStart);
  const we = hhmmToMinutes(workEnd);

  if (t >= ws && t <= we) return true;
  if (allowEarlyMorning && t >= hhmmToMinutes(earlyStart) && t < ws) return true;
  if (allowNight && t > we && t <= hhmmToMinutes(nightEnd)) return true;

  return false;
}
