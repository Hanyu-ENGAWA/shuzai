'use client';



import { useEffect, useState, startTransition } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { TableView } from '@/components/schedule/TableView';
import { TimelineView } from '@/components/schedule/TimelineView';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Download, RefreshCw, Table, BarChart2 } from 'lucide-react';
import type { Schedule } from '@/types';

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const { currentProject, schedules, fetchProject, fetchSchedules, generateSchedule } = useProjectStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);

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
    const schedule = await generateSchedule(id);
    if (schedule) {
      setCurrentSchedule(schedule);
      toast.success('工程表を生成しました');
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
            <div className="flex gap-2">
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
                「工程表を生成」ボタンをクリックしてください。
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? '生成中...' : '工程表を生成'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span>総日数: <strong className="text-foreground">{currentSchedule.totalDays}日</strong></span>
              <span>アイテム数: <strong className="text-foreground">{currentSchedule.items.length}件</strong></span>
              <span>生成日時: {new Date(currentSchedule.generatedAt).toLocaleString('ja-JP')}</span>
            </div>

            <Tabs defaultValue="table">
              <TabsList className="mb-4">
                <TabsTrigger value="table">
                  <Table className="h-4 w-4 mr-1" />テーブル
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <BarChart2 className="h-4 w-4 mr-1" />タイムライン
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
                    <TimelineView
                      schedule={currentSchedule}
                      workStartTime={currentProject?.workStartTime ?? '09:00'}
                      workEndTime={currentProject?.workEndTime ?? '18:00'}
                    />
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
