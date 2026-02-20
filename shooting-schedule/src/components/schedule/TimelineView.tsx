'use client';

import type { Schedule, ScheduleItem, Project } from '@/types';
import { hhmmToMinutes } from '@/lib/optimizer/buffer-calculator';

interface Props {
  schedule: Schedule;
  project?: Pick<Project, 'workStartTime' | 'workEndTime' | 'allowEarlyMorning' | 'earlyMorningStart' | 'allowNightShooting' | 'nightShootingEnd'>;
}

const TYPE_COLORS: Record<ScheduleItem['type'], string> = {
  location: 'bg-blue-500',
  accommodation: 'bg-purple-500',
  meal: 'bg-green-500',
  rest_stop: 'bg-yellow-500',
  transport: 'bg-gray-400',
  buffer: 'bg-orange-300',
};

const TYPE_LABELS: Record<ScheduleItem['type'], string> = {
  location: '撮影',
  accommodation: '宿泊',
  meal: '食事',
  rest_stop: '休憩',
  transport: '移動',
  buffer: 'バッファ',
};

const HOUR_START = 5;
const HOUR_END = 23;
const TOTAL_HOURS = HOUR_END - HOUR_START;

export function TimelineView({ schedule, project }: Props) {
  const byDay = new Map<number, ScheduleItem[]>();
  for (const item of schedule.items) {
    if (!byDay.has(item.day)) byDay.set(item.day, []);
    byDay.get(item.day)!.push(item);
  }

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

  // 稼働時間帯の計算（タイムライン上での位置）
  const workStart = project ? hhmmToMinutes(
    project.allowEarlyMorning && project.earlyMorningStart ? project.earlyMorningStart : project.workStartTime
  ) : null;
  const workEnd = project ? hhmmToMinutes(
    project.allowNightShooting && project.nightShootingEnd ? project.nightShootingEnd : project.workEndTime
  ) : null;
  const totalMin = TOTAL_HOURS * 60;
  const workStartPct = workStart != null ? Math.max(0, ((workStart - HOUR_START * 60) / totalMin) * 100) : null;
  const workEndPct = workEnd != null ? Math.min(100, ((workEnd - HOUR_START * 60) / totalMin) * 100) : null;

  return (
    <div className="overflow-x-auto">
      {/* 時間軸ヘッダー */}
      <div className="min-w-[800px]">
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
          return (
            <div key={day} className="flex mb-3 items-center">
              <div className="w-20 shrink-0 text-sm font-medium">
                <div>{day}日目</div>
                {date && <div className="text-xs text-muted-foreground">{date.slice(5)}</div>}
              </div>
              <div className="flex-1 relative h-10 bg-muted/30 rounded border overflow-hidden">
                {/* 稼働時間帯ハイライト（白背景） */}
                {workStartPct != null && workEndPct != null && (
                  <div
                    className="absolute top-0 bottom-0 bg-white/70"
                    style={{ left: `${workStartPct}%`, width: `${workEndPct - workStartPct}%` }}
                  />
                )}
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
                  const isOutside = item.isOutsideWorkHours;
                  const isTransport = item.type === 'transport';
                  return (
                    <div
                      key={item.id}
                      className={[
                        'absolute top-1 bottom-1 rounded text-white text-xs flex items-center px-1 overflow-hidden cursor-pointer',
                        TYPE_COLORS[item.type],
                        isOutside ? 'ring-2 ring-orange-500 ring-offset-0' : '',
                        isTransport && item.travelFromPreviousMin ? 'bg-green-400' : '',
                      ].join(' ')}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={[
                        `${item.name} ${item.startTime}〜${item.endTime}`,
                        isTransport && item.travelFromPreviousMin ? `移動: ${item.travelFromPreviousMin}分` : '',
                        isOutside ? '⚠ 稼働時間外' : '',
                      ].filter(Boolean).join(' | ')}
                    >
                      <span className="truncate">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 凡例 */}
        <div className="flex flex-wrap gap-3 mt-4 ml-20">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <div className={`w-3 h-3 rounded ${TYPE_COLORS[type as ScheduleItem['type']]}`} />
              <span>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-green-400" />
            <span>実距離移動</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded ring-2 ring-orange-500" />
            <span>稼働時間外</span>
          </div>
        </div>
      </div>
    </div>
  );
}
