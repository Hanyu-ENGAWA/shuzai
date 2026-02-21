'use client';

export const runtime = 'edge';



import { useEffect, useState, startTransition } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { TableView } from '@/components/schedule/TableView';
import { TimelineView } from '@/components/schedule/TimelineView';
import { HotelSuggestions } from '@/components/schedule/HotelSuggestions';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Download, RefreshCw, Table, BarChart2, Map } from 'lucide-react';
import type { Schedule, OptimizationType, Location } from '@/types';

// MapView は SSR 無効（Google Maps は client-only）
const MapView = dynamic(
  () => import('@/components/schedule/MapView').then((m) => m.MapView),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-md" /> }
);

const OPTIMIZATION_OPTIONS: { value: OptimizationType; label: string; description: string }[] = [
  { value: 'none', label: '順序そのまま', description: '登録した順序で工程表を生成します' },
  { value: 'shortest_time', label: '移動時間最短', description: 'Google Maps の実際の移動時間を最小化します' },
  { value: 'shortest_distance', label: '移動距離最短', description: '総移動距離を最小化します' },
  { value: 'balanced', label: 'バランス最適化', description: '移動時間と距離のバランスを取って最適化します' },
];

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const { currentProject, schedules, fetchProject, fetchSchedules, generateSchedule } = useProjectStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [optimizationType, setOptimizationType] = useState<OptimizationType>('none');

  useEffect(() => {
    fetchProject(id);
    fetchSchedules(id).then(() => {});
  }, [id, fetchProject, fetchSchedules]);

  useEffect(() => {
    if (schedules.length > 0) {
      startTransition(() => setCurrentSchedule(schedules[0]));
    }
  }, [schedules]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const schedule = await generateSchedule(id, optimizationType);
    if (schedule) {
      setCurrentSchedule(schedule);
      const optLabel = OPTIMIZATION_OPTIONS.find((o) => o.value === optimizationType)?.label ?? '';
      toast.success(`工程表を生成しました（${optLabel}）`);
    } else {
      toast.error('生成に失敗しました。撮影地が登録されているか確認してください。');
    }
    setIsGenerating(false);
  };

  const handleDownloadCsv = () => {
    if (!currentSchedule) return;
    const url = `/api/projects/${id}/schedules/${currentSchedule.id}/csv`;
    const a = document.createElement('a');
    a.href = url;
    a.click();
  };

  // 撮影地の座標マップを構築（ホテル提案用）
  const locationCoords: Record<string, { lat: number; lng: number }> = {};
  const locations = (currentProject?.locations ?? []) as Location[];
  for (const loc of locations) {
    if (loc.lat != null && loc.lng != null) {
      locationCoords[loc.id] = { lat: loc.lat, lng: loc.lng };
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={`/projects/${id}/locations`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              場所入力に戻る
            </Link>
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{currentProject?.title ?? 'プロジェクト'}</h1>
              <p className="text-sm text-muted-foreground mt-1">撮影工程表</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* 最適化タイプ選択 */}
              <Select
                value={optimizationType}
                onValueChange={(v) => setOptimizationType(v as OptimizationType)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPTIMIZATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? '生成中...' : schedules.length > 0 ? '再生成' : '工程表を生成'}
              </Button>
              {currentSchedule && (
                <Button onClick={handleDownloadCsv}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV出力
                </Button>
              )}
            </div>
          </div>
        </div>

        {!currentSchedule ? (
          <Card>
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground mb-4">
                工程表がまだ生成されていません。<br />
                最適化方法を選択して「工程表を生成」ボタンをクリックしてください。
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? '生成中...' : '工程表を生成'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            {/* スケジュール概要 */}
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>総日数: <strong className="text-foreground">{currentSchedule.totalDays}日</strong></span>
              <span>アイテム数: <strong className="text-foreground">{currentSchedule.items.length}件</strong></span>
              {currentSchedule.totalDistanceKm != null && currentSchedule.totalDistanceKm > 0 && (
                <span>総移動距離: <strong className="text-foreground">{currentSchedule.totalDistanceKm.toFixed(1)}km</strong></span>
              )}
              {currentSchedule.totalDurationMin != null && currentSchedule.totalDurationMin > 0 && (
                <span>総撮影時間: <strong className="text-foreground">{Math.floor(currentSchedule.totalDurationMin / 60)}h{currentSchedule.totalDurationMin % 60}m</strong></span>
              )}
              {currentSchedule.optimizationType && currentSchedule.optimizationType !== 'none' && (
                <span className="text-blue-600">
                  最適化: <strong>{OPTIMIZATION_OPTIONS.find((o) => o.value === currentSchedule.optimizationType)?.label}</strong>
                </span>
              )}
              {currentSchedule.hasOvertimeWarning && (
                <span className="text-orange-600 font-medium">⚠ 稼働時間外の地点あり</span>
              )}
              <span className="ml-auto">生成日時: {new Date(currentSchedule.generatedAt).toLocaleString('ja-JP')}</span>
            </div>

            <Tabs defaultValue="table">
              <TabsList className="mb-4">
                <TabsTrigger value="table">
                  <Table className="h-4 w-4 mr-1" />テーブル
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <BarChart2 className="h-4 w-4 mr-1" />タイムライン
                </TabsTrigger>
                <TabsTrigger value="map">
                  <Map className="h-4 w-4 mr-1" />地図
                </TabsTrigger>
              </TabsList>

              <TabsContent value="table">
                <Card>
                  <CardContent className="pt-6">
                    <TableView schedule={currentSchedule} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">タイムライン表示</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimelineView schedule={currentSchedule} project={currentProject ?? undefined} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="map">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">地図表示</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MapView schedule={currentSchedule} />
                    {currentSchedule.totalDays > 1 && Object.keys(locationCoords).length > 0 && (
                      <HotelSuggestions
                        schedule={currentSchedule}
                        locationCoords={locationCoords}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* 過去の生成履歴 */}
            {schedules.length > 1 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">過去の生成履歴</h3>
                <div className="flex flex-wrap gap-2">
                  {schedules.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setCurrentSchedule(s)}
                      className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                        s.id === currentSchedule.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted border-border'
                      }`}
                    >
                      {new Date(s.generatedAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      （{s.totalDays}日間）
                      {s.optimizationType && s.optimizationType !== 'none' && (
                        <span className="ml-1 text-blue-600">
                          {OPTIMIZATION_OPTIONS.find((o) => o.value === s.optimizationType)?.label}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
