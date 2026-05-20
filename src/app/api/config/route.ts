// src/app/api/config/route.ts
// Public config endpoint — returns non-sensitive company configuration.
// Used by the frontend to dynamically render divisions, branding, etc.
import { NextResponse } from 'next/server';
import { getAllConfig, getDivisions, getReportConfigs, getGoogleLocations, isSetupComplete } from '@/lib/config-service';

export async function GET() {
  try {
    const [config, divisions, reports, locations, setupDone] = await Promise.all([
      getAllConfig(false),
      getDivisions(true),
      getReportConfigs(),
      getGoogleLocations(),
      isSetupComplete(),
    ]);

    return NextResponse.json({
      success: true,
      setupComplete: setupDone,
      company: {
        name: config.company_name || 'KPI Dashboard',
        logoUrl: config.company_logo_url || '',
        timezone: config.timezone || 'America/Chicago',
      },
      divisions,
      reports: reports.filter(r => r.isActive),
      googleLocations: locations,
    });
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
