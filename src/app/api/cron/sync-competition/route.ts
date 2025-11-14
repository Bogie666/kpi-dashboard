/**
 * Vercel Cron Job - Sync Competition Data
 * Runs every hour to update leaderboard with latest data from:
 * - ServiceTitan (UV Lights, Sold Flips)
 * - Google Business (Reviews)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'kpi_dashboard',
});

interface Competition {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export async function GET(request: NextRequest) {
  // Verify this is coming from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔄 Starting competition sync...');

    // 1. Get active competitions
    const competitionsResult = await pool.query(
      `SELECT id, name, start_date, end_date, status
       FROM competitions
       WHERE status = 'active'`
    );

    const activeCompetitions: Competition[] = competitionsResult.rows;

    if (activeCompetitions.length === 0) {
      console.log('ℹ️ No active competitions found');
      return NextResponse.json({
        success: true,
        message: 'No active competitions to sync',
        synced: 0
      });
    }

    console.log(`📊 Found ${activeCompetitions.length} active competition(s)`);

    const syncResults = [];

    // 2. Sync each competition
    for (const competition of activeCompetitions) {
      try {
        console.log(`\n🏆 Syncing: ${competition.name}`);

        // Fetch UV Lights from ServiceTitan
        const uvLightsData = await fetchUVLights(
          competition.start_date,
          competition.end_date
        );

        // Fetch Sold Flips from ServiceTitan (if configured)
        const soldFlipsData = await fetchSoldFlips(
          competition.start_date,
          competition.end_date
        );

        // Fetch Google Reviews
        const reviewsData = await fetchGoogleReviews(
          competition.start_date,
          competition.end_date
        );

        // Combine all data by technician
        const combinedData = combineMetrics(uvLightsData, soldFlipsData, reviewsData);

        // Update leaderboard
        const updateCount = await updateLeaderboard(competition.id, combinedData);

        // Log the sync
        await pool.query(
          `INSERT INTO competition_sync_log
           (competition_id, sync_type, techs_updated, uv_lights_synced, sold_flips_synced, reviews_synced, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            competition.id,
            'scheduled',
            updateCount,
            Object.keys(uvLightsData).length > 0,
            Object.keys(soldFlipsData).length > 0,
            Object.keys(reviewsData).length > 0,
            'success'
          ]
        );

        syncResults.push({
          competition: competition.name,
          techniciansUpdated: updateCount,
          success: true
        });

        console.log(`✅ Updated ${updateCount} technicians for ${competition.name}`);

      } catch (error) {
        console.error(`❌ Error syncing ${competition.name}:`, error);

        // Log the error
        await pool.query(
          `INSERT INTO competition_sync_log
           (competition_id, sync_type, status, error_message)
           VALUES ($1, $2, $3, $4)`,
          [competition.id, 'scheduled', 'error', error.message]
        );

        syncResults.push({
          competition: competition.name,
          success: false,
          error: error.message
        });
      }
    }

    console.log('\n✅ Competition sync completed');

    return NextResponse.json({
      success: true,
      message: 'Competition sync completed',
      results: syncResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Fatal error in competition sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch UV Light sales from ServiceTitan
 */
async function fetchUVLights(startDate: string, endDate: string): Promise<Record<string, number>> {
  try {
    // Call your ServiceTitan API
    const response = await fetch(
      `${process.env.SERVICETITAN_SYNC_URL}/uv-lights?from=${startDate}&to=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SERVICETITAN_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      console.warn('⚠️ ServiceTitan UV Lights fetch failed:', response.status);
      return {};
    }

    const data = await response.json();
    return data.data || {};

  } catch (error) {
    console.error('Error fetching UV lights:', error);
    return {};
  }
}

/**
 * Fetch Sold Flips from ServiceTitan
 */
async function fetchSoldFlips(startDate: string, endDate: string): Promise<Record<string, number>> {
  try {
    // TODO: Implement when sold flips report is configured
    console.log('ℹ️ Sold Flips not yet configured');
    return {};

  } catch (error) {
    console.error('Error fetching sold flips:', error);
    return {};
  }
}

/**
 * Fetch Google Reviews
 */
async function fetchGoogleReviews(startDate: string, endDate: string): Promise<Record<string, number>> {
  try {
    // Call your Google Reviews API (from /sosh project)
    const response = await fetch(
      `${process.env.GOOGLE_REVIEWS_API_URL}?startDate=${startDate}&endDate=${endDate}`
    );

    if (!response.ok) {
      console.warn('⚠️ Google Reviews fetch failed:', response.status);
      return {};
    }

    const data = await response.json();

    // Process reviews to count by technician
    // This depends on how you attribute reviews to techs
    // For now, returning empty - you'll need to implement this
    return {};

  } catch (error) {
    console.error('Error fetching Google reviews:', error);
    return {};
  }
}

/**
 * Combine metrics from different sources
 */
function combineMetrics(
  uvLights: Record<string, number>,
  soldFlips: Record<string, number>,
  reviews: Record<string, number>
): Record<string, { soldFlips: number; uvLights: number; reviews: number; totalPoints: number }> {

  const allTechs = new Set([
    ...Object.keys(uvLights),
    ...Object.keys(soldFlips),
    ...Object.keys(reviews)
  ]);

  const combined: Record<string, any> = {};

  for (const tech of allTechs) {
    const flips = soldFlips[tech] || 0;
    const lights = uvLights[tech] || 0;
    const revs = reviews[tech] || 0;

    combined[tech] = {
      soldFlips: flips,
      uvLights: lights,
      reviews: revs,
      totalPoints: (flips * 10) + (lights * 5) + (revs * 8)
    };
  }

  return combined;
}

/**
 * Update leaderboard in database
 */
async function updateLeaderboard(
  competitionId: number,
  data: Record<string, { soldFlips: number; uvLights: number; reviews: number; totalPoints: number }>
): Promise<number> {

  let updateCount = 0;

  for (const [techName, metrics] of Object.entries(data)) {
    try {
      // Upsert leaderboard entry
      await pool.query(
        `INSERT INTO competition_leaderboard
         (competition_id, technician_name, sold_flips, uv_lights, reviews, total_points, last_synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (competition_id, technician_name)
         DO UPDATE SET
           sold_flips = EXCLUDED.sold_flips,
           uv_lights = EXCLUDED.uv_lights,
           reviews = EXCLUDED.reviews,
           total_points = EXCLUDED.total_points,
           previous_rank = competition_leaderboard.rank,
           last_synced_at = NOW()`,
        [
          competitionId,
          techName,
          metrics.soldFlips,
          metrics.uvLights,
          metrics.reviews,
          metrics.totalPoints
        ]
      );

      updateCount++;

    } catch (error) {
      console.error(`Error updating ${techName}:`, error);
    }
  }

  // Update ranks
  await pool.query(
    `UPDATE competition_leaderboard cl
     SET rank = ranked.new_rank
     FROM (
       SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC, updated_at ASC) as new_rank
       FROM competition_leaderboard
       WHERE competition_id = $1
     ) ranked
     WHERE cl.id = ranked.id`,
    [competitionId]
  );

  return updateCount;
}
