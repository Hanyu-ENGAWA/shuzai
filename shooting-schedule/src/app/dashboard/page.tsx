'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/projectStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Copy, Archive, Trash2, Calendar, MapPin } from 'lucide-react';
import type { Project } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { projects, fetchProjects, duplicateProject, archiveProject, deleteProject, isLoading } = useProjectStore();
  const [tab, setTab] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = projects.filter((p) =>
    tab === 'active' ? p.status !== 'archived' : p.status === 'archived'
  );

  const handleDuplicate = async (project: Project) => {
    const result = await duplicateProject(project.id);
    if (result) toast.success(`「${project.title}」を複製しました`);
    else toast.error('複製に失敗しました');
  };

  const handleArchive = async (project: Project) => {
    await archiveProject(project.id);
    toast.success(project.status !== 'archived' ? 'アーカイブしました' : 'アーカイブを解除しました');
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`「${project.title}」を削除しますか？この操作は元に戻せません。`)) return;
    await deleteProject(project.id);
    toast.success('削除しました');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">プロジェクト一覧</h1>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4 mr-1" />
              新規作成
            </Link>
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'archived')} className="mb-6">
          <TabsList>
            <TabsTrigger value="active">進行中</TabsTrigger>
            <TabsTrigger value="archived">アーカイブ</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">
              {tab === 'active' ? 'プロジェクトがありません' : 'アーカイブされたプロジェクトはありません'}
            </p>
            {tab === 'active' && (
              <Button asChild>
                <Link href="/projects/new">
                  <Plus className="h-4 w-4 mr-1" />
                  最初のプロジェクトを作成
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <Card key={project.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">
                      <Link href={`/projects/${project.id}/locations`} className="hover:underline">
                        {project.title}
                      </Link>
                    </CardTitle>
                    <Badge variant={project.status === 'archived' ? 'secondary' : project.status === 'optimized' ? 'outline' : 'default'} className="shrink-0">
                      {project.status === 'draft' ? '下書き' : project.status === 'optimized' ? '最適化済' : 'アーカイブ'}
                    </Badge>
                  </div>
                  {project.description && (
                    <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-3 flex-1">
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {project.startDate && project.endDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{project.startDate} 〜 {project.endDate}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>稼働: {project.workStartTime}〜{project.workEndTime}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 pt-3 border-t">
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link href={`/projects/${project.id}/locations`}>編集</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link href={`/projects/${project.id}/schedule`}>工程表</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(project)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleArchive(project)}>
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(project)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
