'use client';

import { APIProvider, Map as GoogleMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Schedule, ScheduleItem } from '@/types';

const DAY_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6d28d9',
];

interface MapViewProps {
  schedule: Schedule;
}

type PointWithCoords = ScheduleItem & { lat: number; lng: number };

export function MapView({ schedule }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  // location タイプで座標があるアイテムを抽出
  // Phase 2 では ScheduleItem に直接 lat/lng がないため、
  // items の notes 等から取れないので、address ベースで表示し
  // 座標がある場合のみマーカー表示（今後は items に lat/lng を付与する）
  const allPoints = schedule.items.filter(
    (item) => item.type === 'shooting'
  ) as PointWithCoords[];

  // 実際の座標は items に含まれていないため空になるが、
  // 将来の拡張のために構造を維持
  const validPoints = allPoints.filter(
    (p): p is PointWithCoords => p.lat != null && p.lng != null
  );

  const center = validPoints.length > 0
    ? {
        lat: validPoints.reduce((s, p) => s + p.lat, 0) / validPoints.length,
        lng: validPoints.reduce((s, p) => s + p.lng, 0) / validPoints.length,
      }
    : { lat: 35.6762, lng: 139.6503 }; // デフォルト: 東京

  // 日別グループ化
  const dayGroups = new Map<number, PointWithCoords[]>();
  for (const p of validPoints) {
    if (!dayGroups.has(p.day)) dayGroups.set(p.day, []);
    dayGroups.get(p.day)!.push(p);
  }

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-md text-sm text-muted-foreground">
        Google Maps APIキーが設定されていません
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="w-full h-[480px] rounded-md overflow-hidden border">
        <GoogleMap
          defaultCenter={center}
          defaultZoom={10}
          mapId="shooting-schedule-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {/* マーカー */}
          {validPoints.map((point, idx) => {
            const color = DAY_COLORS[(point.day - 1) % DAY_COLORS.length];
            return (
              <AdvancedMarker
                key={point.id}
                position={{ lat: point.lat, lng: point.lng }}
                title={`Day${point.day}: ${point.name}`}
              >
                <div
                  className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-md text-white text-xs font-bold"
                  style={{ backgroundColor: color }}
                >
                  {idx + 1}
                  {point.isOutsideWorkHours && (
                    <span
                      className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-white"
                      title="稼働時間外"
                    />
                  )}
                </div>
              </AdvancedMarker>
            );
          })}
        </GoogleMap>
      </div>

      {/* 凡例 */}
      {dayGroups.size > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {Array.from(dayGroups.keys()).sort((a, b) => a - b).map((day) => (
            <div key={day} className="flex items-center gap-1.5 text-sm">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: DAY_COLORS[(day - 1) % DAY_COLORS.length] }}
              />
              <span>Day {day}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500" />
            <span>稼働時間外</span>
          </div>
        </div>
      )}

      {validPoints.length === 0 && (
        <p className="text-sm text-muted-foreground mt-3">
          座標情報が付与された撮影地がありません。<br />
          地点登録時に住所検索から場所を選択すると、地図にマーカーが表示されます。
        </p>
      )}
    </APIProvider>
  );
}
