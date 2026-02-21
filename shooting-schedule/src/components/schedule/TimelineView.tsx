'use client';

import type { Schedule, ScheduleItem, Project } from '@/types';
import { hhmmToMinutes } from '@/lib/optimizer/buffer-calculator';

interface Props {
  schedule: Schedule;
  project?: Pick<Project, 'workStartTime' | 'workEndTime' | 'allowEarlyMorning' | 'earlyMorningStart' | 'allowNightShooting' | 'nightShootingEnd'>;
}

const TYPE_COLORS: Record<ScheduleItem['type'], string> = {
  shooting: 'bg-blue-500',
  accommodation: 'bg-purple-500',
  meal: 'bg-green-500',
  rest: 'bg-yellow-500',
  transport: 'bg-gray-400',
  auto_meal: 'bg-lime-400',
  buffer: 'bg-orange-300',
};

const TYPE_LABELS: Record<ScheduleItem['type'], string> = {
  shooting: '撮影（通常）',
  accommodation: '宿泊',
  meal: '食事',
  rest: '休憩',
  transport: '移動',
  auto_meal: '昼食（自動）',
  buffer: 'バッファ',
};

const HOUR_START = 5;
const HOUR_END = 23;
const TOTAL_HOURS = HOUR_END - HOUR_START;

/** 撮影アイテムの色とアイコンを返す（早朝/通常/夜間で区別） */
function getShootingStyle(
  item: ScheduleItem,
  project: Props['project']
): { colorClass: string; icon: string } {
  if (item.type !== 'shooting') {
    return { colorClass: TYPE_COLORS[item.type], icon: '' };
  }
  if (!item.isOutsideWorkHours || !project) {
    return { colorClass: 'bg-blue-500', icon: '' };
  }
  const workStartMin = hhmmToMinutes(project.workStartTime);
  const itemStartMin = hhmmToMinutes(item.startTime);
  if (itemStartMin < workStartMin) {
    return { colorClass: 'bg-sky-300', icon: '🌅' };
  }
  return { colorClass: 'bg-blue-900', icon: '🌙' };
}

/** その日の行程が稼働時間を超過しているか判定 */
function isDayOvertime(items: ScheduleItem[], project: Props['project']): boolean {
  if (!project) return false;
  const effectiveEnd = project.allowNightShooting && project.nightShootingEnd
    ? project.nightShootingEnd
    : project.workEndTime;
  const effectiveEndMin = hhmmToMinutes(effectiveEnd);
  return items.some(
    (item) => item.type !== 'accommodation' && hhmmToMinutes(item.endTime) > effectiveEndMin
  );
}

export function TimelineView({ schedule, project }: Props) {
  const byDay = new Map<number, ScheduleItem[]>();
  for (const item of schedule.items) {
    if (!byDay.has(item.day)) byDay.set(item.day, []);
    byDay.get(item.day)!.push(item);
  }

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

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
      <div className="min-w-[800px]">
        {/* 時間軸ヘッダー */}
        <div className="flex mb-1">
          <div className="w-24 shrink-0" />
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
          const overtime = isDayOvertime(items, project);

          return (
            <div key={day} className="flex mb-3 items-center">
              {/* 日付ラベル */}
              <div className="w-24 shrink-0 text-sm font-medium flex items-start gap-1">
                <div>
                  <div className="flex items-center gap-1">
                    <span>{day}日目</span>
                    {overtime && (
                      <span title="稼働時間超過" className="text-base leading-none">⚠️</span>
                    )}
                  </div>
                  {date && <div className="text-xs text-muted-foreground">{date.slice(5)}</div>}
                </div>
              </div>

              {/* タイムラインバー */}
              <div className="flex-1 relative h-10 bg-muted/30 rounded border overflow-hidden">
                {/* 稼働時間帯ハイライト */}
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
                  const left = Math.max(0, (startMin / totalMin) * 100);
                  const width = Math.max(0.5, ((endMin - startMin) / totalMin) * 100);
                  const isTransport = item.type === 'transport';
                  const { colorClass, icon } = getShootingStyle(item, project);
                  const blockColor = isTransport && item.travelFromPreviousMin
                    ? 'bg-green-400'
                    : colorClass;

                  return (
                    <div
                      key={item.id}
                      className={[
                        'absolute top-1 bottom-1 rounded text-white text-xs flex items-center px-1 overflow-hidden cursor-pointer',
                        blockColor,
                      ].join(' ')}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={[
                        `${item.name} ${item.startTime}〜${item.endTime}`,
                        isTransport && item.travelFromPreviousMin ? `移動: ${item.travelFromPreviousMin}分` : '',
                        item.isOutsideWorkHours ? '稼働時間外' : '',
                      ].filter(Boolean).join(' | ')}
                    >
                      {icon && <span className="mr-0.5 shrink-0">{icon}</span>}
                      <span className="truncate">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 凡例 */}
        <div className="flex flex-wrap gap-3 mt-4 ml-24">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <div className={`w-3 h-3 rounded ${TYPE_COLORS[type as ScheduleItem['type']]}`} />
              <span>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-sky-300" />
            <span>🌅 撮影（早朝）</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-blue-900" />
            <span>🌙 撮影（夜間）</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded bg-green-400" />
            <span>実距離移動</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span>⚠️</span>
            <span>稼働時間超過</span>
          </div>
        </div>
      </div>
    </div>
  );
}
