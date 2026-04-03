"use client";

import React, { useState } from 'react';
import {
  X,
  Star,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  BarChart3,
  Download,
  Sparkles,
  Target,
  AlertCircle,
  User
} from 'lucide-react';
import jsPDF from 'jspdf';

const ReviewInsightsModal = ({ isOpen, onClose, locations, reviews }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('3months');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const timeframes = [
    { value: '1week', label: 'Last Week' },
    { value: '2weeks', label: 'Last 2 Weeks' },
    { value: '1month', label: 'Last Month' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: 'year', label: 'Last Year' }
  ];

  const generateInsights = async () => {
    setLoading(true);
    try {
      console.log('Generating customer insights...');

      const response = await fetch('/api/google/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe: selectedTimeframe,
          locationId: selectedLocation,
          reviews: reviews
        })
      });

      const data = await response.json();

      if (data.success) {
        setInsights(data.insights);
      } else {
        alert(`Failed to generate insights: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Failed to generate customer insights');
    } finally {
      setLoading(false);
    }
  };

  const getRatingIcon = (rating) => {
    if (rating >= 4.5) return '🌟';
    if (rating >= 4.0) return '⭐';
    if (rating >= 3.5) return '🔸';
    if (rating >= 3.0) return '🔶';
    return '🔻';
  };

  const getSentimentColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSentimentLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const exportGroupInsights = async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const mx = 7;

    const sanitize = (str) => (str || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[\u2026]/g, '...').replace(/[^\x00-\x7F]/g, '');

    // Brand colors
    const dark = [26, 26, 46];       // #1a1a2e
    const lexBlue = [10, 38, 71];    // #0A2647
    const etxGreen = [45, 80, 22];   // #2D5016
    const lyonsBlue = [58, 91, 160]; // #3A5BA0
    const green = [46, 139, 87];
    const red = [231, 76, 60];

    // Filter reviews by selected timeframe (matching server-side logic)
    const now = new Date();
    let cutoffDate;
    switch (selectedTimeframe) {
      case '1week': cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '2weeks': cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); break;
      case '1month': cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); break;
      case '3months': cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); break;
      case '6months': cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()); break;
      case 'year': cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break;
      default: cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    }
    const filteredReviews = (reviews || []).filter(r => new Date(r.date) >= cutoffDate);

    // Compute per-brand stats from filtered reviews
    const brandIds = ['lex', 'lex-etx', 'lyons'];
    const brandLabels = { 'lex': 'LEX (Plano/DFW)', 'lex-etx': 'LEX ETX (Tyler)', 'lyons': 'Lyons (Rockwall)' };
    const brandColors = { 'lex': lexBlue, 'lex-etx': etxGreen, 'lyons': lyonsBlue };
    const brandShort = { 'lex': 'LEX', 'lex-etx': 'ETX', 'lyons': 'LYONS' };

    const perBrand = {};
    brandIds.forEach(id => {
      const br = filteredReviews.filter(r => r.locationId === id);
      const validRatings = br.filter(r => r.rating && typeof r.rating === 'number');
      const total = validRatings.length;
      const avg = total > 0 ? validRatings.reduce((s, r) => s + r.rating, 0) / total : 0;
      const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      validRatings.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++; });
      const fiveRate = total > 0 ? Math.round((dist[5] / total) * 100) : 0;
      const oneRate = total > 0 ? Math.round((dist[1] / total) * 100) : 0;
      perBrand[id] = { total, avg: Math.round(avg * 10) / 10, dist, fiveRate, oneRate };
    });

    const totalAll = insights.totalReviews;
    const oneStarAll = totalAll > 0 ? Math.round(((insights.ratingDistribution[1] || 0) / totalAll) * 100) : 0;
    const fiveStarAll = totalAll > 0 ? Math.round(((insights.ratingDistribution[5] || 0) / totalAll) * 100) : 0;

    // Helpers
    const drawWrapped = (text, x, y, maxW, fontSize, color, style = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont(undefined, style);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(sanitize(text), maxW);
      doc.text(lines, x, y);
      return y + lines.length * fontSize * 0.38;
    };

    const drawSectionTitle = (text, x, y, w, color) => {
      doc.setFontSize(6);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...color);
      doc.text(sanitize(text), x, y);
      doc.setDrawColor(...color);
      doc.setLineWidth(0.5);
      doc.line(x, y + 1, x + w, y + 1);
      return y + 3.5;
    };

    const drawBulletItem = (text, x, y, maxW, bulletColor) => {
      doc.setFontSize(5.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...bulletColor);
      doc.text('>', x, y);
      return drawWrapped(text, x + 3, y, maxW - 3, 5.5, [68, 68, 68]);
    };

    const drawGroupHeader = (title, subtitle) => {
      doc.setFillColor(...dark);
      doc.rect(0, 0, pw, 12, 'F');
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(sanitize(title), mx + 1, 6.5);
      doc.setFontSize(5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(255, 255, 255, 128);
      doc.text(sanitize(subtitle), mx + 1, 10);

      // Brand dots on right
      let dotX = pw - mx - 2;
      [['LYONS', lyonsBlue], ['LEX ETX', etxGreen], ['LEX', lexBlue]].forEach(([label, color]) => {
        doc.setFontSize(5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(255, 255, 255, 153);
        const lw = doc.getTextWidth(label);
        doc.text(label, dotX - lw, 7);
        doc.setFillColor(...color);
        doc.circle(dotX - lw - 2.5, 6.3, 1.2, 'F');
        dotX = dotX - lw - 7;
      });

      // Tri-color accent line
      const third = pw / 3;
      doc.setFillColor(...lexBlue);
      doc.rect(0, 12, third, 1, 'F');
      doc.setFillColor(...etxGreen);
      doc.rect(third, 12, third, 1, 'F');
      doc.setFillColor(...lyonsBlue);
      doc.rect(third * 2, 12, third + 1, 1, 'F');
    };

    const drawGroupFooter = (pageNum, totalPages) => {
      const fy = ph - 4.5;
      // Tri-color accent line
      const third = pw / 3;
      doc.setFillColor(...lexBlue);
      doc.rect(0, fy - 3, third, 0.8, 'F');
      doc.setFillColor(...etxGreen);
      doc.rect(third, fy - 3, third, 0.8, 'F');
      doc.setFillColor(...lyonsBlue);
      doc.rect(third * 2, fy - 3, third + 1, 0.8, 'F');
      // Footer bar
      doc.setFillColor(...dark);
      doc.rect(0, fy - 2.2, pw, 6.7, 'F');
      doc.setFontSize(4.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(255, 255, 255, 115);
      doc.text('Generated by AI  \u2022  Customer Insights Platform  \u2022  Champions Group / Service Star Brands', mx + 1, fy);
      doc.text(`Page ${pageNum} of ${totalPages}`, pw - mx - 1, fy, { align: 'right' });
    };

    try {
      const tfLabel = timeframes.find(tf => tf.value === selectedTimeframe)?.label || '';

      // ═══════════════ PAGE 1: EXECUTIVE SCORECARD ═══════════════
      drawGroupHeader('Customer Insights Report \u2014 All Brands', `AI-Powered Review Analysis  |  ${tfLabel}  |  Champions Group`);

      // Combined KPIs
      let y = 13;
      const ckpiH = 12;
      doc.setFillColor(244, 245, 247);
      doc.rect(0, y, pw, ckpiH, 'F');
      doc.setDrawColor(224, 224, 224);
      doc.line(0, y + ckpiH, pw, y + ckpiH);

      const ckpis = [
        { value: `${totalAll}`, label: 'TOTAL REVIEWS', color: dark },
        { value: `${insights.averageRating.toFixed(1)}`, label: 'AVG RATING', color: green },
        { value: `${insights.sentimentScore || 0}`, label: 'SENTIMENT SCORE', color: green },
        { value: `${fiveStarAll}%`, label: '5-STAR RATE', color: green },
        { value: `${oneStarAll}%`, label: '1-STAR RATE', color: red },
      ];
      const ckpiW = pw / ckpis.length;
      ckpis.forEach((kpi, i) => {
        const cx = i * ckpiW + ckpiW / 2;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...kpi.color);
        doc.text(kpi.value, cx, y + 6.5, { align: 'center' });
        doc.setFontSize(4.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(136, 136, 136);
        doc.text(kpi.label, cx, y + 9.5, { align: 'center' });
      });
      y += ckpiH;

      // Brand Comparison Table
      const tableX = 0;
      const tableW = pw;
      const cols = [tableW * 0.28, tableW * 0.24, tableW * 0.24, tableW * 0.24];
      const colX = [0, cols[0], cols[0] + cols[1], cols[0] + cols[1] + cols[2]];
      const rowH = 5.5;

      // Table header
      const headerColors = [[85, 85, 85], lexBlue, etxGreen, lyonsBlue];
      const headerLabels = ['Metric', 'LEX (Plano/DFW)', 'LEX ETX (Tyler)', 'Lyons (Rockwall)'];
      headerColors.forEach((c, i) => {
        doc.setFillColor(...c);
        doc.rect(colX[i], y, cols[i], rowH + 1, 'F');
        doc.setFontSize(5.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(headerLabels[i], i === 0 ? colX[i] + 5 : colX[i] + cols[i] / 2, y + 3.8, i === 0 ? {} : { align: 'center' });
      });
      y += rowH + 1;

      // Table rows
      const tableRows = [
        { label: 'Reviews', values: brandIds.map(id => `${perBrand[id].total}`) },
        { label: 'Avg Rating', values: brandIds.map(id => `${perBrand[id].avg.toFixed(1)}`), colorFn: (v) => parseFloat(v) >= 4.5 ? green : parseFloat(v) >= 4.0 ? [184, 148, 45] : red },
        { label: 'Sentiment Score', values: brandIds.map(() => '-') },
        { label: '5-Star Rate', values: brandIds.map(id => `${perBrand[id].fiveRate}%`) },
        { label: '1-Star Rate', values: brandIds.map(id => `${perBrand[id].oneRate}%`), colorFn: (v) => parseInt(v) > 5 ? red : [68, 68, 68] },
      ];

      tableRows.forEach((row, ri) => {
        if (ri % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(0, y, tableW, rowH, 'F');
        }
        doc.setDrawColor(238, 238, 238);
        doc.line(0, y + rowH, tableW, y + rowH);

        doc.setFontSize(5.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(68, 68, 68);
        doc.text(row.label, 5, y + 3.5);

        row.values.forEach((val, vi) => {
          doc.setFont(undefined, 'bold');
          const valColor = row.colorFn ? row.colorFn(val) : [68, 68, 68];
          doc.setTextColor(...valColor);
          doc.text(val, colX[vi + 1] + cols[vi + 1] / 2, y + 3.5, { align: 'center' });
        });
        y += rowH;
      });
      y += 3;

      // Two-column content area
      const colGap = 5;
      const leftW = (pw - mx * 2 - colGap) * 0.50;
      const rightX = mx + leftW + colGap;
      const rightW = pw - mx - rightX;

      // ── LEFT COLUMN: Strengths & Issues ──
      let ly = y;
      ly = drawSectionTitle("What's Working Across Brands", mx, ly, leftW, green);
      insights.commonPraise?.slice(0, 5).forEach((praise) => {
        ly = drawBulletItem(praise, mx, ly, leftW, green);
        ly += 0.8;
      });
      ly += 2;

      ly = drawSectionTitle('What Needs Attention', mx, ly, leftW, red);
      insights.commonComplaints?.slice(0, 5).forEach((complaint) => {
        ly = drawBulletItem(complaint, mx, ly, leftW, red);
        ly += 0.8;
      });

      // ── RIGHT COLUMN: Key Themes + Rating Distribution ──
      let ry = y;

      // Column divider
      doc.setDrawColor(238, 238, 238);
      doc.setLineWidth(0.2);
      doc.line(rightX - colGap / 2, y - 1, rightX - colGap / 2, ph - 18);

      // Key Themes (aggregate with color coding)
      ry = drawSectionTitle('Key Themes', rightX, ry, rightW, dark);
      const maxFreq = Math.max(...(insights.keyThemes?.map(t => t.frequency) || [1]));
      insights.keyThemes?.slice(0, 6).forEach((theme) => {
        const pct = (theme.frequency / maxFreq) * 100;
        const barColor = theme.sentiment === 'positive' ? green :
                         theme.sentiment === 'negative' ? red : [41, 128, 185];

        doc.setFontSize(5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(68, 68, 68);
        doc.text(sanitize(theme.theme), rightX, ry);
        doc.setTextColor(...dark);
        doc.text(`${theme.frequency}x`, rightX + rightW - doc.getTextWidth(`${theme.frequency}x`), ry);
        ry += 1.2;
        doc.setFillColor(238, 238, 238);
        doc.roundedRect(rightX, ry, rightW, 1.2, 0.6, 0.6, 'F');
        doc.setFillColor(...barColor);
        doc.roundedRect(rightX, ry, (pct / 100) * rightW, 1.2, 0.6, 0.6, 'F');
        ry += 3;
      });
      ry += 2;

      // Rating Distribution by Brand (5-star, 4-star, 1-star with 3 bars each)
      ry = drawSectionTitle('Rating Distribution by Brand', rightX, ry, rightW, [136, 136, 136]);
      const barStars = [5, 4, 1];
      const barW = (rightW - 14) / 3;
      barStars.forEach((star) => {
        doc.setFontSize(5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(68, 68, 68);
        doc.text(`${star} \u2605`, rightX, ry + 1.5);
        const bx = rightX + 10;
        brandIds.forEach((id, bi) => {
          const pct = perBrand[id].total > 0 ? (perBrand[id].dist[star] / perBrand[id].total) * 100 : 0;
          const x = bx + bi * (barW + 2);
          doc.setFillColor(232, 234, 237);
          doc.roundedRect(x, ry, barW, 1.8, 0.9, 0.9, 'F');
          if (pct > 0) {
            const c = star === 1 ? red : brandColors[id];
            doc.setFillColor(...c);
            doc.roundedRect(x, ry, Math.max((pct / 100) * barW, 0.5), 1.8, 0.9, 0.9, 'F');
          }
        });
        ry += 3;
      });
      // Brand labels under bars
      const bx = rightX + 10;
      brandIds.forEach((id, bi) => {
        const x = bx + bi * (barW + 2) + barW / 2;
        doc.setFontSize(4);
        doc.setTextColor(136, 136, 136);
        doc.setFont(undefined, 'normal');
        doc.text(brandShort[id], x, ry, { align: 'center' });
      });

      drawGroupFooter(1, 2);

      // ═══════════════ PAGE 2: TECHS + RECOMMENDATIONS ═══════════════
      doc.addPage();
      drawGroupHeader('Technician Recognition & AI Recommendations', `${tfLabel}  |  Champions Group`);

      let p2y = 14;
      const p2LeftW = (pw - mx * 2 - colGap) * 0.50;
      const p2RightX = mx + p2LeftW + colGap;
      const p2RightW = pw - mx - p2RightX;

      // Column divider
      doc.setDrawColor(238, 238, 238);
      doc.setLineWidth(0.2);
      doc.line(p2RightX - colGap / 2, 14, p2RightX - colGap / 2, ph - 18);

      // ── LEFT: Tech Shoutouts ──
      let tly = p2y;
      if (insights.technicianMentions && insights.technicianMentions.length > 0) {
        tly = drawSectionTitle('Technician Shoutouts', mx, tly, p2LeftW, dark);

        const sortedTechs = [...insights.technicianMentions]
          .sort((a, b) => b.mentions - a.mentions)
          .slice(0, 14);

        sortedTechs.forEach((tech) => {
          doc.setFontSize(5.5);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(...dark);
          doc.text(`${tech.mentions}x`, mx, tly);
          doc.text(sanitize(tech.name), mx + 8, tly);

          if (tech.samplePraise) {
            tly += 2;
            doc.setFontSize(4.5);
            doc.setFont(undefined, 'italic');
            doc.setTextColor(153, 153, 153);
            const snippet = sanitize(tech.samplePraise).substring(0, 65);
            const lines = doc.splitTextToSize(`"${snippet}..."`, p2LeftW - 8);
            doc.text(lines, mx + 8, tly);
            tly += lines.length * 1.8;
          }

          doc.setDrawColor(240, 240, 240);
          doc.setLineWidth(0.15);
          doc.line(mx, tly + 0.5, mx + p2LeftW, tly + 0.5);
          tly += 1.8;
        });
      }

      // ── RIGHT: AI Recommendations ──
      let try_ = p2y;
      try_ = drawSectionTitle('Priority Recommendations', p2RightX, try_, p2RightW, red);

      insights.recommendations?.slice(0, 7).forEach((rec, index) => {
        // Number badge (dark background like template)
        const numSize = 3.8;
        doc.setFillColor(...dark);
        doc.roundedRect(p2RightX, try_ - 2.5, numSize, numSize, 0.5, 0.5, 'F');
        doc.setFontSize(5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${index + 1}`, p2RightX + numSize / 2, try_ - 0.3, { align: 'center' });

        try_ = drawWrapped(rec, p2RightX + 5.5, try_, p2RightW - 5.5, 5, [68, 68, 68]);
        try_ += 1.5;
      });

      drawGroupFooter(2, 2);

      doc.save(`Group_Customer_Insights_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating group PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const exportInsights = async () => {
    if (!insights) return;

    // Route to group template when all locations selected
    if (selectedLocation === 'all') {
      return exportGroupInsights();
    }

    // Brand config based on selected location
    const isLyons = selectedLocation === 'lyons';
    const brand = isLyons ? {
      navy: [27, 42, 74],
      accent: [212, 132, 42],
      kpiStripBg: [250, 246, 241],
      recBadgeBg: [253, 240, 229],
      logoUrl: 'https://www.acrepairsrockwall.com/wp-content/uploads/2025/04/lyons-web-transparent_logo-color.png',
      companyName: 'Lyons Heating, Cooling, Plumbing & Electric',
      phone: '(469) 224-1512',
      website: 'acrepairsrockwall.com',
      filePrefix: 'Lyons',
    } : {
      navy: [10, 38, 71],
      accent: [200, 168, 81],
      kpiStripBg: [240, 244, 248],
      recBadgeBg: [232, 240, 250],
      logoUrl: 'https://www.lexairconditioning.com/wp-content/uploads/2024/01/cropped-lex-logo@2x.png',
      companyName: 'LEX Air Conditioning, Heating, Plumbing & Electrical',
      phone: '(972) 466-1917',
      website: 'lexairconditioning.com',
      filePrefix: 'LEX',
    };

    // Load logo image
    let logoDataUrl = null;
    try {
      const resp = await fetch(brand.logoUrl);
      const blob = await resp.blob();
      logoDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Could not load logo for PDF:', e);
    }

    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const pw = doc.internal.pageSize.getWidth();   // 215.9
    const ph = doc.internal.pageSize.getHeight();   // 279.4
    const mx = 7; // horizontal margin

    const sanitize = (str) => (str || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[\u2026]/g, '...').replace(/[^\x00-\x7F]/g, '');

    // Colors
    const { navy, accent } = brand;
    const green = [46, 139, 87];
    const red = [231, 76, 60];
    const blue = [41, 128, 185];

    // Wrapped text helper - returns new Y after drawing
    const drawWrapped = (text, x, y, maxW, fontSize, color, style = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont(undefined, style);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(sanitize(text), maxW);
      doc.text(lines, x, y);
      return y + lines.length * fontSize * 0.38;
    };

    try {
      // ── HEADER ──
      doc.setFillColor(...navy);
      doc.rect(0, 0, pw, 13, 'F');

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Customer', mx + 1, 7);
      const cw = doc.getTextWidth('Customer ');
      doc.setTextColor(...accent);
      doc.text('Insights Report', mx + 1 + cw, 7);

      // Logo on right side of header
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, 'PNG', pw - mx - 28, 1.5, 27, 10);
        } catch (e) {
          console.warn('Could not add logo to PDF:', e);
        }
      }

      // Subtitle
      doc.setFontSize(5.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(255, 255, 255, 140);

      const tfLabel = timeframes.find(tf => tf.value === selectedTimeframe)?.label || '';
      const locLabel = selectedLocation === 'all' ? 'All Locations' : (locations.find(l => l.id === selectedLocation)?.name || '');
      const genDate = new Date(insights.generatedAt);
      const dateStr = genDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      doc.text(`AI-Powered Review Analysis  |  ${tfLabel}  |  ${locLabel}`, mx + 1, 11);

      // Gold accent line
      doc.setFillColor(...accent);
      doc.rect(0, 13, pw, 1, 'F');

      // ── KPI STRIP ──
      const kpiY = 14;
      const kpiH = 14;
      doc.setFillColor(...brand.kpiStripBg);
      doc.rect(0, kpiY, pw, kpiH, 'F');
      doc.setDrawColor(221, 227, 234);
      doc.line(0, kpiY + kpiH, pw, kpiY + kpiH);

      const kpiW = pw / 5;
      const fiveStarCount = insights.ratingDistribution[5] || 0;
      const fiveStarRate = insights.totalReviews > 0 ? Math.round((fiveStarCount / insights.totalReviews) * 100) : 0;

      const kpis = [
        { value: `${insights.totalReviews}`, label: 'TOTAL REVIEWS', color: navy },
        { value: `${insights.averageRating.toFixed(1)}`, label: 'AVG RATING', color: accent },
        { value: `${insights.sentimentScore || 0}`, label: 'SENTIMENT SCORE', color: green },
        { value: `${fiveStarRate}%`, label: '5-STAR RATE', color: green },
      ];

      kpis.forEach((kpi, i) => {
        const cx = i * kpiW + kpiW / 2;
        doc.setFontSize(15);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...kpi.color);
        doc.text(kpi.value, cx, kpiY + 7.5, { align: 'center' });
        doc.setFontSize(5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(136, 136, 136);
        doc.text(kpi.label, cx, kpiY + 11, { align: 'center' });
        // divider
        if (i < 4) {
          doc.setDrawColor(221, 227, 234);
          doc.line((i + 1) * kpiW, kpiY + 1.5, (i + 1) * kpiW, kpiY + kpiH - 1.5);
        }
      });

      // Mini rating distribution bars (5th KPI cell)
      const rbX = 4 * kpiW + 4;
      const rbW = kpiW - 8;
      let rbY = kpiY + 2;
      [5, 4, 3, 2, 1].forEach((star) => {
        const count = insights.ratingDistribution[star] || 0;
        const pct = insights.totalReviews > 0 ? (count / insights.totalReviews) * 100 : 0;
        const barColor = star >= 4 ? green : star >= 3 ? accent : red;

        doc.setFontSize(4.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(102, 102, 102);
        doc.text(`${star}`, rbX, rbY + 1.5);

        // Track
        const trackX = rbX + 5;
        const trackW = rbW - 16;
        doc.setFillColor(232, 234, 237);
        doc.roundedRect(trackX, rbY, trackW, 1.8, 0.9, 0.9, 'F');
        // Fill
        if (pct > 0) {
          doc.setFillColor(...barColor);
          doc.roundedRect(trackX, rbY, Math.max((pct / 100) * trackW, 0.5), 1.8, 0.9, 0.9, 'F');
        }

        doc.setFontSize(4);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(153, 153, 153);
        doc.text(`${count}`, trackX + trackW + 1.5, rbY + 1.5);
        rbY += 2.2;
      });

      // ── MAIN CONTENT (two columns) ──
      const contentY = kpiY + kpiH + 3;
      const colGap = 5;
      const leftW = (pw - mx * 2 - colGap) * 0.52;
      const rightX = mx + leftW + colGap;
      const rightW = pw - mx - rightX;

      // Section title helper
      const drawSectionTitle = (text, x, y, w, color) => {
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...color);
        doc.text(sanitize(text), x, y);
        doc.setDrawColor(...color);
        doc.setLineWidth(0.5);
        doc.line(x, y + 1, x + w, y + 1);
        return y + 3.5;
      };

      // Bullet item helper
      const drawBulletItem = (text, x, y, maxW, bulletColor) => {
        doc.setFontSize(5.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...bulletColor);
        doc.text('>', x, y);
        return drawWrapped(text, x + 3, y, maxW - 3, 5.5, [68, 68, 68]);
      };

      // ── LEFT COLUMN ──
      let ly = contentY;

      // What Customers Love
      ly = drawSectionTitle('What Customers Love', mx, ly, leftW, green);
      insights.commonPraise?.slice(0, 5).forEach((praise) => {
        ly = drawBulletItem(praise, mx, ly, leftW, green);
        ly += 0.8;
      });
      ly += 2;

      // Areas for Improvement
      ly = drawSectionTitle('Areas for Improvement', mx, ly, leftW, red);
      insights.commonComplaints?.slice(0, 4).forEach((complaint) => {
        ly = drawBulletItem(complaint, mx, ly, leftW, red);
        ly += 0.8;
      });
      ly += 2;

      // Key Themes
      ly = drawSectionTitle('Key Themes', mx, ly, leftW, navy);
      const maxFreq = Math.max(...(insights.keyThemes?.map(t => t.frequency) || [1]));
      insights.keyThemes?.slice(0, 4).forEach((theme) => {
        const pct = (theme.frequency / maxFreq) * 100;
        const barColor = theme.sentiment === 'positive' ? green :
                         theme.sentiment === 'negative' ? red : blue;

        // Theme name + count on same line
        doc.setFontSize(5.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(68, 68, 68);
        doc.text(sanitize(theme.theme), mx, ly);
        doc.setFontSize(5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...navy);
        doc.text(`${theme.frequency} mentions`, mx + leftW - doc.getTextWidth(`${theme.frequency} mentions`), ly);

        ly += 1.5;
        // Track bar
        doc.setFillColor(238, 238, 238);
        doc.roundedRect(mx, ly, leftW, 1.5, 0.75, 0.75, 'F');
        doc.setFillColor(...barColor);
        doc.roundedRect(mx, ly, (pct / 100) * leftW, 1.5, 0.75, 0.75, 'F');
        ly += 3.5;
      });

      // ── RIGHT COLUMN ──
      let ry = contentY;

      // Divider line between columns
      doc.setDrawColor(238, 238, 238);
      doc.setLineWidth(0.2);
      doc.line(rightX - colGap / 2, contentY - 1, rightX - colGap / 2, ph - 18);

      // Technician Shoutouts
      if (insights.technicianMentions && insights.technicianMentions.length > 0) {
        ry = drawSectionTitle('Technician Shoutouts', rightX, ry, rightW, navy);

        const sortedTechs = [...insights.technicianMentions]
          .sort((a, b) => b.mentions - a.mentions)
          .slice(0, 8);

        sortedTechs.forEach((tech) => {
          // Count badge
          doc.setFontSize(5.5);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(...accent);
          doc.text(`${tech.mentions}x`, rightX, ry);

          // Name
          doc.setTextColor(...navy);
          doc.text(sanitize(tech.name), rightX + 8, ry);

          // Sample quote
          if (tech.samplePraise) {
            ry += 2.2;
            doc.setFontSize(4.5);
            doc.setFont(undefined, 'italic');
            doc.setTextColor(136, 136, 136);
            const snippet = sanitize(tech.samplePraise).substring(0, 70);
            const lines = doc.splitTextToSize(`"${snippet}..."`, rightW - 8);
            doc.text(lines, rightX + 8, ry);
            ry += lines.length * 1.8;
          }

          // Row divider
          doc.setDrawColor(240, 240, 240);
          doc.setLineWidth(0.15);
          doc.line(rightX, ry + 0.5, rightX + rightW, ry + 0.5);
          ry += 1.8;
        });
        ry += 2;
      }

      // AI Recommendations
      ry = drawSectionTitle('AI Recommendations', rightX, ry, rightW, blue);
      insights.recommendations?.slice(0, 5).forEach((rec, index) => {
        // Number badge
        const numX = rightX;
        const numSize = 3.8;
        doc.setFillColor(...brand.recBadgeBg);
        doc.roundedRect(numX, ry - 2.5, numSize, numSize, 0.5, 0.5, 'F');
        doc.setFontSize(5.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...navy);
        doc.text(`${index + 1}`, numX + numSize / 2, ry - 0.3, { align: 'center' });

        // Recommendation text
        ry = drawWrapped(rec, rightX + 5.5, ry, rightW - 5.5, 5, [68, 68, 68]);
        ry += 1.5;
      });

      // ── FOOTER ──
      const footerY = ph - 5;
      doc.setFillColor(...accent);
      doc.rect(0, footerY - 3.5, pw, 0.8, 'F');
      doc.setFillColor(...navy);
      doc.rect(0, footerY - 2.7, pw, 7, 'F');

      doc.setFontSize(4.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(255, 255, 255, 128);
      doc.text(`Generated by AI  \u2022  Customer Insights Platform  \u2022  ${brand.companyName}`, mx + 1, footerY);
      doc.text(`${brand.phone}  |  ${brand.website}`, pw - mx - 1, footerY, { align: 'right' });

      // Save
      doc.save(`${brand.filePrefix}_Customer_Insights_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">AI Customer Insights</h2>
              <p className="text-blue-100 text-sm">Powered by Ryan™ </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-gray-300 font-medium mb-2 text-sm">Timeframe</label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                {timeframes.map(tf => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-medium mb-2 text-sm">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Locations</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={generateInsights}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>Generate Insights</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Insights Display */}
          {insights && (
            <div className="space-y-6">
              {/* Export Button */}
              <div className="flex justify-end">
                <button
                  onClick={exportInsights}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Report</span>
                </button>
              </div>

              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                  <BarChart3 className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white">
                    {insights.totalReviews}
                  </div>
                  <div className="text-sm text-gray-400">Total Reviews</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                  <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white flex items-center justify-center gap-1">
                    {getRatingIcon(insights.averageRating)}
                    {insights.averageRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-400">Average Rating</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                  <ThumbsUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-green-400">
                    {insights.commonPraise?.length || 0}
                  </div>
                  <div className="text-sm text-gray-400">Praise Themes</div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                  <Target className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                  <div className={`text-3xl font-bold ${getSentimentColor(insights.sentimentScore || 0)}`}>
                    {insights.sentimentScore || 0}
                  </div>
                  <div className="text-sm text-gray-400">Sentiment Score</div>
                </div>
              </div>

              {/* Sentiment Indicator */}
              {insights.sentimentScore !== undefined && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Target className="h-5 w-5 text-purple-400 mr-2" />
                    Overall Customer Sentiment
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${
                          insights.sentimentScore >= 80 ? 'bg-green-500' :
                          insights.sentimentScore >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${insights.sentimentScore}%` }}
                      ></div>
                    </div>
                    <span className={`text-xl font-bold ${getSentimentColor(insights.sentimentScore)}`}>
                      {getSentimentLabel(insights.sentimentScore)}
                    </span>
                  </div>
                </div>
              )}

              {/* Technician Shoutouts */}
              {insights.technicianMentions && insights.technicianMentions.length > 0 && (
                <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Technician Shoutouts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {insights.technicianMentions
                      .sort((a, b) => b.mentions - a.mentions)
                      .map((tech, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          tech.sentiment === 'positive' ? 'bg-green-900/20 border-green-700/30' :
                          tech.sentiment === 'negative' ? 'bg-red-900/20 border-red-700/30' :
                          'bg-gray-900/50 border-gray-700/30'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-white">{tech.name}</h4>
                          <span className={`px-2 py-1 text-xs rounded font-semibold ${
                            tech.sentiment === 'positive' ? 'bg-green-600 text-white' :
                            tech.sentiment === 'negative' ? 'bg-red-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {tech.mentions}x
                          </span>
                        </div>
                        {tech.samplePraise && (
                          <p className="text-xs text-gray-400 italic">
                            "{tech.samplePraise.substring(0, 100)}{tech.samplePraise.length > 100 ? '...' : ''}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating Distribution */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 mr-2" />
                  Rating Distribution
                </h3>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = insights.ratingDistribution[rating] || 0;
                    const percentage = insights.totalReviews > 0 ? (count / insights.totalReviews) * 100 : 0;

                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-300 w-8">{rating}★</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-3 rounded-full transition-all duration-300 ${
                              rating >= 4 ? 'bg-green-500' :
                              rating >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-400 w-16 text-right">
                          {count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Praise and Complaints */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Common Praise */}
                <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    What Customers Love
                  </h3>
                  <ul className="space-y-2">
                    {insights.commonPraise?.map((praise, index) => (
                      <li key={index} className="text-sm text-gray-200 flex items-start gap-2">
                        <span className="text-green-400 mt-1">✓</span>
                        <span>{praise}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Common Complaints */}
                <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
                    <ThumbsDown className="h-5 w-5 mr-2" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {insights.commonComplaints?.map((complaint, index) => (
                      <li key={index} className="text-sm text-gray-200 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span>{complaint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Key Themes */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 text-blue-400 mr-2" />
                  Key Themes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insights.keyThemes?.map((theme, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        theme.sentiment === 'positive' ? 'bg-green-900/20 border-green-700/30' :
                        theme.sentiment === 'negative' ? 'bg-red-900/20 border-red-700/30' :
                        'bg-gray-900/50 border-gray-700/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-white text-sm">{theme.theme}</h4>
                        <span className={`px-2 py-1 text-xs rounded font-semibold ${
                          theme.sentiment === 'positive' ? 'bg-green-600 text-white' :
                          theme.sentiment === 'negative' ? 'bg-red-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {theme.frequency}x
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 italic">
                        "{theme.examples?.[0]?.substring(0, 100) || 'No example available'}..."
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Recommendations */}
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  AI-Powered Recommendations
                </h3>
                <ul className="space-y-3">
                  {insights.recommendations?.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-200 flex items-start gap-3">
                      <span className="text-blue-400 text-lg mt-0.5">💡</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Metadata */}
              <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700">
                Generated on {new Date(insights.generatedAt).toLocaleString()} •
                Timeframe: {timeframes.find(tf => tf.value === selectedTimeframe)?.label} •
                Location: {selectedLocation === 'all' ? 'All Locations' : locations.find(l => l.id === selectedLocation)?.name}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!insights && !loading && (
            <div className="text-center py-16">
              <Sparkles className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Ready to Analyze</h3>
              <p className="text-gray-400 mb-6">
                Select your preferences above and click "Generate Insights" to get AI-powered analysis of your customer reviews.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewInsightsModal;
