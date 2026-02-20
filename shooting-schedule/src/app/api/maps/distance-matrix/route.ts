import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

export const runtime = 'edge';

interface LatLng {
  lat: number;
  lng: number;
}

interface RequestBody {
  origins: LatLng[];
  destinations: LatLng[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'Maps API not configured' }, { status: 500 });
  }

  const body = await req.json() as RequestBody;
  const { origins, destinations } = body;

  if (!origins?.length || !destinations?.length) {
    return NextResponse.json({ success: false, error: 'origins and destinations are required' }, { status: 400 });
  }

  if (origins.length * destinations.length > 625) {
    return NextResponse.json({ success: false, error: 'Too many combinations (max 625)' }, { status: 400 });
  }

  const originsStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
  const destinationsStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', originsStr);
  url.searchParams.set('destinations', destinationsStr);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('language', 'ja');
  url.searchParams.set('mode', 'driving');

  const res = await fetch(url.toString());
  const data = await res.json() as {
    status: string;
    rows: Array<{
      elements: Array<{
        status: string;
        duration?: { value: number };
        distance?: { value: number };
      }>;
    }>;
  };

  if (data.status !== 'OK') {
    return NextResponse.json({ success: false, error: `Google API error: ${data.status}` }, { status: 500 });
  }

  const durationMin: number[][] = data.rows.map((row) =>
    row.elements.map((el) =>
      el.status === 'OK' && el.duration ? Math.round(el.duration.value / 60) : -1
    )
  );

  const distanceKm: number[][] = data.rows.map((row) =>
    row.elements.map((el) =>
      el.status === 'OK' && el.distance ? Math.round(el.distance.value / 100) / 10 : -1
    )
  );

  return NextResponse.json({ success: true, data: { durationMin, distanceKm } });
}
