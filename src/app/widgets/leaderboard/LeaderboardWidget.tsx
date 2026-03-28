'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BRAND, WIDGET_BASE_STYLES, getWidgetParams, initIframeResize, initAutoRefresh,
  formatRevenue, renderSparkline, getTrendArrow,
} from '@/lib/widget-utils';

interface Technician {
  rank: number;
  name: string;
  fullName: string;
  department: string;
  departmentLabel: string;
  metricType: string;
  revenue: number;
  bookingRate: number;
  closeRate: number;
  jobsCompleted: number;
  totalCalls: number;
  memberships: number;
  trend: string;
  revenueHistory: number[];
}

interface LeaderboardData {
  success: boolean;
  period: string;
  asOf: string;
  technicians: Technician[];
}

function getMedalStyle(rank: number): { bg: string; color: string; icon: string } {
  switch (rank) {
    case 1: return { bg: `${BRAND.gold}20`, color: BRAND.gold, icon: '🥇' };
    case 2: return { bg: '#C0C0C020', color: '#9CA3AF', icon: '🥈' };
    case 3: return { bg: '#CD7F3220', color: '#CD7F32', icon: '🥉' };
    default: return { bg: 'transparent', color: BRAND.gray400, icon: '' };
  }
}

export default function LeaderboardWidget() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const postHeightRef = useRef<(() => void) | null>(null);

  const params = getWidgetParams({
    theme: 'light',
    refresh: 300,
    compact: false,
    location: 'lex',
    period: 'mtd',
    limit: 6,
    sortBy: 'revenue',
    dept: 'all',
    mode: 'top_per_dept',
  });

  const isDark = params.theme === 'dark';

  const isPerDept = params.mode === 'top_per_dept';

  const fetchData = useCallback(async () => {
    try {
      const qs = new URLSearchParams({
        period: String(params.period),
        location: String(params.location),
        limit: String(params.limit),
        sortBy: String(params.sortBy),
        dept: String(params.dept),
        mode: String(params.mode),
      });
      const res = await fetch(`/api/kpi/leaderboard?${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setData(json);
      setError(null);
      setRetryCount(0);
    } catch {
      if (retryCount < 3) {
        setError('Unable to load data. Retrying...');
        setTimeout(() => setRetryCount(c => c + 1), 5000);
      } else {
        setError('Data temporarily unavailable');
      }
    }
  }, [retryCount, params.period, params.location, params.limit, params.sortBy, params.dept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const postHeight = initIframeResize('leaderboard');
    postHeightRef.current = postHeight;
    const cleanup = initAutoRefresh(fetchData, params.refresh as number);
    return cleanup;
  }, [fetchData, params.refresh]);

  useEffect(() => {
    if (postHeightRef.current) setTimeout(postHeightRef.current, 100);
  }, [data]);

  const bg = isDark ? BRAND.navy : 'transparent';
  const textColor = isDark ? '#fff' : BRAND.gray800;
  const mutedColor = isDark ? 'rgba(255,255,255,0.55)' : BRAND.gray400;
  const rowHoverBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : BRAND.gray100;
  const isCompact = params.compact;

  if (error && !data) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: WIDGET_BASE_STYLES }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: "'Open Sans',sans-serif", color: mutedColor, fontSize: 13 }}>
          {error}
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: WIDGET_BASE_STYLES }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${BRAND.gray100}`, borderTopColor: BRAND.sky, borderRadius: '50%', animation: 'lex-spin 0.8s linear infinite' }} />
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        ${WIDGET_BASE_STYLES}
        body { background: ${bg}; }
        .lb-container { padding: ${isCompact ? '10px 12px' : '16px 20px'}; }
        .lb-header { display: flex; align-items: center; gap: 8px; margin-bottom: ${isCompact ? '8px' : '14px'}; }
        .lb-row { display: flex; align-items: center; gap: ${isCompact ? '8px' : '12px'}; padding: ${isCompact ? '6px 4px' : '10px 8px'}; border-bottom: 1px solid ${borderColor}; border-radius: 6px; transition: background 0.15s; }
        .lb-row:hover { background: ${rowHoverBg}; }
        .lb-row:last-child { border-bottom: none; }
        .lb-rank { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; font-family: 'Montserrat', sans-serif; flex-shrink: 0; }
        .lb-sparkline { flex-shrink: 0; }
        .lb-footer { margin-top: 12px; padding-top: 10px; border-top: 1px solid ${borderColor}; text-align: center; }
        .lb-footer a { color: ${BRAND.sky}; text-decoration: none; font-size: 12px; font-weight: 600; }
        .lb-footer a:hover { text-decoration: underline; }
        @media (max-width: 400px) { .lb-sparkline { display: none !important; } }
        ${isCompact ? '.lb-sparkline, .lb-meta { display: none !important; }' : ''}
      `}} />
      <div className="lb-container">
        {/* Header */}
        <div className="lb-header">
          <span style={{ fontSize: 18 }}>🏆</span>
          <span className="widget-heading" style={{ fontSize: isCompact ? 14 : 16, color: textColor }}>
            Top Performers
          </span>
          <span style={{ fontSize: 12, color: mutedColor, marginLeft: 'auto' }}>{data.period}</span>
        </div>

        {/* Rows */}
        {data.technicians.map((tech) => {
          const medal = getMedalStyle(isPerDept ? 1 : tech.rank);
          const isBookingRate = tech.metricType === 'booking_rate';
          return (
            <div key={`${tech.department}-${tech.fullName}`} className="lb-row" style={!isPerDept && tech.rank === 1 ? { background: `${BRAND.gold}08` } : {}}>
              {/* Rank or Department badge */}
              {isPerDept ? (
                <div className="lb-dept-badge" style={{
                  fontSize: 10, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
                  color: BRAND.gold, backgroundColor: `${BRAND.gold}15`,
                  padding: '3px 8px', borderRadius: 4, flexShrink: 0, whiteSpace: 'nowrap',
                  minWidth: 56, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.3px',
                }}>
                  {tech.departmentLabel}
                </div>
              ) : (
                <div className="lb-rank" style={{ backgroundColor: medal.bg, color: medal.color }}>
                  {medal.icon || tech.rank}
                </div>
              )}

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tech.name}
                </div>
                <div className="lb-meta" style={{ fontSize: 11, color: mutedColor }}>
                  {isBookingRate
                    ? `${tech.totalCalls} calls · ${tech.memberships} memberships`
                    : `${tech.jobsCompleted} jobs · ${tech.closeRate}% close`}
                </div>
              </div>

              {/* Sparkline (hide for booking rate) */}
              {!isBookingRate && (
                <div className="lb-sparkline"
                  dangerouslySetInnerHTML={{ __html: renderSparkline(tech.revenueHistory, BRAND.sky, 60, 24) }}
                />
              )}

              {/* Primary metric */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span className="widget-stat" style={{ fontSize: 15, color: textColor }}>
                  {isBookingRate ? `${tech.bookingRate}%` : formatRevenue(tech.revenue)}
                </span>
              </div>

              {/* Trend */}
              <div style={{ flexShrink: 0, fontSize: 12 }}
                dangerouslySetInnerHTML={{ __html: getTrendArrow(tech.trend) }}
              />
            </div>
          );
        })}

        {/* Footer */}
        <div className="lb-footer">
          <a href="https://lexkpi.app" target="_blank" rel="noopener noreferrer">
            View Full Leaderboard &rarr;
          </a>
        </div>
      </div>
    </>
  );
}
