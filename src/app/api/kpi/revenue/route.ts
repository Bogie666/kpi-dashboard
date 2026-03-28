// src/app/api/kpi/revenue/route.ts
// Revenue by Department API endpoint for the revenue widget
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=60',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Map period param to DB period_type and previous period
function resolvePeriod(period: string) {
  switch (period) {
    case 'qtd': return { periodType: 'ytd', previousPeriodType: 'last_month', label: 'QTD' };
    case 'ytd': return { periodType: 'ytd', previousPeriodType: 'last_month', label: 'YTD' };
    case 'last30': return { periodType: 'mtd', previousPeriodType: 'last_month', label: 'Last 30 Days' };
    case 'mtd':
    default: return { periodType: 'mtd', previousPeriodType: 'last_month', label: 'MTD' };
  }
}

// Build target lookup from performance_targets table (same source as main dashboard)
async function getTargetsForPeriod(pool: any, period: string): Promise<Record<string, number>> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (period === 'ytd' || period === 'qtd') {
    // Sum monthly targets from January (or quarter start) through current month
    const startMonth = period === 'qtd' ? Math.floor((currentMonth - 1) / 3) * 3 + 1 : 1;
    const result = await pool.query(`
      SELECT department, SUM(target_value) as total_target
      FROM performance_targets
      WHERE target_category = 'financial'
        AND target_month >= $1 AND target_month <= $2
        AND target_year = $3
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      GROUP BY department
    `, [startMonth, currentMonth, currentYear]);

    const targets: Record<string, number> = {};
    for (const row of result.rows) {
      if (row.department) targets[row.department] = Number(row.total_target);
    }
    return targets;
  }

  if (period === 'last30') {
    // Use previous month's target
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const result = await pool.query(`
      SELECT department, target_value
      FROM performance_targets
      WHERE target_category = 'financial'
        AND target_month = $1
        AND target_year = $2
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    `, [lastMonth, lastMonthYear]);

    const targets: Record<string, number> = {};
    for (const row of result.rows) {
      if (row.department) targets[row.department] = Number(row.target_value);
    }
    return targets;
  }

  // MTD (default) - current month target
  const result = await pool.query(`
    SELECT department, target_value
    FROM performance_targets
    WHERE target_category = 'financial'
      AND target_month = $1
      AND target_year = $2
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  `, [currentMonth, currentYear]);

  const targets: Record<string, number> = {};
  for (const row of result.rows) {
    if (row.department) targets[row.department] = Number(row.target_value);
  }
  return targets;
}

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503, headers: corsHeaders });
    }

    const params = request.nextUrl.searchParams;
    const period = params.get('period') || 'mtd';
    const location = params.get('location') || 'lex';
    const { periodType, previousPeriodType } = resolvePeriod(period);

    // Fetch current period department revenue
    const currentQuery = `
      SELECT
        department_name,
        COALESCE(total_revenue_cents, 0) as revenue_cents,
        COALESCE(invoiced_revenue_cents, 0) as invoiced_cents,
        COALESCE(completed_revenue_cents, 0) as completed_cents,
        updated_at
      FROM financial_performance
      WHERE period_type = $1
      ORDER BY total_revenue_cents DESC
    `;

    // Fetch previous period for comparison
    const prevQuery = `
      SELECT
        department_name,
        COALESCE(total_revenue_cents, 0) as revenue_cents
      FROM financial_performance
      WHERE period_type = $1
    `;

    const [currentResult, prevResult, targetMap] = await Promise.all([
      pool.query(currentQuery, [periodType]),
      pool.query(prevQuery, [previousPeriodType]),
      getTargetsForPeriod(pool, period),
    ]);

    // Build previous period lookup
    const prevMap: Record<string, number> = {};
    for (const row of prevResult.rows) {
      prevMap[row.department_name] = Math.round(Number(row.revenue_cents) / 100);
    }

    // Normalize department name to ID
    function deptId(name: string): string {
      const n = name.toLowerCase();
      if (n.includes('hvac') || n.includes('heating') || n.includes('cooling') || n.includes('air')) return 'hvac';
      if (n.includes('plumb')) return 'plumbing';
      if (n.includes('electr')) return 'electrical';
      if (n.includes('commercial')) return 'commercial';
      return n.replace(/[^a-z0-9]/g, '_');
    }

    let totalRevenue = 0;
    let totalTarget = 0;
    let totalPrev = 0;

    const departments = currentResult.rows.map(row => {
      const revenue = Math.round(Number(row.revenue_cents) / 100);
      const id = deptId(row.department_name);
      const target = targetMap[row.department_name] || targetMap[id] || targetMap[row.department_name.toLowerCase()] || 0;
      const previousPeriod = prevMap[row.department_name] || 0;
      totalRevenue += revenue;
      totalTarget += target;
      totalPrev += previousPeriod;

      return {
        id,
        name: row.department_name,
        revenue,
        target,
        previousPeriod,
      };
    });

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const periodLabel = period === 'mtd' ? `MTD ${months[new Date().getMonth()]}` :
                        period === 'ytd' ? `YTD ${new Date().getFullYear()}` :
                        period === 'qtd' ? `QTD Q${Math.ceil((new Date().getMonth() + 1) / 3)}` :
                        'Last 30 Days';

    return NextResponse.json({
      success: true,
      period: periodLabel,
      location,
      asOf: new Date().toISOString(),
      departments,
      total: {
        revenue: totalRevenue,
        target: totalTarget,
        previousPeriod: totalPrev,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Revenue API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
