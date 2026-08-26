import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sanitizeInput, rateLimit, verifyJWTFromRequest, requireRole, setSecurityHeaders } from '@/middleware/security';

/**
 * POST /api/supplier-inquiries
 * Public endpoint: receive supplier inquiry submissions from the public site.
 */
export async function POST(req: Request) {
  try {
    rateLimit(req);
    const body = await req.json();
    const sanitized = sanitizeInput(body);
    const { company_name, contact_name, contact_email, contact_phone, message } = sanitized;

    if (!company_name || !contact_email || !message) {
      const res = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return setSecurityHeaders(res);
    }

    const sql = `
      INSERT INTO supplier_inquiries (company_name, contact_name, contact_email, contact_phone, message, sanitized)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, company_name, contact_name, contact_email, contact_phone, message, received_at
    `;
    const dbRes = await query(sql, [company_name, contact_name || null, contact_email, contact_phone || null, message, true]);

    const res = NextResponse.json({ data: dbRes.rows[0] }, { status: 201 });
    setSecurityHeaders(res);
    return res;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('/api/supplier-inquiries POST error', err);
    const res = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return setSecurityHeaders(res);
  }
}

/**
 * GET /api/supplier-inquiries
 * Protected: Admin only to list inquiries.
 */
export async function GET(req: Request) {
  try {
    rateLimit(req);
    const payload = verifyJWTFromRequest(req);
    requireRole(payload, ['admin', 'editor']);

    const sql = `SELECT id, company_name, contact_name, contact_email, contact_phone, message, received_at FROM supplier_inquiries ORDER BY received_at DESC LIMIT 200`;
    const dbRes = await query(sql);
    const res = NextResponse.json({ data: dbRes.rows }, { status: 200 });
    setSecurityHeaders(res);
    return res;
  } catch (err: any) {
    if (err?.status) return err;
    // eslint-disable-next-line no-console
    console.error('/api/supplier-inquiries GET error', err);
    const res = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return setSecurityHeaders(res);
  }
}
