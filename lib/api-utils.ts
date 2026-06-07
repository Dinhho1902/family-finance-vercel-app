import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF defense for cookie-authenticated, state-changing requests.
 *
 * The app uses Supabase session cookies, so a cross-site page could trigger
 * authenticated writes. For a same-origin JSON API the cheapest robust check
 * is to require the request's Origin (or Referer fallback) to match the host
 * the request was served on. Cross-site form posts cannot forge Origin.
 *
 * Returns a 403 NextResponse if the check fails, otherwise null.
 */
export function checkOrigin(req: NextRequest): NextResponse | null {
  const host = req.headers.get('host');
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // Derive the origin from Origin, falling back to Referer.
  let sourceHost: string | null = null;
  try {
    if (origin) sourceHost = new URL(origin).host;
    else if (referer) sourceHost = new URL(referer).host;
  } catch {
    sourceHost = null;
  }

  if (!host || !sourceHost || sourceHost !== host) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

/**
 * Return a client-safe error response. The real error is logged server-side;
 * the client only ever sees a generic message so we never leak Postgres/
 * Supabase internals (column names, constraints, file paths).
 */
export function errorResponse(context: string, e: unknown, status = 500): NextResponse {
  console.error(`${context}:`, e);
  return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại.' }, { status });
}

/**
 * Validate a comma-separated `tickers` param against the strict VN stock
 * symbol format and cap the count, preventing query/URL injection into the
 * upstream price API and unbounded request fan-out.
 */
const TICKER_RE = /^[A-Z0-9]{3}$/;
const MAX_TICKERS = 50;

export function parseTickers(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(t => TICKER_RE.test(t))
    .slice(0, MAX_TICKERS);
}
