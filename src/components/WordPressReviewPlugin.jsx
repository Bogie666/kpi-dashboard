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

function generateModernEmbedSnippet(location, apiUrl) {
  const safeApiUrl = apiUrl.replace(/\/+$/, '');
  return `<div id="ssr-modern-${location.id}"></div>
<script>
(function(){
  var CFG = {
    apiUrl: '${safeApiUrl}',
    location: '${location.filterValue}',
    minRating: 4,
    maxReviews: 12,
    scrollSpeed: 5000
  };

  var root = document.getElementById('ssr-modern-${location.id}');
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
      var allFiltered = data.reviews.filter(function(r){ return r.locationId === CFG.location; });
      var totalCount = allFiltered.length;
      var avgRating = totalCount ? (allFiltered.reduce(function(s,r){ return s+r.rating; },0)/totalCount) : 5;
      render(reviews, totalCount, avgRating);
    })
    .catch(function(){ root.innerHTML = ''; });

  var palette = ['#E91E63','#009688','#2196F3','#FF5722','#9C27B0','#4CAF50','#FF9800','#3F51B5'];
  function avatarColor(name){ return palette[Math.abs(hashCode(name)) % palette.length]; }
  function hashCode(s){ var h=0; for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;} return h; }
  function esc(s){ var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function relativeTime(dateStr){
    var now = new Date(), then = new Date(dateStr);
    var diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff/60) + ' minutes ago';
    if (diff < 86400) return Math.floor(diff/3600) + ' hours ago';
    var days = Math.floor(diff/86400);
    if (days < 30) return days + ' days ago';
    var months = Math.floor(days/30);
    if (months < 12) return months + (months===1 ? ' month ago' : ' months ago');
    var years = Math.floor(months/12);
    return years + (years===1 ? ' year ago' : ' years ago');
  }

  function ratingText(avg){
    if (avg >= 4.5) return 'EXCELLENT';
    if (avg >= 4.0) return 'GREAT';
    if (avg >= 3.5) return 'GOOD';
    return 'GOOD';
  }

  var googleG = '<svg viewBox="0 0 24 24" width="20" height="20" style="flex-shrink:0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';

  var googleLogo = '<svg viewBox="0 0 272 92" width="80" height="28"><path d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" fill="#EA4335"/><path d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" fill="#FBBC05"/><path d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z" fill="#4285F4"/><path d="M225 3v65h-9.5V3h9.5z" fill="#34A853"/><path d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z" fill="#EA4335"/><path d="M35.29 41.19V32H67c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 34.91.36 15.93 16.32.47 35.3.47c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.49-.01z" fill="#4285F4"/></svg>';

  function starsSVG(count){
    var s = '';
    for(var i=0;i<count;i++) s += '<svg viewBox="0 0 24 24" width="16" height="16" fill="#FBBC05"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
    return s;
  }

  var verifiedCheck = '<svg viewBox="0 0 24 24" width="16" height="16" style="margin-left:4px;flex-shrink:0"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="#1E88E5"/></svg>';

  function render(reviews, totalCount, avgRating){
    var id = 'ssrm-' + Math.random().toString(36).substr(2, 8);
    var summaryStars = '';
    for(var i=0;i<5;i++) summaryStars += '<svg viewBox="0 0 24 24" width="28" height="28" fill="#FBBC05"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';

    var cards = reviews.map(function(r){
      var name = r.name || 'Anonymous';
      var initial = name.charAt(0).toUpperCase();
      var color = avatarColor(name);
      var text = esc(r.text || '');
      var isLong = (r.text || '').length > 180;
      var dateAgo = relativeTime(r.date);
      return '<div class="ssrm-card">'
        + '<div class="ssrm-card-header">'
        +   '<div class="ssrm-avatar" style="background:' + color + '">' + esc(initial) + '</div>'
        +   '<div class="ssrm-header-info">'
        +     '<div class="ssrm-name">' + esc(name) + '</div>'
        +     '<div class="ssrm-date">' + esc(dateAgo) + '</div>'
        +   '</div>'
        +   '<div class="ssrm-g-icon">' + googleG + '</div>'
        + '</div>'
        + '<div class="ssrm-stars">' + starsSVG(r.rating) + verifiedCheck + '</div>'
        + '<div class="ssrm-text' + (isLong ? ' ssrm-clamped' : '') + '">' + text + '</div>'
        + (isLong ? '<button class="ssrm-read-more">Read more</button>' : '')
        + '</div>';
    }).join('');

    root.innerHTML = '<style>'
      + '.ssrm-container{position:relative;display:flex;align-items:center;gap:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:16px 0}'
      + '.ssrm-summary{flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 32px;min-width:180px}'
      + '.ssrm-summary-label{font-size:22px;font-weight:700;color:#333;letter-spacing:1px;margin-bottom:6px}'
      + '.ssrm-summary-stars{display:flex;gap:2px;margin-bottom:8px}'
      + '.ssrm-summary-count{font-size:13px;color:#666;margin-bottom:12px}'
      + '.ssrm-summary-count strong{color:#333}'
      + '.ssrm-summary-google{margin-top:4px}'
      + '.ssrm-track-wrap{position:relative;flex:1;overflow:hidden}'
      + '.ssrm-track{display:flex;gap:20px;overflow-x:auto;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:8px 4px}'
      + '.ssrm-track::-webkit-scrollbar{display:none}'
      + '.ssrm-card{background:#f9f9f9;border-radius:10px;padding:20px;min-width:280px;max-width:300px;flex:0 0 auto;display:flex;flex-direction:column;box-sizing:border-box;box-shadow:0 1px 6px rgba(0,0,0,.08);transition:transform .2s}'
      + '.ssrm-card:hover{transform:translateY(-3px);box-shadow:0 4px 12px rgba(0,0,0,.12)}'
      + '.ssrm-card-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}'
      + '.ssrm-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:17px;font-weight:700;flex-shrink:0}'
      + '.ssrm-header-info{flex:1;min-width:0}'
      + '.ssrm-name{font-size:14px;font-weight:600;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.ssrm-date{font-size:12px;color:#999}'
      + '.ssrm-g-icon{flex-shrink:0}'
      + '.ssrm-stars{display:flex;align-items:center;gap:1px;margin-bottom:10px}'
      + '.ssrm-text{color:#444;font-size:13.5px;line-height:1.6;flex-grow:1;overflow:hidden;text-align:left}'
      + '.ssrm-text.ssrm-clamped{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical}'
      + '.ssrm-read-more{color:#1a73e8;cursor:pointer;font-size:13px;background:none;border:none;padding:0;margin-top:6px;font-family:inherit}'
      + '.ssrm-read-more:hover{text-decoration:underline}'
      + '.ssrm-arrow{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.9);border:1px solid #ddd;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;font-size:18px;color:#555;opacity:0;transition:opacity .2s;box-shadow:0 1px 4px rgba(0,0,0,.1)}'
      + '.ssrm-track-wrap:hover .ssrm-arrow{opacity:1}'
      + '.ssrm-arrow:hover{background:#fff;color:#222}'
      + '.ssrm-arrow-left{left:0}'
      + '.ssrm-arrow-right{right:0}'
      + '@media(max-width:700px){.ssrm-container{flex-direction:column}.ssrm-summary{padding:12px 20px;min-width:auto}.ssrm-arrow{display:none}}'
      + '</style>'
      + '<div class="ssrm-container" id="' + id + '">'
      +   '<div class="ssrm-summary">'
      +     '<div class="ssrm-summary-label">' + ratingText(avgRating) + '</div>'
      +     '<div class="ssrm-summary-stars">' + summaryStars + '</div>'
      +     '<div class="ssrm-summary-count">Based on <strong>' + totalCount.toLocaleString() + ' reviews</strong></div>'
      +     '<div class="ssrm-summary-google">' + googleLogo + '</div>'
      +   '</div>'
      +   '<div class="ssrm-track-wrap">'
      +     '<button class="ssrm-arrow ssrm-arrow-left" aria-label="Previous">&#8249;</button>'
      +     '<div class="ssrm-track">' + cards + '</div>'
      +     '<button class="ssrm-arrow ssrm-arrow-right" aria-label="Next">&#8250;</button>'
      +   '</div>'
      + '</div>';

    var wrap = document.getElementById(id);
    var trackWrap = wrap.querySelector('.ssrm-track-wrap');
    var track = wrap.querySelector('.ssrm-track');
    var cardW = 300;

    trackWrap.addEventListener('click', function(e){
      if(!e.target.classList.contains('ssrm-read-more')) return;
      var txt = e.target.previousElementSibling;
      txt.classList.toggle('ssrm-clamped');
      e.target.textContent = txt.classList.contains('ssrm-clamped') ? 'Read more' : 'Read less';
    });

    trackWrap.querySelector('.ssrm-arrow-left').addEventListener('click', function(){ track.scrollBy({left:-cardW,behavior:'smooth'}); });
    trackWrap.querySelector('.ssrm-arrow-right').addEventListener('click', function(){ track.scrollBy({left:cardW,behavior:'smooth'}); });

    var timer = setInterval(function(){
      if(track.scrollLeft+track.clientWidth>=track.scrollWidth-10){track.scrollTo({left:0,behavior:'smooth'});}
      else{track.scrollBy({left:cardW,behavior:'smooth'});}
    }, CFG.scrollSpeed);

    trackWrap.addEventListener('mouseenter', function(){ clearInterval(timer); });
    trackWrap.addEventListener('mouseleave', function(){
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
  const [style, setStyle] = useState('modern');

  const getSnippet = (location) =>
    style === 'modern'
      ? generateModernEmbedSnippet(location, apiUrl)
      : generateEmbedSnippet(location, apiUrl);

  const handleCopy = async (location) => {
    const snippet = getSnippet(location);
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

      {/* Style Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-gray-400">Style:</span>
        <div className="flex bg-gray-900 rounded-lg overflow-hidden">
          <button
            onClick={() => setStyle('classic')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${style === 'classic' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Classic
          </button>
          <button
            onClick={() => setStyle('modern')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${style === 'modern' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Modern
          </button>
        </div>
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
          <span>Preview embed code (Lex &ndash; {style === 'modern' ? 'Modern' : 'Classic'})</span>
        </button>
        {expanded && (
          <pre className="px-4 pb-4 text-xs text-gray-300 overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
            <code>{getSnippet(LOCATIONS[0])}</code>
          </pre>
        )}
      </div>

      {/* Live Preview */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Live Preview (Lex &ndash; {style === 'modern' ? 'Modern' : 'Classic'})</h4>
        <div className="bg-white rounded-lg overflow-hidden border border-gray-700">
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;padding:10px 0;background:#fff;font-family:Arial,sans-serif;}</style></head><body>${getSnippet(LOCATIONS[0])}</body></html>`}
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
