// src/lib/google-reviews-cache.ts
import { Pool } from 'pg';

// Only create pool if DATABASE_URL is configured
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;

export interface CachedReview {
  id: number;
  review_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  review_reply: string | null;
  location_name: string;
  location_id: string;
  account_id: string;
  review_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SyncStatus {
  last_sync_at: Date;
  total_reviews_synced: number;
  sync_status: string;
  error_message: string | null;
  location_stats: Record<string, number>;
  reported_totals?: Record<string, number>; // What Google reports as total (may be higher than fetched)
}

export interface ReviewData {
  id: string;
  name: string;
  rating: number;
  text: string;
  reply: string | null;
  locationName: string;
  locationId: string;
  accountId: string;
  date: string;
}

export class GoogleReviewsCacheService {
  /**
   * Get all cached reviews
   */
  async getCachedReviews(): Promise<{ reviews: ReviewData[], locationStats: Record<string, number> }> {
    if (!pool) {
      console.warn('⚠️ DATABASE_URL not configured - returning empty reviews');
      return { reviews: [], locationStats: {} };
    }

    const client = await pool.connect();

    try {
      // Get all reviews
      const reviewsResult = await client.query(`
        SELECT
          review_id as id,
          reviewer_name as name,
          rating,
          review_text as text,
          review_reply as reply,
          location_name as "locationName",
          location_id as "locationId",
          account_id as "accountId",
          review_date as date
        FROM google_reviews_cache
        ORDER BY review_date DESC
      `);

      // Get location stats
      const statsResult = await client.query(`
        SELECT
          location_id,
          COUNT(*) as count
        FROM google_reviews_cache
        GROUP BY location_id
      `);

      const locationStats: Record<string, number> = {};
      statsResult.rows.forEach(row => {
        locationStats[row.location_id] = parseInt(row.count);
      });

      return {
        reviews: reviewsResult.rows,
        locationStats
      };
    } finally {
      client.release();
    }
  }

  /**
   * Sync reviews from Google API to cache
   * @param force - If true, skip the validation check and always sync
   * @param reportedTotals - What Google reports as total counts (may be higher than fetched due to API limitations)
   */
  async syncReviews(reviews: ReviewData[], locationStats: Record<string, number>, force: boolean = false, reportedTotals?: Record<string, number>): Promise<{ skipped: boolean; reason?: string; previousCount?: number }> {
    if (!pool) {
      console.warn('⚠️ DATABASE_URL not configured - skipping sync');
      return { skipped: true, reason: 'DATABASE_URL not configured' };
    }

    const client = await pool.connect();

    try {
      // Check current count before deleting
      const currentCountResult = await client.query('SELECT COUNT(*) as count FROM google_reviews_cache');
      const currentCount = parseInt(currentCountResult.rows[0].count);

      // Only proceed if we got at least 95% of the reviews we had before
      // (allows for some reviews being legitimately removed by Google)
      const minimumRequired = Math.floor(currentCount * 0.95);

      if (reviews.length < minimumRequired && currentCount > 100 && !force) {
        console.warn(`⚠️ API returned fewer reviews than expected: ${reviews.length} vs ${currentCount} cached. Skipping sync to prevent data loss.`);

        // Log the failed sync attempt - still store reported totals for reference
        const statsToStore = {
          fetched: locationStats,
          reported: reportedTotals || locationStats
        };
        await client.query(`
          INSERT INTO google_reviews_sync_status (
            last_sync_at,
            total_reviews_synced,
            sync_status,
            error_message,
            location_stats
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          new Date(),
          reviews.length,
          'skipped',
          `API returned ${reviews.length} reviews but cache has ${currentCount}. Sync skipped to prevent data loss.`,
          JSON.stringify(statsToStore)
        ]);

        return { skipped: true, reason: `API returned ${reviews.length} reviews but cache has ${currentCount}`, previousCount: currentCount };
      }

      await client.query('BEGIN');

      // Clear old reviews - safe to do now since we validated the count
      await client.query('DELETE FROM google_reviews_cache');

      // Insert new reviews
      for (const review of reviews) {
        await client.query(`
          INSERT INTO google_reviews_cache (
            review_id,
            reviewer_name,
            rating,
            review_text,
            review_reply,
            location_name,
            location_id,
            account_id,
            review_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (review_id)
          DO UPDATE SET
            reviewer_name = EXCLUDED.reviewer_name,
            rating = EXCLUDED.rating,
            review_text = EXCLUDED.review_text,
            review_reply = EXCLUDED.review_reply,
            location_name = EXCLUDED.location_name,
            location_id = EXCLUDED.location_id,
            account_id = EXCLUDED.account_id,
            review_date = EXCLUDED.review_date,
            updated_at = CURRENT_TIMESTAMP
        `, [
          review.id,
          review.name,
          review.rating,
          review.text,
          review.reply,
          review.locationName,
          review.locationId,
          review.accountId,
          review.date
        ]);
      }

      // Update sync status - store both fetched and reported totals
      const statsToStore = {
        fetched: locationStats,
        reported: reportedTotals || locationStats // Fall back to fetched if no reported totals
      };
      await client.query(`
        INSERT INTO google_reviews_sync_status (
          last_sync_at,
          total_reviews_synced,
          sync_status,
          location_stats
        ) VALUES ($1, $2, $3, $4)
      `, [
        new Date(),
        reviews.length,
        'success',
        JSON.stringify(statsToStore)
      ]);

      await client.query('COMMIT');
      console.log(`✅ Successfully synced ${reviews.length} reviews to cache (was ${currentCount})`);
      return { skipped: false };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error syncing reviews to cache:', error);

      // Log the failed sync
      await client.query(`
        INSERT INTO google_reviews_sync_status (
          last_sync_at,
          total_reviews_synced,
          sync_status,
          error_message
        ) VALUES ($1, $2, $3, $4)
      `, [
        new Date(),
        0,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      ]);

      throw error;
    } finally {
      client.release();
    }

    return { skipped: false };
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus | null> {
    if (!pool) {
      return null;
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          last_sync_at,
          total_reviews_synced,
          sync_status,
          error_message,
          location_stats
        FROM google_reviews_sync_status
        ORDER BY last_sync_at DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Parse location_stats - handle both old format (flat) and new format (nested with fetched/reported)
      let locationStats: Record<string, number> = {};
      let reportedTotals: Record<string, number> | undefined;

      if (row.location_stats) {
        const stats = typeof row.location_stats === 'string'
          ? JSON.parse(row.location_stats)
          : row.location_stats;

        if (stats.fetched && stats.reported) {
          // New format
          locationStats = stats.fetched;
          reportedTotals = stats.reported;
        } else {
          // Old format - flat object
          locationStats = stats;
        }
      }

      return {
        last_sync_at: row.last_sync_at,
        total_reviews_synced: row.total_reviews_synced,
        sync_status: row.sync_status,
        error_message: row.error_message,
        location_stats: locationStats,
        reported_totals: reportedTotals
      };
    } finally {
      client.release();
    }
  }

  /**
   * Check if cache needs refresh (older than X hours)
   */
  async needsRefresh(maxAgeHours: number = 24): Promise<boolean> {
    const status = await this.getSyncStatus();

    if (!status) {
      return true; // No sync yet
    }

    if (status.sync_status === 'error') {
      return true; // Last sync failed
    }

    const hoursSinceSync = (Date.now() - new Date(status.last_sync_at).getTime()) / (1000 * 60 * 60);
    return hoursSinceSync >= maxAgeHours;
  }
}
