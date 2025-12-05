import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';

interface CredentialsRequest {
  provider?: string;
  stTenantId: string;
  clientId: string;
  clientSecret: string;
}

interface Credentials {
  id: string;
  tenant_id: string;
  provider: string;
  st_tenant_id: string;
  connection_status: string;
  last_verified_at: string | null;
  last_error: string | null;
  created_at: string;
}

// Test ServiceTitan API connection
async function testServiceTitanConnection(
  stTenantId: string,
  clientId: string,
  clientSecret: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Request access token
    const tokenResponse = await fetch('https://auth.servicetitan.io/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return {
        success: false,
        error: `Authentication failed: ${tokenResponse.status} - ${error}`,
      };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Test API access by fetching tenant info
    const apiResponse = await fetch(
      `https://api.servicetitan.io/settings/v2/tenant/${stTenantId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'ST-App-Key': clientId,
        },
      }
    );

    if (!apiResponse.ok) {
      return {
        success: false,
        error: `API access failed: ${apiResponse.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

// POST - Save or update credentials
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401 }
      );
    }

    const body: CredentialsRequest = await request.json();
    const { provider = 'servicetitan', stTenantId, clientId, clientSecret } = body;

    // Validate required fields
    if (!stTenantId || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      );
    }

    // Test connection before saving
    const testResult = await testServiceTitanConnection(stTenantId, clientId, clientSecret);

    // Encrypt credentials
    const encryptedClientId = encrypt(clientId);
    const encryptedClientSecret = encrypt(clientSecret);

    // Upsert credentials
    const result = await query<Credentials>(
      `INSERT INTO api_credentials (
        tenant_id, provider, st_tenant_id,
        encrypted_client_id, encrypted_client_secret,
        connection_status, last_verified_at, last_error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tenant_id, provider) DO UPDATE SET
        st_tenant_id = EXCLUDED.st_tenant_id,
        encrypted_client_id = EXCLUDED.encrypted_client_id,
        encrypted_client_secret = EXCLUDED.encrypted_client_secret,
        connection_status = EXCLUDED.connection_status,
        last_verified_at = EXCLUDED.last_verified_at,
        last_error = EXCLUDED.last_error,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, tenant_id, provider, st_tenant_id, connection_status,
                last_verified_at, last_error, created_at`,
      [
        tenantId,
        provider,
        stTenantId,
        encryptedClientId,
        encryptedClientSecret,
        testResult.success ? 'connected' : 'error',
        testResult.success ? new Date().toISOString() : null,
        testResult.error || null,
      ]
    );

    return NextResponse.json({
      success: testResult.success,
      credentials: result.rows[0],
      error: testResult.error,
    });
  } catch (error) {
    console.error('Error saving credentials:', error);
    return NextResponse.json(
      { error: 'Failed to save credentials' },
      { status: 500 }
    );
  }
}

// GET - Get credentials status (not the actual secrets)
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401 }
      );
    }

    const result = await query<Credentials>(
      `SELECT id, tenant_id, provider, st_tenant_id, connection_status,
              last_verified_at, last_error, created_at
       FROM api_credentials WHERE tenant_id = $1`,
      [tenantId]
    );

    return NextResponse.json({ credentials: result.rows });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}

// PUT - Test existing credentials
export async function PUT(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401 }
      );
    }

    // Get stored credentials
    const credsResult = await query<{
      st_tenant_id: string;
      encrypted_client_id: string;
      encrypted_client_secret: string;
    }>(
      `SELECT st_tenant_id, encrypted_client_id, encrypted_client_secret
       FROM api_credentials WHERE tenant_id = $1 AND provider = 'servicetitan'`,
      [tenantId]
    );

    if (credsResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No credentials found' },
        { status: 404 }
      );
    }

    const creds = credsResult.rows[0];
    const clientId = decrypt(creds.encrypted_client_id);
    const clientSecret = decrypt(creds.encrypted_client_secret);

    // Test connection
    const testResult = await testServiceTitanConnection(
      creds.st_tenant_id,
      clientId,
      clientSecret
    );

    // Update status
    await query(
      `UPDATE api_credentials SET
        connection_status = $1,
        last_verified_at = $2,
        last_error = $3,
        updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = $4 AND provider = 'servicetitan'`,
      [
        testResult.success ? 'connected' : 'error',
        testResult.success ? new Date().toISOString() : null,
        testResult.error || null,
        tenantId,
      ]
    );

    return NextResponse.json({
      success: testResult.success,
      error: testResult.error,
    });
  } catch (error) {
    console.error('Error testing credentials:', error);
    return NextResponse.json(
      { error: 'Failed to test credentials' },
      { status: 500 }
    );
  }
}

// DELETE - Remove credentials
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'servicetitan';

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401 }
      );
    }

    await query(
      'DELETE FROM api_credentials WHERE tenant_id = $1 AND provider = $2',
      [tenantId, provider]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting credentials:', error);
    return NextResponse.json(
      { error: 'Failed to delete credentials' },
      { status: 500 }
    );
  }
}
