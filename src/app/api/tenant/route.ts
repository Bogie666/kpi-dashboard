import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { hashPassword } from '@/lib/encryption';

interface CreateTenantRequest {
  companyName: string;
  email: string;
  password: string;
  name: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  subscription_tier: string;
  created_at: string;
}

interface TenantUser {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: string;
}

// Generate URL-friendly slug from company name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 8);
}

// POST - Create new tenant (signup)
export async function POST(request: NextRequest) {
  try {
    const body: CreateTenantRequest = await request.json();
    const { companyName, email, password, name } = body;

    // Validate required fields
    if (!companyName || !email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await query<{ id: string }>(
      'SELECT id FROM tenant_users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create tenant and user in a transaction
    const result = await transaction(async (client) => {
      // Create tenant
      const slug = generateSlug(companyName);
      const tenantResult = await client.query<Tenant>(
        `INSERT INTO tenants (name, slug, subscription_tier, subscription_status)
         VALUES ($1, $2, 'free', 'active')
         RETURNING id, name, slug, logo_url, primary_color, subscription_tier, created_at`,
        [companyName, slug]
      );
      const tenant = tenantResult.rows[0];

      // Create owner user
      const passwordHash = hashPassword(password);
      const userResult = await client.query<TenantUser>(
        `INSERT INTO tenant_users (tenant_id, email, password_hash, name, role, email_verified)
         VALUES ($1, $2, $3, $4, 'owner', true)
         RETURNING id, tenant_id, email, name, role`,
        [tenant.id, email.toLowerCase(), passwordHash, name]
      );
      const user = userResult.rows[0];

      // Create default dashboard
      await client.query(
        `INSERT INTO tenant_dashboards (tenant_id, name, slug, is_default, created_by)
         VALUES ($1, 'Main Dashboard', 'main', true, $2)`,
        [tenant.id, user.id]
      );

      return { tenant, user };
    });

    return NextResponse.json({
      success: true,
      tenant: result.tenant,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

// GET - Get current tenant info (requires auth)
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401 }
      );
    }

    const result = await query<Tenant>(
      `SELECT id, name, slug, logo_url, primary_color, secondary_color,
              subscription_tier, subscription_status, settings, created_at
       FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tenant: result.rows[0] });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
}

// PATCH - Update tenant settings
export async function PATCH(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, logo_url, primary_color, secondary_color, settings } = body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramIndex++}`);
      values.push(logo_url);
    }
    if (primary_color !== undefined) {
      updates.push(`primary_color = $${paramIndex++}`);
      values.push(primary_color);
    }
    if (secondary_color !== undefined) {
      updates.push(`secondary_color = $${paramIndex++}`);
      values.push(secondary_color);
    }
    if (settings !== undefined) {
      updates.push(`settings = settings || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    values.push(tenantId);
    const result = await query<Tenant>(
      `UPDATE tenants SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING id, name, slug, logo_url, primary_color, secondary_color, settings`,
      values
    );

    return NextResponse.json({ tenant: result.rows[0] });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}
