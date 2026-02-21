'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: CSRFトークンを相対パスで取得（next-auth/reactのsignInはlocalhost固定のため直接fetchを使用）
      const csrfRes = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfRes.json();

      // Step 2: ログインリクエストを相対パスで送信
      const loginRes = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: data.email,
          password: data.password,
          csrfToken,
          callbackUrl: '/dashboard',
          json: 'true',
        }),
        redirect: 'manual', // リダイレクトを自動追従しない
      });

      // 302または200はログイン成功
      if (loginRes.status === 302 || loginRes.status === 200 || loginRes.type === 'opaqueredirect') {
        // Step 3: セッション確認
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();

        if (session?.user?.email) {
          toast.success('ログインしました');
          router.push('/dashboard');
          router.refresh();
        } else {
          setError('メールアドレスまたはパスワードが正しくありません');
          setIsLoading(false);
        }
      } else {
        // レスポンスボディにエラーメッセージが含まれる場合
        let errorMsg = 'メールアドレスまたはパスワードが正しくありません';
        try {
          const body = await loginRes.json();
          if (body?.message) errorMsg = body.message;
        } catch {
          // ignore JSON parse error
        }
        setError(errorMsg);
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Login error:', e);
      setError('ログインに失敗しました。再度お試しください。');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Camera className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">撮影工程表</CardTitle>
          <CardDescription>アカウントにログイン</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl><Input type="email" placeholder="example@email.com" autoComplete="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>パスワード</FormLabel>
                  <FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            アカウントをお持ちでない方は{' '}
            <Link href="/register" className="text-primary underline">
              新規登録
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
