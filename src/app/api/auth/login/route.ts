import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/encryption';
import crypto from 'crypto';

interface LoginRequest {
  email: string;
  password: string;
}

interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

// Generate a session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find user
    const userResult = await query<User>(
      `SELECT id, tenant_id, email, password_hash, name, role
       FROM tenant_users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Verify password
    if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get tenant info
    const tenantResult = await query<Tenant>(
      'SELECT id, name, slug FROM tenants WHERE id = $1',
      [user.tenant_id]
    );

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Account configuration error' },
        { status: 500 }
      );
    }

    const tenant = tenantResult.rows[0];

    // Update last login
    await query(
      'UPDATE tenant_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate session token
    const sessionToken = generateSessionToken();

    // In a production app, you would store this token in a sessions table
    // and set it as an HTTP-only cookie. For now, we'll return it directly.

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      token: sessionToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
