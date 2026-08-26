import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sanitizeInput, rateLimit, setSecurityHeaders } from '@/middleware/security';

/**
 * GET /api/stores
 * Query params:
 * - city (string)
 * - format (Hyper | Shopper | Cash & Carry)
 * - q (search by name/address)
 * - limit, offset
 */
export async function GET(req: Request) {
  try {
    rateLimit(req);

    const url = new URL(req.url);
    const city = url.searchParams.get('city');
    const format = url.searchParams.get('format');
    const q = url.searchParams.get('q') || '';
    const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 100);
    const offset = Number(url.searchParams.get('offset') || '0');

    const filters: string[] = [];
    const values: unknown[] = [];

    if (city) {
      values.push(city);
      filters.push(`city = $${values.length}`);
    }
    if (format) {
      values.push(format);
      filters.push(`format ILIKE $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      filters.push(`(name ILIKE $${values.length} OR address ILIKE $${values.length})`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    values.push(limit);
    values.push(offset);

    const sql = `
      SELECT id, name, format, address, city, latitude, longitude, phone, is_open
      FROM stores
      ${where}
      ORDER BY city, name
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const dbRes = await query(sql, values);
    const sanitizedRows = sanitizeInput(dbRes.rows);

    const res = NextResponse.json({ data: sanitizedRows }, { status: 200 });
    setSecurityHeaders(res);
    // Cache store locator short-term
    res.headers.set('Cache-Control', 'public, max-age=120');
    return res;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('/api/stores GET error', err);
    const res = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return setSecurityHeaders(res);
  }
}
