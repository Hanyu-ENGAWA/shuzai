'use client';

import { useEffect, useState } from 'react';
import type { Schedule, HotelSuggestion, ScheduleItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  schedule: Schedule;
  /** 各撮影地の座標情報 (locationId → {lat, lng}) */
  locationCoords: Record<string, { lat: number; lng: number }>;
}

interface DayLastLocation {
  day: number;
  item: ScheduleItem;
  lat: number;
  lng: number;
}

export function HotelSuggestions({ schedule, locationCoords }: Props) {
  const [suggestions, setSuggestions] = useState<Map<number, HotelSuggestion[]>>(new Map());
  const [loading, setLoading] = useState<Set<number>>(new Set());

  // 各日の最終撮影地を抽出
  const dayLastLocations: DayLastLocation[] = [];
  const maxDay = schedule.totalDays;

  for (let day = 1; day < maxDay; day++) {
    // 当日の location タイプアイテムを抽出して最後の1件を取得
    const dayLocations = schedule.items
      .filter((item) => item.day === day && item.type === 'location' && item.refId)
      .sort((a, b) => {
        const aMin = parseInt(a.startTime.replace(':', ''), 10);
        const bMin = parseInt(b.startTime.replace(':', ''), 10);
        return bMin - aMin; // 降順
      });

    const lastItem = dayLocations[0];
    if (!lastItem?.refId) continue;

    const coords = locationCoords[lastItem.refId];
    if (!coords) continue;

    dayLastLocations.push({ day, item: lastItem, lat: coords.lat, lng: coords.lng });
  }

  useEffect(() => {
    if (dayLastLocations.length === 0) return;

    dayLastLocations.forEach(({ day, lat, lng }) => {
      if (suggestions.has(day) || loading.has(day)) return;

      setLoading((prev) => new Set(prev).add(day));

      fetch('/api/maps/nearby-hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radiusKm: 5 }),
      })
        .then((res) => res.json() as Promise<{ success: boolean; data?: HotelSuggestion[] }>)
        .then((data) => {
          if (data.success && data.data) {
            setSuggestions((prev) => new Map(prev).set(day, data.data!));
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoading((prev) => {
            const next = new Set(prev);
            next.delete(day);
            return next;
          });
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.id]);

  if (dayLastLocations.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-sm font-semibold">ホテル候補（各日最終地点付近）</h3>
      {dayLastLocations.map(({ day, item }) => {
        const hotels = suggestions.get(day);
        const isLoading = loading.has(day);

        return (
          <div key={day}>
            <p className="text-xs text-muted-foreground mb-2">
              Day {day} 最終地点: <strong>{item.name}</strong> 周辺
            </p>
            {isLoading && (
              <p className="text-xs text-muted-foreground">検索中...</p>
            )}
            {hotels && hotels.length === 0 && (
              <p className="text-xs text-muted-foreground">近隣のホテルが見つかりませんでした</p>
            )}
            {hotels && hotels.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {hotels.map((hotel) => (
                  <Card key={hotel.placeId} className="border-border/50">
                    <CardHeader className="pb-1 pt-3 px-3">
                      <CardTitle className="text-sm leading-tight">{hotel.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-1">
                      <p className="text-xs text-muted-foreground line-clamp-2">{hotel.address}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {hotel.distanceKm.toFixed(1)} km
                        </Badge>
                        {hotel.rating != null && (
                          <Badge variant="outline" className="text-xs">
                            ★ {hotel.rating.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
