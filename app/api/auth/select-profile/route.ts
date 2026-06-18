import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { setActiveProfileIndex } from '@/lib/profile';

const BASE = 'https://otnet.io/api/v1';

// Bind the viewer's session to a specific profile. The server rejects the
// unbound token returned by /viewer/auth/login with default-deny on
// catalog requests, so this call is mandatory before browse/playback works
// for adult profiles. On success the server returns a new pair of tokens
// where the profileIndex is signed into the JWT itself — we replace the
// stored cookies with these bound tokens. The PIN flow is forwarded
// verbatim so the client can render its own attempts-left / countdown UI.
export async function POST(req: Request) {
  const apiKey = process.env.OTNET_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OTNET_API_KEY not configured' }, { status: 500 });
  }
  const token = cookies().get('otnet_viewer')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { profileIndex, pin } = body as { profileIndex?: number; pin?: string };
  if (typeof profileIndex !== 'number' || !Number.isFinite(profileIndex)) {
    return NextResponse.json({ error: 'profileIndex required' }, { status: 400 });
  }

  const upstreamBody: Record<string, unknown> = { profileIndex };
  if (typeof pin === 'string' && pin.length > 0) upstreamBody.pin = pin;

  const r = await fetch(`${BASE}/viewer/profiles/select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(upstreamBody),
    cache: 'no-store',
  });

  const data = await r.json().catch(() => ({} as Record<string, unknown>));
  console.log(`[select-profile] POST /viewer/profiles/select → ${r.status}`);

  // Pass PIN-flow signals straight through so the client can react.
  if (r.status === 400 && (data as { pinRequired?: boolean }).pinRequired) {
    return NextResponse.json(data, { status: 400 });
  }
  if (r.status === 401 || r.status === 429) {
    return NextResponse.json(data, { status: r.status });
  }
  if (!r.ok) {
    return NextResponse.json(data, { status: r.status });
  }

  const {
    accessToken,
    refreshToken,
    profileIndex: boundIndex,
    profile,
  } = data as {
    accessToken?: string;
    refreshToken?: string;
    profileIndex?: number;
    profile?: unknown;
  };

  if (!accessToken) {
    console.error('[select-profile] 200 with no accessToken', data);
    return NextResponse.json(
      { error: 'Server did not return a bound token' },
      { status: 500 },
    );
  }

  const prod = process.env.NODE_ENV === 'production';
  cookies().set('otnet_viewer', accessToken, {
    httpOnly: true,
    secure: prod,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  if (refreshToken) {
    cookies().set('otnet_viewer_refresh', refreshToken, {
      httpOnly: true,
      secure: prod,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  // Mirror the bound index in a UI-readable cookie so the header can
  // highlight the active profile without decoding the JWT.
  if (typeof boundIndex === 'number') {
    setActiveProfileIndex(boundIndex);
  }

  return NextResponse.json({ profileIndex: boundIndex, profile });
}
