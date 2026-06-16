import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const apiKey = process.env.OTNET_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OTNET_API_KEY is not configured' }, { status: 500 });
  }
  const body = await req.text();
  const r = await fetch('https://otnet.io/api/v1/viewer/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body,
    cache: 'no-store',
  });
  const data = await r.json().catch(() => ({}));
  const setCookieHeaders = r.headers.getSetCookie?.() ?? [];
  console.log(
    `[auth] POST /viewer/auth/login → ${r.status} bodyKeys: ${Object.keys(data).join(',')} setCookie: ${setCookieHeaders.length}`,
  );
  if (!r.ok) return NextResponse.json(data, { status: r.status });

  // Token discovery — OTNet versions vary. Try the JSON body first, then
  // parse any Set-Cookie headers the upstream returned.
  function fromCookies(name: RegExp): string | undefined {
    for (const c of setCookieHeaders) {
      const m = c.match(new RegExp(`(?:^|;\\s*)(${name.source})=([^;]+)`));
      if (m) return decodeURIComponent(m[2]);
    }
    return undefined;
  }

  const accessToken =
    data.accessToken ||
    data.access_token ||
    data.token ||
    data.jwt ||
    fromCookies(/(?:otnet_)?(?:access[_-]?token|viewer|jwt|session)/i);
  const refreshToken =
    data.refreshToken ||
    data.refresh_token ||
    data.refresh ||
    fromCookies(/(?:otnet_)?refresh[_-]?token/i);

  if (!accessToken) {
    console.error('[auth] login succeeded but no token field in response', data);
    return NextResponse.json(
      { error: 'Sign-in succeeded but the server did not return a token' },
      { status: 500 },
    );
  }

  cookies().set('otnet_viewer', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  if (refreshToken) {
    cookies().set('otnet_viewer_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return NextResponse.json({ viewer: data.viewer ?? data.user ?? null });
}
