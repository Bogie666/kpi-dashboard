// src/app/api/kpi/coolclub/route.ts
// Cool Club Membership Counter API endpoint
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

const GOALS: Record<string, number> = {
  lex: 5000,
  'lex-etx': 500,
};

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    if (!pool) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503, headers: corsHeaders });
    }

    const params = request.nextUrl.searchParams;
    const location = params.get('location') || 'lex';

    // Query membership_performance for Cool Club / maintenance membership data
    // The membership_performance table stores membership types with metrics
    const mtdQuery = `
      SELECT
        membership_name,
        COALESCE(active_at_start, 0) as active_at_start,
        COALESCE(active_at_end, 0) as active_at_end,
        COALESCE(new_sales, 0) as new_sales,
        COALESCE(canceled, 0) as canceled,
        COALESCE(suspended, 0) as suspended,
        COALESCE(net_growth, 0) as net_growth,
        COALESCE(memberships_lost, 0) as memberships_lost,
        COALESCE(reactivated, 0) as reactivated
      FROM membership_performance
      WHERE period_type = 'mtd'
      ORDER BY membership_name
    `;

    // Also get last_month data for comparison/history
    const lastMonthQuery = `
      SELECT
        membership_name,
        COALESCE(active_at_end, 0) as active_at_end,
        COALESCE(new_sales, 0) as new_sales
      FROM membership_performance
      WHERE period_type = 'last_month'
      ORDER BY membership_name
    `;

    const [mtdResult, lastMonthResult] = await Promise.all([
      pool.query(mtdQuery),
      pool.query(lastMonthQuery),
    ]);

    // Aggregate across all membership types (Cool Club is the main one)
    // Look for "Cool Club" or similar membership names, or aggregate all
    let activeMembers = 0;
    let newThisMonth = 0;
    let churnThisMonth = 0;
    let netGrowthThisMonth = 0;

    for (const row of mtdResult.rows) {
      activeMembers += Number(row.active_at_end);
      newThisMonth += Number(row.new_sales);
      churnThisMonth += Number(row.memberships_lost);
      netGrowthThisMonth += Number(row.net_growth);
    }

    // Build a simple history from what we have
    let lastMonthActive = 0;
    for (const row of lastMonthResult.rows) {
      lastMonthActive += Number(row.active_at_end);
    }

    // Generate a 7-point history approximation
    // We have current and last month; interpolate backwards
    const currentActive = activeMembers || lastMonthActive;
    const monthlyGrowth = netGrowthThisMonth || Math.round(currentActive * 0.01);
    const history: number[] = [];
    for (let i = 6; i >= 0; i--) {
      history.push(Math.max(0, Math.round(currentActive - monthlyGrowth * i)));
    }

    // Estimate weekly from monthly
    const newThisWeek = Math.round(newThisMonth / 4);

    return NextResponse.json({
      success: true,
      location,
      asOf: new Date().toISOString(),
      activeMembers,
      goal: GOALS[location] || 5000,
      newThisMonth,
      newThisWeek,
      churnThisMonth,
      netGrowthThisMonth,
      history,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Cool Club API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
