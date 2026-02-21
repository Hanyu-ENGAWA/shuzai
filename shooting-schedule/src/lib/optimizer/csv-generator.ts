import type { Schedule, ScheduleItem } from '@/types';

const TYPE_LABELS: Record<ScheduleItem['type'], string> = {
  shooting: '撮影',
  accommodation: '宿泊',
  meal: '食事',
  rest: '休憩',
  transport: '移動',
  auto_meal: '昼食（自動）',
  buffer: 'バッファ',
};

const TRANSPORT_MODE_LABELS: Record<string, string> = {
  driving: '車',
  transit: '公共交通',
  walking: '徒歩',
  bicycling: '自転車',
};

const PRIORITY_LABELS: Record<string, string> = {
  required: '必須',
  high: '高',
  medium: '中',
  low: '低',
};

const REASON_LABELS: Record<string, string> = {
  time_exceeded: '日程内に収まらず',
  low_priority: '優先度が低い',
  unreachable: '到達不可',
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function calcWorkMinutes(item: ScheduleItem): string {
  const total = timeToMinutes(item.endTime) - timeToMinutes(item.startTime);
  if (total <= 0) return '';
  const before = item.bufferBeforeMin ?? 0;
  const after = item.bufferAfterMin ?? 0;
  const work = total - before - after;
  return work > 0 ? String(work) : String(total);
}

/**
 * 工程表をCSV文字列に変換（UTF-8 BOM付き、17カラム）
 */
export function generateCsv(schedule: Schedule, projectTitle: string): string {
  const rows: string[][] = [
    ['工程表:', projectTitle],
    ['生成日時:', new Date(schedule.generatedAt).toLocaleString('ja-JP')],
    ['総日数:', String(schedule.totalDays)],
    [],
    [
      '日目', '順番', '種別', '時間帯区分', '場所名', '住所',
      '開始時刻', '終了時刻',
      'バッファ前(分)', '作業時間(分)', 'バッファ後(分)',
      '食事兼用', '移動時間(分)', '移動距離(km)', '移動手段',
      '稼働時間内', 'メモ',
    ],
  ];

  const byDay = new Map<number, ScheduleItem[]>();
  for (const item of schedule.items) {
    if (!byDay.has(item.day)) byDay.set(item.day, []);
    byDay.get(item.day)!.push(item);
  }

  for (let day = 1; day <= schedule.totalDays; day++) {
    const items = (byDay.get(day) ?? []).sort((a, b) => a.order - b.order);
    for (const item of items) {
      rows.push([
        String(item.day),
        String(item.order + 1),
        TYPE_LABELS[item.type] ?? item.type,
        item.isOutsideWorkHours ? '時間外' : '通常',
        item.name,
        item.address ?? '',
        item.startTime,
        item.endTime,
        item.bufferBeforeMin != null ? String(item.bufferBeforeMin) : '',
        calcWorkMinutes(item),
        item.bufferAfterMin != null ? String(item.bufferAfterMin) : '',
        item.includesMeal ? '○' : '',
        item.travelFromPreviousMin != null ? String(item.travelFromPreviousMin) : '',
        item.travelFromPreviousKm != null ? String(item.travelFromPreviousKm) : '',
        item.transportMode
          ? (TRANSPORT_MODE_LABELS[item.transportMode] ?? item.transportMode)
          : '',
        item.isOutsideWorkHours ? '×' : '○',
        item.notes ?? '',
      ]);
    }
    if (items.length > 0) rows.push([]);
  }

  // 除外撮影地セクション（期間固定モードで除外された地点がある場合）
  if (schedule.excludedLocations && schedule.excludedLocations.length > 0) {
    rows.push([]);
    rows.push(['--- 除外された撮影地 ---']);
    rows.push(['場所名', '住所', '優先度', '除外理由']);
    for (const loc of schedule.excludedLocations) {
      rows.push([
        loc.name,
        loc.address ?? '',
        loc.priority ? (PRIORITY_LABELS[loc.priority] ?? loc.priority) : '',
        loc.reason ? (REASON_LABELS[loc.reason] ?? loc.reason) : '',
      ]);
    }
  }

  const csvContent = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  return '\uFEFF' + csvContent;
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
