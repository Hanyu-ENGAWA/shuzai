'use client';

import type { Schedule, ScheduleItem } from '@/types';
import { Badge } from '@/components/ui/badge';

interface Props {
  schedule: Schedule;
}

const TYPE_CONFIG: Record<ScheduleItem['type'], { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  location: { label: '撮影', variant: 'default' },
  accommodation: { label: '宿泊', variant: 'secondary' },
  meal: { label: '食事', variant: 'outline' },
  rest_stop: { label: '休憩', variant: 'outline' },
  transport: { label: '移動', variant: 'outline' },
  buffer: { label: 'バッファ', variant: 'outline' },
};

export function TableView({ schedule }: Props) {
  const byDay = new Map<number, ScheduleItem[]>();
  for (const item of schedule.items) {
    if (!byDay.has(item.day)) byDay.set(item.day, []);
    byDay.get(item.day)!.push(item);
  }

  return (
    <div className="space-y-8">
      {Array.from({ length: schedule.totalDays }, (_, i) => i + 1).map((day) => {
        const items = (byDay.get(day) ?? []).sort(
          (a, b) => a.startTime.localeCompare(b.startTime)
        );
        const date = items[0]?.date;
        return (
          <div key={day}>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm">
                {day}
              </span>
              {day}日目
              {date && <span className="text-muted-foreground text-sm font-normal">（{date}）</span>}
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium w-28">時間</th>
                    <th className="text-left px-4 py-2 font-medium w-20">種別</th>
                    <th className="text-left px-4 py-2 font-medium">場所/内容</th>
                    <th className="text-left px-4 py-2 font-medium hidden md:table-cell">住所</th>
                    <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">備考</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const config = TYPE_CONFIG[item.type];
                    return (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                        <td className="px-4 py-2.5 font-mono text-sm whitespace-nowrap">
                          {item.startTime}〜{item.endTime}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={config.variant} className="text-xs">
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 font-medium">{item.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                          {item.address ?? '-'}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">
                          {item.notes ?? '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                        この日のスケジュールはありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
