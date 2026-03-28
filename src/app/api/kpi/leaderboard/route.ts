// src/app/api/kpi/leaderboard/route.ts
// Tech Leaderboard API — proxies the same dashboard_api endpoints used by Top Performers page
import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=60',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const DASHBOARD_API = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/dashboard_api';

// Same department definitions as TopPerformersDashboard
const DEPARTMENTS: Record<string, { endpoint: string; label: string; shortLabel: string; sortField: string; revenueField: string; metricType: string }> = {
  comfort_advisor: { endpoint: 'comfort-advisors', label: 'Comfort Advisors', shortLabel: 'Sales', sortField: 'sales', revenueField: 'sales', metricType: 'revenue' },
  hvac_tech: { endpoint: 'hvac-tech', label: 'HVAC Tech', shortLabel: 'Service', sortField: 'totalSales', revenueField: 'totalSales', metricType: 'revenue' },
  hvac_maintenance: { endpoint: 'hvac-maintenance', label: 'HVAC Maintenance', shortLabel: 'Maint', sortField: 'totalSales', revenueField: 'totalSales', metricType: 'revenue' },
  plumbing: { endpoint: 'plumbing', label: 'Plumbing', shortLabel: 'Plumbing', sortField: 'totalSales', revenueField: 'totalSales', metricType: 'revenue' },
  electrical: { endpoint: 'electrical', label: 'Electrical', shortLabel: 'Electrical', sortField: 'totalSales', revenueField: 'totalSales', metricType: 'revenue' },
  call_center: { endpoint: 'call-center', label: 'Call Center', shortLabel: 'Call Center', sortField: 'bookingPercent', revenueField: 'bookingPercent', metricType: 'booking_rate' },
};

function resolvePeriodType(period: string): string {
  switch (period) {
    case 'ytd': return 'ytd';
    case 'last_month': return 'last_month';
    case 'mtd':
    default: return 'mtd';
  }
}

interface DashboardTech {
  name: string;
  businessUnit?: string;
  trade?: string;
  completedJobs?: number;
  totalSales?: number;
  sales?: number;
  closeRatePercent?: number;
  closingPercent?: number;
  bookingPercent?: number;
  coolClubMemberships?: number;
  totalCalls?: number;
  opportunities?: number;
  jobs?: number;
  department?: string;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const period = params.get('period') || 'mtd';
    const limit = Math.min(Math.max(parseInt(params.get('limit') || '5'), 1), 20);
    const dept = params.get('dept') || 'all';
    const mode = params.get('mode') || 'combined'; // 'combined' or 'top_per_dept'
    const periodType = resolvePeriodType(period);

    // Determine which departments to fetch
    const deptsToFetch = dept === 'all'
      ? Object.entries(DEPARTMENTS)
      : Object.entries(DEPARTMENTS).filter(([key]) => key === dept);

    if (deptsToFetch.length === 0) {
      return NextResponse.json({ success: true, period, technicians: [] }, { headers: corsHeaders });
    }

    // Fetch from the same dashboard_api endpoints as TopPerformersDashboard
    const fetchResults = await Promise.all(
      deptsToFetch.map(async ([deptKey, config]) => {
        try {
          const res = await fetch(`${DASHBOARD_API}/${config.endpoint}/${periodType}`);
          if (!res.ok) return { deptKey, data: [] };
          const json = await res.json();
          return { deptKey, data: (json.data || []) as DashboardTech[] };
        } catch {
          return { deptKey, data: [] };
        }
      })
    );

    let technicians;

    if (mode === 'top_per_dept') {
      // Return the #1 performer from each department
      technicians = fetchResults.map(({ deptKey, data }, index) => {
        const config = DEPARTMENTS[deptKey];
        if (data.length === 0) return null;

        // Sort by department's sort field descending
        const sorted = [...data].sort((a, b) => {
          const aVal = Number((a as unknown as Record<string, unknown>)[config.sortField] || 0);
          const bVal = Number((b as unknown as Record<string, unknown>)[config.sortField] || 0);
          return bVal - aVal;
        });

        const tech = sorted[0];
        const name = tech.name || 'Unknown';
        const nameParts = name.trim().split(/\s+/);
        const displayName = nameParts.length > 1
          ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
          : nameParts[0];

        const primaryValue = Number((tech as unknown as Record<string, unknown>)[config.revenueField] || 0);
        const closeRate = Math.round(Number(tech.closeRatePercent || tech.closingPercent || 0));
        const jobs = Number(tech.completedJobs || tech.jobs || 0);

        return {
          rank: index + 1,
          name: displayName,
          fullName: name,
          department: deptKey,
          departmentLabel: config.shortLabel,
          metricType: config.metricType,
          revenue: config.metricType === 'revenue' ? Math.round(primaryValue) : 0,
          bookingRate: config.metricType === 'booking_rate' ? Number(primaryValue.toFixed(1)) : 0,
          closeRate,
          jobsCompleted: jobs,
          totalCalls: Number(tech.totalCalls || 0),
          memberships: Number(tech.coolClubMemberships || 0),
          trend: 'flat' as const,
          revenueHistory: config.metricType === 'revenue' ? [primaryValue] : [],
        };
      }).filter(Boolean);
    } else {
      // Original combined mode: merge all techs, sort by revenue, take top N
      const allTechs: { tech: DashboardTech; deptKey: string; revenue: number }[] = [];

      for (const { deptKey, data } of fetchResults) {
        const config = DEPARTMENTS[deptKey];
        if (config.metricType !== 'revenue') continue; // skip non-revenue depts in combined mode
        for (const tech of data) {
          const revenue = Number((tech as unknown as Record<string, unknown>)[config.revenueField] || 0);
          allTechs.push({ tech, deptKey, revenue });
        }
      }

      allTechs.sort((a, b) => b.revenue - a.revenue);
      const topN = allTechs.slice(0, limit);

      technicians = topN.map((item, index) => {
        const { tech, deptKey, revenue } = item;
        const name = tech.name || 'Unknown';
        const nameParts = name.trim().split(/\s+/);
        const displayName = nameParts.length > 1
          ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
          : nameParts[0];

        const closeRate = Math.round(Number(tech.closeRatePercent || tech.closingPercent || 0));
        const jobs = Number(tech.completedJobs || tech.jobs || 0);

        return {
          rank: index + 1,
          name: displayName,
          fullName: name,
          department: deptKey,
          departmentLabel: DEPARTMENTS[deptKey].shortLabel,
          metricType: 'revenue',
          revenue: Math.round(revenue),
          bookingRate: 0,
          closeRate,
          jobsCompleted: jobs,
          totalCalls: 0,
          memberships: 0,
          trend: 'flat' as const,
          revenueHistory: [revenue],
        };
      });
    }

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const periodLabel = period === 'mtd' ? `MTD ${months[new Date().getMonth()]}` :
                        period === 'ytd' ? `YTD ${new Date().getFullYear()}` :
                        period === 'last_month' ? 'Last Month' :
                        period;

    return NextResponse.json({
      success: true,
      period: periodLabel,
      asOf: new Date().toISOString(),
      technicians,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
