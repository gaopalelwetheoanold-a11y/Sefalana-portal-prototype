import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { sanitizeInput, rateLimit, setSecurityHeaders } from '@/middleware/security';

const JWT_SECRET = process.env.JWT_SECRET || 'replace_me_change_in_production';
const TOKEN_EXPIRES_IN = '4h';

export async function POST(req: Request) {
  try {
    // Apply basic rate limiting
    rateLimit(req);

    const body = await req.json();
    const { email, password } = sanitizeInput(body);

    if (!email || !password) {
      const res = NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
      return setSecurityHeaders(res);
    }

    const sql = 'SELECT id, email, password_hash, full_name, role FROM admin_users WHERE email = $1 LIMIT 1';
    const dbRes = await query(sql, [email]);
    if (dbRes.rowCount === 0) {
      const res = NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      return setSecurityHeaders(res);
    }

    const user = dbRes.rows[0] as { id: number; email: string; password_hash: string; full_name: string; role: string };

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const res = NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      return setSecurityHeaders(res);
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.full_name }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRES_IN,
    });

    const res = NextResponse.json(
      {
        user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    const secure = process.env.NODE_ENV === 'production';
    const cookieParts = [
      `token=${encodeURIComponent(token)}`,
      'HttpOnly',
      'Path=/',
      `Max-Age=${4 * 60 * 60}`, // 4 hours
      'SameSite=Lax',
    ];
    if (secure) cookieParts.push('Secure');

    res.headers.set('Set-Cookie', cookieParts.join('; '));
    setSecurityHeaders(res);
    return res;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('auth/login error', err);
    const res = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return setSecurityHeaders(res);
  }
}
