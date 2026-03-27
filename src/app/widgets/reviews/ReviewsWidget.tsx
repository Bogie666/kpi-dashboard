'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { BRAND, WIDGET_BASE_STYLES, getWidgetParams, initIframeResize, initAutoRefresh } from '@/lib/widget-utils';

interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  date: string;
  locationId: string;
  locationName: string;
}

interface ReviewsData {
  success: boolean;
  reviews: Review[];
  totalCount: number;
  reportedTotals?: Record<string, number>;
  locationStats?: Record<string, number>;
}

const STAR_SVG = (filled: boolean) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="${filled ? '#FBBC04' : '#E0E0E0'}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

export default function ReviewsWidget() {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const postHeightRef = useRef<(() => void) | null>(null);

  const params = getWidgetParams({
    theme: 'light',
    refresh: 300,
    compact: false,
    location: 'lex',
    minRating: 4,
    maxReviews: 16,
    autoScroll: true,
    speed: 5000,
  });

  const isDark = params.theme === 'dark';

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/google/reviews');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setData(json);
      setError(null);
      setRetryCount(0);
    } catch (e) {
      if (retryCount < 3) {
        setError('Unable to load data. Retrying...');
        setTimeout(() => setRetryCount(c => c + 1), 5000);
      } else {
        setError('Data temporarily unavailable');
      }
    }
  }, [retryCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const postHeight = initIframeResize('reviews');
    postHeightRef.current = postHeight;
    const cleanup = initAutoRefresh(fetchData, params.refresh as number);
    return cleanup;
  }, [fetchData, params.refresh]);

  // Update height when data changes
  useEffect(() => {
    if (postHeightRef.current) {
      setTimeout(postHeightRef.current, 100);
    }
  }, [data, expandedCards]);

  // Auto-scroll carousel
  useEffect(() => {
    if (!params.autoScroll || !carouselRef.current) return;
    const el = carouselRef.current;
    autoScrollRef.current = setInterval(() => {
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 280, behavior: 'smooth' });
      }
    }, params.speed as number);
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [data, params.autoScroll, params.speed]);

  // Filter reviews
  const filteredReviews = data?.reviews
    ?.filter(r => r.rating >= (params.minRating as number))
    ?.filter(r => {
      if (params.location === 'lex') return r.locationId === 'lex' || r.locationId === '2211062401809147654';
      if (params.location === 'lex-etx') return r.locationId === 'lex-etx' || r.locationId === '7913826327010230630';
      return true;
    })
    ?.slice(0, params.maxReviews as number) || [];

  // Calculate stats
  const allLocationReviews = data?.reviews?.filter(r => {
    if (params.location === 'lex') return r.locationId === 'lex' || r.locationId === '2211062401809147654';
    if (params.location === 'lex-etx') return r.locationId === 'lex-etx' || r.locationId === '7913826327010230630';
    return true;
  }) || [];

  const avgRating = allLocationReviews.length > 0
    ? allLocationReviews.reduce((sum, r) => sum + r.rating, 0) / allLocationReviews.length
    : 0;
  const totalReviewCount = data?.reportedTotals
    ? Object.values(data.reportedTotals).reduce((a, b) => a + b, 0)
    : data?.totalCount || 0;

  function getRatingLabel(avg: number): string {
    if (avg >= 4.8) return 'OUTSTANDING';
    if (avg >= 4.5) return 'EXCELLENT';
    if (avg >= 4.0) return 'GREAT';
    if (avg >= 3.5) return 'GOOD';
    return 'AVERAGE';
  }

  function relativeDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
  }

  function getInitialColor(name: string): string {
    const colors = [BRAND.sky, BRAND.blue, BRAND.navy, BRAND.gold, BRAND.green, '#8B5CF6', '#EC4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  const bg = isDark ? BRAND.navy : 'transparent';
  const textColor = isDark ? '#fff' : BRAND.gray800;
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : BRAND.gray400;
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : '#fff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.12)' : BRAND.gray100;

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
        .reviews-container { display: flex; gap: 20px; padding: 16px; align-items: stretch; }
        .reviews-summary { min-width: 180px; max-width: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 16px; }
        .reviews-carousel-wrap { flex: 1; overflow: hidden; position: relative; min-width: 0; }
        .reviews-carousel { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 4px 0; }
        .reviews-carousel::-webkit-scrollbar { display: none; }
        .review-card { flex: 0 0 260px; scroll-snap-align: start; background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; transition: box-shadow 0.2s; }
        .review-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .review-text { font-size: 13px; line-height: 1.5; color: ${textColor}; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .review-text.expanded { -webkit-line-clamp: unset; }
        .read-more { color: ${BRAND.sky}; cursor: pointer; font-size: 12px; font-weight: 600; border: none; background: none; padding: 0; }
        @media (max-width: 599px) {
          .reviews-container { flex-direction: column; }
          .reviews-summary { max-width: none; flex-direction: row; gap: 16px; padding: 12px 16px; }
        }
        ${params.compact ? '.reviews-summary { display: none !important; }' : ''}
      `}} />
      <div className="reviews-container">
        <div className="reviews-summary">
          <div>
            <div className="widget-stat" style={{ fontSize: 42, color: textColor, lineHeight: 1.1 }}>
              {avgRating.toFixed(1)}
            </div>
            <div style={{ display: 'flex', gap: 2, justifyContent: 'center', margin: '6px 0' }}
              dangerouslySetInnerHTML={{ __html: [1,2,3,4,5].map(i => STAR_SVG(i <= Math.round(avgRating))).join('') }} />
            <div style={{ fontSize: 11, color: mutedColor, marginBottom: 4 }}>
              {totalReviewCount.toLocaleString()} reviews
            </div>
            <div className="widget-heading" style={{ fontSize: 11, color: BRAND.gold, letterSpacing: 1.5 }}>
              {getRatingLabel(avgRating)}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <svg width="48" height="48" viewBox="0 0 48 48">
              <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#4285F4"/>
              <path d="M3.2 14.1l7 5.2C12.2 14.9 17.5 11 24 11c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 14.9 2 7.2 6.8 3.2 14.1z" fill="#EA4335"/>
              <path d="M24 46c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 37 27 37.8 24 37.8c-6 0-10.5-3.9-12.2-9.3l-7 5.4C7.4 41.3 15 46 24 46z" fill="#34A853"/>
              <path d="M46 24c0-1.3-.2-2.7-.5-4H24v8.5h11.8c-.8 3-2.6 5.4-5.2 7l6.5 5.5C41.2 37.5 46 31.3 46 24z" fill="#FBBC05"/>
            </svg>
          </div>
        </div>
        <div className="reviews-carousel-wrap">
          <div className="reviews-carousel" ref={carouselRef}
            onMouseEnter={() => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); }}
            onMouseLeave={() => {
              if (!params.autoScroll) return;
              autoScrollRef.current = setInterval(() => {
                const el = carouselRef.current;
                if (!el) return;
                const maxScroll = el.scrollWidth - el.clientWidth;
                if (el.scrollLeft >= maxScroll - 10) el.scrollTo({ left: 0, behavior: 'smooth' });
                else el.scrollBy({ left: 280, behavior: 'smooth' });
              }, params.speed as number);
            }}
          >
            {filteredReviews.map((review) => {
              const isExpanded = expandedCards.has(review.id);
              return (
                <div key={review.id} className="review-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: getInitialColor(review.name), color: '#fff', fontWeight: 700, fontSize: 14,
                      fontFamily: "'Montserrat',sans-serif",
                    }}>
                      {review.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {review.name}
                      </div>
                      <div style={{ fontSize: 11, color: mutedColor }}>{relativeDate(review.date)}</div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill={BRAND.sky}>
                      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 6.8l-4 4a.7.7 0 01-1 0l-2-2a.7.7 0 011-1L7 9.3l3.5-3.5a.7.7 0 011 1z"/>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', gap: 1 }}
                    dangerouslySetInnerHTML={{ __html: [1,2,3,4,5].map(i => STAR_SVG(i <= review.rating)).join('') }} />
                  <div className={`review-text ${isExpanded ? 'expanded' : ''}`}>
                    {review.text || 'No review text provided.'}
                  </div>
                  {review.text && review.text.length > 150 && (
                    <button className="read-more" onClick={() => {
                      setExpandedCards(prev => {
                        const next = new Set(prev);
                        if (next.has(review.id)) next.delete(review.id);
                        else next.add(review.id);
                        return next;
                      });
                    }}>
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
