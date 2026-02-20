import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

export const runtime = 'edge';

interface RequestBody {
  lat: number;
  lng: number;
  radiusKm?: number;
}

interface PlacesResult {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  rating?: number;
  geometry: {
    location: { lat: number; lng: number };
  };
}

/** Haversine公式で2点間の距離(km)を計算 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const { lat, lng, radiusKm = 5 } = body;

  if (lat == null || lng == null) {
    return NextResponse.json({ success: false, error: 'lat and lng are required' }, { status: 400 });
  }

  const radius = Math.min(radiusKm * 1000, 50000); // 最大50km

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', String(radius));
  url.searchParams.set('type', 'lodging');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('language', 'ja');

  const res = await fetch(url.toString());
  const data = await res.json() as { status: string; results: PlacesResult[] };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return NextResponse.json({ success: false, error: `Google API error: ${data.status}` }, { status: 500 });
  }

  const hotels = (data.results ?? [])
    .slice(0, 10) // 最大10件取得してから距離でソート
    .map((place) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity ?? place.formatted_address ?? '',
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating,
      distanceKm: haversineKm(lat, lng, place.geometry.location.lat, place.geometry.location.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3); // 最近3件

  return NextResponse.json({ success: true, data: hotels });
}
