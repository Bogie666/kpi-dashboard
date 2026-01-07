import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, DollarSign, Calendar, BarChart3, ArrowUp, ArrowDown, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend } from 'recharts';

const HistoricalRevenueDashboard = () => {
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('total');
  const [selectedYear, setSelectedYear] = useState('all');
  const [viewMode, setViewMode] = useState('trend'); // 'trend' or 'yoy'
  const [dataSource, setDataSource] = useState('loading');

  const DASHBOARD_API = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/dashboard_api';

  // Department labels mapping
  const departmentLabels = {
    'total': 'Total Revenue',
    'hvac_replacement': 'HVAC Replacement',
    'hvac_service': 'HVAC Service',
    'hvac_maintenance': 'HVAC Maintenance',
    'commercial_hvac': 'Commercial HVAC',
    'plumbing': 'Plumbing',
    'electrical': 'Electrical',
    'tyler': 'Tyler'
  };

  // Color palette for departments
  const departmentColors = {
    'hvac_replacement': '#3B82F6',
    'hvac_service': '#10B981',
    'hvac_maintenance': '#F59E0B',
    'commercial_hvac': '#8B5CF6',
    'plumbing': '#06B6D4',
    'electrical': '#EF4444',
    'tyler': '#EC4899'
  };

  // Year colors for YoY comparison
  const yearColors = {
    2024: '#9CA3AF',
    2025: '#3B82F6',
    2026: '#10B981',
    2027: '#F59E0B'
  };

  const currentYear = new Date().getFullYear();
  const availableYears = [];
  for (let year = 2024; year <= currentYear; year++) {
    availableYears.push(year);
  }

  // Fetch historical data for all years
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        // Fetch data for each year from 2024 to current
        const yearPromises = availableYears.map(year =>
          fetch(`${DASHBOARD_API}/historical-revenue/${year}`)
            .then(res => res.json())
            .catch(() => ({ status: 'error', data: [] }))
        );

        const yearResults = await Promise.all(yearPromises);

        // Combine all year data
        let allData = [];
        yearResults.forEach((result, index) => {
          if (result.status === 'success' && result.data) {
            allData = [...allData, ...result.data];
          }
        });

        if (allData.length > 0) {
          setHistoricalData(allData);
          setDataSource('api');
        } else {
          // Fall back to TTM departments endpoint for now
          const ttmResponse = await fetch(`${DASHBOARD_API}/financial-ttm-departments`);
          const ttmData = await ttmResponse.json();
          if (ttmData.status === 'success') {
            setHistoricalData(ttmData.data || []);
            setDataSource('ttm');
          }
        }
      } catch (error) {
        console.error('Error fetching historical data:', error);
        setDataSource('error');
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, []);

  // Get revenue value for selected department
  const getDepartmentRevenue = (month) => {
    if (selectedDepartment === 'total') {
      return month.total || month.revenue || 0;
    }
    return month[selectedDepartment] || 0;
  };

  // Filter data by selected year
  const filteredData = useMemo(() => {
    if (selectedYear === 'all') {
      return historicalData;
    }
    return historicalData.filter(month => month.year === parseInt(selectedYear));
  }, [historicalData, selectedYear]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (filteredData.length === 0) return {};

    const revenues = filteredData.map(m => getDepartmentRevenue(m));
    const totalRevenue = revenues.reduce((sum, r) => sum + r, 0);
    const avgMonthly = totalRevenue / filteredData.length;

    const highestMonth = filteredData.reduce((max, month) =>
      getDepartmentRevenue(month) > getDepartmentRevenue(max) ? month : max, filteredData[0]);

    const lowestMonth = filteredData.reduce((min, month) =>
      getDepartmentRevenue(month) < getDepartmentRevenue(min) ? month : min, filteredData[0]);

    // Calculate YoY growth - compare selected year to prior year (using all historical data)
    let yoyGrowth = null;
    if (selectedYear === 'all') {
      // For "all years" view, compare the two most recent complete years
      const completeYears = [...new Set(filteredData.filter(m => m.isComplete !== false).map(m => m.year))];
      if (completeYears.length >= 2) {
        const sortedYears = completeYears.sort((a, b) => b - a);
        const latestYear = sortedYears[0];
        const priorYear = sortedYears[1];

        const latestTotal = filteredData
          .filter(m => m.year === latestYear)
          .reduce((sum, m) => sum + getDepartmentRevenue(m), 0);
        const priorTotal = filteredData
          .filter(m => m.year === priorYear)
          .reduce((sum, m) => sum + getDepartmentRevenue(m), 0);

        if (priorTotal > 0) {
          yoyGrowth = ((latestTotal - priorTotal) / priorTotal) * 100;
        }
      }
    } else {
      // For single year view, compare to the prior year from historicalData
      const viewYear = parseInt(selectedYear);
      const priorYear = viewYear - 1;

      // Get data for the selected year (from filteredData)
      const currentYearTotal = filteredData.reduce((sum, m) => sum + getDepartmentRevenue(m), 0);

      // Get data for prior year (from full historicalData)
      const priorYearData = historicalData.filter(m => m.year === priorYear);
      const priorYearTotal = priorYearData.reduce((sum, m) => sum + getDepartmentRevenue(m), 0);

      if (priorYearTotal > 0 && currentYearTotal > 0) {
        yoyGrowth = ((currentYearTotal - priorYearTotal) / priorYearTotal) * 100;
      }
    }

    return {
      totalRevenue,
      avgMonthly,
      highestMonth,
      lowestMonth,
      yoyGrowth,
      monthCount: filteredData.length
    };
  }, [filteredData, selectedDepartment, selectedYear, historicalData]);

  // Prepare chart data with growth calculations
  const chartData = useMemo(() => {
    return filteredData.map((month, index) => {
      const revenue = getDepartmentRevenue(month);
      const growth = metrics.avgMonthly > 0
        ? ((revenue - metrics.avgMonthly) / metrics.avgMonthly) * 100
        : 0;

      // Calculate YoY change
      let yoyChange = null;
      const priorYearMonth = historicalData.find(m =>
        m.year === month.year - 1 && m.monthNumber === month.monthNumber
      );
      if (priorYearMonth) {
        const priorRevenue = getDepartmentRevenue(priorYearMonth);
        if (priorRevenue > 0) {
          yoyChange = ((revenue - priorRevenue) / priorRevenue) * 100;
        }
      }

      return {
        ...month,
        revenue,
        growth,
        yoyChange,
        displayLabel: `${month.monthName} ${month.year}`,
        shortLabel: month.monthName
      };
    });
  }, [filteredData, metrics, selectedDepartment, historicalData]);

  // YoY comparison data - group by month across years
  const yoyComparisonData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return monthNames.map((monthName, index) => {
      const monthNum = index + 1;
      const dataPoint = { month: monthName, monthNum };

      availableYears.forEach(year => {
        const monthData = historicalData.find(m => m.year === year && m.monthNumber === monthNum);
        dataPoint[year] = monthData ? getDepartmentRevenue(monthData) : null;
      });

      return dataPoint;
    });
  }, [historicalData, availableYears, selectedDepartment]);

  // Department mix data for pie chart
  const departmentMixData = useMemo(() => {
    const deptTotals = {};
    const departments = Object.keys(departmentLabels).filter(d => d !== 'total');

    departments.forEach(dept => {
      deptTotals[dept] = filteredData.reduce((sum, month) => sum + (month[dept] || 0), 0);
    });

    return departments
      .map(dept => ({
        name: departmentLabels[dept],
        value: deptTotals[dept],
        key: dept,
        color: departmentColors[dept]
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Heatmap data - revenue intensity by month/year
  const heatmapData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const allRevenues = historicalData.map(m => getDepartmentRevenue(m)).filter(r => r > 0);
    const maxRevenue = Math.max(...allRevenues, 1);
    const minRevenue = Math.min(...allRevenues, 0);

    return availableYears.map(year => ({
      year,
      months: monthNames.map((monthName, index) => {
        const monthData = historicalData.find(m => m.year === year && m.monthNumber === index + 1);
        const revenue = monthData ? getDepartmentRevenue(monthData) : null;
        const intensity = revenue !== null ? (revenue - minRevenue) / (maxRevenue - minRevenue) : null;
        return {
          month: monthName,
          revenue,
          intensity,
          isComplete: monthData?.isComplete !== false
        };
      })
    }));
  }, [historicalData, availableYears, selectedDepartment]);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{data.displayLabel || data.month}</p>
          <p className="text-blue-400 text-sm">
            Revenue: {formatCurrency(data.revenue || payload[0].value)}
          </p>
          {data.yoyChange !== null && data.yoyChange !== undefined && (
            <p className={`text-sm ${data.yoyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              YoY: {data.yoyChange >= 0 ? '+' : ''}{data.yoyChange.toFixed(1)}%
            </p>
          )}
          {data.isComplete === false && (
            <p className="text-orange-400 text-xs mt-1">Month-to-Date</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Get heatmap cell color based on intensity
  const getHeatmapColor = (intensity, isComplete) => {
    if (intensity === null) return 'bg-gray-800';
    if (!isComplete) {
      // MTD - use orange tones
      const opacity = Math.max(0.3, intensity);
      return `bg-orange-500 bg-opacity-${Math.round(opacity * 100)}`;
    }
    // Complete months - use blue/green gradient
    if (intensity >= 0.8) return 'bg-green-500';
    if (intensity >= 0.6) return 'bg-green-600';
    if (intensity >= 0.4) return 'bg-blue-500';
    if (intensity >= 0.2) return 'bg-blue-600';
    return 'bg-blue-900';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <TrendingUp className="h-7 w-7 text-blue-400 mr-3" />
            Historical Revenue
          </h2>
          <p className="text-gray-400 text-sm mt-1">Revenue Performance from 2024 to Present</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Data Range</div>
          <div className="text-sm text-gray-400">
            {selectedYear === 'all' ? '2024 - Present' : selectedYear}
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Year Selector */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <label className="text-sm text-gray-400 mb-2 block">Select Year:</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedYear === 'all'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Years
            </button>
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year.toString())}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedYear === year.toString()
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <label className="text-sm text-gray-400 mb-2 block">View Mode:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('trend')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'trend'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Trend View
            </button>
            <button
              onClick={() => setViewMode('yoy')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'yoy'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Year-over-Year
            </button>
          </div>
        </div>
      </div>

      {/* Department Selector */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <label className="text-sm text-gray-400 mb-2 block">Select Department:</label>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {Object.entries(departmentLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedDepartment(key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedDepartment === key
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 text-center">
          <span className="text-lg font-semibold text-blue-400">
            {departmentLabels[selectedDepartment]}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-400 text-sm font-medium">Total Revenue</div>
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div className="text-xs text-gray-500">{metrics.monthCount} months</div>
        </div>

        {/* Average Monthly */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-400 text-sm font-medium">Avg Monthly Revenue</div>
            <BarChart3 className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatCurrency(metrics.avgMonthly)}
          </div>
          <div className="text-xs text-gray-500">Per month average</div>
        </div>

        {/* YoY Growth */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-400 text-sm font-medium">YoY Growth</div>
            {metrics.yoyGrowth !== null && metrics.yoyGrowth >= 0 ? (
              <ArrowUp className="h-5 w-5 text-green-400" />
            ) : (
              <ArrowDown className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className={`text-3xl font-bold mb-1 ${
            metrics.yoyGrowth !== null
              ? (metrics.yoyGrowth >= 0 ? 'text-green-400' : 'text-red-400')
              : 'text-gray-400'
          }`}>
            {metrics.yoyGrowth !== null
              ? `${metrics.yoyGrowth >= 0 ? '+' : ''}${metrics.yoyGrowth.toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="text-xs text-gray-500">Year-over-year change</div>
        </div>

        {/* Peak Month */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-400 text-sm font-medium">Peak Month</div>
            <TrendingUp className="h-5 w-5 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {formatCurrency(getDepartmentRevenue(metrics.highestMonth || {}))}
          </div>
          <div className="text-xs text-gray-500">
            {metrics.highestMonth?.monthName} {metrics.highestMonth?.year}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            {viewMode === 'trend' ? 'Revenue Trend' : 'Year-over-Year Comparison'}
          </h3>
          <p className="text-gray-400 text-sm">
            {viewMode === 'trend'
              ? 'Monthly revenue performance over time'
              : 'Compare same months across different years'}
          </p>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          {viewMode === 'trend' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="displayLabel"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={metrics.avgMonthly}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                label={{
                  value: 'Average',
                  position: 'insideTopRight',
                  fill: '#F59E0B',
                  fontSize: 12
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload, index } = props;
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={payload.isComplete === false ? '#F59E0B' : '#3B82F6'}
                      opacity={payload.isComplete === false ? 0.8 : 1}
                    />
                  );
                }}
                activeDot={{ r: 6 }}
                name="Revenue"
              />
            </LineChart>
          ) : (
            <LineChart data={yoyComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
                        <p className="text-white font-semibold mb-2">{label}</p>
                        {payload.map((entry, index) => (
                          entry.value !== null && (
                            <p key={index} style={{ color: entry.color }} className="text-sm">
                              {entry.name}: {formatCurrency(entry.value)}
                            </p>
                          )
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              {availableYears.map(year => (
                <Line
                  key={year}
                  type="monotone"
                  dataKey={year}
                  stroke={yearColors[year] || '#9CA3AF'}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls={false}
                  name={year.toString()}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>

        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          {viewMode === 'trend' ? (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-0.5 bg-blue-400"></div>
                <span className="text-gray-400">Monthly Revenue</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-0.5 bg-orange-400 opacity-60"></div>
                <span className="text-gray-400">Period Average</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span className="text-gray-400">Complete Month</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-400 opacity-80"></div>
                <span className="text-gray-400">Month-to-Date</span>
              </div>
            </>
          ) : (
            availableYears.map(year => (
              <div key={year} className="flex items-center space-x-2">
                <div className="w-4 h-0.5" style={{ backgroundColor: yearColors[year] }}></div>
                <span className="text-gray-400">{year}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Department Mix & Heatmap Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Mix Pie Chart */}
        {selectedDepartment === 'total' && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Layers className="h-5 w-5 text-purple-400 mr-2" />
              Revenue by Department
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentMixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {departmentMixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#F3F4F6' }}
                  itemStyle={{ color: '#F3F4F6' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {departmentMixData.slice(0, 6).map((dept) => (
                <div key={dept.key} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: dept.color }}></div>
                  <span className="text-gray-400 truncate">{dept.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Heatmap */}
        <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${selectedDepartment !== 'total' ? 'lg:col-span-2' : ''}`}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Calendar className="h-5 w-5 text-cyan-400 mr-2" />
            Monthly Revenue Heatmap
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-gray-400 pb-2 text-sm font-medium w-16">Year</th>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                    <th key={month} className="text-center text-gray-400 pb-2 text-xs font-medium px-1">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map(({ year, months }) => (
                  <tr key={year}>
                    <td className="text-white font-medium py-1 text-sm">{year}</td>
                    {months.map(({ month, revenue, intensity, isComplete }) => (
                      <td key={`${year}-${month}`} className="p-1">
                        <div
                          className={`h-8 rounded flex items-center justify-center text-xs font-medium cursor-default transition-all hover:scale-105 ${
                            intensity === null
                              ? 'bg-gray-800 text-gray-600'
                              : isComplete
                                ? intensity >= 0.7
                                  ? 'bg-green-500 text-white'
                                  : intensity >= 0.4
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-900 text-blue-200'
                                : 'bg-orange-500 bg-opacity-70 text-white'
                          }`}
                          title={revenue !== null ? `${month} ${year}: ${formatCurrency(revenue)}${!isComplete ? ' (MTD)' : ''}` : 'No data'}
                        >
                          {revenue !== null ? `${(revenue / 1000000).toFixed(1)}M` : '-'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded bg-blue-900"></div>
              <span className="text-gray-400">Lower</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-gray-400">Average</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-gray-400">Higher</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded bg-orange-500 bg-opacity-70"></div>
              <span className="text-gray-400">MTD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seasonal Analysis */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Performance vs Period Average</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="shortLabel"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
                      <p className="text-white font-semibold mb-1">{data.displayLabel}</p>
                      <p className={`text-sm ${data.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.growth >= 0 ? '+' : ''}{data.growth?.toFixed(1)}% vs average
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />
            <Bar
              dataKey="growth"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={(entry.growth || 0) >= 0 ? '#10B981' : '#EF4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Insights */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Best Month Ever</div>
            <div className="text-white font-semibold">
              {metrics.highestMonth?.monthName} {metrics.highestMonth?.year}
            </div>
            <div className="text-lg text-green-400 font-bold">
              {formatCurrency(getDepartmentRevenue(metrics.highestMonth || {}))}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Lowest Month</div>
            <div className="text-white font-semibold">
              {metrics.lowestMonth?.monthName} {metrics.lowestMonth?.year}
            </div>
            <div className="text-lg text-orange-400 font-bold">
              {formatCurrency(getDepartmentRevenue(metrics.lowestMonth || {}))}
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Months Above Average</div>
            <div className="text-white font-semibold">
              {chartData.filter(m => (m.growth || 0) >= 0).length} of {chartData.length} months
            </div>
            <div className="text-lg text-blue-400 font-bold">
              {chartData.length > 0 ? ((chartData.filter(m => (m.growth || 0) >= 0).length / chartData.length) * 100).toFixed(0) : '0'}%
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Revenue Range</div>
            <div className="text-white font-semibold">High to Low Spread</div>
            <div className="text-lg text-purple-400 font-bold">
              {formatCurrency(
                getDepartmentRevenue(metrics.highestMonth || {}) -
                getDepartmentRevenue(metrics.lowestMonth || {})
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalRevenueDashboard;
