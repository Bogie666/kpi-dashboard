// src/app/api/setup/route.ts
// Setup wizard API — handles reading/writing all config during initial setup.
// Each step saves its data independently so progress is preserved.
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllConfig, setConfig, setConfigs, getSetupStep, logSetupStep,
  getDivisions, createDivision, updateDivision, deleteDivision,
  getBusinessUnits, saveBusinessUnits,
  getReportConfigs, updateReportConfig,
  getGoogleLocations, saveGoogleLocation,
} from '@/lib/config-service';

export async function GET(request: NextRequest) {
  try {
    const step = request.nextUrl.searchParams.get('step');

    if (step === 'status') {
      const config = await getAllConfig(false);
      const currentStep = await getSetupStep();
      return NextResponse.json({
        success: true,
        currentStep,
        setupCompleted: config.setup_completed === 'true',
      });
    }

    if (step === '1') {
      const config = await getAllConfig(false);
      return NextResponse.json({
        success: true,
        data: {
          companyName: config.company_name || '',
          logoUrl: config.company_logo_url || '',
          timezone: config.timezone || 'America/Chicago',
        },
      });
    }

    if (step === '2') {
      // Return non-sensitive ST config status (connected or not, not the actual keys)
      const config = await getAllConfig(true);
      return NextResponse.json({
        success: true,
        data: {
          tenantId: config.servicetitan_tenant_id || '',
          hasClientId: !!config.servicetitan_client_id,
          hasClientSecret: !!config.servicetitan_client_secret,
          hasAppKey: !!config.servicetitan_app_key,
        },
      });
    }

    if (step === '3') {
      const [divisions, businessUnits] = await Promise.all([
        getDivisions(false),
        getBusinessUnits(),
      ]);
      return NextResponse.json({ success: true, data: { divisions, businessUnits } });
    }

    if (step === '4') {
      const reports = await getReportConfigs();
      return NextResponse.json({ success: true, data: { reports } });
    }

    if (step === '5') {
      const locations = await getGoogleLocations();
      const config = await getAllConfig(false);
      return NextResponse.json({
        success: true,
        data: {
          locations,
          hasGoogleCredentials: !!(config.google_client_id),
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid step' }, { status: 400 });
  } catch (error) {
    console.error('Setup GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, data } = body;

    if (step === 1) {
      await setConfigs({
        company_name: data.companyName || '',
        company_logo_url: data.logoUrl || '',
        timezone: data.timezone || 'America/Chicago',
      });
      await setConfig('setup_step', '2');
      await logSetupStep(1, 'company_basics', 'completed', data);
      return NextResponse.json({ success: true });
    }

    if (step === 2) {
      await setConfigs({
        servicetitan_tenant_id: data.tenantId || '',
        servicetitan_client_id: data.clientId || '',
        servicetitan_client_secret: data.clientSecret || '',
        servicetitan_app_key: data.appKey || '',
      });
      await setConfig('setup_step', '3');
      await logSetupStep(2, 'servicetitan_connection', 'completed');
      return NextResponse.json({ success: true });
    }

    if (step === 3) {
      // Save divisions and business unit mappings
      if (data.divisions) {
        for (const div of data.divisions) {
          if (div.id && div._delete) {
            await deleteDivision(div.id);
          } else if (div.id) {
            await updateDivision(div.id, div);
          } else {
            await createDivision({
              name: div.name,
              slug: div.slug,
              icon: div.icon || 'building',
              color: div.color || '#3B82F6',
              displayOrder: div.displayOrder || 0,
              isActive: div.isActive !== false,
              hasTechnicians: div.hasTechnicians !== false,
              hasComfortAdvisors: div.hasComfortAdvisors || false,
            });
          }
        }
      }
      if (data.businessUnits) {
        await saveBusinessUnits(data.businessUnits);
      }
      await setConfig('setup_step', '4');
      await logSetupStep(3, 'divisions_mapping', 'completed');
      return NextResponse.json({ success: true });
    }

    if (step === 4) {
      if (data.reports) {
        for (const report of data.reports) {
          await updateReportConfig(report.reportKey, {
            servicetitanReportId: report.servicetitanReportId,
            isActive: report.isActive,
            divisionId: report.divisionId,
            businessUnitIds: report.businessUnitIds,
          });
        }
      }
      await setConfig('setup_step', '5');
      await logSetupStep(4, 'report_config', 'completed');
      return NextResponse.json({ success: true });
    }

    if (step === 5) {
      if (data.googleClientId) {
        await setConfigs({
          google_client_id: data.googleClientId,
          google_client_secret: data.googleClientSecret || '',
          google_refresh_token: data.googleRefreshToken || '',
        });
      }
      if (data.locations) {
        for (const loc of data.locations) {
          await saveGoogleLocation(loc);
        }
      }
      await setConfig('setup_completed', 'true');
      await setConfig('setup_step', '5');
      await logSetupStep(5, 'google_reviews', 'completed');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid step' }, { status: 400 });
  } catch (error) {
    console.error('Setup POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
