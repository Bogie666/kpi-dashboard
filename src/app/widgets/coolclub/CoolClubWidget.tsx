'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BRAND, WIDGET_BASE_STYLES, getWidgetParams, initIframeResize, initAutoRefresh,
  formatCount, renderSparkline,
} from '@/lib/widget-utils';

interface CoolClubData {
  success: boolean;
  location: string;
  asOf: string;
  activeMembers: number;
  goal: number;
  newThisMonth: number;
  newThisWeek: number;
  churnThisMonth: number;
  netGrowthThisMonth: number;
  history: number[];
}

function AnimatedCounter({ target, duration = 1500, animate }: { target: number; duration?: number; animate: boolean }) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (!animate) {
      setCount(target);
      return;
    }
    const startVal = prevTarget.current;
    prevTarget.current = target;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration, animate]);

  return <>{formatCount(count)}</>;
}

export default function CoolClubWidget() {
  const [data, setData] = useState<CoolClubData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const postHeightRef = useRef<(() => void) | null>(null);

  const params = getWidgetParams({
    theme: 'dark', // dark by default per spec
    refresh: 300,
    compact: false,
    location: 'lex',
    goal: 3000,
    animate: true,
  });

  // Always dark for Cool Club unless explicitly set to light
  const isDark = params.theme !== 'light';

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/kpi/coolclub?location=${params.location}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      // Allow goal override from URL param
      if (params.goal !== 3000) json.goal = params.goal;
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
  }, [retryCount, params.location, params.goal]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const postHeight = initIframeResize('coolclub');
    postHeightRef.current = postHeight;
    const cleanup = initAutoRefresh(fetchData, params.refresh as number);
    return cleanup;
  }, [fetchData, params.refresh]);

  useEffect(() => {
    if (postHeightRef.current) setTimeout(postHeightRef.current, 100);
  }, [data]);

  const textColor = isDark ? '#fff' : BRAND.gray800;
  const mutedColor = isDark ? 'rgba(255,255,255,0.55)' : BRAND.gray400;
  const barBg = isDark ? 'rgba(255,255,255,0.15)' : BRAND.gray100;
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
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
          background: isDark ? `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.blue} 100%)` : 'transparent',
          borderRadius: 12,
        }}>
          <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: BRAND.sky, borderRadius: '50%', animation: 'lex-spin 0.8s linear infinite' }} />
        </div>
      </>
    );
  }

  const goal = data.goal || (params.goal as number);
  const pctOfGoal = goal > 0 ? Math.round((data.activeMembers / goal) * 100) : 0;

  if (isCompact) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: WIDGET_BASE_STYLES }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
          background: isDark ? `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.blue} 100%)` : 'transparent',
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 16 }}>&#10052;&#65039;</span>
          <span className="widget-stat" style={{ fontSize: 20, color: textColor }}>
            <AnimatedCounter target={data.activeMembers} animate={params.animate as boolean} />
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: BRAND.green }}>
            +{data.newThisMonth} this mo.
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        ${WIDGET_BASE_STYLES}
        .cc-container {
          padding: 20px 24px;
          background: ${isDark ? `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.blue} 100%)` : 'transparent'};
          border-radius: 12px;
          text-align: center;
        }
        .cc-label { font-size: 12px; font-weight: 600; color: ${mutedColor}; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
        .cc-count { font-size: 48px; line-height: 1.1; color: ${textColor}; animation: lex-countup 0.5s ease; }
        .cc-badge { display: inline-flex; align-items: center; gap: 4px; background: ${BRAND.green}20; color: ${BRAND.green}; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-top: 8px; }
        .cc-progress { margin-top: 16px; }
        .cc-bar-outer { height: 8px; border-radius: 4px; background: ${barBg}; overflow: hidden; }
        .cc-bar-inner { height: 100%; border-radius: 4px; background: linear-gradient(90deg, ${BRAND.sky}, ${BRAND.gold}); transition: width 0.8s ease; }
        .cc-goal-text { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: ${mutedColor}; }
        .cc-sparkline { margin-top: 12px; display: flex; justify-content: center; }
      `}} />
      <div className="cc-container">
        <div className="cc-label">&#10052;&#65039; Cool Club Members</div>
        <div className="cc-count widget-stat">
          <AnimatedCounter target={data.activeMembers} animate={params.animate as boolean} />
        </div>
        <div className="cc-badge">
          +{data.newThisMonth} this mo.
        </div>

        <div className="cc-progress">
          <div className="cc-bar-outer">
            <div className="cc-bar-inner" style={{ width: `${Math.min(pctOfGoal, 100)}%` }} />
          </div>
          <div className="cc-goal-text">
            <span>{pctOfGoal}% of goal</span>
            <span>Goal: {formatCount(goal)}</span>
          </div>
        </div>

        {data.history && data.history.length > 1 && (
          <div className="cc-sparkline"
            dangerouslySetInnerHTML={{ __html: renderSparkline(data.history, BRAND.sky, 120, 30) }}
          />
        )}
      </div>
    </>
  );
}
