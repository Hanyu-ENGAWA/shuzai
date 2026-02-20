import type { Schedule, ScheduleItem } from '@/types';

const TYPE_LABELS: Record<ScheduleItem['type'], string> = {
  location: '撮影',
  accommodation: '宿泊',
  meal: '食事',
  rest_stop: '休憩',
  transport: '移動',
  buffer: 'バッファ',
};

/**
 * 工程表をCSV文字列に変換（UTF-8 BOM付き）
 */
export function generateCsv(schedule: Schedule, projectTitle: string): string {
  const rows: string[][] = [
    ['工程表:', projectTitle],
    ['生成日時:', new Date(schedule.generatedAt).toLocaleString('ja-JP')],
    ['総日数:', String(schedule.totalDays)],
    [],
    ['日付', '日程', '種別', '時間', '場所/内容', '住所', '備考'],
  ];

  // day でグループ化
  const byDay = new Map<number, ScheduleItem[]>();
  for (const item of schedule.items) {
    if (!byDay.has(item.day)) byDay.set(item.day, []);
    byDay.get(item.day)!.push(item);
  }

  for (let day = 1; day <= schedule.totalDays; day++) {
    const items = (byDay.get(day) ?? []).sort(
      (a, b) => a.startTime.localeCompare(b.startTime)
    );
    for (const item of items) {
      rows.push([
        item.date ?? '',
        `${day}日目`,
        TYPE_LABELS[item.type] ?? item.type,
        `${item.startTime}〜${item.endTime}`,
        item.name,
        item.address ?? '',
        item.notes ?? '',
      ]);
    }
    if (items.length > 0) rows.push([]); // 空行でday区切り
  }

  const csvContent = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  // UTF-8 BOM
  return '\uFEFF' + csvContent;
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
