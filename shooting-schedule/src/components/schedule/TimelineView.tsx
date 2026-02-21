'use client';

import type { Schedule, ScheduleItem } from '@/types';
import { hhmmToMinutes } from '@/lib/optimizer/buffer-calculator';

interface Props {
  schedule: Schedule;
  workStartTime?: string;
  workEndTime?: string;
}

// 種別 × 時間帯で色を決定
function getItemColor(item: ScheduleItem): string {
  if (item.type === 'shooting') {
    if (item.timeSlot === 'early_morning') return 'bg-sky-300';   // 🌅 早朝: ライトブルー
    if (item.timeSlot === 'night') return 'bg-indigo-700';         // 🌙 夜間: ダークブルー
    return 'bg-blue-500';                                           // 通常撮影: ブルー
  }
  const colors: Record<ScheduleItem['type'], string> = {
    shooting: 'bg-blue-500',
    accommodation: 'bg-purple-500',
    meal: 'bg-green-500',
    rest: 'bg-yellow-500',
    transport: 'bg-gray-400',
    buffer: 'bg-orange-300',
    auto_meal: 'bg-emerald-400',
  };
  return colors[item.type] ?? 'bg-gray-300';
}

const TYPE_LABELS: Record<ScheduleItem['type'], string> = {
  shooting: '撮影',
  accommodation: '宿泊',
  meal: '食事',
  rest: '休憩',
  transport: '移動',
  buffer: 'バッファ',
  auto_meal: '食事（自動）',
};

const HOUR_START = 5;
const HOUR_END = 23;
const TOTAL_HOURS = HOUR_END - HOUR_START;

export function TimelineView({ schedule, workStartTime = '09:00', workEndTime = '18:00' }: Props) {
  const byDay = new Map<number, ScheduleItem[]>();
  for (const item of schedule.items) {
    if (!byDay.has(item.day)) byDay.set(item.day, []);
    byDay.get(item.day)!.push(item);
  }

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

  // 稼働時間帯の背景位置計算
  const workStartPos = ((hhmmToMinutes(workStartTime) - HOUR_START * 60) / (TOTAL_HOURS * 60)) * 100;
  const workEndPos = ((hhmmToMinutes(workEndTime) - HOUR_START * 60) / (TOTAL_HOURS * 60)) * 100;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* 凡例 */}
        <div className="flex flex-wrap gap-3 mb-3 text-xs">
          {[
            { color: 'bg-blue-500', label: '撮影（通常）' },
            { color: 'bg-sky-300', label: '🌅 早朝撮影' },
            { color: 'bg-indigo-700', label: '🌙 夜間撮影' },
            { color: 'bg-green-500', label: '食事' },
            { color: 'bg-emerald-400', label: '食事（自動）' },
            { color: 'bg-yellow-500', label: '休憩' },
            { color: 'bg-gray-400', label: '移動' },
            { color: 'bg-orange-300', label: 'バッファ' },
            { color: 'bg-purple-500', label: '宿泊' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${color}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* 時間軸ヘッダー */}
        <div className="flex mb-1">
          <div className="w-20 shrink-0" />
          <div className="flex-1 relative h-6">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute text-xs text-muted-foreground"
                style={{ left: `${((h - HOUR_START) / TOTAL_HOURS) * 100}%` }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* 各日のタイムライン */}
        {Array.from({ length: schedule.totalDays }, (_, i) => i + 1).map((day) => {
          const items = byDay.get(day) ?? [];
          const date = items[0]?.date;

          // 稼働時間超過チェック
          const hasOvertime = items.some(
            (item) =>
              item.timeSlot !== 'early_morning' &&
              item.timeSlot !== 'night' &&
              item.type === 'shooting' &&
              hhmmToMinutes(item.endTime) > hhmmToMinutes(workEndTime)
          );

          return (
            <div key={day} className="flex mb-3 items-center">
              <div className="w-20 shrink-0 text-sm font-medium">
                <div className="flex items-center gap-1">
                  <span>{day}日目</span>
                  {hasOvertime && (
                    <span title="稼働時間超過" className="text-yellow-500">⚠️</span>
                  )}
                </div>
                {date && <div className="text-xs text-muted-foreground">{date.slice(5)}</div>}
              </div>
              <div className="flex-1 relative h-10 bg-muted/30 rounded border overflow-hidden">
                {/* 稼働時間帯: 白背景 */}
                <div
                  className="absolute top-0 bottom-0 bg-white/60"
                  style={{ left: `${workStartPos}%`, width: `${workEndPos - workStartPos}%` }}
                />
                {/* 時間グリッド線 */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0 border-l border-border/30"
                    style={{ left: `${((h - HOUR_START) / TOTAL_HOURS) * 100}%` }}
                  />
                ))}
                {/* スケジュールブロック */}
                {items.map((item) => {
                  const startMin = hhmmToMinutes(item.startTime) - HOUR_START * 60;
                  const endMin = hhmmToMinutes(item.endTime) - HOUR_START * 60;
                  const totalMin = TOTAL_HOURS * 60;
                  const left = Math.max(0, (startMin / totalMin) * 100);
                  const width = Math.max(0.5, ((endMin - startMin) / totalMin) * 100);
                  const color = getItemColor(item);
                  return (
                    <div
                      key={item.id}
                      className={`absolute top-1 bottom-1 rounded text-white text-xs flex items-center px-1 overflow-hidden cursor-pointer ${color}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${item.name} ${item.startTime}〜${item.endTime}${item.timeSlot === 'early_morning' ? ' 🌅早朝' : item.timeSlot === 'night' ? ' 🌙夜間' : ''}`}
                    >
                      <span className="truncate">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
