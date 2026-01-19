import React, { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';

const SYNC_API = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/sync_servicetitan_data';

// Department mapping from ServiceTitan business units
const departmentMapping = {
  'Service Sales': 'sales',
  'LYONS Sales': 'sales',
  'Service Residential': 'demand',
  'LYONS Service': 'demand',
  'Service Maintenance': 'maintenance',
  'LYONS Maintenance': 'maintenance',
  'Plumbing': 'plumbing',
  'Plumbing Service': 'plumbing',
  'Plumbing Sales': 'plumbing',
  'Plumbing Maintenance': 'plumbing',
  'Electrical': 'electrical',
  'Electrical Service': 'electrical',
  'Electrical Sales': 'electrical',
  'Electrical Maintenance': 'electrical',
  'Tyler Service': 'tyler',
  'Tyler Maintenance': 'tyler',
  'Tyler Sales': 'tyler',
};

const getDepartment = (businessUnit) => {
  if (!businessUnit) return 'other';
  const normalized = businessUnit.trim();
  return departmentMapping[normalized] || 'other';
};

// Calculate date range based on period type
const getDateRange = (periodType, customStart = null, customEnd = null) => {
  const today = new Date();
  let startDate, endDate;

  if (periodType === 'Custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  } else if (periodType === 'MTD') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = today;
  } else if (periodType === 'YTD') {
    startDate = new Date(today.getFullYear(), 0, 1);
    endDate = today;
  } else if (periodType === 'Last Month') {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    startDate = lastMonth;
    endDate = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (periodType === 'Last 6 Months') {
    startDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    endDate = today;
  } else if (periodType === 'Last 12 Months') {
    startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    endDate = today;
  }

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
};

// Group array by key
const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

const EstimateAnalysis = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [dateRange, setDateRange] = useState('Last 6 Months');
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showRevenueTooltip, setShowRevenueTooltip] = useState(false);

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

  // Department configuration with targets
  const departments = [
    { id: 'all', label: 'All Departments', color: colors.accent, closeRateTarget: 45, avgTicketTarget: 5000 },
    { id: 'sales', label: 'Sales', color: colors.accent, closeRateTarget: 60, avgTicketTarget: 15000 },
    { id: 'demand', label: 'Service', color: colors.success, closeRateTarget: 55, avgTicketTarget: 2000 },
    { id: 'maintenance', label: 'Maintenance', color: colors.orange, closeRateTarget: 30, avgTicketTarget: 2500 },
    { id: 'plumbing', label: 'Plumbing', color: colors.cyan, closeRateTarget: 50, avgTicketTarget: 1800 },
    { id: 'electrical', label: 'Electrical', color: colors.warning, closeRateTarget: 50, avgTicketTarget: 1500 },
    { id: 'tyler', label: 'Tyler', color: colors.purple, closeRateTarget: 50, avgTicketTarget: 1200 },
  ];

  // Fetch data when date range changes
  useEffect(() => {
    // Skip fetch if Custom is selected but dates aren't set
    if (dateRange === 'Custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { start, end } = getDateRange(dateRange, customStartDate, customEndDate);
        const response = await fetch(
          `${SYNC_API}/estimate-analysis?start_date=${start}&end_date=${end}`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success' && result.data) {
          setRawData(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching estimate analysis data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, customStartDate, customEndDate]);

  // Process raw data into analytics - memoized for performance
  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return null;
    }

    // Add department to each record
    const dataWithDept = rawData.map(record => ({
      ...record,
      department: getDepartment(record.business_unit)
    }));

    // Filter by selected department
    const filteredData = selectedDepartment === 'all'
      ? dataWithDept
      : dataWithDept.filter(r => r.department === selectedDepartment);

    if (filteredData.length === 0) {
      return null;
    }

    // Group by opportunity number
    const opportunities = groupBy(filteredData, 'opportunity_number');
    const totalOpportunities = Object.keys(opportunities).length;

    // Separate won vs unsold opportunities
    const wonOpps = {};
    const unsoldOpps = {};

    for (const [oppNum, estimates] of Object.entries(opportunities)) {
      const status = estimates[0]?.opportunity_status?.toLowerCase() || '';
      if (status === 'won') {
        wonOpps[oppNum] = estimates;
      } else if (status !== 'dismissed') {
        unsoldOpps[oppNum] = estimates;
      }
    }

    const wonCount = Object.keys(wonOpps).length;
    const closeRate = totalOpportunities > 0 ? (wonCount / totalOpportunities) * 100 : 0;

    // Calculate average ticket (mean of each opportunity's estimates, then average)
    const opportunityAverages = Object.values(opportunities).map(estimates => {
      const total = estimates.reduce((sum, e) => sum + (e.estimates_subtotal || 0), 0);
      return total / estimates.length;
    });
    const avgTicket = opportunityAverages.length > 0
      ? opportunityAverages.reduce((a, b) => a + b, 0) / opportunityAverages.length
      : 0;

    // Average options per opportunity
    const avgOptionsPerOpp = totalOpportunities > 0 ? filteredData.length / totalOpportunities : 0;

    // Tier Selection Analysis (for won opportunities with multiple estimates)
    const tierCounts = { low: 0, mid: 0, high: 0 };
    let multiOptionWins = 0;

    for (const [, estimates] of Object.entries(wonOpps)) {
      if (estimates.length <= 1) continue;

      // Sort by price ascending
      const sorted = [...estimates].sort((a, b) => (a.estimates_subtotal || 0) - (b.estimates_subtotal || 0));

      // Find the sold estimate
      const soldEstimate = sorted.find(e => e.estimate_status?.toLowerCase() === 'sold');
      if (!soldEstimate) continue;

      // Find its rank
      const rank = sorted.findIndex(e => e.estimates_subtotal === soldEstimate.estimates_subtotal) + 1;
      const numOptions = sorted.length;

      if (rank === 1) {
        tierCounts.low++;
      } else if (rank === numOptions) {
        tierCounts.high++;
      } else {
        tierCounts.mid++;
      }
      multiOptionWins++;
    }

    const tierSelection = multiOptionWins > 0 ? {
      low: parseFloat((tierCounts.low / multiOptionWins * 100).toFixed(1)),
      mid: parseFloat((tierCounts.mid / multiOptionWins * 100).toFixed(1)),
      high: parseFloat((tierCounts.high / multiOptionWins * 100).toFixed(1))
    } : { low: 0, mid: 0, high: 0 };

    // Time to Close Analysis
    const timeBuckets = { sameDay: 0, within7: 0, beyond7: 0 };
    let validTimeCount = 0;

    for (const [, estimates] of Object.entries(wonOpps)) {
      const creationDate = estimates[0]?.creation_date;
      const soldOn = estimates[0]?.sold_on;

      if (!creationDate || !soldOn) continue;

      const created = new Date(creationDate);
      const sold = new Date(soldOn);
      const daysToClose = Math.floor((sold - created) / (1000 * 60 * 60 * 24));

      if (daysToClose < 0 || daysToClose > 365) continue;

      validTimeCount++;
      if (daysToClose === 0) {
        timeBuckets.sameDay++;
      } else if (daysToClose <= 7) {
        timeBuckets.within7++;
      } else {
        timeBuckets.beyond7++;
      }
    }

    const timeToClose = validTimeCount > 0 ? {
      sameDay: parseFloat((timeBuckets.sameDay / validTimeCount * 100).toFixed(1)),
      within7: parseFloat((timeBuckets.within7 / validTimeCount * 100).toFixed(1)),
      beyond7: parseFloat((timeBuckets.beyond7 / validTimeCount * 100).toFixed(1))
    } : { sameDay: 0, within7: 0, beyond7: 0 };

    // Seasonality Analysis (by month)
    const byMonth = {};
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const [oppNum, estimates] of Object.entries(opportunities)) {
      const creationDate = estimates[0]?.creation_date;
      if (!creationDate) continue;

      const date = new Date(creationDate);
      const monthKey = monthOrder[date.getMonth()];

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { opps: 0, won: 0, totalValue: 0, wonValue: 0 };
      }

      byMonth[monthKey].opps++;

      const oppAvg = estimates.reduce((sum, e) => sum + (e.estimates_subtotal || 0), 0) / estimates.length;
      byMonth[monthKey].totalValue += oppAvg;

      if (estimates[0]?.opportunity_status?.toLowerCase() === 'won') {
        byMonth[monthKey].won++;
        // Get the sold estimate value for won tickets
        const soldEstimate = estimates.find(e => e.estimate_status?.toLowerCase() === 'sold');
        if (soldEstimate) {
          byMonth[monthKey].wonValue += soldEstimate.estimates_subtotal || 0;
        }
      }
    }

    const seasonality = monthOrder
      .filter(month => byMonth[month])
      .map(month => ({
        month,
        opps: byMonth[month].opps,
        won: byMonth[month].won,
        closeRate: byMonth[month].opps > 0
          ? parseFloat((byMonth[month].won / byMonth[month].opps * 100).toFixed(1))
          : 0,
        avgTicket: byMonth[month].won > 0
          ? Math.round(byMonth[month].wonValue / byMonth[month].won)
          : 0
      }));

    // Calculate realistic unsold revenue using department-specific method
    const dept = departments.find(d => d.id === selectedDepartment);
    let realisticUnsold = 0;

    const multipliers = {
      sales: { method: 'weighted', weights: { low: 0.456, mid: 0.345, high: 0.199 } },
      demand: { method: 'minMultiplier', multiplier: 1.70 },
      maintenance: { method: 'minMultiplier', multiplier: 1.60 },
      plumbing: { method: 'minMultiplier', multiplier: 1.65 },
      electrical: { method: 'minMultiplier', multiplier: 1.65 },
      tyler: { method: 'minMultiplier', multiplier: 1.65 },
      all: { method: 'minMultiplier', multiplier: 1.65 }
    };

    const config = multipliers[selectedDepartment] || multipliers.all;

    for (const [, estimates] of Object.entries(unsoldOpps)) {
      if (config.method === 'weighted') {
        if (estimates.length === 1) {
          realisticUnsold += estimates[0].estimates_subtotal || 0;
        } else {
          const sorted = [...estimates].sort((a, b) => (a.estimates_subtotal || 0) - (b.estimates_subtotal || 0));
          const low = sorted[0]?.estimates_subtotal || 0;
          const high = sorted[sorted.length - 1]?.estimates_subtotal || 0;
          const mid = sorted.length > 2
            ? sorted[Math.floor(sorted.length / 2)]?.estimates_subtotal || 0
            : (low + high) / 2;
          realisticUnsold += (low * config.weights.low) + (mid * config.weights.mid) + (high * config.weights.high);
        }
      } else {
        const minEstimate = Math.min(...estimates.map(e => e.estimates_subtotal || 0));
        realisticUnsold += minEstimate * config.multiplier;
      }
    }

    return {
      totalOpportunities,
      won: wonCount,
      closeRate: parseFloat(closeRate.toFixed(1)),
      closeRateTarget: dept?.closeRateTarget || 45,
      avgTicket: Math.round(avgTicket),
      avgTicketTarget: dept?.avgTicketTarget || 5000,
      realisticUnsold: Math.round(realisticUnsold),
      avgOptionsPerOpp: parseFloat(avgOptionsPerOpp.toFixed(1)),
      tierSelection,
      timeToClose,
      seasonality
    };
  }, [rawData, selectedDepartment, departments]);

  // Generate comparison data for all departments
  const comparisonData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    const dataWithDept = rawData.map(record => ({
      ...record,
      department: getDepartment(record.business_unit)
    }));

    const metrics = ['sales', 'demand', 'maintenance', 'plumbing', 'electrical', 'tyler'].map(deptId => {
      const deptData = dataWithDept.filter(r => r.department === deptId);
      if (deptData.length === 0) return { deptId, totalOpportunities: 0 };

      const opportunities = groupBy(deptData, 'opportunity_number');
      const totalOpportunities = Object.keys(opportunities).length;
      const wonCount = Object.values(opportunities).filter(
        estimates => estimates[0]?.opportunity_status?.toLowerCase() === 'won'
      ).length;

      const closeRate = totalOpportunities > 0 ? (wonCount / totalOpportunities) * 100 : 0;
      const avgOptionsPerOpp = totalOpportunities > 0 ? deptData.length / totalOpportunities : 0;

      const oppAvgs = Object.values(opportunities).map(estimates => {
        const total = estimates.reduce((sum, e) => sum + (e.estimates_subtotal || 0), 0);
        return total / estimates.length;
      });
      const avgTicket = oppAvgs.length > 0 ? oppAvgs.reduce((a, b) => a + b, 0) / oppAvgs.length : 0;

      // Tier selection
      let tierLow = 0, tierHigh = 0, multiWins = 0;
      const wonOpps = Object.entries(opportunities).filter(
        ([, estimates]) => estimates[0]?.opportunity_status?.toLowerCase() === 'won'
      );

      for (const [, estimates] of wonOpps) {
        if (estimates.length <= 1) continue;
        const sorted = [...estimates].sort((a, b) => (a.estimates_subtotal || 0) - (b.estimates_subtotal || 0));
        const soldEstimate = sorted.find(e => e.estimate_status?.toLowerCase() === 'sold');
        if (!soldEstimate) continue;
        const rank = sorted.findIndex(e => e.estimates_subtotal === soldEstimate.estimates_subtotal) + 1;
        if (rank === 1) tierLow++;
        else if (rank === sorted.length) tierHigh++;
        multiWins++;
      }

      // Same day close
      let sameDay = 0, validTime = 0;
      for (const [, estimates] of wonOpps) {
        const creationDate = estimates[0]?.creation_date;
        const soldOn = estimates[0]?.sold_on;
        if (!creationDate || !soldOn) continue;
        const days = Math.floor((new Date(soldOn) - new Date(creationDate)) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 365) {
          validTime++;
          if (days === 0) sameDay++;
        }
      }

      return {
        deptId,
        totalOpportunities,
        closeRate: closeRate.toFixed(1) + '%',
        avgOptionsPerOpp: avgOptionsPerOpp.toFixed(1),
        avgTicket: '$' + Math.round(avgTicket).toLocaleString(),
        tierLow: multiWins > 0 ? (tierLow / multiWins * 100).toFixed(1) + '%' : 'N/A',
        tierHigh: multiWins > 0 ? (tierHigh / multiWins * 100).toFixed(1) + '%' : 'N/A',
        sameDayClose: validTime > 0 ? (sameDay / validTime * 100).toFixed(1) + '%' : 'N/A'
      };
    });

    return [
      { metric: 'Total Opportunities', sales: metrics[0].totalOpportunities.toLocaleString(), demand: metrics[1].totalOpportunities.toLocaleString(), maintenance: metrics[2].totalOpportunities.toLocaleString(), plumbing: metrics[3].totalOpportunities.toLocaleString(), electrical: metrics[4].totalOpportunities.toLocaleString(), tyler: metrics[5].totalOpportunities.toLocaleString() },
      { metric: 'Close Rate', sales: metrics[0].closeRate, demand: metrics[1].closeRate, maintenance: metrics[2].closeRate, plumbing: metrics[3].closeRate, electrical: metrics[4].closeRate, tyler: metrics[5].closeRate },
      { metric: 'Avg Options/Opp', sales: metrics[0].avgOptionsPerOpp, demand: metrics[1].avgOptionsPerOpp, maintenance: metrics[2].avgOptionsPerOpp, plumbing: metrics[3].avgOptionsPerOpp, electrical: metrics[4].avgOptionsPerOpp, tyler: metrics[5].avgOptionsPerOpp },
      { metric: 'Avg Ticket', sales: metrics[0].avgTicket, demand: metrics[1].avgTicket, maintenance: metrics[2].avgTicket, plumbing: metrics[3].avgTicket, electrical: metrics[4].avgTicket, tyler: metrics[5].avgTicket },
      { metric: 'Low Tier %', sales: metrics[0].tierLow, demand: metrics[1].tierLow, maintenance: metrics[2].tierLow, plumbing: metrics[3].tierLow, electrical: metrics[4].tierLow, tyler: metrics[5].tierLow },
      { metric: 'High Tier %', sales: metrics[0].tierHigh, demand: metrics[1].tierHigh, maintenance: metrics[2].tierHigh, plumbing: metrics[3].tierHigh, electrical: metrics[4].tierHigh, tyler: metrics[5].tierHigh },
      { metric: 'Same Day Close', sales: metrics[0].sameDayClose, demand: metrics[1].sameDayClose, maintenance: metrics[2].sameDayClose, plumbing: metrics[3].sameDayClose, electrical: metrics[4].sameDayClose, tyler: metrics[5].sameDayClose },
    ];
  }, [rawData]);

  const currentDept = departments.find(d => d.id === selectedDepartment);

  // Helper function for status color
  const getStatusColor = (value, target) => {
    const ratio = value / target;
    if (ratio >= 1.0) return colors.success;
    if (ratio >= 0.85) return colors.warning;
    return colors.danger;
  };

  // Chart data
  const tierData = processedData ? [
    { name: 'Low', value: processedData.tierSelection.low, color: colors.success },
    { name: 'Mid', value: processedData.tierSelection.mid, color: colors.warning },
    { name: 'High', value: processedData.tierSelection.high, color: colors.accent },
  ] : [];

  const timeToCloseData = processedData ? [
    { name: 'Same Day', value: processedData.timeToClose.sameDay, color: colors.success },
    { name: '1-7 Days', value: processedData.timeToClose.within7, color: colors.warning },
    { name: '8+ Days', value: processedData.timeToClose.beyond7, color: colors.danger },
  ] : [];

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
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      color: colors.textSecondary,
    },
    errorContainer: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid ' + colors.danger,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      color: colors.danger,
    },
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Estimate Analysis</h1>
        </div>
        <div style={styles.loadingContainer}>
          <div style={{ marginBottom: '16px', fontSize: '18px' }}>Loading estimate data...</div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #374151',
            borderTopColor: colors.accent,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Estimate Analysis</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={styles.dateButtons}>
            {['MTD', 'Last Month', 'Last 6 Months', 'Last 12 Months', 'YTD', 'Custom'].map((range) => (
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
          {dateRange === 'Custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  backgroundColor: '#374151',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
              <span style={{ color: '#9ca3af' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #374151',
                  backgroundColor: '#374151',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={styles.errorContainer}>
          <strong>Error loading data:</strong> {error}
        </div>
      )}

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

      {processedData ? (
        <>
          {/* KPI Cards */}
          <div style={styles.kpiRow}>
            <div style={{ ...styles.kpiCard, borderLeftColor: currentDept.color }}>
              <div style={styles.kpiLabel}>Total Opportunities</div>
              <div style={{ ...styles.kpiValue, color: currentDept.color }}>
                {processedData.totalOpportunities.toLocaleString()}
              </div>
              <div style={styles.kpiSubtext}>{processedData.won.toLocaleString()} won</div>
            </div>
            <div style={{ ...styles.kpiCard, borderLeftColor: getStatusColor(processedData.closeRate, processedData.closeRateTarget) }}>
              <div style={styles.kpiLabel}>Close Rate</div>
              <div style={{ ...styles.kpiValue, color: getStatusColor(processedData.closeRate, processedData.closeRateTarget) }}>
                {processedData.closeRate}%
              </div>
              <div style={styles.kpiSubtext}>Target: {processedData.closeRateTarget}%</div>
            </div>
            <div style={{ ...styles.kpiCard, borderLeftColor: colors.warning, position: 'relative' }}>
              <div style={{ ...styles.kpiLabel, display: 'flex', alignItems: 'center', gap: '6px' }}>
                Realistic Unsold Revenue
                <span
                  onMouseEnter={() => setShowRevenueTooltip(true)}
                  onMouseLeave={() => setShowRevenueTooltip(false)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#374151',
                    color: '#9ca3af',
                    fontSize: '11px',
                    cursor: 'help',
                    fontWeight: 'bold',
                  }}
                >
                  ?
                </span>
                {showRevenueTooltip && (
                  <div style={{
                    position: 'absolute',
                    top: '45px',
                    left: '0',
                    right: '0',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    padding: '12px',
                    zIndex: 100,
                    fontSize: '12px',
                    color: '#d1d5db',
                    lineHeight: '1.5',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}>
                    <div style={{ fontWeight: '600', color: '#fff', marginBottom: '8px' }}>How this is calculated:</div>
                    <div style={{ marginBottom: '6px' }}>
                      <strong style={{ color: colors.accent }}>Sales:</strong> Weighted average based on historical tier selection (45.6% low, 34.5% mid, 19.9% high)
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      <strong style={{ color: colors.success }}>Service:</strong> Minimum estimate × 1.70
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      <strong style={{ color: colors.orange }}>Maintenance:</strong> Minimum estimate × 1.60
                    </div>
                    <div>
                      <strong style={{ color: '#9ca3af' }}>Others:</strong> Minimum estimate × 1.65
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
                      This avoids overstating revenue by using the mean of all options.
                    </div>
                  </div>
                )}
              </div>
              <div style={{ ...styles.kpiValue, color: colors.warning, fontSize: processedData.realisticUnsold >= 1000000 ? '24px' : '28px' }}>
                ${processedData.realisticUnsold.toLocaleString()}
              </div>
              <div style={styles.kpiSubtext}>Weighted calculation</div>
            </div>
            <div style={{ ...styles.kpiCard, borderLeftColor: getStatusColor(processedData.avgTicket, processedData.avgTicketTarget) }}>
              <div style={styles.kpiLabel}>Avg Ticket</div>
              <div style={{ ...styles.kpiValue, color: getStatusColor(processedData.avgTicket, processedData.avgTicketTarget) }}>
                ${processedData.avgTicket.toLocaleString()}
              </div>
              <div style={styles.kpiSubtext}>Target: ${processedData.avgTicketTarget.toLocaleString()}</div>
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

          {/* Seasonality Chart - Dual Axis */}
          {processedData.seasonality && processedData.seasonality.length > 0 && (
            <div style={styles.fullWidthCard}>
              <div style={styles.chartTitle}>Close Rate & Avg Ticket by Month</div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={processedData.seasonality}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
                    <XAxis dataKey="month" stroke="#8b95a5" />
                    <YAxis
                      yAxisId="left"
                      stroke="#8b95a5"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke={colors.cyan}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: colors.cardBg, border: 'none', borderRadius: '8px' }}
                      formatter={(value, name) => {
                        if (name === 'closeRate') return [`${value}%`, 'Close Rate'];
                        if (name === 'avgTicket') return [`$${value.toLocaleString()}`, 'Avg Ticket'];
                        return [value, name];
                      }}
                    />
                    <ReferenceLine yAxisId="left" y={processedData.closeRateTarget} stroke={colors.danger} strokeDasharray="5 5" />
                    <Bar yAxisId="left" dataKey="closeRate" fill={currentDept.color} radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgTicket"
                      stroke={colors.cyan}
                      strokeWidth={3}
                      dot={{ fill: colors.cyan, strokeWidth: 2, r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '12px', backgroundColor: currentDept.color, borderRadius: '2px' }} />
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>Close Rate</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '3px', backgroundColor: colors.cyan, borderRadius: '2px' }} />
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>Avg Ticket</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '2px', backgroundColor: colors.danger, borderStyle: 'dashed' }} />
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>Target: {processedData.closeRateTarget}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Table */}
          {comparisonData.length > 0 && (
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
                      <span style={{ ...styles.badge, backgroundColor: colors.success }}>Service</span>
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
          )}
        </>
      ) : (
        <div style={styles.loadingContainer}>
          <div>No data available for the selected period and department.</div>
        </div>
      )}
    </div>
  );
};

export default EstimateAnalysis;
