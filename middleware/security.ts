// Security utilities: rate limiter, JWT verification, input sanitization, and security headers
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import type { Request as NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'replace_me_change_in_production';
if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('Warning: JWT_SECRET not set. Use a strong secret in production.');
}

/**
 * Basic in-memory rate limiter per IP. Suitable for prototype/edge. For production,
 * replace with Redis or centralized store to work across instances.
 */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 150;
type RateRecord = { count: number; windowStart: number };
const rateMap = new Map<string, RateRecord>();

export function rateLimit(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') || request.headers.get('host') || 'unknown') as string;
  const now = Date.now();
  const rec = rateMap.get(ip);

  if (!rec || now - rec.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return;
  }

  rec.count += 1;
  rateMap.set(ip, rec);

  if (rec.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((rec.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    const res = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    res.headers.set('Retry-After', String(retryAfter));
    throw res;
  }
}

/**
 * Read JWT from Authorization header (Bearer) or http-only cookie 'token'.
 * Returns decoded payload or throws NextResponse(401).
 */
export function verifyJWTFromRequest(request: Request) {
  const auth = request.headers.get('authorization');
  let token = null;
  if (auth && auth.startsWith('Bearer ')) token = auth.slice(7);
  if (!token) {
    // Try cookies
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.match(/(?:^|; )token=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (!token) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as Record<string, any>;
    return payload;
  } catch (err) {
    throw NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

/**
 * Role guard helper
 */
export function requireRole(payload: Record<string, any>, allowed: string[] = []) {
  if (!payload || !payload.role) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!allowed.includes(payload.role)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

/**
 * Sanitize strings in an object recursively to reduce XSS injection possibilities.
 * This is a basic sanitizer: it escapes angle brackets and strips script tags.
 * For a production system use a well-maintained library like DOMPurify on the client and server-side sanitizers.
 */
export function sanitizeInput<T extends any>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') {
    // Remove script tags and escape angle brackets
    const withoutScripts = input.replace(/<\s*script.*?>.*?<\s*\/\s*script\s*>/gi, '');
    return withoutScripts.replace(/</g, '&lt;').replace(/>/g, '&gt;') as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((v) => sanitizeInput(v)) as unknown as T;
  }
  if (typeof input === 'object') {
    const out: any = {};
    // Preserve only simple properties to avoid prototype poisoning
    for (const [k, v] of Object.entries(input as any)) {
      out[k] = sanitizeInput(v);
    }
    return out;
  }
  return input;
}

/**
 * Inject strong security headers into an outgoing Response headers object.
 * Call this prior to returning a NextResponse.
 */
export function setSecurityHeaders(res: NextResponse) {
  // Content Security Policy is kept intentionally conservative for the prototype.
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'no-referrer-when-downgrade');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('Cache-Control', 'no-store'); // Sensitive endpoints: no cache
  // Minimal CSP: adjust as your static assets domains evolve
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline' https:; font-src 'self' data:;"
  );
  return res;
}
