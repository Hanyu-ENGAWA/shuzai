export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';



export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: session.user });
}
