'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { useProjectStore } from '@/stores/projectStore';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject } = useProjectStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Parameters<typeof createProject>[0]) => {
    setIsLoading(true);
    const project = await createProject(data);
    if (project) {
      toast.success('プロジェクトを作成しました');
      router.push(`/projects/${project.id}/locations`);
    } else {
      toast.error('作成に失敗しました');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              ダッシュボードへ戻る
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">新規プロジェクト作成</h1>
        </div>

        <ProjectForm onSubmit={handleSubmit} submitLabel="プロジェクトを作成" isLoading={isLoading} />
      </main>
    </div>
  );
}
