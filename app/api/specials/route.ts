import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sanitizeInput, rateLimit, verifyJWTFromRequest, requireRole, setSecurityHeaders } from '@/middleware/security';

/**
 * GET /api/specials
 * Query params:
 * - q (search in title/description)
 * - active (true/false)
 * - limit, offset for pagination
 */
export async function GET(req: Request) {
  try {
    rateLimit(req);

    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const active = url.searchParams.get('active');
    const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100);
    const offset = Number(url.searchParams.get('offset') || '0');

    const filters: string[] = [];
    const values: unknown[] = [];

    if (q) {
      values.push(`%${q}%`);
      filters.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }

    if (active === 'true' || active === 'false') {
      values.push(active === 'true');
      filters.push(`active = $${values.length}`);
    } else {
      // default: only active specials and within date window
      filters.push('(active = true AND start_date <= current_date AND end_date >= current_date)');
    }

    let where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    values.push(limit);
    values.push(offset);

    const sql = `
      SELECT id, title, description, price_bwp, original_price_bwp, savings_bwp, image_url, start_date, end_date, active
      FROM specials
      ${where}
      ORDER BY start_date DESC, id DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const dbRes = await query(sql, values);
    const res = NextResponse.json({ data: dbRes.rows }, { status: 200 });
    setSecurityHeaders(res);
    // Public route: allow caching short-term
    res.headers.set('Cache-Control', 'public, max-age=60');
    return res;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('/api/specials GET error', err);
    const res = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return setSecurityHeaders(res);
  }
}

/**
 * POST /api/specials
 * Protected: requires valid JWT with role admin or editor.
 * Payload (JSON): title, description, price_bwp, original_price_bwp, image_url, start_date, end_date
 */
export async function POST(req: Request) {
  try {
    rateLimit(req);

    const payload = verifyJWTFromRequest(req);
    requireRole(payload, ['admin', 'editor']);

    const body = await req.json();
    const sanitized = sanitizeInput(body);

    const { title, description, price_bwp, original_price_bwp, image_url, start_date, end_date } = sanitized;

    if (!title || !price_bwp) {
      const res = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return setSecurityHeaders(res);
    }

    const sql = `
      INSERT INTO specials (title, description, price_bwp, original_price_bwp, image_url, start_date, end_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, title, description, price_bwp, original_price_bwp, savings_bwp, image_url, start_date, end_date, active
    `;
    const dbRes = await query(sql, [
      title,
      description || null,
      Number(price_bwp),
      original_price_bwp ? Number(original_price_bwp) : null,
      image_url || null,
      start_date || null,
      end_date || null,
      payload.sub,
    ]);

    const res = NextResponse.json({ data: dbRes.rows[0] }, { status: 201 });
    setSecurityHeaders(res);
    return res;
  } catch (err: any) {
    if (err?.status) return err; // Already a NextResponse thrown by middleware helpers
    // eslint-disable-next-line no-console
    console.error('/api/specials POST error', err);
    const res = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return setSecurityHeaders(res);
  }
}
