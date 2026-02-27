"use client";

import React, { useState } from 'react';
import { Globe, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

const LOCATIONS = [
  { id: 'lex',     label: 'Lex',     filterValue: 'lex',     locationLabel: 'Dallas / Plano, TX' },
  { id: 'lex-etx', label: 'Lex ETX', filterValue: 'lex-etx', locationLabel: 'East Texas' },
  { id: 'lyons',   label: 'Lyons',   filterValue: 'lyons',   locationLabel: 'Rockwall, TX' },
];

function generateEmbedSnippet(location, apiUrl) {
  const safeApiUrl = apiUrl.replace(/\/+$/, '');
  return `<div id="ssr-reviews-${location.id}"></div>
<script>
(function(){
  var CFG = {
    apiUrl: '${safeApiUrl}',
    location: '${location.filterValue}',
    minRating: 4,
    maxReviews: 12,
    scrollSpeed: 5000
  };

  var root = document.getElementById('ssr-reviews-${location.id}');
  if (!root) return;
  root.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Loading reviews...</p>';

  fetch(CFG.apiUrl + '/api/google/reviews')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (!data.success || !data.reviews) { root.innerHTML = ''; return; }
      var reviews = data.reviews
        .filter(function(r){ return r.locationId === CFG.location && r.rating >= CFG.minRating && r.text && r.text.trim(); })
        .sort(function(a,b){ return new Date(b.date) - new Date(a.date); })
        .slice(0, CFG.maxReviews);
      if (!reviews.length) { root.innerHTML = ''; return; }
      render(reviews);
    })
    .catch(function(){ root.innerHTML = ''; });

  var palette = ['#E91E63','#009688','#2196F3','#FF5722','#9C27B0','#4CAF50','#FF9800','#3F51B5'];
  function avatarColor(name){ return palette[Math.abs(hashCode(name)) % palette.length]; }
  function hashCode(s){ var h=0; for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;} return h; }

  function starSVG(count){
    var google = '<svg viewBox="0 0 24 24" width="24" height="24" style="flex-shrink:0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';
    var star = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#FBBC05"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
    return google + new Array(count + 1).join(star);
  }

  function esc(s){ var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function render(reviews){
    var id = 'ssr-' + Math.random().toString(36).substr(2, 8);
    var cards = reviews.map(function(r){
      var name = r.name || 'Anonymous';
      var initial = name.charAt(0).toUpperCase();
      var color = avatarColor(name);
      var text = esc(r.text || '');
      var isLong = (r.text || '').length > 220;
      return '<div class="ssr-card">'
        + '<div class="ssr-stars">' + starSVG(r.rating) + '</div>'
        + '<div class="ssr-text' + (isLong ? ' ssr-clamped' : '') + '">' + text + '</div>'
        + (isLong ? '<button class="ssr-see-more">See More</button>' : '')
        + '<div class="ssr-avatar" style="background:' + color + '">' + esc(initial) + '</div>'
        + '<div class="ssr-name">' + esc(name) + '</div>'
        + '</div>';
    }).join('');

    root.innerHTML = '<style>'
      + '.ssr-wrap{position:relative;padding:20px 0;overflow:hidden}'
      + '.ssr-track{display:flex;gap:24px;overflow-x:auto;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:10px 4px}'
      + '.ssr-track::-webkit-scrollbar{display:none}'
      + '.ssr-card{background:#fff;border-radius:12px;border:2px solid #c8e6c9;padding:28px 22px;min-width:280px;max-width:300px;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;text-align:center;box-sizing:border-box;box-shadow:0 2px 12px rgba(0,0,0,.08);transition:transform .2s}'
      + '.ssr-card:hover{transform:translateY(-4px)}'
      + '.ssr-stars{display:flex;align-items:center;gap:3px;margin-bottom:20px}'
      + '.ssr-text{color:#333;font-size:14px;line-height:1.65;margin-bottom:20px;flex-grow:1;overflow:hidden}'
      + '.ssr-text.ssr-clamped{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical}'
      + '.ssr-see-more{color:#1a73e8;cursor:pointer;font-size:13px;text-decoration:underline;background:none;border:none;padding:0;margin-bottom:16px;font-family:inherit}'
      + '.ssr-avatar{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700;margin-bottom:8px;flex-shrink:0}'
      + '.ssr-name{color:#333;font-size:14px;font-weight:600;margin-bottom:2px}'
      + '.ssr-arrow{position:absolute;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;z-index:2;font-size:32px;font-weight:700;color:#FBBC05;opacity:0;transition:opacity .2s;padding:8px;line-height:1}'
      + '.ssr-wrap:hover .ssr-arrow{opacity:1}'
      + '.ssr-arrow:hover{color:#F9A825}'
      + '.ssr-arrow-left{left:4px}'
      + '.ssr-arrow-right{right:4px}'
      + '@media(max-width:640px){.ssr-card{min-width:260px}.ssr-arrow{display:none}}'
      + '</style>'
      + '<div class="ssr-wrap" id="' + id + '">'
      + '<button class="ssr-arrow ssr-arrow-left" aria-label="Previous">&lsaquo;</button>'
      + '<div class="ssr-track">' + cards + '</div>'
      + '<button class="ssr-arrow ssr-arrow-right" aria-label="Next">&rsaquo;</button>'
      + '</div>';

    var wrap = document.getElementById(id);
    var track = wrap.querySelector('.ssr-track');
    var cardW = 304;

    wrap.addEventListener('click', function(e){
      if(!e.target.classList.contains('ssr-see-more')) return;
      var txt = e.target.previousElementSibling;
      txt.classList.toggle('ssr-clamped');
      e.target.textContent = txt.classList.contains('ssr-clamped') ? 'See More' : 'See Less';
    });

    wrap.querySelector('.ssr-arrow-left').addEventListener('click', function(){ track.scrollBy({left:-cardW,behavior:'smooth'}); });
    wrap.querySelector('.ssr-arrow-right').addEventListener('click', function(){ track.scrollBy({left:cardW,behavior:'smooth'}); });

    var timer = setInterval(function(){
      if(track.scrollLeft+track.clientWidth>=track.scrollWidth-10){track.scrollTo({left:0,behavior:'smooth'});}
      else{track.scrollBy({left:cardW,behavior:'smooth'});}
    }, CFG.scrollSpeed);

    wrap.addEventListener('mouseenter', function(){ clearInterval(timer); });
    wrap.addEventListener('mouseleave', function(){
      timer = setInterval(function(){
        if(track.scrollLeft+track.clientWidth>=track.scrollWidth-10){track.scrollTo({left:0,behavior:'smooth'});}
        else{track.scrollBy({left:cardW,behavior:'smooth'});}
      }, CFG.scrollSpeed);
    });
  }
})();
</script>`;
}

const WordPressReviewPlugin = ({ hideHeader }) => {
  const [apiUrl, setApiUrl] = useState('https://lexkpi.app');
  const [copiedId, setCopiedId] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async (location) => {
    const snippet = generateEmbedSnippet(location, apiUrl);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedId(location.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className={hideHeader ? '' : 'bg-gray-800 rounded-lg p-6'}>
      {!hideHeader && (
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-medium">Review Carousel Embed</h3>
        </div>
      )}

      <p className="text-gray-400 text-sm mb-6">
        Embeddable review carousel that displays recent 4-5 star Google reviews.
        Copy the snippet for a location and paste it into any page on your website.
        Reviews are fetched from this dashboard&apos;s API. Transparent background.
      </p>

      {/* API URL Config */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6">
        <label className="block text-sm font-semibold text-white mb-2">Dashboard URL</label>
        <input
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="https://kpi.servicestarbrands.com"
          className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">Base URL of the KPI Dashboard (no trailing slash)</p>
      </div>

      {/* Copy Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            onClick={() => handleCopy(loc)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors"
          >
            {copiedId === loc.id ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>{copiedId === loc.id ? 'Copied!' : `Copy ${loc.label}`}</span>
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-semibold text-white mb-3">How to Use</h4>
        <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
          <li>Click a button above to copy the embed code for that location</li>
          <li>In your website editor, add a <span className="text-blue-400">Custom HTML</span> block</li>
          <li>Paste the snippet</li>
          <li>Publish &mdash; the carousel loads automatically</li>
        </ol>
      </div>

      {/* Configuration Notes */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-semibold text-white mb-3">Configuration</h4>
        <div className="text-sm text-gray-300 space-y-2">
          <p>Edit these values in the snippet&apos;s <code className="bg-gray-700 px-2 py-0.5 rounded text-green-400">CFG</code> object:</p>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div><code className="text-gray-400">minRating</code> &mdash; 4 (4+ stars) or 5 (5 stars only)</div>
            <div><code className="text-gray-400">maxReviews</code> &mdash; number of review cards (default 12)</div>
            <div><code className="text-gray-400">scrollSpeed</code> &mdash; milliseconds between auto-scroll (default 5000)</div>
          </div>
        </div>
      </div>

      {/* Expandable Code Preview */}
      <div className="bg-gray-900 rounded-lg overflow-hidden mb-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-2 w-full px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span>Preview embed code (Lex)</span>
        </button>
        {expanded && (
          <pre className="px-4 pb-4 text-xs text-gray-300 overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
            <code>{generateEmbedSnippet(LOCATIONS[0], apiUrl)}</code>
          </pre>
        )}
      </div>

      {/* Live Preview */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Live Preview (Lex)</h4>
        <div className="bg-white rounded-lg overflow-hidden border border-gray-700">
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;padding:10px 0;background:#fff;font-family:Arial,sans-serif;}</style></head><body>${generateEmbedSnippet(LOCATIONS[0], apiUrl)}</body></html>`}
            title="Review Carousel Preview"
            className="w-full border-0"
            style={{ height: '340px' }}
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
};

export default WordPressReviewPlugin;
