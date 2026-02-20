import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { createDb } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';
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

export async function getAuthAndDb(_req: NextRequest): Promise<AuthenticatedContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const ctx = getRequestContext();
  const db = createDb(ctx.env.DB);

  return {
    session: session as AuthenticatedContext['session'],
    db,
  };
}
