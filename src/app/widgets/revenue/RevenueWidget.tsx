'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BRAND, WIDGET_BASE_STYLES, getWidgetParams, initIframeResize, initAutoRefresh,
  formatRevenue, getDepartmentIcon, getDepartmentColor, getPercentColor,
} from '@/lib/widget-utils';

interface Department {
  id: string;
  name: string;
  revenue: number;
  target: number;
  previousPeriod: number;
}

interface RevenueData {
  success: boolean;
  period: string;
  asOf: string;
  departments: Department[];
  total: { revenue: number; target: number; previousPeriod: number };
}

export default function RevenueWidget() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const postHeightRef = useRef<(() => void) | null>(null);

  const params = getWidgetParams({
    theme: 'light',
    refresh: 300,
    compact: false,
    location: 'lex',
    period: 'mtd',
    target: true,
  });

  const isDark = params.theme === 'dark';

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/kpi/revenue?period=${params.period}&location=${params.location}`);
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
  }, [retryCount, params.period, params.location]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const postHeight = initIframeResize('revenue');
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
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#fff';
  const barBg = isDark ? 'rgba(255,255,255,0.1)' : BRAND.gray100;

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

  const showTargets = params.target && data.departments.some(d => d.target > 0);
  const isCompact = params.compact;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        ${WIDGET_BASE_STYLES}
        body { background: ${bg}; }
        .revenue-container { padding: ${isCompact ? '10px 12px' : '16px 20px'}; }
        .revenue-header { display: flex; align-items: center; gap: 8px; margin-bottom: ${isCompact ? '8px' : '14px'}; }
        .dept-row { display: flex; align-items: center; gap: 12px; padding: ${isCompact ? '6px 0' : '10px 0'}; border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : BRAND.gray100}; }
        .dept-row:last-child { border-bottom: none; }
        .dept-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .dept-info { flex: 1; min-width: 0; }
        .progress-bar { height: 6px; border-radius: 3px; background: ${barBg}; margin-top: 4px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
        .revenue-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 2px solid ${isDark ? 'rgba(255,255,255,0.12)' : BRAND.gray100}; }
      `}} />
      <div className="revenue-container">
        {/* Header */}
        <div className="revenue-header">
          <span style={{ fontSize: 18 }}>💰</span>
          <span className="widget-heading" style={{ fontSize: isCompact ? 14 : 16, color: textColor }}>
            Revenue by Department
          </span>
          <span style={{ fontSize: 12, color: mutedColor, marginLeft: 'auto' }}>{data.period}</span>
        </div>

        {/* Department rows */}
        {data.departments.map((dept) => {
          const pctOfTarget = dept.target > 0 ? Math.round((dept.revenue / dept.target) * 100) : 0;
          const pctChange = dept.previousPeriod > 0
            ? Math.round(((dept.revenue - dept.previousPeriod) / dept.previousPeriod) * 100)
            : 0;
          const deptColor = getDepartmentColor(dept.name);

          if (isCompact) {
            return (
              <div key={dept.id} className="dept-row">
                <span style={{ fontSize: 14 }}>{getDepartmentIcon(dept.name)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: textColor, flex: 1 }}>{dept.name}</span>
                <span className="widget-stat" style={{ fontSize: 15, color: textColor }}>
                  {formatRevenue(dept.revenue)}
                </span>
                {pctChange !== 0 && (
                  <span style={{ fontSize: 11, color: pctChange > 0 ? BRAND.green : BRAND.red, fontWeight: 600 }}>
                    {pctChange > 0 ? '▲' : '▼'} {Math.abs(pctChange)}%
                  </span>
                )}
              </div>
            );
          }

          return (
            <div key={dept.id} className="dept-row">
              <div className="dept-icon" style={{ backgroundColor: `${deptColor}18` }}>
                {getDepartmentIcon(dept.name)}
              </div>
              <div className="dept-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: textColor }}>{dept.name}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="widget-stat" style={{ fontSize: 16, color: textColor }}>
                      {formatRevenue(dept.revenue)}
                    </span>
                    {showTargets && dept.target > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: getPercentColor(pctOfTarget) }}>
                        {pctOfTarget}%
                      </span>
                    )}
                  </div>
                </div>
                {showTargets && dept.target > 0 && (
                  <>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: `${Math.min(pctOfTarget, 100)}%`,
                        backgroundColor: deptColor,
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>
                      Target: {formatRevenue(dept.target)}
                      {pctChange !== 0 && (
                        <span style={{ marginLeft: 8, color: pctChange > 0 ? BRAND.green : BRAND.red }}>
                          {pctChange > 0 ? '↑' : '↓'} {Math.abs(pctChange)}% vs prev
                        </span>
                      )}
                    </div>
                  </>
                )}
                {!showTargets && pctChange !== 0 && (
                  <div style={{ fontSize: 11, color: pctChange > 0 ? BRAND.green : BRAND.red, marginTop: 2 }}>
                    {pctChange > 0 ? '↑' : '↓'} {Math.abs(pctChange)}% vs previous period
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Footer total */}
        <div className="revenue-footer">
          <span style={{ fontSize: 13, fontWeight: 600, color: mutedColor }}>Total Revenue</span>
          <span className="widget-stat" style={{ fontSize: 18, color: textColor }}>
            {formatRevenue(data.total.revenue)}
          </span>
        </div>
      </div>
    </>
  );
}
