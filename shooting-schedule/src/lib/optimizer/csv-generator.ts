import type { Schedule, ScheduleItem, ExcludedLocation } from '@/types';

// 仕様書 v1.2 準拠の種別ラベル
const TYPE_LABELS: Record<ScheduleItem['type'], string> = {
  shooting: '撮影',
  accommodation: '宿泊',
  meal: '食事',
  rest: '休憩',
  transport: '移動',
  buffer: 'バッファ',
  auto_meal: '食事（自動）',
};

const TIME_SLOT_LABELS: Record<string, string> = {
  normal: '通常',
  early_morning: '早朝',
  night: '夜間',
  flexible: 'フレキシブル',
};

/**
 * 工程表をCSV文字列に変換（UTF-8 BOM付き、17カラム仕様）
 */
export function generateCsv(
  schedule: Schedule,
  projectTitle: string,
  excludedLocations?: { name: string; address?: string | null; priority?: string | null; reason?: string | null }[]
): string {
  const rows: string[][] = [
    ['工程表:', projectTitle],
    ['生成日時:', new Date(schedule.generatedAt).toLocaleString('ja-JP')],
    ['総日数:', String(schedule.totalDays)],
    ['バージョン:', String(schedule.version)],
    [],
    // 17カラムヘッダー
    [
      '日目',
      '順番',
      '種別',
      '時間帯区分',
      '場所名',
      '住所',
      '開始時刻',
      '終了時刻',
      'バッファ前(分)',
      '作業時間(分)',
      'バッファ後(分)',
      '食事兼用',
      '移動時間(分)',
      '移動距離(km)',
      '移動手段',
      '稼働時間内',
      'メモ',
    ],
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

    items.forEach((item, idx) => {
      // 作業時間（分）: 開始〜終了の差
      const [sh, sm] = item.startTime.split(':').map(Number);
      const [eh, em] = item.endTime.split(':').map(Number);
      const durationMin = (eh * 60 + em) - (sh * 60 + sm);

      // 稼働時間内かどうか
      const isOutsideWork = item.timeSlot === 'early_morning' || item.timeSlot === 'night';

      rows.push([
        String(day),
        String(idx + 1),
        TYPE_LABELS[item.type] ?? item.type,
        TIME_SLOT_LABELS[item.timeSlot ?? 'normal'] ?? '通常',
        item.name,
        item.address ?? '',
        item.startTime,
        item.endTime,
        '', // バッファ前（将来拡張）
        durationMin > 0 ? String(durationMin) : '',
        '', // バッファ後（将来拡張）
        '', // 食事兼用（将来拡張）
        '', // 移動時間（将来拡張: Distance Matrix）
        '', // 移動距離（将来拡張）
        '', // 移動手段（将来拡張）
        isOutsideWork ? '×' : '○',
        item.notes ?? '',
      ]);
    });

    if (items.length > 0) rows.push([]); // 空行でday区切り
  }

  // 除外撮影地セクション（期間固定モード）
  if (excludedLocations && excludedLocations.length > 0) {
    rows.push([]);
    rows.push(['--- 除外された撮影地 ---']);
    rows.push(['場所名', '住所', '優先度', '除外理由']);
    for (const loc of excludedLocations) {
      const priorityLabel: Record<string, string> = { required: '必須', high: '高', medium: '中', low: '低' };
      const reasonLabel: Record<string, string> = {
        time_exceeded: '日程内に収まらず',
        low_priority: '優先度が低い',
        unreachable: '到達不可',
      };
      rows.push([
        loc.name,
        loc.address ?? '',
        priorityLabel[loc.priority ?? ''] ?? loc.priority ?? '',
        reasonLabel[loc.reason ?? ''] ?? loc.reason ?? '',
      ]);
    }
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
