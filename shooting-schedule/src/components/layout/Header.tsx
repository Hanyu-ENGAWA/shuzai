'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Camera, LogOut, LayoutDashboard } from 'lucide-react';

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // CSRFトークンを相対パスで取得してサインアウト（signOut()はlocalhost固定のため直接fetchを使用）
      const csrfRes = await fetch('/api/auth/csrf');
      const csrfData = await csrfRes.json() as { csrfToken: string };
      const { csrfToken } = csrfData;
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken, callbackUrl: '/login', json: 'true' }),
        redirect: 'manual',
      });
    } catch {
      // サインアウトAPIが失敗してもリダイレクトする
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <Camera className="h-5 w-5 text-primary" />
          <span>撮影工程表</span>
        </Link>

        {session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {session.user.name}
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-1" />
                ダッシュボード
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" />
              ログアウト
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
