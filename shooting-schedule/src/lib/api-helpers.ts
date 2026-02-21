import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { createDb, createLocalDb } from '@/lib/db';
import type { Database } from '@/lib/db';

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status });
}

export function err(error: string, status = 400) {
  return NextResponse.json<ApiResponse>({ success: false, error }, { status });
}

type AuthenticatedContext = {
  session: { user: { id: string; name?: string | null; email?: string | null } };
  db: Database;
};

/**
 * DB インスタンスを取得する
 * - Cloudflare Pages (本番/プレビュー): getRequestContext() で D1 を取得
 * - ローカル開発 (next dev): better-sqlite3 でローカル SQLite ファイルを使用
 */
async function getDb(): Promise<Database> {
  if (process.env.NODE_ENV === 'production' || process.env.CF_PAGES) {
    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const ctx = getRequestContext();
    return createDb(ctx.env.DB);
  }
  return createLocalDb();
}

export async function getAuthAndDb(_req: NextRequest): Promise<AuthenticatedContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = await getDb();

  return {
    session: session as AuthenticatedContext['session'],
    db,
  };
}

/**
 * 認証なしで DB だけ取得する（register API などで使用）
 */
export async function getDbOnly(): Promise<Database> {
  return getDb();
}
