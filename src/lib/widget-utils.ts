// src/lib/widget-utils.ts
// Shared utilities for all LEX SharePoint embeddable widgets

export const BRAND = {
  navy: '#0A2647',
  blue: '#144272',
  sky: '#2C74B3',
  gold: '#D4A843',
  green: '#22C55E',
  red: '#EF4444',
  orange: '#F59E0B',
  gray100: '#EEF0F4',
  gray400: '#9CA3AF',
  gray600: '#6B7280',
  gray800: '#374151',
} as const;

export function getWidgetParams(defaults: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
  if (typeof window === 'undefined') return defaults;
  const params = new URLSearchParams(window.location.search);
  const result = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const val = params.get(key);
    if (val === null) continue;
    const def = defaults[key];
    if (typeof def === 'boolean') {
      result[key] = val === 'true' || val === '1';
    } else if (typeof def === 'number') {
      const n = Number(val);
      if (!isNaN(n)) result[key] = n;
    } else {
      result[key] = val;
    }
  }
  return result;
}

export function initIframeResize(widgetName: string): () => void {
  function postHeight() {
    const h = document.body.scrollHeight;
    window.parent.postMessage({ type: 'lex-widget-height', widget: widgetName, height: h }, '*');
  }
  window.addEventListener('load', postHeight);
  window.addEventListener('resize', postHeight);
  // Also post after a short delay for fonts/images loading
  setTimeout(postHeight, 500);
  return postHeight;
}

export function initAutoRefresh(fetchFn: () => Promise<void>, intervalSeconds: number): () => void {
  const id = setInterval(fetchFn, intervalSeconds * 1000);
  return () => clearInterval(id);
}

export function formatRevenue(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    const m = amount / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 10_000) {
    const k = amount / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  if (Math.abs(amount) >= 1_000) {
    const k = amount / 1000;
    return `$${k.toFixed(1)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

export function renderSparkline(data: number[], color: string, width: number, height: number): string {
  if (!data || data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * usableW;
    const y = padding + usableH - ((v - min) / range) * usableH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="${points.join(' ')}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="${points[points.length - 1].split(',')[0]}" cy="${points[points.length - 1].split(',')[1]}" r="2" fill="${color}"/>
  </svg>`;
}

export function loadingSpinner(): string {
  return `<div style="display:flex;align-items:center;justify-content:center;padding:40px;font-family:'Open Sans',sans-serif;">
    <div style="width:28px;height:28px;border:3px solid ${BRAND.gray100};border-top-color:${BRAND.sky};border-radius:50%;animation:lex-spin 0.8s linear infinite;"></div>
    <style>@keyframes lex-spin{to{transform:rotate(360deg)}}</style>
  </div>`;
}

export function errorState(message: string): string {
  return `<div style="display:flex;align-items:center;justify-content:center;padding:30px;font-family:'Open Sans',sans-serif;color:${BRAND.gray400};font-size:13px;">
    ${message}
  </div>`;
}

export const WIDGET_FONTS = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Open+Sans:wght@400;600;700&display=swap');`;

export const WIDGET_BASE_STYLES = `
  ${WIDGET_FONTS}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: transparent; font-family: 'Open Sans', sans-serif; color: ${BRAND.gray800}; }
  .widget-heading { font-family: 'Montserrat', sans-serif; font-weight: 700; }
  .widget-stat { font-family: 'Montserrat', sans-serif; font-weight: 800; }
  @keyframes lex-spin { to { transform: rotate(360deg); } }
  @keyframes lex-countup { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
`;

// Widget response headers for iframe embedding
export const WIDGET_HEADERS = {
  'Content-Security-Policy': "frame-ancestors https://*.sharepoint.com https://*.microsoft.com https://lexkpi.app http://localhost:*",
  'X-Frame-Options': 'ALLOW-FROM https://*.sharepoint.com',
  'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
};

export const LOCATION_IDS: Record<string, string[]> = {
  lex: ['lex', '2211062401809147654'],
  'lex-etx': ['lex-etx', '7913826327010230630'],
};

export function matchesLocation(locationId: string, locationParam: string): boolean {
  const ids = LOCATION_IDS[locationParam];
  if (!ids) return true; // show all if unknown location
  return ids.includes(locationId);
}

export function getDepartmentIcon(dept: string): string {
  const d = dept.toLowerCase();
  if (d.includes('hvac') || d.includes('heating') || d.includes('cooling') || d.includes('air')) return '❄️';
  if (d.includes('plumb')) return '💧';
  if (d.includes('electr')) return '⚡';
  if (d.includes('solar')) return '☀️';
  return '🔹';
}

export function getDepartmentColor(dept: string): string {
  const d = dept.toLowerCase();
  if (d.includes('hvac') || d.includes('heating') || d.includes('cooling') || d.includes('air')) return BRAND.sky;
  if (d.includes('plumb')) return '#3B82F6';
  if (d.includes('electr')) return BRAND.gold;
  return BRAND.navy;
}

export function getPercentColor(pct: number): string {
  if (pct >= 90) return BRAND.green;
  if (pct >= 70) return BRAND.orange;
  return BRAND.red;
}

export function getTrendArrow(trend: string): string {
  if (trend === 'up') return `<span style="color:${BRAND.green}">▲</span>`;
  if (trend === 'down') return `<span style="color:${BRAND.red}">▼</span>`;
  return `<span style="color:${BRAND.gray400}">—</span>`;
}
