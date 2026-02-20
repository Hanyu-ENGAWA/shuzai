import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const input = searchParams.get('input');
  if (!input) {
    return NextResponse.json({ success: false, error: 'input is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Maps API not configured' }, { status: 500 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', input);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('language', 'ja');
  url.searchParams.set('components', 'country:jp');

  const res = await fetch(url.toString());
  const data = await res.json();

  return NextResponse.json({ success: true, data });
}
