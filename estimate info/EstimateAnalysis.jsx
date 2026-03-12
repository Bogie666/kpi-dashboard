import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';

const EstimateAnalysis = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [dateRange, setDateRange] = useState('MTD');

  // Color palette matching existing dashboard
  const colors = {
    background: '#1a1f2e',
    cardBg: '#252b3b',
    cardBorder: '#2d3548',
    textPrimary: '#ffffff',
    textSecondary: '#8b95a5',
    accent: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    cyan: '#06b6d4',
    purple: '#8b5cf6',
    orange: '#f97316',
    teal: '#14b8a6',
  };

  // Department configuration
  const departments = [
    { id: 'all', label: 'All Departments', color: colors.accent },
    { id: 'sales', label: 'Sales', color: colors.accent },
    { id: 'demand', label: 'Demand Calls', color: colors.success },
    { id: 'maintenance', label: 'Maintenance', color: colors.orange },
    { id: 'plumbing', label: 'Plumbing', color: colors.cyan },
    { id: 'electrical', label: 'Electrical', color: colors.warning },
    { id: 'tyler', label: 'Tyler', color: colors.purple },
  ];

  // Mock data - will be replaced with API data
  const departmentData = {
    all: {
      totalOpportunities: 6511,
      won: 2686,
      closeRate: 41.3,
      closeRateTarget: 45,
      avgTicket: 5765,
      avgTicketTarget: 5000,
      realisticUnsold: 8234567,
      avgOptionsPerOpp: 3.0,
      tierSelection: { low: 57.7, mid: 26.2, high: 16.1 },
      timeToClose: { sameDay: 88.9, within7: 8.2, beyond7: 2.9 },
      seasonality: [
        { month: 'Jun', opps: 899, won: 440, closeRate: 48.9, avgTicket: 4520 },
        { month: 'Jul', opps: 926, won: 471, closeRate: 50.9, avgTicket: 5180 },
        { month: 'Aug', opps: 1017, won: 475, closeRate: 46.7, avgTicket: 5340 },
        { month: 'Sep', opps: 994, won: 415, closeRate: 41.8, avgTicket: 5890 },
        { month: 'Oct', opps: 988, won: 363, closeRate: 36.7, avgTicket: 6120 },
        { month: 'Nov', opps: 778, won: 260, closeRate: 33.4, avgTicket: 6450 },
        { month: 'Dec', opps: 909, won: 262, closeRate: 28.8, avgTicket: 6780 },
      ],
    },
    sales: {
      totalOpportunities: 833,
      won: 473,
      closeRate: 56.8,
      closeRateTarget: 60,
      avgTicket: 15746,
      avgTicketTarget: 15000,
      realisticUnsold: 4250000,
      avgOptionsPerOpp: 2.7,
      tierSelection: { low: 45.6, mid: 34.5, high: 19.9 },
      timeToClose: { sameDay: 79.3, within7: 16.4, beyond7: 4.3 },
      seasonality: [
        { month: 'Jun', opps: 173, won: 98, closeRate: 56.6, avgTicket: 14806 },
        { month: 'Jul', opps: 153, won: 89, closeRate: 58.2, avgTicket: 14390 },
        { month: 'Aug', opps: 122, won: 68, closeRate: 55.7, avgTicket: 16131 },
        { month: 'Sep', opps: 114, won: 73, closeRate: 64.0, avgTicket: 16425 },
        { month: 'Oct', opps: 112, won: 57, closeRate: 50.9, avgTicket: 16567 },
        { month: 'Nov', opps: 84, won: 47, closeRate: 56.0, avgTicket: 16157 },
        { month: 'Dec', opps: 75, won: 41, closeRate: 54.7, avgTicket: 17332 },
      ],
    },
    demand: {
      totalOpportunities: 2041,
      won: 1235,
      closeRate: 60.5,
      closeRateTarget: 55,
      avgTicket: 2110,
      avgTicketTarget: 2000,
      realisticUnsold: 1420000,
      avgOptionsPerOpp: 2.6,
      tierSelection: { low: 64.8, mid: 19.2, high: 16.0 },
      timeToClose: { sameDay: 95.4, within7: 3.8, beyond7: 0.8 },
      seasonality: [
        { month: 'Jun', opps: 342, won: 219, closeRate: 64.0, avgTicket: 1695 },
        { month: 'Jul', opps: 418, won: 270, closeRate: 64.6, avgTicket: 1991 },
        { month: 'Aug', opps: 422, won: 274, closeRate: 64.9, avgTicket: 2015 },
        { month: 'Sep', opps: 322, won: 184, closeRate: 57.1, avgTicket: 2476 },
        { month: 'Oct', opps: 173, won: 94, closeRate: 54.3, avgTicket: 2599 },
        { month: 'Nov', opps: 172, won: 87, closeRate: 50.6, avgTicket: 2315 },
        { month: 'Dec', opps: 192, won: 107, closeRate: 55.7, avgTicket: 2075 },
      ],
    },
    maintenance: {
      totalOpportunities: 3637,
      won: 978,
      closeRate: 26.9,
      closeRateTarget: 30,
      avgTicket: 2953,
      avgTicketTarget: 2500,
      realisticUnsold: 4150000,
      avgOptionsPerOpp: 3.6,
      tierSelection: { low: 62.8, mid: 28.9, high: 8.4 },
      timeToClose: { sameDay: 92.0, within7: 4.3, beyond7: 3.7 },
      seasonality: [
        { month: 'Jun', opps: 384, won: 123, closeRate: 32.0, avgTicket: 1718 },
        { month: 'Jul', opps: 355, won: 112, closeRate: 31.5, avgTicket: 2733 },
        { month: 'Aug', opps: 473, won: 133, closeRate: 28.1, avgTicket: 2671 },
        { month: 'Sep', opps: 558, won: 158, closeRate: 28.3, avgTicket: 3016 },
        { month: 'Oct', opps: 703, won: 212, closeRate: 30.2, avgTicket: 2829 },
        { month: 'Nov', opps: 522, won: 126, closeRate: 24.1, avgTicket: 3428 },
        { month: 'Dec', opps: 642, won: 114, closeRate: 17.8, avgTicket: 3716 },
      ],
    },
    plumbing: {
      totalOpportunities: 845,
      won: 412,
      closeRate: 48.8,
      closeRateTarget: 50,
      avgTicket: 1850,
      avgTicketTarget: 1800,
      realisticUnsold: 680000,
      avgOptionsPerOpp: 2.4,
      tierSelection: { low: 58.2, mid: 25.4, high: 16.4 },
      timeToClose: { sameDay: 89.5, within7: 7.2, beyond7: 3.3 },
      seasonality: [
        { month: 'Jun', opps: 125, won: 62, closeRate: 49.6, avgTicket: 1720 },
        { month: 'Jul', opps: 132, won: 68, closeRate: 51.5, avgTicket: 1810 },
        { month: 'Aug', opps: 118, won: 55, closeRate: 46.6, avgTicket: 1890 },
        { month: 'Sep', opps: 128, won: 60, closeRate: 46.9, avgTicket: 1920 },
        { month: 'Oct', opps: 115, won: 58, closeRate: 50.4, avgTicket: 1850 },
        { month: 'Nov', opps: 108, won: 52, closeRate: 48.1, avgTicket: 1880 },
        { month: 'Dec', opps: 119, won: 57, closeRate: 47.9, avgTicket: 1910 },
      ],
    },
    electrical: {
      totalOpportunities: 520,
      won: 245,
      closeRate: 47.1,
      closeRateTarget: 50,
      avgTicket: 1420,
      avgTicketTarget: 1500,
      realisticUnsold: 345000,
      avgOptionsPerOpp: 2.2,
      tierSelection: { low: 52.3, mid: 29.8, high: 17.9 },
      timeToClose: { sameDay: 87.2, within7: 9.1, beyond7: 3.7 },
      seasonality: [
        { month: 'Jun', opps: 78, won: 38, closeRate: 48.7, avgTicket: 1380 },
        { month: 'Jul', opps: 82, won: 41, closeRate: 50.0, avgTicket: 1410 },
        { month: 'Aug', opps: 75, won: 34, closeRate: 45.3, avgTicket: 1450 },
        { month: 'Sep', opps: 72, won: 33, closeRate: 45.8, avgTicket: 1420 },
        { month: 'Oct', opps: 68, won: 32, closeRate: 47.1, avgTicket: 1440 },
        { month: 'Nov', opps: 70, won: 34, closeRate: 48.6, avgTicket: 1400 },
        { month: 'Dec', opps: 75, won: 33, closeRate: 44.0, avgTicket: 1460 },
      ],
    },
    tyler: {
      totalOpportunities: 635,
      won: 343,
      closeRate: 54.0,
      closeRateTarget: 50,
      avgTicket: 1180,
      avgTicketTarget: 1200,
      realisticUnsold: 290000,
      avgOptionsPerOpp: 2.8,
      tierSelection: { low: 61.5, mid: 24.2, high: 14.3 },
      timeToClose: { sameDay: 91.3, within7: 5.8, beyond7: 2.9 },
      seasonality: [
        { month: 'Jun', opps: 95, won: 52, closeRate: 54.7, avgTicket: 1150 },
        { month: 'Jul', opps: 102, won: 58, closeRate: 56.9, avgTicket: 1170 },
        { month: 'Aug', opps: 98, won: 51, closeRate: 52.0, avgTicket: 1190 },
        { month: 'Sep', opps: 88, won: 47, closeRate: 53.4, avgTicket: 1200 },
        { month: 'Oct', opps: 85, won: 46, closeRate: 54.1, avgTicket: 1180 },
        { month: 'Nov', opps: 82, won: 44, closeRate: 53.7, avgTicket: 1160 },
        { month: 'Dec', opps: 85, won: 45, closeRate: 52.9, avgTicket: 1210 },
      ],
    },
  };

  const currentData = departmentData[selectedDepartment];
  const currentDept = departments.find(d => d.id === selectedDepartment);

  // Comparison table data
  const comparisonData = [
    { metric: 'Total Opportunities', sales: '833', demand: '2,041', maintenance: '3,637', plumbing: '845', electrical: '520', tyler: '635' },
    { metric: 'Close Rate', sales: '56.8%', demand: '60.5%', maintenance: '26.9%', plumbing: '48.8%', electrical: '47.1%', tyler: '54.0%' },
    { metric: 'Avg Options/Opp', sales: '2.7', demand: '2.6', maintenance: '3.6', plumbing: '2.4', electrical: '2.2', tyler: '2.8' },
    { metric: 'Avg Ticket', sales: '$15,746', demand: '$2,110', maintenance: '$2,953', plumbing: '$1,850', electrical: '$1,420', tyler: '$1,180' },
    { metric: 'Low Tier %', sales: '45.6%', demand: '64.8%', maintenance: '62.8%', plumbing: '58.2%', electrical: '52.3%', tyler: '61.5%' },
    { metric: 'High Tier %', sales: '19.9%', demand: '16.0%', maintenance: '8.4%', plumbing: '16.4%', electrical: '17.9%', tyler: '14.3%' },
    { metric: 'Same Day Close', sales: '79.3%', demand: '95.4%', maintenance: '92.0%', plumbing: '89.5%', electrical: '87.2%', tyler: '91.3%' },
  ];

  // Helper function for status color
  const getStatusColor = (value, target) => {
    const ratio = value / target;
    if (ratio >= 1.0) return colors.success;
    if (ratio >= 0.85) return colors.warning;
    return colors.danger;
  };

  // Tier selection chart data
  const tierData = [
    { name: 'Low', value: currentData.tierSelection.low, color: colors.success },
    { name: 'Mid', value: currentData.tierSelection.mid, color: colors.warning },
    { name: 'High', value: currentData.tierSelection.high, color: colors.accent },
  ];

  // Time to close chart data
  const timeToCloseData = [
    { name: 'Same Day', value: currentData.timeToClose.sameDay, color: colors.success },
    { name: '1-7 Days', value: currentData.timeToClose.within7, color: colors.warning },
    { name: '8+ Days', value: currentData.timeToClose.beyond7, color: colors.danger },
  ];

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      padding: '24px',
      backgroundColor: colors.background,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: colors.textPrimary,
      margin: 0,
    },
    dateButtons: {
      display: 'flex',
      gap: '8px',
    },
    dateButton: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    dateButtonActive: {
      backgroundColor: colors.accent,
      color: colors.textPrimary,
    },
    dateButtonInactive: {
      backgroundColor: '#374151',
      color: '#9ca3af',
    },
    tabs: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      flexWrap: 'wrap',
    },
    tab: {
      padding: '10px 20px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    tabInactive: {
      backgroundColor: '#374151',
      color: '#9ca3af',
    },
    kpiRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px',
    },
    kpiCard: {
      backgroundColor: colors.cardBg,
      borderRadius: '12px',
      padding: '20px',
      borderLeft: '4px solid',
    },
    kpiLabel: {
      fontSize: '13px',
      color: '#9ca3af',
      marginBottom: '8px',
    },
    kpiValue: {
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '4px',
    },
    kpiSubtext: {
      fontSize: '12px',
      color: '#6b7280',
    },
    chartRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginBottom: '24px',
    },
    chartCard: {
      backgroundColor: colors.cardBg,
      borderRadius: '12px',
      padding: '20px',
    },
    chartTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: '16px',
    },
    chartContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    legendContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      paddingLeft: '16px',
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minWidth: '140px',
    },
    legendDot: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      marginRight: '8px',
    },
    legendLabel: {
      color: '#9ca3af',
      fontSize: '14px',
    },
    legendValue: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: '14px',
    },
    fullWidthCard: {
      backgroundColor: colors.cardBg,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      textAlign: 'center',
      padding: '12px 16px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#9ca3af',
      borderBottom: '1px solid #374151',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    thLeft: {
      textAlign: 'left',
    },
    td: {
      padding: '14px 16px',
      fontSize: '14px',
      color: colors.textPrimary,
      borderBottom: '1px solid #2d3548',
      textAlign: 'center',
    },
    tdLeft: {
      textAlign: 'left',
      color: '#9ca3af',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600',
      color: colors.textPrimary,
    },
    insightsCard: {
      backgroundColor: colors.cardBg,
      borderRadius: '12px',
      padding: '20px',
      borderLeft: `4px solid ${colors.warning}`,
    },
    insightsTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: '12px',
    },
    insightsList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    insightItem: {
      color: '#9ca3af',
      fontSize: '14px',
      marginBottom: '8px',
      lineHeight: '1.5',
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Estimate Analysis</h1>
        <div style={styles.dateButtons}>
          {['MTD', 'YTD', 'Last Month'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              style={{
                ...styles.dateButton,
                ...(dateRange === range ? styles.dateButtonActive : styles.dateButtonInactive),
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Department Tabs */}
      <div style={styles.tabs}>
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => setSelectedDepartment(dept.id)}
            style={{
              ...styles.tab,
              ...(selectedDepartment === dept.id
                ? { backgroundColor: dept.color, color: colors.textPrimary }
                : styles.tabInactive),
            }}
          >
            {dept.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiRow}>
        <div style={{ ...styles.kpiCard, borderLeftColor: currentDept.color }}>
          <div style={styles.kpiLabel}>Total Opportunities</div>
          <div style={{ ...styles.kpiValue, color: currentDept.color }}>
            {currentData.totalOpportunities.toLocaleString()}
          </div>
          <div style={styles.kpiSubtext}>{currentData.won.toLocaleString()} won</div>
        </div>
        <div style={{ ...styles.kpiCard, borderLeftColor: getStatusColor(currentData.closeRate, currentData.closeRateTarget) }}>
          <div style={styles.kpiLabel}>Close Rate</div>
          <div style={{ ...styles.kpiValue, color: getStatusColor(currentData.closeRate, currentData.closeRateTarget) }}>
            {currentData.closeRate}%
          </div>
          <div style={styles.kpiSubtext}>Target: {currentData.closeRateTarget}%</div>
        </div>
        <div style={{ ...styles.kpiCard, borderLeftColor: colors.warning }}>
          <div style={styles.kpiLabel}>Realistic Unsold Revenue</div>
          <div style={{ ...styles.kpiValue, color: colors.warning }}>
            ${(currentData.realisticUnsold / 1000000).toFixed(2)}M
          </div>
          <div style={styles.kpiSubtext}>Weighted calculation</div>
        </div>
        <div style={{ ...styles.kpiCard, borderLeftColor: getStatusColor(currentData.avgTicket, currentData.avgTicketTarget) }}>
          <div style={styles.kpiLabel}>Avg Ticket</div>
          <div style={{ ...styles.kpiValue, color: getStatusColor(currentData.avgTicket, currentData.avgTicketTarget) }}>
            ${currentData.avgTicket.toLocaleString()}
          </div>
          <div style={styles.kpiSubtext}>Target: ${currentData.avgTicketTarget.toLocaleString()}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={styles.chartRow}>
        {/* Tier Selection */}
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Customer Tier Selection</div>
          <div style={styles.chartContainer}>
            <div style={{ width: '50%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {tierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: colors.cardBg, border: 'none', borderRadius: '8px' }}
                    formatter={(value) => [`${value}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={styles.legendContainer}>
              {tierData.map((tier) => (
                <div key={tier.name} style={styles.legendItem}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ ...styles.legendDot, backgroundColor: tier.color }} />
                    <span style={styles.legendLabel}>{tier.name} Tier</span>
                  </div>
                  <span style={styles.legendValue}>{tier.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Time to Close */}
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Time to Close</div>
          <div style={styles.chartContainer}>
            <div style={{ width: '50%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeToCloseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {timeToCloseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: colors.cardBg, border: 'none', borderRadius: '8px' }}
                    formatter={(value) => [`${value}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={styles.legendContainer}>
              {timeToCloseData.map((item) => (
                <div key={item.name} style={styles.legendItem}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ ...styles.legendDot, backgroundColor: item.color }} />
                    <span style={styles.legendLabel}>{item.name}</span>
                  </div>
                  <span style={styles.legendValue}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Seasonality Chart */}
      <div style={styles.fullWidthCard}>
        <div style={styles.chartTitle}>Close Rate by Month</div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentData.seasonality}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
              <XAxis dataKey="month" stroke="#8b95a5" />
              <YAxis stroke="#8b95a5" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: colors.cardBg, border: 'none', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'closeRate') return [`${value}%`, 'Close Rate'];
                  return [value, name];
                }}
              />
              <ReferenceLine y={currentData.closeRateTarget} stroke={colors.danger} strokeDasharray="5 5" />
              <Bar dataKey="closeRate" fill={currentDept.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '12px', backgroundColor: currentDept.color, borderRadius: '2px' }} />
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>Close Rate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '2px', backgroundColor: colors.danger, borderStyle: 'dashed' }} />
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>Target: {currentData.closeRateTarget}%</span>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div style={styles.fullWidthCard}>
        <div style={styles.chartTitle}>Department Comparison</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, ...styles.thLeft }}>Metric</th>
              <th style={styles.th}>
                <span style={{ ...styles.badge, backgroundColor: colors.accent }}>Sales</span>
              </th>
              <th style={styles.th}>
                <span style={{ ...styles.badge, backgroundColor: colors.success }}>Demand</span>
              </th>
              <th style={styles.th}>
                <span style={{ ...styles.badge, backgroundColor: colors.orange }}>Maint.</span>
              </th>
              <th style={styles.th}>
                <span style={{ ...styles.badge, backgroundColor: colors.cyan }}>Plumbing</span>
              </th>
              <th style={styles.th}>
                <span style={{ ...styles.badge, backgroundColor: colors.warning }}>Electrical</span>
              </th>
              <th style={styles.th}>
                <span style={{ ...styles.badge, backgroundColor: colors.purple }}>Tyler</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, index) => (
              <tr key={row.metric} style={{ backgroundColor: index % 2 === 1 ? 'rgba(45, 53, 72, 0.3)' : 'transparent' }}>
                <td style={{ ...styles.td, ...styles.tdLeft }}>{row.metric}</td>
                <td style={styles.td}>{row.sales}</td>
                <td style={styles.td}>{row.demand}</td>
                <td style={styles.td}>{row.maintenance}</td>
                <td style={styles.td}>{row.plumbing}</td>
                <td style={styles.td}>{row.electrical}</td>
                <td style={styles.td}>{row.tyler}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key Insights */}
      <div style={styles.insightsCard}>
        <div style={styles.insightsTitle}>💡 Key Insights</div>
        <ul style={styles.insightsList}>
          <li style={styles.insightItem}>
            • <strong style={{ color: colors.textPrimary }}>Sales</strong> customers tolerate higher prices (19.9% pick high tier vs 8.4% for Maintenance)
          </li>
          <li style={styles.insightItem}>
            • <strong style={{ color: colors.textPrimary }}>Demand Calls</strong> close fastest — 95.4% same day. Follow-up window is 24-48 hours.
          </li>
          <li style={styles.insightItem}>
            • <strong style={{ color: colors.textPrimary }}>Maintenance</strong> has the lowest close rate (26.9%) — these are surprise expenses for customers
          </li>
          <li style={styles.insightItem}>
            • December is the toughest month across all departments — avoid big asks during holidays
          </li>
        </ul>
      </div>
    </div>
  );
};

export default EstimateAnalysis;
