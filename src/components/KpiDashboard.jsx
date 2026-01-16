"use client";

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { UserCheck, Phone, DollarSign, Wrench, Users, Settings, TrendingUp, Target, AlertTriangle, Trophy, CheckCircle, Zap, Droplets, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import CompetitionLeaderboard from './CompetitionLeaderboard';
import LoginScreen from './LoginScreen';
import { LogOut, User, Monitor } from 'lucide-react';
import YtdTrendChart from './YtdTrendChart';
import TopPerformersDashboard from './TopPerformersDashboard';
import RevenueTTMDashboard from './RevenueTTMDashboard';
import HistoricalRevenueDashboard from './HistoricalRevenueDashboard';
import GoogleReviews from './GoogleReviews';
import ToolsPage from './ToolsPage';

const KpiDashboard = () => {
  const [activeView, setActiveView] = useState('financial');
  const [timePeriod, setTimePeriod] = useState('mtd');
  const [dashboardData, setDashboardData] = useState({});
  const [targets, setTargets] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sub-tab states for grouped navigation
  const [financialSubTab, setFinancialSubTab] = useState('overview');
  const [technicianSubTab, setTechnicianSubTab] = useState('comfort_advisor');
  const [operationsSubTab, setOperationsSubTab] = useState('call_center');
  const [engagementSubTab, setEngagementSubTab] = useState('reviews');

// Set default time period based on active view and sub-tab
useEffect(() => {
  if (activeView === 'financial') {
    setTimePeriod('mtd');
  } else if (activeView === 'technicians') {
    setTimePeriod('mtd');
  } else if (activeView === 'operations') {
    // Call center uses 'today' by default, memberships uses 'mtd'
    if (operationsSubTab === 'call_center') {
      setTimePeriod('today');
    } else {
      setTimePeriod('mtd');
    }
  } else if (activeView === 'engagement') {
    setTimePeriod('mtd');
  }
}, [activeView, operationsSubTab]);

  // API URLs
  const DASHBOARD_API = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/dashboard_api';
  const ADMIN_API = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api';

  const getTabsForUser = (user) => {
  const allTabs = [
    { id: "financial", label: "Financial", icon: DollarSign },
    { id: "technicians", label: "Technicians", icon: Wrench },
    { id: "operations", label: "Operations", icon: Phone },
    { id: "engagement", label: "Engagement", icon: MessageSquare },
    { id: "tools", label: "Tools", icon: Settings },
  ];

  // Admin tab is now in the header, not in the main tabs
  return allTabs;
};

const tabs = getTabsForUser(currentUser);

// Sub-tab definitions for each main tab group
const financialSubTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'historical', label: 'Historical' },
  { id: 'ttm', label: 'Revenue TTM' },
];

const technicianSubTabs = [
  { id: 'comfort_advisor', label: 'Comfort Advisor' },
  { id: 'hvac_tech', label: 'HVAC Tech' },
  { id: 'hvac_maintenance', label: 'HVAC Maint' },
  { id: 'commercial_hvac', label: 'Commercial HVAC' },
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'electrical', label: 'Electrical' },
];

const operationsSubTabs = [
  { id: 'call_center', label: 'Call Center' },
  { id: 'memberships', label: 'Memberships' },
];

const engagementSubTabs = [
  { id: 'reviews', label: 'Reviews' },
  { id: 'top_performers', label: 'Top Performers' },
  { id: 'competition', label: 'Competition' },
];

// Styled SubTabs component with color outlines
const SubTabs = ({ tabs, activeTab, onTabChange, colorScheme = 'blue', rightContent }) => {
  const colorClasses = {
    blue: {
      active: 'bg-blue-500/20 border-blue-500 text-blue-400',
      inactive: 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-blue-400 hover:text-blue-300',
    },
    green: {
      active: 'bg-green-500/20 border-green-500 text-green-400',
      inactive: 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-green-400 hover:text-green-300',
    },
    purple: {
      active: 'bg-purple-500/20 border-purple-500 text-purple-400',
      inactive: 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-purple-400 hover:text-purple-300',
    },
    amber: {
      active: 'bg-amber-500/20 border-amber-500 text-amber-400',
      inactive: 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-amber-400 hover:text-amber-300',
    },
  };

  const colors = colorClasses[colorScheme] || colorClasses.blue;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
              activeTab === tab.id ? colors.active : colors.inactive
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {rightContent && (
        <div className="flex flex-wrap gap-1 md:gap-2">
          {rightContent}
        </div>
      )}
    </div>
  );
};

  const comfortAdvisorPeriods = [
    { id: 'mtd', label: 'MTD' },
    { id: 'ytd', label: 'YTD' },
    { id: 'last_month', label: 'Last Month' }
  ];

  const callCenterPeriods = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'mtd', label: 'MTD' },
    { id: 'last_month', label: 'Last Month' }
  ];

  // Period selector buttons component
  const PeriodSelector = ({ periodOptions = comfortAdvisorPeriods }) => (
    <>
      {periodOptions.map((period) => (
        <button
          key={period.id}
          onClick={() => setTimePeriod(period.id)}
          className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm transition-colors ${
            timePeriod === period.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {period.label}
        </button>
      ))}
    </>
  );

  // Determine periods based on active view and sub-tabs
  const getPeriods = () => {
    if (activeView === 'operations' && operationsSubTab === 'call_center') {
      return callCenterPeriods;
    }
    // Legacy support for display mode
    if (activeView === 'call_center') {
      return callCenterPeriods;
    }
    return comfortAdvisorPeriods;
  };
  const periods = getPeriods();

  // Check authentication on component mount
useEffect(() => {
    checkAuthentication();
  }, []);

  // Check for display mode URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const displayMode = urlParams.get('display');
    const singlePage = urlParams.get('page');

    if (displayMode === 'true' || displayMode === '1') {
      // Auto-login as display user
      const displayUser = {
        id: 'display-auto',
        name: 'Display Screen',
        email: 'display@auto',
        role: 'display',
        status: 'active'
      };

      setCurrentUser(displayUser);
      setIsAuthenticated(true);

      // Valid pages for single-page display mode
      const validPages = [
        'financial', 'revenue-ttm', 'comfort_advisor', 'technician',
        'hvac_maintenance', 'commercial_hvac', 'plumbing', 'electrical', 'call_center',
        'memberships', 'reviews', 'top_performers', 'competition',
        'top_comfort_advisor', 'top_hvac_tech', 'top_hvac_maintenance',
        'top_commercial_hvac', 'top_plumbing', 'top_electrical', 'top_call_center'
      ];

      if (singlePage && validPages.includes(singlePage)) {
        // Single page mode - show only the specified page without rotation
        setActiveView(singlePage);
      } else {
        // Auto-rotation mode
        setActiveView('financial');
        startDisplayAutoRotation();
      }

      setAuthLoading(false);
    }
  }, []);

const checkAuthentication = async () => {
  setAuthLoading(true);
  
  try {
    // Check for display mode URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const displayMode = urlParams.get('display');
    
    if (displayMode === 'true' || displayMode === '1') {
      // Skip authentication check for display mode
      return;
    }
    
    const storedUser = localStorage.getItem('dashboardUser');
    const storedToken = localStorage.getItem('dashboardToken');
    
    if (storedUser && storedToken) {
      const response = await fetch(`${ADMIN_API}/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
        setIsAuthenticated(true);
        
        if (userData.role === 'display') {
          setActiveView('financial');
          startDisplayAutoRotation();
        }
      } else {
        handleLogout();
      }
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    handleLogout();
  } finally {
    setAuthLoading(false);
  }
};

const handleLogin = (userData) => {
  setCurrentUser(userData);
  setIsAuthenticated(true);
  
  if (userData.role === 'display') {
    setActiveView('financial');
    startDisplayAutoRotation();
  } else if (userData.role === 'admin') {
    setActiveView('admin');
  } else {
    setActiveView('financial');
  }
};

const handleLogout = () => {
  localStorage.removeItem('dashboardUser');
  localStorage.removeItem('dashboardToken');
  setCurrentUser(null);
  setIsAuthenticated(false);
  setActiveView('financial');
  
  if (window.displayRotationInterval) {
    clearInterval(window.displayRotationInterval);
  }
};

const startDisplayAutoRotation = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const rotationInterval = parseInt(urlParams.get('interval')) * 1000 || 30000;
  const views = [
    'financial',                    // Financial Overview

    'comfort_advisor',              // Comfort Advisor Metrics
    'top_comfort_advisor',          // Top Comfort Advisors

    'technician',                   // HVAC Tech Metrics
    'top_hvac_tech',               // Top HVAC Techs

    'hvac_maintenance',            // HVAC Maintenance Metrics
    'top_hvac_maintenance',        // Top HVAC Maintenance

    'commercial_hvac',             // Commercial HVAC Metrics
    'top_commercial_hvac',         // Top Commercial HVAC

    'plumbing',                    // Plumbing Metrics
    'top_plumbing',                // Top Plumbers

    'electrical',                  // Electrical Metrics
    'top_electrical',              // Top Electricians

    'call_center',                 // Call Center Metrics
    'top_call_center',             // Top Call Center

    'memberships',                 // Memberships

    'reviews'                      // Google Reviews

    // 'competition'               // Competition Leaderboard (temporarily disabled)
  ];
  
  let currentIndex = 0;
  
  // Clear any existing interval
  if (window.displayRotationInterval) {
    clearInterval(window.displayRotationInterval);
  }
  
  window.displayRotationInterval = setInterval(() => {
    currentIndex = (currentIndex + 1) % views.length;
    setActiveView(views[currentIndex]);
  }, rotationInterval);
};
  // Set initial timestamp on component mount
  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  // Load dashboard data and targets
  useEffect(() => {
    if (activeView !== 'admin' && activeView !== 'tools') {
      loadDashboardData();
    }
    loadTargets();
    setLastUpdated(new Date().toLocaleTimeString());
  }, [timePeriod, activeView, financialSubTab, technicianSubTab, operationsSubTab, engagementSubTab]);

  const loadDashboardData = async () => {
  setLoading(true);
  try {
    // Handle grouped views by checking sub-tabs
    const effectiveView = activeView === 'technicians' ? technicianSubTab :
                          activeView === 'operations' ? operationsSubTab :
                          activeView === 'engagement' ? engagementSubTab :
                          activeView === 'financial' && financialSubTab === 'ttm' ? 'revenue-ttm' :
                          activeView;

    if (effectiveView === 'comfort_advisor') {
      const url = `${DASHBOARD_API}/comfort-advisors/${timePeriod}`;
      console.log('🔍 Fetching comfort advisor data from:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('📦 Comfort Advisor API Response:', data);
      console.log('📊 First advisor in response:', data.data?.[0]);
      console.log('📊 All fields in first advisor:', JSON.stringify(data.data?.[0], null, 2));
      if (data.status === 'success') {
        // TEMPORARY FIX: Backend sync has bugs for MTD comfort advisor data
        // The data is being written to wrong database columns
        const fixedData = data.data.map(advisor => {
          // Check if this looks like corrupted MTD data
          // Indicators: sales=0, very high jobs value, or mismatched numbers
          const needsFix = (advisor.sales === 0 && advisor.jobs > 50) ||
                          (advisor.averageDollar < 100 && advisor.jobs > 50);

          if (needsFix) {
            console.warn(`⚠️ Fixing corrupted data for ${advisor.name}`);
            console.log('Original data:', {
              jobs: advisor.jobs,
              sales: advisor.sales,
              opportunities: advisor.opportunities,
              averageDollar: advisor.averageDollar,
              closingPercent: advisor.closingPercent
            });

            // The backend is incorrectly mapping ServiceTitan data
            // Correct mapping based on actual MTD data structure:
            return {
              ...advisor,
              // Sales is actually in marketingJobs field
              sales: advisor.marketingJobs || 0,
              // Jobs count is in tglJobs field
              jobs: advisor.tglJobs || 0,
              // Opportunities needs to be calculated or pulled from correct field
              opportunities: advisor.tglJobs || 0,
              // Average dollar might be corrupted, recalculate
              averageDollar: (advisor.tglJobs > 0)
                ? Math.round((advisor.marketingJobs || 0) / advisor.tglJobs)
                : 0,
              // Close rate might be in different field
              closingPercent: advisor.tglCloseRate || advisor.closingPercent || 0,
              _dataFixed: true
            };
          }
          return advisor;
        });

        console.log('📊 Sample fixed data:', fixedData[0]);
        setDashboardData(prev => ({ ...prev, comfort_advisor: fixedData }));
        console.log('✅ Set comfort_advisor data, count:', fixedData.length);
      } else {
        console.error('❌ API returned error status:', data);
      }
    } else if (effectiveView === 'call_center') {
      const response = await fetch(`${DASHBOARD_API}/call-center/${timePeriod}`);
      const data = await response.json();
      if (data.status === 'success') {
        setDashboardData(prev => ({ ...prev, call_center: data.data }));
      }
    } else if (effectiveView === 'hvac_tech' || effectiveView === 'technician') {
      // CHANGED: Use new hvac-tech endpoint
      const response = await fetch(`${DASHBOARD_API}/hvac-tech/${timePeriod}`);
      const data = await response.json();
      if (data.status === 'success') {
        setDashboardData(prev => ({ ...prev, technician: data.data }));
      }
    } else if (effectiveView === 'hvac_maintenance') {
      // CHANGED: Use new hvac-maintenance endpoint
      const response = await fetch(`${DASHBOARD_API}/hvac-maintenance/${timePeriod}`);
      const data = await response.json();
      if (data.status === 'success') {
        setDashboardData(prev => ({ ...prev, hvac_maintenance: data.data }));
      }
    } else if (effectiveView === 'commercial_hvac') {
      // Commercial HVAC endpoint
      const response = await fetch(`${DASHBOARD_API}/commercial-hvac/${timePeriod}`);
      const data = await response.json();
      if (data.status === 'success') {
        setDashboardData(prev => ({ ...prev, commercial_hvac: data.data }));
      }
    } else if (effectiveView === 'plumbing') {
      // NEW: Use dedicated plumbing endpoint
      const response = await fetch(`${DASHBOARD_API}/plumbing/${timePeriod}`);
      const data = await response.json();
      if (data.status === 'success') {
        setDashboardData(prev => ({ ...prev, plumbing: data.data }));
      }
    } else if (effectiveView === 'electrical') {
      // NEW: Use dedicated electrical endpoint
      const response = await fetch(`${DASHBOARD_API}/electrical/${timePeriod}`);
      const data = await response.json();
      if (data.status === 'success') {
        setDashboardData(prev => ({ ...prev, electrical: data.data }));
      }
    } else if (effectiveView === 'revenue-ttm') {
      // Load TTM data with department breakdowns
      const response = await fetch(`${DASHBOARD_API}/financial-ttm-departments`);
      const data = await response.json();
      if (data.status === 'success') {
        setDashboardData(prev => ({
          ...prev,
          revenueTTM: data.data,
          ttmSummary: {
            totalRevenue: data.total_ttm_revenue,
            averageMonthly: data.average_monthly,
            period: data.period
          }
        }));
      }
    } else if (effectiveView === 'financial' || activeView === 'financial') {
      // Load both financial data and unsold estimates in parallel
      const [financialResponse, unsoldResponse] = await Promise.all([
        fetch(`${DASHBOARD_API}/financial/${timePeriod}`),
        fetch(`${DASHBOARD_API}/unsold-estimates/${timePeriod}`)
      ]);

      const financialData = await financialResponse.json();
      const unsoldData = await unsoldResponse.json();

      if (financialData.status === 'success') {
        setDashboardData(prev => ({ ...prev, financial: financialData.data }));
      }
      if (unsoldData.status === 'success') {
        setDashboardData(prev => ({ ...prev, unsoldEstimates: unsoldData.data }));
      }
    } else if (effectiveView === 'memberships') {
      // Load both membership data and summary
      const [membershipResponse, summaryResponse] = await Promise.all([
        fetch(`${DASHBOARD_API}/memberships/${timePeriod}`),
        fetch(`${DASHBOARD_API}/membership-summary/${timePeriod}`)
      ]);
      
      const membershipData = await membershipResponse.json();
      const summaryData = await summaryResponse.json();
      
      if (membershipData.status === 'success') {
        setDashboardData(prev => ({ ...prev, memberships: membershipData.data }));
      }
      if (summaryData.status === 'success') {
        setDashboardData(prev => ({ ...prev, membershipSummary: summaryData.data }));
      }
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  } finally {
    setLoading(false);
  }
};

  const loadTargets = async () => {
    try {
      const response = await fetch(`${ADMIN_API}/targets`);
      const data = await response.json();
      if (data.status === 'success') {
        setTargets(data.data);
      }
    } catch (error) {
      console.error('Error loading targets:', error);
    }
  };

  // Helper function to get target value for a specific metric with time-based scaling
  const getTargetValue = (category, targetKey, timePeriod = 'mtd') => {
    if (!targets[category]) {
      return null;
    }
    
    // Enhanced matching logic to handle different naming conventions
    const target = targets[category].find(t => {
      const targetName = t.name?.toLowerCase() || '';
      const targetCategory = t.target_name?.toLowerCase() || '';
      
      // Multiple matching strategies
      switch (targetKey) {
        case 'avg_ticket':
          return targetName.includes('average ticket') || 
                 targetName.includes('avg ticket') ||
                 targetCategory.includes('avg_ticket');
        
        case 'close_rate':
          return targetName.includes('close rate') || 
                 targetCategory.includes('close_rate');
        
        case 'booking_rate':
          return targetName.includes('booking rate') || 
                 targetCategory.includes('booking_rate');
        
        case 'memberships_sold':
          return targetName.includes('memberships sold') || 
                 targetName.includes('memberships') ||
                 targetCategory.includes('memberships_sold');
        
        case 'recall_rate':
          return targetName.includes('recall rate') ||
                 targetCategory.includes('recall_rate');
        
        default:
          return targetName.includes(targetKey.replace('_', ' ')) || 
                 targetCategory.includes(targetKey);
      }
    });
    
    if (!target) return null;
    
    // Scale membership targets based on time period
    if (targetKey === 'memberships_sold') {
      const monthlyTarget = target.value;
      
      switch (timePeriod) {
        case 'today':
          // Assume 22 working days per month
          return 1;
        case 'week':
          // Assume 4.3 weeks per month
          return Math.round(monthlyTarget / 4.3);
        case 'mtd':
          // Calculate based on current day of month
          const today = new Date();
          const dayOfMonth = today.getDate();
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          return Math.round((monthlyTarget * dayOfMonth) / daysInMonth);
        case 'last_month':
          return monthlyTarget; // Full monthly target
        default:
          return monthlyTarget;
      }
    }
    
    // For other targets, return as-is
    return target.value;
  };

  // Helper function to get target achievement status
  const getTargetStatus = (current, target, isReverse = false) => {
    if (!target || !current) return 'unknown';
    
    const percentage = (current / target) * 100;
    
    if (isReverse) {
      // For metrics where lower is better (like recall rate)
      if (percentage <= 80) return 'success'; // 20% under target is good
      if (percentage <= 100) return 'warning';
      return 'danger';
    } else {
      // For metrics where higher is better
      if (percentage >= 100) return 'success';
      if (percentage >= 80) return 'warning';
      return 'danger';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'danger': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default: return <Target className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-400 bg-green-900 bg-opacity-20';
      case 'warning': return 'text-yellow-400 bg-yellow-900 bg-opacity-20';
      case 'danger': return 'text-red-400 bg-red-900 bg-opacity-20';
      default: return 'text-gray-400 bg-gray-700';
    }
  };

  // KPI Widget Component
  const KpiWidget = ({ title, children, className = "" }) => (
    <div className={`bg-gray-800 rounded-lg p-4 md:p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );

  // Enhanced Metric Card with Target Comparison and Colors
  const MetricCard = ({ title, value, target, unit = "", trend, isReverse = false, showDetailedStatus = true, colorScheme = null }) => {
  const status = getTargetStatus(value, target, isReverse);
  const percentage = target ? Math.round((value / target) * 100) : null;
  
  // Enhanced color schemes with default colors for cards without targets
  const getCardColors = (status, colorScheme) => {
    // If colorScheme is provided (for cards without targets), use it
    if (colorScheme) {
      return {
        border: `border-${colorScheme}-500`,
        bg: 'bg-gray-800',
        text: `text-${colorScheme}-400`,
        icon: `text-${colorScheme}-400`,
        progress: `bg-${colorScheme}-500`,
        badge: `bg-${colorScheme}-600 text-${colorScheme}-100`
      };
    }
    
    // Otherwise use status-based colors
    switch (status) {
      case 'success': 
        return {
          border: 'border-green-500',
          bg: 'bg-gradient-to-r from-green-900/20 to-green-800/10',
          text: 'text-green-400',
          icon: 'text-green-400',
          progress: 'bg-green-500',
          badge: 'bg-green-600 text-green-100'
        };
      case 'warning': 
        return {
          border: 'border-yellow-500',
          bg: 'bg-gradient-to-r from-yellow-900/20 to-yellow-800/10',
          text: 'text-yellow-400',
          icon: 'text-yellow-400',
          progress: 'bg-yellow-500',
          badge: 'bg-yellow-600 text-yellow-100'
        };
      case 'danger': 
        return {
          border: 'border-red-500',
          bg: 'bg-gradient-to-r from-red-900/20 to-red-800/10',
          text: 'text-red-400',
          icon: 'text-red-400',
          progress: 'bg-red-500',
          badge: 'bg-red-600 text-red-100'
        };
      default: 
        return {
          border: 'border-gray-500',
          bg: 'bg-gray-800',
          text: 'text-gray-400',
          icon: 'text-gray-400',
          progress: 'bg-gray-500',
          badge: 'bg-gray-600 text-gray-100'
        };
    }
  };

  const colors = getCardColors(status, colorScheme);
  
  // Status labels
  const getStatusLabel = (status, percentage, isReverse) => {
    if (!percentage) return 'No Target';
    
    if (isReverse) {
      if (status === 'success') return 'Excellent';
      if (status === 'warning') return 'Good';
      return 'Needs Improvement';
    } else {
      if (status === 'success') return 'Target Met';
      if (status === 'warning') return 'Close to Target';
      return 'Below Target';
    }
  };
  
  // Format value display - handle $ at front
  const formatValueDisplay = () => {
    if (unit === '$') {
      return `$${typeof value === 'number' ? value.toLocaleString() : value}`;
    }
    return `${typeof value === 'number' ? value.toLocaleString() : value}${unit}`;
  };
  
  const formatTargetDisplay = () => {
    if (unit === '$') {
      return `$${target.toLocaleString()}`;
    }
    return `${target.toLocaleString()}${unit}`;
  };
  
  return (
    <div className={`${colors.bg} rounded-lg p-3 md:p-4 border-l-4 ${colors.border} relative overflow-hidden`}>
      {/* Background pulse effect for critical metrics */}
      {status === 'danger' && (
        <div className="absolute inset-0 bg-red-500 opacity-5 animate-pulse"></div>
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs md:text-sm font-medium text-gray-300 line-clamp-2">{title}</h4>
          <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
            {getStatusIcon(status)}
            {showDetailedStatus && target && (
              <span className={`text-xs px-1 md:px-2 py-1 rounded-full font-medium ${colors.badge} hidden md:inline-block`}>
                {getStatusLabel(status, percentage, isReverse)}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-baseline space-x-1 md:space-x-2 mb-2 md:mb-3">
          <span className={`text-lg md:text-2xl font-bold ${colors.text} truncate`}>
            {formatValueDisplay()}
          </span>
          {target && (
            <span className="text-xs md:text-sm text-gray-400 truncate">
              / {formatTargetDisplay()}
            </span>
          )}
        </div>
        
        {percentage && (
          <div className="space-y-1 md:space-y-2">
            {/* Progress bar */}
            <div className="w-full bg-gray-700 rounded-full h-1.5 md:h-2">
              <div 
                className={`h-1.5 md:h-2 rounded-full transition-all duration-500 ${colors.progress}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              ></div>
            </div>
            
            {/* Percentage and status */}
            <div className="flex justify-between items-center">
              <span className={`text-xs md:text-sm font-medium ${colors.text}`}>
                {percentage}% {isReverse ? '(lower is better)' : 'to target'}
              </span>
              {percentage > 100 && !isReverse && (
                <span className="text-xs text-green-400 font-medium">
                  +{percentage - 100}% over!
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

  // Enhanced Chart with Target Indicators
  const EnhancedChart = ({ data, targetValue, title, dataKey, yAxisLabel }) => {
    return (
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name" 
              stroke="#9CA3AF" 
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              stroke="#9CA3AF" 
              fontSize={12}
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#374151', 
                border: 'none', 
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#F9FAFB' }}
              formatter={(value, name) => {
                if (name === dataKey) {
                  const status = getTargetStatus(value, targetValue);
                  const statusColor = status === 'success' ? '#10B981' : 
                                    status === 'warning' ? '#F59E0B' : '#EF4444';
                  return [
                    <span style={{ color: statusColor }}>
                      {typeof value === 'number' ? value.toLocaleString() : value}
                      {yAxisLabel.includes('$') ? '$' : yAxisLabel.includes('%') ? '%' : ''}
                    </span>, 
                    'Actual'
                  ];
                }
                return [`${value.toLocaleString()}`, 'Target'];
              }}
            />
            <Bar 
              dataKey={dataKey} 
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
            {targetValue && (
              <>
                <ReferenceLine 
                  y={targetValue} 
                  stroke="#EF4444" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                />
                {/* Target zones */}
                <ReferenceLine 
                  y={targetValue * 0.8} 
                  stroke="#F59E0B" 
                  strokeDasharray="2 2" 
                  strokeWidth={1}
                  opacity={0.7}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center space-x-3 md:space-x-6 text-xs md:text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-red-400"></div>
            <span className="text-gray-400">Target: {targetValue?.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-yellow-400 opacity-70"></div>
            <span className="text-gray-400">Warning: {(targetValue * 0.8)?.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4 mt-2">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-400" />
              <span className="text-green-400">At/Above Target</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-yellow-400" />
              <span className="text-yellow-400">Close to Target</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-red-400" />
              <span className="text-red-400">Below Target</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Performance Table with Color-Coded Performance
const PerformanceTable = ({ data, targetValues, title }) => {
  const [sortField, setSortField] = useState('sales');
  const [sortDirection, setSortDirection] = useState('desc');

  const getValueColor = (value, target, isReverse = false) => {
    const status = getTargetStatus(value, target, isReverse);
    switch (status) {
      case 'success': return 'text-green-400 bg-green-900 bg-opacity-20';
      case 'warning': return 'text-yellow-400 bg-yellow-900 bg-opacity-20';
      case 'danger': return 'text-red-400 bg-red-900 bg-opacity-20';
      default: return 'text-gray-300';
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-gray-500 opacity-50" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 text-blue-400" />
      : <ChevronDown className="h-3 w-3 text-blue-400" />;
  };

  const sortedData = [...data].sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case 'name': aVal = a.name || ''; bVal = b.name || ''; break;
      case 'jobs': aVal = a.jobs || 0; bVal = b.jobs || 0; break;
      case 'opportunities': aVal = a.opportunities || 0; bVal = b.opportunities || 0; break;
      case 'closingPercent': aVal = a.closingPercent || 0; bVal = b.closingPercent || 0; break;
      case 'averageDollar': aVal = a.averageDollar || 0; bVal = b.averageDollar || 0; break;
      case 'optionsPerJob': aVal = a.optionsPerJob || 0; bVal = b.optionsPerJob || 0; break;
      case 'sales': aVal = a.sales || 0; bVal = b.sales || 0; break;
      default: aVal = a.sales || 0; bVal = b.sales || 0;
    }
    if (typeof aVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const SortableHeader = ({ field, children, className = '' }) => (
    <th
      className={`${className} text-gray-300 pb-3 text-sm cursor-pointer hover:text-white select-none`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {children}
        <SortIcon field={field} />
      </div>
    </th>
  );

  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-700">
              <SortableHeader field="name" className="sticky left-0 z-10 bg-gray-800 text-left">Name</SortableHeader>
              <SortableHeader field="jobs" className="text-center">Jobs</SortableHeader>
              <SortableHeader field="opportunities" className="text-center">Opportunities</SortableHeader>
              <SortableHeader field="closingPercent" className="text-center">Close Rate</SortableHeader>
              <SortableHeader field="averageDollar" className="text-center">Avg Sale</SortableHeader>
              <SortableHeader field="optionsPerJob" className="text-center">Options/Opp</SortableHeader>
              <SortableHeader field="sales" className="text-center">Total Sales</SortableHeader>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((advisor, index) => {
              const avgTicketColor = getValueColor(advisor.averageDollar, targetValues.avgTicket);
              const closeRateColor = getValueColor(advisor.closingPercent, targetValues.closeRate);
              
              // Debug log for the first advisor
              if (index === 0) {
                console.log('First advisor data:', advisor);
                console.log('Jobs value:', advisor.jobs, 'Type:', typeof advisor.jobs);
                console.log('Sales value:', advisor.sales, 'Type:', typeof advisor.sales);
              }

              return (
                <tr key={index} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="sticky left-0 z-10 bg-gray-800 py-3 text-white font-medium text-sm truncate max-w-[120px]">{advisor.name}</td>
                  <td className="py-3 text-center text-gray-300 text-sm">{advisor.jobs}</td>
                  <td className="py-3 text-center text-gray-300 text-sm">{advisor.opportunities}</td>
                  <td className="py-3 text-center">
                    <div className="flex flex-col items-center space-y-1">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${closeRateColor}`}>
                        {advisor.closingPercent}%
                      </span>
                      {getStatusIcon(getTargetStatus(advisor.closingPercent, targetValues.closeRate))}
                      <div className="text-xs text-gray-400">
                        Target: {targetValues.closeRate}%
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex flex-col items-center space-y-1">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${avgTicketColor}`}>
                        ${advisor.averageDollar?.toLocaleString()}
                      </span>
                      {getStatusIcon(getTargetStatus(advisor.averageDollar, targetValues.avgTicket))}
                      <div className="text-xs text-gray-400">
                        Target: ${targetValues.avgTicket?.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-3 text-center text-gray-300 text-sm">
                    {advisor.optionsPerJob?.toFixed(1) || '0.0'}
                  </td>
                  
                  <td className="py-3 text-center text-gray-300 text-sm">
                    ${advisor.sales?.toLocaleString()}  {/* Updated to show $ at front */}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

  // Filter technicians by trade
  const filterTechniciansByTrade = (technicianData, trade) => {
    if (!technicianData) return [];
    return technicianData.filter(tech => 
      tech.trade && tech.trade.toLowerCase().includes(trade.toLowerCase())
    );
  };

  // Filter maint technicians by business unit
  const filterTechniciansByBusinessUnit = (technicianData, businessUnit) => {
  if (!technicianData) return [];
  return technicianData.filter(tech => 
    tech.businessUnit && tech.businessUnit.includes(businessUnit)
  );
};

  // Comfort Advisor View
  const ComfortAdvisorView = () => {
    const avgTicketTarget = getTargetValue('comfort_advisor', 'avg_ticket', timePeriod);
    const closeRateTarget = getTargetValue('comfort_advisor', 'close_rate', timePeriod);
    
    const advisorData = dashboardData.comfort_advisor || [];
    
    // Company totals (for display only, not target comparison)
    const totalSales = advisorData.reduce((sum, advisor) => sum + (advisor.sales || 0), 0);
    const totalJobs = advisorData.reduce((sum, advisor) => sum + (advisor.jobs || 0), 0);
    const totalOpportunities = advisorData.reduce((sum, advisor) => sum + (advisor.opportunities || 0), 0);
    
    const avgTicket = totalSales > 0 
      ? advisorData.reduce((sum, advisor) => {
          const weight = (advisor.sales || 0) / totalSales;
          return sum + ((advisor.averageDollar || 0) * weight);
        }, 0)
      : 0;
    
    const avgCloseRate = totalOpportunities > 0
      ? advisorData.reduce((sum, advisor) => {
          const weight = (advisor.opportunities || 0) / totalOpportunities;
          return sum + ((advisor.closingPercent || 0) * weight);
        }, 0)
      : 0;

    // Individual performance analysis for targets
    const individualTargetStatus = {
      avgTicket: {
        meeting: avgTicketTarget ? advisorData.filter(a => a.averageDollar >= avgTicketTarget).length : 0,
        total: advisorData.length,
        percentage: avgTicketTarget && advisorData.length > 0 ? (advisorData.filter(a => a.averageDollar >= avgTicketTarget).length / advisorData.length) * 100 : 0
      },
      closeRate: {
        meeting: closeRateTarget ? advisorData.filter(a => a.closingPercent >= closeRateTarget).length : 0,
        total: advisorData.length,
        percentage: closeRateTarget && advisorData.length > 0 ? (advisorData.filter(a => a.closingPercent >= closeRateTarget).length / advisorData.length) * 100 : 0
      }
    };

    const chartData = advisorData.map(advisor => ({
      name: advisor.name ? `${advisor.name.split(' ')[0]} ${advisor.name.split(' ')[1]?.[0] || ''}`.trim() : 'Unknown',
      actual: advisor.averageDollar || 0,
      target: avgTicketTarget,
      closeRate: advisor.closingPercent || 0,
      closeTarget: closeRateTarget
    }));

    const targetValues = {
      avgTicket: avgTicketTarget,
      closeRate: closeRateTarget
    };

    return (
  <div className="space-y-4 md:space-y-6">

        {/* Company Summary Cards - Now show individual target achievement */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-gray-800 rounded-lg p-3 md:p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs md:text-sm font-medium text-gray-300">Avg Sale (Company)</h4>
            <Target className="h-3 w-3 md:h-4 md:w-4 text-blue-400" />
          </div>
          <div className="flex items-baseline space-x-1 md:space-x-2 mb-2">
            <span className="text-lg md:text-2xl font-bold text-blue-400">
              ${Math.round(avgTicket).toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Individual Target: ${avgTicketTarget?.toLocaleString() || 'Not Set'} •
            {individualTargetStatus.avgTicket.meeting}/{individualTargetStatus.avgTicket.total} meeting target
            ({Math.round(individualTargetStatus.avgTicket.percentage)}%)
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 md:p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs md:text-sm font-medium text-gray-300">Close Rate (Company)</h4>
            <Target className="h-3 w-3 md:h-4 md:w-4 text-green-400" />
          </div>
          <div className="flex items-baseline space-x-1 md:space-x-2 mb-2">
            <span className="text-lg md:text-2xl font-bold text-green-400">
              {Math.round(avgCloseRate)}%
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Individual Target: {closeRateTarget || 'Not Set'}% • 
            {individualTargetStatus.closeRate.meeting}/{individualTargetStatus.closeRate.total} meeting target 
            ({Math.round(individualTargetStatus.closeRate.percentage)}%)
          </div>
        </div>

        <MetricCard 
          title="Total Sales" 
          value={totalSales} 
          unit="$"  // Changed to use $ at front
          showDetailedStatus={false}
          colorScheme="purple"
        />
        <MetricCard 
          title="Jobs Completed" 
          value={totalJobs} 
          unit=" jobs" 
          showDetailedStatus={false}
          colorScheme="orange"
        />
      </div>

      {currentUser?.role !== 'display' && (
        <EnhancedChart 
          data={chartData}
          targetValue={avgTicketTarget}
          title="Average Ticket by Advisor"
          dataKey="actual"
          yAxisLabel="Average Ticket ($)"
        />
      )}

      <PerformanceTable 
        data={advisorData}
        targetValues={targetValues}
        title="Individual Performance"
      />
    </div>
  );
};

  // Call Center View
  const CallCenterView = () => {
  const bookingRateTarget = getTargetValue('call_center', 'booking_rate', timePeriod);
  const membershipsTarget = getTargetValue('call_center', 'memberships_sold', timePeriod);
  
  const callCenterData = dashboardData.call_center || [];
  
  const formatCallDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Company totals (for display only)
  const totalCalls = callCenterData.reduce((sum, agent) => sum + (agent.totalCalls || 0), 0);
  const totalBooked = callCenterData.reduce((sum, agent) => sum + (agent.bookedCalls || 0), 0);
  const avgBookingRate = callCenterData.length > 0 
    ? Math.round(callCenterData.reduce((sum, agent) => sum + (agent.bookingPercent || 0), 0) / callCenterData.length) 
    : 0;
  const totalMemberships = callCenterData.reduce((sum, agent) => sum + (agent.coolClubMemberships || 0), 0);

  // Individual performance analysis for targets
  const individualTargetStatus = {
    bookingRate: {
      meeting: callCenterData.filter(a => a.bookingPercent >= bookingRateTarget).length,
      total: callCenterData.length,
      percentage: callCenterData.length > 0 ? (callCenterData.filter(a => a.bookingPercent >= bookingRateTarget).length / callCenterData.length) * 100 : 0
    },
    memberships: {
      meeting: callCenterData.filter(a => a.coolClubMemberships >= membershipsTarget).length,
      total: callCenterData.length,
      percentage: callCenterData.length > 0 ? (callCenterData.filter(a => a.coolClubMemberships >= membershipsTarget).length / callCenterData.length) * 100 : 0
    }
  };

  const chartData = callCenterData.map(agent => ({
    name: agent.name ? `${agent.name.split(' ')[0]} ${agent.name.split(' ')[1]?.[0] || ''}`.trim() : 'Unknown',
    bookingRate: agent.bookingPercent || 0,
    target: bookingRateTarget
  }));

  const targetValues = {
    bookingRate: bookingRateTarget,
    memberships: membershipsTarget
  };

  return (
    <div className="space-y-4 md:space-y-6">

      {/* Company Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-gray-800 rounded-lg p-3 md:p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs md:text-sm font-medium text-gray-300">Booking Rate (Company)</h4>
            <Target className="h-3 w-3 md:h-4 md:w-4 text-green-400" />
          </div>
          <div className="flex items-baseline space-x-1 md:space-x-2 mb-2">
            <span className="text-lg md:text-2xl font-bold text-green-400">
              {Math.round(avgBookingRate)}%
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Individual Target: {bookingRateTarget || 'Not Set'}% • 
            {individualTargetStatus.bookingRate.meeting}/{individualTargetStatus.bookingRate.total} meeting target 
            ({Math.round(individualTargetStatus.bookingRate.percentage)}%)
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 md:p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs md:text-sm font-medium text-gray-300">Memberships (Company)</h4>
            <Target className="h-3 w-3 md:h-4 md:w-4 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-1 md:space-x-2 mb-2">
            <span className="text-lg md:text-2xl font-bold text-purple-400">
              {totalMemberships}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Individual Target: {membershipsTarget} each • 
            {individualTargetStatus.memberships.meeting}/{individualTargetStatus.memberships.total} meeting target 
            ({Math.round(individualTargetStatus.memberships.percentage)}%)
          </div>
        </div>

        <MetricCard 
          title="Total Calls" 
          value={totalCalls} 
          unit=" calls" 
          showDetailedStatus={false}
          colorScheme="blue"
        />
        <MetricCard 
          title="Calls Booked" 
          value={totalBooked} 
          unit=" appointments" 
          showDetailedStatus={false}
          colorScheme="orange"
        />
      </div>

      {currentUser?.role !== 'display' && (
        <EnhancedChart 
          data={chartData}
          targetValue={bookingRateTarget}
          title="Booking Rate by Agent"
          dataKey="bookingRate"
          yAxisLabel="Booking Rate (%)"
        />
      )}

      {/* Call Center Performance Table - WITH SORTING BY BOOKED AND MOBILE FROZEN FIRST COLUMN */}
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Individual Agent Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="sticky left-0 z-10 bg-gray-800 text-left text-gray-300 pb-3 text-sm">Agent</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Total Calls</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Lead Calls</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Booked</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Booking Rate</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Avg Call Time</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Memberships</th>
              </tr>
            </thead>
            <tbody>
              {callCenterData
                .sort((a, b) => (b.bookedCalls || 0) - (a.bookedCalls || 0)) // Sort by booked calls descending
                .map((agent, index) => {
                const bookingStatus = getTargetStatus(agent.bookingPercent, bookingRateTarget);
                const membershipStatus = getTargetStatus(agent.coolClubMemberships, membershipsTarget);
                
                return (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="sticky left-0 z-10 bg-gray-800 py-3 text-white font-medium text-sm truncate max-w-[120px]">{agent.name}</td>
                    <td className="py-3 text-center text-gray-300 text-sm">{agent.totalCalls}</td>

                    <td className="py-3 text-center text-gray-300 text-sm">{agent.leadCalls}</td>

                    <td className="py-3 text-center">
                      <span className={`font-medium ${
                        (agent.bookedCalls || 0) > 0 ? 'text-green-400' : 'text-gray-300'
                      }`}>
                        {agent.bookedCalls || 0}
                      </span>
                    </td>

                    <td className="py-3 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(bookingStatus)}`}>
                          {agent.bookingPercent}%
                        </span>
                        {getStatusIcon(getTargetStatus(agent.bookingPercent, bookingRateTarget))}
                        <div className="text-xs text-gray-400">
                          Target: {bookingRateTarget || 'Not Set'}%
                        </div>
                      </div>
                    </td>

                    <td className="py-3 text-center text-gray-300 text-sm">
                      {formatCallDuration(agent.avgCallDuration)}
                    </td>

                    <td className="py-3 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(membershipStatus)}`}>
                          {agent.coolClubMemberships}
                        </span>
                        {getStatusIcon(getTargetStatus(agent.coolClubMemberships, membershipsTarget))}
                        <div className="text-xs text-gray-400">
                          Target: {membershipsTarget || 'Not Set'}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

  // Generic Technician View (for HVAC, Plumbing, Electrical)
const TechnicianView = ({ 
  tradeFilter = null, 
  businessUnitFilter = null, 
  viewTitle = "Technician", 
  targetCategory = "technician",
  dataKey = "technician"  // NEW: dataKey parameter
}) => {
  const avgTicketTarget = getTargetValue(targetCategory, 'avg_ticket', timePeriod);
  const closeRateTarget = getTargetValue(targetCategory, 'close_rate', timePeriod);
  const recallRateTarget = getTargetValue(targetCategory, 'recall_rate', timePeriod);
  const membershipsTarget = getTargetValue(targetCategory, 'memberships_sold', timePeriod);
  
  // UPDATED: Use dataKey to get the right data source
  const allTechnicianData = dashboardData[dataKey] || [];
  let technicianData;

  // Debug logging
  console.log(`🔧 TechnicianView - ${viewTitle}`);
  console.log(`📦 Using dataKey: ${dataKey}`);
  console.log(`📊 Total records:`, allTechnicianData.length);
  if (allTechnicianData.length > 0) {
    console.log(`📋 Sample record:`, allTechnicianData[0]);
    console.log(`🏷️ Unique trades:`, [...new Set(allTechnicianData.map(t => t.trade))]);
  }
  if (tradeFilter) {
    console.log(`🔍 Applying trade filter: ${tradeFilter}`);
  }
  if (businessUnitFilter) {
    console.log(`🏢 Applying business unit filter: ${businessUnitFilter}`);
  }

  if (businessUnitFilter) {
    // Filter by business unit
    technicianData = filterTechniciansByBusinessUnit(allTechnicianData, businessUnitFilter);
    console.log(`✅ After business unit filter:`, technicianData.length);
  } else if (tradeFilter) {
    // Filter by trade
    technicianData = filterTechniciansByTrade(allTechnicianData, tradeFilter);
    console.log(`✅ After trade filter:`, technicianData.length);
  } else {
    // No filter - use data as-is (for HVAC Tech and HVAC Maintenance with new endpoints)
    technicianData = allTechnicianData;
    console.log(`✅ No filter, using all records`);
  }
    
    // Company totals (for display only)
    const totalSales = technicianData.reduce((sum, tech) => sum + (tech.totalSales || 0), 0);
    const totalJobs = technicianData.reduce((sum, tech) => sum + (tech.completedJobs || 0), 0);
    const totalOpportunities = technicianData.reduce((sum, tech) => sum + (tech.opportunities || 0), 0);
  
    const avgTicket = totalSales > 0 
      ? technicianData.reduce((sum, tech) => {
          const weight = (tech.totalSales || 0) / totalSales;
          return sum + ((tech.totalJobAverage || 0) * weight);
        }, 0)
      : 0;
  
    const avgCloseRate = totalOpportunities > 0
      ? technicianData.reduce((sum, tech) => {
          const weight = (tech.opportunities || 0) / totalOpportunities;
          return sum + ((tech.closeRatePercent || 0) * weight);
        }, 0)
      : 0;

    const avgRecallRate = technicianData.length > 0
      ? technicianData.reduce((sum, tech) => sum + (tech.techRecallPercent || 0), 0) / technicianData.length
      : 0;

    const totalMemberships = technicianData.reduce((sum, tech) => sum + (tech.membershipsSold || 0), 0);

    // Individual performance analysis for targets
    const individualTargetStatus = {
    avgTicket: {
      meeting: avgTicketTarget ? technicianData.filter(a => a.totalJobAverage >= avgTicketTarget).length : 0,
      total: technicianData.length,
      percentage: avgTicketTarget && technicianData.length > 0 ? (technicianData.filter(a => a.totalJobAverage >= avgTicketTarget).length / technicianData.length) * 100 : 0
    },
    closeRate: {
      meeting: closeRateTarget ? technicianData.filter(a => a.closeRatePercent >= closeRateTarget).length : 0,
      total: technicianData.length,
      percentage: closeRateTarget && technicianData.length > 0 ? (technicianData.filter(a => a.closeRatePercent >= closeRateTarget).length / technicianData.length) * 100 : 0
    },
    recallRate: {
      meeting: recallRateTarget ? technicianData.filter(a => a.techRecallPercent <= recallRateTarget).length : 0,
      total: technicianData.length,
      percentage: recallRateTarget && technicianData.length > 0 ? (technicianData.filter(a => a.techRecallPercent <= recallRateTarget).length / technicianData.length) * 100 : 0
    },
    memberships: {
      meeting: membershipsTarget ? technicianData.filter(a => a.membershipsSold >= membershipsTarget).length : 0,
      total: technicianData.length,
      percentage: membershipsTarget && technicianData.length > 0 ? (technicianData.filter(a => a.membershipsSold >= membershipsTarget).length / technicianData.length) * 100 : 0
    }
  };

  const chartData = technicianData.map(tech => ({
    name: tech.name ? `${tech.name.split(' ')[0]} ${tech.name.split(' ')[1]?.[0] || ''}`.trim() : 'Unknown',
    actual: tech.totalJobAverage || 0,
    target: avgTicketTarget,
    closeRate: tech.closeRatePercent || 0,
    closeTarget: closeRateTarget
  })).slice(0, 10); // Show top 10

  const targetValues = {
    avgTicket: avgTicketTarget,
    closeRate: closeRateTarget,
    recallRate: recallRateTarget,
    memberships: membershipsTarget
  };

  // Sorting state for technician table
  const [techSortField, setTechSortField] = useState('totalSales');
  const [techSortDirection, setTechSortDirection] = useState('desc');

  const handleTechSort = (field) => {
    if (techSortField === field) {
      setTechSortDirection(techSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setTechSortField(field);
      setTechSortDirection('desc');
    }
  };

  const TechSortIcon = ({ field }) => {
    if (techSortField !== field) return <ChevronDown className="h-3 w-3 text-gray-500 opacity-50" />;
    return techSortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 text-blue-400" />
      : <ChevronDown className="h-3 w-3 text-blue-400" />;
  };

  const sortedTechnicianData = [...technicianData].sort((a, b) => {
    let aVal, bVal;
    switch (techSortField) {
      case 'name': aVal = a.name || ''; bVal = b.name || ''; break;
      case 'trade': aVal = a.trade || ''; bVal = b.trade || ''; break;
      case 'completedJobs': aVal = a.completedJobs || 0; bVal = b.completedJobs || 0; break;
      case 'opportunities': aVal = a.opportunities || 0; bVal = b.opportunities || 0; break;
      case 'closeRatePercent': aVal = a.closeRatePercent || 0; bVal = b.closeRatePercent || 0; break;
      case 'totalJobAverage': aVal = a.totalJobAverage || 0; bVal = b.totalJobAverage || 0; break;
      case 'techRecallPercent': aVal = a.techRecallPercent || 0; bVal = b.techRecallPercent || 0; break;
      case 'membershipsSold': aVal = a.membershipsSold || 0; bVal = b.membershipsSold || 0; break;
      case 'leadsSet': aVal = a.leadsSet || 0; bVal = b.leadsSet || 0; break;
      case 'totalSales': aVal = a.totalSales || 0; bVal = b.totalSales || 0; break;
      case 'firstCallArrivalTime': aVal = a.firstCallArrivalTime || ''; bVal = b.firstCallArrivalTime || ''; break;
      default: aVal = a.totalSales || 0; bVal = b.totalSales || 0;
    }
    if (typeof aVal === 'string') {
      return techSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return techSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const TechSortableHeader = ({ field, children, className = '' }) => (
    <th
      className={`${className} text-gray-300 pb-3 text-sm cursor-pointer hover:text-white select-none`}
      onClick={() => handleTechSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {children}
        <TechSortIcon field={field} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 md:space-y-6">

      {/* Company Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-gray-800 rounded-lg p-3 md:p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs md:text-sm font-medium text-gray-300">Avg Ticket (Company)</h4>
            <Target className="h-3 w-3 md:h-4 md:w-4 text-blue-400" />
          </div>
          <div className="flex items-baseline space-x-1 md:space-x-2 mb-2">
            <span className="text-lg md:text-2xl font-bold text-blue-400">
              ${Math.round(avgTicket).toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Individual Target: ${avgTicketTarget?.toLocaleString() || 'Not Set'} • 
            {individualTargetStatus.avgTicket.meeting}/{individualTargetStatus.avgTicket.total} meeting target 
            ({Math.round(individualTargetStatus.avgTicket.percentage)}%)
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 md:p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs md:text-sm font-medium text-gray-300">Close Rate (Company)</h4>
            <Target className="h-3 w-3 md:h-4 md:w-4 text-green-400" />
          </div>
          <div className="flex items-baseline space-x-1 md:space-x-2 mb-2">
            <span className="text-lg md:text-2xl font-bold text-green-400">
              {Math.round(avgCloseRate)}%
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Individual Target: {closeRateTarget || 'Not Set'}% • 
            {individualTargetStatus.closeRate.meeting}/{individualTargetStatus.closeRate.total} meeting target 
            ({Math.round(individualTargetStatus.closeRate.percentage)}%)
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 md:p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs md:text-sm font-medium text-gray-300">Total Sales</h4>
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-1 md:space-x-2 mb-2">
            <span className="text-lg md:text-2xl font-bold text-purple-400">
              ${totalSales.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Total revenue for {viewTitle}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 md:p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs md:text-sm font-medium text-gray-300">Recall Rate (Company)</h4>
            <Target className="h-3 w-3 md:h-4 md:w-4 text-yellow-400" />
          </div>
          <div className="flex items-baseline space-x-1 md:space-x-2 mb-2">
            <span className="text-lg md:text-2xl font-bold text-yellow-400">
              {Math.round(avgRecallRate * 10) / 10}%
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Individual Target: ≤{recallRateTarget || 'Not Set'}% •
            {individualTargetStatus.recallRate.meeting}/{individualTargetStatus.recallRate.total} meeting target
            ({Math.round(individualTargetStatus.recallRate.percentage)}%)
          </div>
        </div>
      </div>

      {currentUser?.role !== 'display' && (
        <EnhancedChart 
          data={chartData}
          targetValue={avgTicketTarget}
          title={`Average Ticket by ${viewTitle} (Top 10)`}
          dataKey="actual"
          yAxisLabel="Average Ticket ($)"
        />
      )}

      {/* Technician Performance Table - WITH FROZEN FIRST COLUMN */}
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Individual {viewTitle} Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-700">
                <TechSortableHeader field="name" className="sticky left-0 z-10 bg-gray-800 text-left">Technician</TechSortableHeader>
                <TechSortableHeader field="trade" className="text-center">Trade</TechSortableHeader>
                <TechSortableHeader field="completedJobs" className="text-center">Jobs</TechSortableHeader>
                <TechSortableHeader field="opportunities" className="text-center">Opportunities</TechSortableHeader>
                <TechSortableHeader field="closeRatePercent" className="text-center">Close Rate</TechSortableHeader>
                <TechSortableHeader field="totalJobAverage" className="text-center">Avg Ticket</TechSortableHeader>
                <TechSortableHeader field="techRecallPercent" className="text-center">Recall Rate</TechSortableHeader>
                <TechSortableHeader field="membershipsSold" className="text-center">Memberships</TechSortableHeader>
                <TechSortableHeader field="leadsSet" className="text-center">Flips</TechSortableHeader>
                <TechSortableHeader field="firstCallArrivalTime" className="text-center">1st Call Arrival</TechSortableHeader>
                <TechSortableHeader field="totalSales" className="text-center">Total Sales</TechSortableHeader>
              </tr>
            </thead>
            <tbody>
              {sortedTechnicianData
                .slice(0, 20)
                .map((tech, index) => {
                const closeRateStatus = getTargetStatus(tech.closeRatePercent, closeRateTarget);
                const avgTicketStatus = getTargetStatus(tech.totalJobAverage, avgTicketTarget);
                const recallRateStatus = getTargetStatus(tech.techRecallPercent, recallRateTarget, true); // isReverse = true for recall rate
                const membershipStatus = getTargetStatus(tech.membershipsSold, membershipsTarget);
                
                return (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="sticky left-0 z-10 bg-gray-800 py-3 text-white font-medium text-sm truncate max-w-[120px]">{tech.name}</td>
                    <td className="py-3 text-center text-gray-300 text-sm">{tech.trade}</td>
                    <td className="py-3 text-center text-gray-300 text-sm">{tech.completedJobs}</td>
                    <td className="py-3 text-center text-gray-300 text-sm">{tech.opportunities}</td>
                    
                    {/* Close Rate with color indicator */}
                    <td className="py-3 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(closeRateStatus)}`}>
                          {tech.closeRatePercent}%
                        </span>
                        {getStatusIcon(closeRateStatus)}
                        <div className="text-xs text-gray-400">
                          Target: {closeRateTarget}%
                        </div>
                      </div>
                    </td>
                    
                    {/* Average Ticket with color indicator */}
                    <td className="py-3 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(avgTicketStatus)}`}>
                          ${tech.totalJobAverage?.toLocaleString()}
                        </span>
                        {getStatusIcon(avgTicketStatus)}
                        <div className="text-xs text-gray-400">
                          Target: ${avgTicketTarget?.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    
                    {/* Recall Rate with color indicator (lower is better) */}
                    <td className="py-3 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(recallRateStatus)}`}>
                          {tech.techRecallPercent}%
                        </span>
                        {getStatusIcon(recallRateStatus)}
                        <div className="text-xs text-gray-400">
                          Target: ≤{recallRateTarget}%
                        </div>
                      </div>
                    </td>
                    
                    {/* Memberships with color indicator */}
                    <td className="py-3 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(membershipStatus)}`}>
                          {tech.membershipsSold}
                        </span>
                        {getStatusIcon(membershipStatus)}
                        <div className="text-xs text-gray-400">
                          Target: {membershipsTarget}
                        </div>
                      </div>
                    </td>

                    {/* Leads Set */}
                    <td className="py-3 text-center">
                      <span className={`font-medium ${
                        (tech.leadsSet || 0) > 0 ? 'text-green-400' : 'text-gray-300'
                      }`}>
                        {tech.leadsSet || 0}
                      </span>
                    </td>

                    {/* First Call Arrival Time */}
                    <td className="py-3 text-center text-gray-300 text-sm">
                      {tech.firstCallArrivalTime || '-'}
                    </td>

                    {/* Total Sales */}
                    <td className="py-3 text-center text-gray-300 text-sm">
                      ${tech.totalSales?.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

  // Financial View
const FinancialView = () => {
  // Uses parent-level financialSubTab state

  // Fixed department order
  const departmentOrder = [
    'hvac_replacement',
    'hvac_service',
    'hvac_maintenance',
    'commercial_hvac',
    'plumbing',
    'electrical',
    'tyler'
  ];

  // Sort financial data by fixed order
  const financialData = (dashboardData.financial || []).sort((a, b) => {
    const indexA = departmentOrder.indexOf(a.department);
    const indexB = departmentOrder.indexOf(b.department);
    // If department not in order list, put it at the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Department labels mapping
  const departmentLabels = {
    'hvac_service': 'HVAC Service',
    'hvac_maintenance': 'HVAC Maintenance',
    'hvac_replacement': 'HVAC Replacement',
    'commercial_hvac': 'Commercial HVAC',
    'plumbing': 'Plumbing',
    'electrical': 'Electrical',
    'tyler': 'Tyler'
  };

  // DEFINE FUNCTIONS FIRST - before using them
  const getBudgetTarget = (department) => {
    const monthlyTargets = targets.financial?.monthly?.[department];
    if (monthlyTargets) {
      const currentMonthTarget = monthlyTargets.find(t => t.month === new Date().getMonth() + 1);
      return currentMonthTarget?.value || 0;
    }
    return 0;
  };

  const getBudgetStatus = (actualRevenue, target) => {
    if (!target) return 'unknown';
    const percentage = (actualRevenue / target) * 100;
    if (percentage >= 100) return 'success';
    if (percentage >= 80) return 'warning';
    return 'danger';
  };

  // NEW: Pace-based budget status for MTD
  const getPaceBudgetStatus = (actualRevenue, monthlyTarget, timePeriod) => {
    if (!monthlyTarget || timePeriod !== 'mtd') {
      // Fall back to simple comparison for non-MTD periods
      return getBudgetStatus(actualRevenue, monthlyTarget);
    }
    
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth; // 0.0 to 1.0
    
    // Expected revenue at this point in the month
    const expectedRevenueToDate = monthlyTarget * monthProgress;
    
    // Calculate pace: how much we should have vs how much we actually have
    const revenueRatio = actualRevenue / expectedRevenueToDate;
    
    // Pace-based status thresholds
    if (revenueRatio >= 1.1) return 'success';  // 110%+ of pace = green
    if (revenueRatio >= 0.95) return 'success'; // 95-110% of pace = green  
    if (revenueRatio >= 0.80) return 'warning'; // 80-95% of pace = yellow
    return 'danger';                            // <80% of pace = red
  };

  const getShortDepartmentName = (department) => {
    const shortNames = {
      'hvac_service': 'Service',
      'hvac_maintenance': 'Maintenance',
      'hvac_replacement': 'Replacement',
      'commercial_hvac': 'Commercial',
      'plumbing': 'Plumbing',
      'electrical': 'Electrical',
      'tyler': 'Tyler'
    };
    return shortNames[department] || department;
  };

  // Get major holidays for a given year
  const getHolidays = (year) => {
    const holidays = [];

    // Fixed date holidays
    holidays.push(new Date(year, 0, 1));  // New Year's Day
    holidays.push(new Date(year, 6, 4));  // Independence Day
    holidays.push(new Date(year, 11, 25)); // Christmas

    // Memorial Day - Last Monday in May
    const memorialDay = new Date(year, 4, 31); // Start at May 31
    while (memorialDay.getDay() !== 1) {
      memorialDay.setDate(memorialDay.getDate() - 1);
    }
    holidays.push(new Date(memorialDay));

    // Labor Day - First Monday in September
    const laborDay = new Date(year, 8, 1); // September 1
    while (laborDay.getDay() !== 1) {
      laborDay.setDate(laborDay.getDate() + 1);
    }
    holidays.push(new Date(laborDay));

    // Thanksgiving - Fourth Thursday in November
    const thanksgiving = new Date(year, 10, 1); // November 1
    let thursdayCount = 0;
    while (thursdayCount < 4) {
      if (thanksgiving.getDay() === 4) {
        thursdayCount++;
      }
      if (thursdayCount < 4) {
        thanksgiving.setDate(thanksgiving.getDate() + 1);
      }
    }
    holidays.push(new Date(thanksgiving));

    return holidays;
  };

  // Check if a date is a holiday
  const isHoliday = (date, holidays) => {
    return holidays.some(holiday =>
      holiday.getFullYear() === date.getFullYear() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getDate() === date.getDate()
    );
  };

  // Calculate effective working days (M-F full days, Sat 25% capacity, Sun closed, excluding holidays)
  // countSaturdays parameter controls whether Saturdays are included (only for certain HVAC departments)
  const getEffectiveWorkingDays = (startDate, endDate, countSaturdays = true) => {
    let weekdays = 0;
    let saturdays = 0;

    // Get holidays for the year(s) covered by the date range
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    let holidays = getHolidays(startYear);
    if (endYear !== startYear) {
      holidays = holidays.concat(getHolidays(endYear));
    }

    // Normalize dates to start of day for accurate comparison including today
    const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    const current = new Date(normalizedStart);
    while (current <= normalizedEnd) {
      const dayOfWeek = current.getDay(); // 0=Sunday, 6=Saturday

      // Skip if it's a holiday
      if (!isHoliday(current, holidays)) {
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          weekdays++;
        } else if (dayOfWeek === 6 && countSaturdays) {
          saturdays++;
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return weekdays + (saturdays * 0.25);
  };

  // Check if department works on Saturdays (only residential HVAC departments)
  const departmentWorksSaturdays = (department) => {
    return ['hvac_replacement', 'hvac_service', 'hvac_maintenance'].includes(department);
  };

  // NOW calculate totals - after functions are defined
  const totalRevenue = financialData.reduce((sum, dept) => sum + (dept.totalRevenue || 0), 0);
  const totalJobs = financialData.reduce((sum, dept) => sum + (dept.techLeadJobs || 0) + (dept.marketingLeadJobs || 0), 0);
  const totalOpportunities = financialData.reduce((sum, dept) => sum + (dept.opportunities || 0), 0);
  const totalMembershipRevenue = financialData.reduce((sum, dept) => sum + (dept.membershipRevenue || 0), 0);

  // Get unsold estimates data for Potential Revenue card
  const unsoldEstimates = dashboardData.unsoldEstimates || {};
  const potentialRevenue = unsoldEstimates.potentialRevenue || 0;
  const unsoldOpportunities = unsoldEstimates.totalOpportunities || 0;

  // Calculate total budget from all departments
  const getTotalBudgetForPeriod = (timePeriod) => {
  return financialData.reduce((sum, dept) => {
    let adjustedTarget = 0;
    
    // Get the correct monthly target based on time period
    const getTargetForPeriod = (department, period) => {
      const monthlyTargets = targets?.financial?.monthly?.[department];
      if (!monthlyTargets) return 0;

      const now = new Date();
      const currentYear = now.getFullYear();

      switch (period) {
        case 'ytd':
          // YTD: Sum of January through current month for current year
          const currentMonth = now.getMonth() + 1;
          let ytdTarget = 0;
          for (let month = 1; month <= currentMonth; month++) {
            const monthTarget = monthlyTargets.find(t => t.month === month && t.year === currentYear);
            ytdTarget += monthTarget?.value || 0;
          }
          return ytdTarget;
        case 'last_month':
          // Last month: Previous month's target (handle year boundary)
          const lastMonthIndex = now.getMonth(); // 0-11
          const targetMonth = lastMonthIndex === 0 ? 12 : lastMonthIndex;
          const targetYear = lastMonthIndex === 0 ? currentYear - 1 : currentYear;
          const lastMonthTarget = monthlyTargets.find(t => t.month === targetMonth && t.year === targetYear);
          return lastMonthTarget?.value || 0;
        case 'mtd':
        default:
          // MTD: Current month target for current year
          const currentMonthTarget = monthlyTargets.find(t => t.month === now.getMonth() + 1 && t.year === currentYear);
          return currentMonthTarget?.value || 0;
      }
    };
    
    adjustedTarget = getTargetForPeriod(dept.department, timePeriod);
    return sum + adjustedTarget;
  }, 0);
};

const totalBudget = getTotalBudgetForPeriod(timePeriod);

  // Get the overall revenue status
  const totalRevenueStatus = getPaceBudgetStatus(totalRevenue, totalBudget, timePeriod);

  // Calculate daily average revenue based on effective working days
  const getDailyAverageRevenue = () => {
    const today = new Date();

    if (timePeriod === 'mtd') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const elapsedEffectiveDays = getEffectiveWorkingDays(startOfMonth, today);
      return elapsedEffectiveDays > 0 ? Math.round(totalRevenue / elapsedEffectiveDays) : 0;
    } else if (timePeriod === 'last_month') {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      const effectiveDaysInLastMonth = getEffectiveWorkingDays(lastMonth, endOfLastMonth);
      return effectiveDaysInLastMonth > 0 ? Math.round(totalRevenue / effectiveDaysInLastMonth) : 0;
    } else if (timePeriod === 'ytd') {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const elapsedEffectiveDays = getEffectiveWorkingDays(startOfYear, today);
      return elapsedEffectiveDays > 0 ? Math.round(totalRevenue / elapsedEffectiveDays) : 0;
    }
    return 0;
  };

  const dailyAverageRevenue = getDailyAverageRevenue();

  // Enhanced Total Revenue Card Component
const EnhancedTotalRevenueCard = () => {
  const getCardColors = (status) => {
    switch (status) {
      case 'success': 
        return {
          border: 'border-green-500',
          bg: 'bg-gray-800',
          text: 'text-green-400',
          progress: 'bg-green-500',
          badge: 'bg-green-600 text-green-100'
        };
      case 'warning': 
        return {
          border: 'border-yellow-500',
          bg: 'bg-gray-800',
          text: 'text-yellow-400',
          progress: 'bg-yellow-500',
          badge: 'bg-yellow-600 text-yellow-100'
        };
      case 'danger': 
        return {
          border: 'border-red-500',
          bg: 'bg-gray-800',
          text: 'text-red-400',
          progress: 'bg-red-500',
          badge: 'bg-red-600 text-red-100'
        };
      default: 
        return {
          border: 'border-gray-500',
          bg: 'bg-gray-800',
          text: 'text-gray-400',
          progress: 'bg-gray-500',
          badge: 'bg-gray-600 text-gray-100'
        };
    }
  };

  const colors = getCardColors(totalRevenueStatus);
  
  // Time period specific calculations and labels
  const getTimePeriodInfo = (timePeriod) => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth;
    
    switch (timePeriod) {
      case 'ytd':
        const currentMonth = today.getMonth() + 1;
        return {
          label: 'Year-to-Date Revenue',
          targetLabel: `YTD Target (${currentMonth} months)`,
          usePace: false,
          progressLabel: `${Math.round((totalRevenue / totalBudget) * 100)}% of YTD target`,
          contextLabel: `Through ${today.toLocaleDateString('en-US', { month: 'long' })}`
        };
      case 'last_month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return {
          label: 'Last Month Revenue',
          targetLabel: `${lastMonth.toLocaleDateString('en-US', { month: 'long' })} Target`,
          usePace: false,
          progressLabel: `${Math.round((totalRevenue / totalBudget) * 100)}% of monthly target`,
          contextLabel: lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      case 'mtd':
      default:
        const expectedRevenueToDate = totalBudget * monthProgress;
        const pacePercentage = expectedRevenueToDate > 0 ? Math.round((totalRevenue / expectedRevenueToDate) * 100) : 0;
        return {
          label: 'Month-to-Date Revenue',
          targetLabel: 'Monthly Target',
          usePace: true,
          pacePercentage,
          expectedRevenue: expectedRevenueToDate,
          progressLabel: `${pacePercentage}% of expected pace`,
          contextLabel: `Day ${dayOfMonth} of ${daysInMonth} (${Math.round(monthProgress * 100)}% through month)`
        };
    }
  };

  const periodInfo = getTimePeriodInfo(timePeriod);
  const budgetPercentage = totalBudget > 0 ? Math.round((totalRevenue / totalBudget) * 100) : 0;

  const getStatusLabel = (status, timePeriod) => {
    if (timePeriod === 'mtd') {
      if (status === 'success') return 'On Pace';
      if (status === 'warning') return 'Slightly Behind Pace';
      return 'Behind Pace';
    } else {
      if (status === 'success') return 'Above Target';
      if (status === 'warning') return 'Near Target';
      return 'Below Target';
    }
  };

  return (
    <div className={`${colors.bg} rounded-lg p-4 md:p-6 border-l-4 ${colors.border} relative overflow-hidden`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base md:text-lg font-semibold text-white">{periodInfo.label}</h4>
          <div className="flex items-center space-x-2">
            {getStatusIcon(totalRevenueStatus)}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors.badge} hidden md:inline-block`}>
              {getStatusLabel(totalRevenueStatus, timePeriod)}
            </span>
          </div>
        </div>
        
        <div className="flex items-baseline space-x-1 md:space-x-2 mb-2 md:mb-3">
          <span className={`text-2xl md:text-3xl font-bold ${colors.text}`}>
            ${totalRevenue.toLocaleString()}
          </span>
          {totalBudget > 0 && (
            <span className="text-xs md:text-sm text-gray-400">
              / ${totalBudget.toLocaleString()}
            </span>
          )}
        </div>
        
        {totalBudget > 0 && (
          <div className="space-y-1 md:space-y-2">
            {/* Progress bar */}
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${colors.progress}`}
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              ></div>
            </div>
            
            {/* Status details */}
            <div className="flex justify-between items-center">
              {periodInfo.usePace && timePeriod === 'mtd' ? (
                <>
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {periodInfo.progressLabel}
                  </span>
                  <span className="text-xs text-gray-400">
                    ${totalRevenue.toLocaleString()} / ${Math.round(periodInfo.expectedRevenue).toLocaleString()} expected
                  </span>
                </>
              ) : (
                <>
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {periodInfo.progressLabel}
                  </span>
                  {budgetPercentage > 100 && (
                    <span className="text-xs text-green-400 font-medium">
                      +{budgetPercentage - 100}% over target!
                    </span>
                  )}
                </>
              )}
            </div>
            
            {/* Additional context */}
            <div className="text-xs text-gray-400 pt-1">
              {periodInfo.targetLabel}: ${totalBudget.toLocaleString()} • {periodInfo.contextLabel}
              {periodInfo.usePace && (
                <span className="ml-2">
                  {periodInfo.pacePercentage >= 100 ? '• Ahead of schedule' : 
                   periodInfo.pacePercentage >= 95 ? '• On track' : 
                   periodInfo.pacePercentage >= 80 ? '• Slightly behind' : '• Significantly behind'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

  // Chart data for revenue by department
  const chartData = financialData.map(dept => ({
    name: getShortDepartmentName(dept.department), // Use shorter names for chart
    revenue: dept.totalRevenue || 0,
    target: getBudgetTarget(dept.department)
  }));

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Financial Sub-Tabs */}
      <SubTabs
        tabs={financialSubTabs}
        activeTab={financialSubTab}
        onTabChange={setFinancialSubTab}
        colorScheme="blue"
        rightContent={financialSubTab !== 'ttm' && <PeriodSelector />}
      />

      {financialSubTab === 'historical' ? (
        <HistoricalRevenueDashboard />
      ) : financialSubTab === 'ttm' ? (
        <RevenueTTMDashboard
          ttmData={dashboardData.revenueTTM || []}
          summary={dashboardData.ttmSummary || {}}
          loading={loading}
        />
      ) : (
        <>
      {/* Enhanced Summary Cards with Color-Coded Total Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
        <EnhancedTotalRevenueCard />

        {/* Potential Revenue Card - Unsold Estimates */}
        <div className="bg-gray-800 border border-amber-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-300 text-sm font-medium">Potential Revenue</h3>
            <span className="text-xs bg-amber-600 text-amber-100 px-2 py-0.5 rounded">Unsold</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            ${potentialRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {unsoldOpportunities} open opportunities
          </p>
        </div>

        {/* Combined Jobs & Opportunities Card */}
        <div className="bg-gray-800 border border-blue-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-300 text-sm font-medium">Jobs & Opportunities</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-blue-400">{totalJobs}</p>
            <span className="text-gray-400 text-sm">jobs</span>
            <span className="text-gray-500 mx-1">|</span>
            <p className="text-2xl font-bold text-purple-400">{totalOpportunities}</p>
            <span className="text-gray-400 text-sm">opps</span>
          </div>
        </div>

        <MetricCard
          title="Daily Average Revenue"
          value={dailyAverageRevenue}
          unit="$"
          showDetailedStatus={false}
          colorScheme="green"
        />
      </div>

      {/* YTD Trend Chart */}
{currentUser?.role !== 'display' && (
  <YtdTrendChart />
)}

      {/* Department Performance Table */}
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Department Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="sticky left-0 z-10 bg-gray-800 text-left text-gray-300 pb-3 text-sm">Department</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Total Revenue</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Budget Target ($)</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Budget Status</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Daily Goal</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Adjusted Daily Target</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Tech Jobs</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Marketing Jobs</th>
                <th className="text-center text-gray-300 pb-3 text-sm">Opportunities</th>
              </tr>
            </thead>
            <tbody>
              {financialData.map((dept, index) => {
                const budgetTarget = (() => {
                  const monthlyTargets = targets?.financial?.monthly?.[dept.department];
                  if (!monthlyTargets) return 0;

                  const now = new Date();
                  const currentYear = now.getFullYear();

                  const getTargetForPeriod = (department, period) => {
                    const deptTargets = targets?.financial?.monthly?.[department];
                    if (!deptTargets) return 0;

                    switch (period) {
                      case 'ytd':
                        const currentMonth = now.getMonth() + 1;
                        let ytdTarget = 0;
                        for (let month = 1; month <= currentMonth; month++) {
                          const monthTarget = deptTargets.find(t => t.month === month && t.year === currentYear);
                          ytdTarget += monthTarget?.value || 0;
                        }
                        return ytdTarget;
                      case 'last_month':
                        const lastMonthIndex = now.getMonth();
                        const targetMonth = lastMonthIndex === 0 ? 12 : lastMonthIndex;
                        const targetYear = lastMonthIndex === 0 ? currentYear - 1 : currentYear;
                        const lastMonthTarget = deptTargets.find(t => t.month === targetMonth && t.year === targetYear);
                        return lastMonthTarget?.value || 0;
                      case 'mtd':
                      default:
                        const currentMonthTarget = deptTargets.find(t => t.month === now.getMonth() + 1 && t.year === currentYear);
                        return currentMonthTarget?.value || 0;
                    }
                  };

                  return getTargetForPeriod(dept.department, timePeriod);
                })();
                
                const budgetStatus = getPaceBudgetStatus(dept.totalRevenue, budgetTarget, timePeriod);
                const budgetPercentage = budgetTarget > 0 ? Math.round((dept.totalRevenue / budgetTarget) * 100) : null;

                // Calculate daily goal and variance for this department
                const getDailyGoalForDept = () => {
                  if (!budgetTarget) return null;
                  const today = new Date();
                  const worksSaturdays = departmentWorksSaturdays(dept.department);

                  if (timePeriod === 'mtd') {
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    const totalEffectiveDays = getEffectiveWorkingDays(startOfMonth, endOfMonth, worksSaturdays);
                    return totalEffectiveDays > 0 ? Math.round(budgetTarget / totalEffectiveDays) : null;
                  } else if (timePeriod === 'last_month') {
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                    const effectiveDaysInLastMonth = getEffectiveWorkingDays(lastMonth, endOfLastMonth, worksSaturdays);
                    return effectiveDaysInLastMonth > 0 ? Math.round(budgetTarget / effectiveDaysInLastMonth) : null;
                  } else if (timePeriod === 'ytd') {
                    const startOfYear = new Date(today.getFullYear(), 0, 1);
                    const totalEffectiveDays = getEffectiveWorkingDays(startOfYear, today, worksSaturdays);
                    return totalEffectiveDays > 0 ? Math.round(budgetTarget / totalEffectiveDays) : null;
                  }
                  return null;
                };

                const getAdjustedDailyTargetForDept = (originalDailyGoal) => {
                  if (!budgetTarget || !originalDailyGoal) return null;
                  const today = new Date();
                  const worksSaturdays = departmentWorksSaturdays(dept.department);

                  if (timePeriod === 'mtd') {
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    const elapsedEffectiveDays = getEffectiveWorkingDays(startOfMonth, today, worksSaturdays);
                    const totalEffectiveDays = getEffectiveWorkingDays(startOfMonth, endOfMonth, worksSaturdays);
                    const remainingEffectiveDays = totalEffectiveDays - elapsedEffectiveDays;

                    // Calculate how much revenue is still needed
                    const remainingNeeded = budgetTarget - (dept.totalRevenue || 0);

                    // If already at or over target, return emoji indicator
                    if (remainingNeeded <= 0) {
                      return 'emoji';
                    }

                    // Calculate required daily rate for remaining days
                    if (remainingEffectiveDays > 0) {
                      const adjustedTarget = Math.round(remainingNeeded / remainingEffectiveDays);

                      // If adjusted target is less than or equal to original goal, they're on pace or ahead
                      if (adjustedTarget <= originalDailyGoal) {
                        return 'emoji';
                      }

                      // Otherwise they're behind, show the higher number needed
                      return adjustedTarget;
                    }

                    // If no days remaining but still short, return null
                    return null;
                  } else if (timePeriod === 'last_month') {
                    // For completed periods, show emoji if target met, otherwise show what was needed
                    const remainingNeeded = budgetTarget - (dept.totalRevenue || 0);
                    return remainingNeeded <= 0 ? 'emoji' : null;
                  } else if (timePeriod === 'ytd') {
                    // For YTD, show emoji if target met
                    const remainingNeeded = budgetTarget - (dept.totalRevenue || 0);
                    return remainingNeeded <= 0 ? 'emoji' : null;
                  }
                  return null;
                };

                const dailyGoal = getDailyGoalForDept();
                const adjustedDailyTarget = getAdjustedDailyTargetForDept(dailyGoal);

                return (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="sticky left-0 z-10 bg-gray-800 py-3 text-white font-medium text-sm truncate">
                      {departmentLabels[dept.department] || dept.department}
                    </td>
                    <td className="py-3 text-center text-gray-300 text-sm">
                      ${dept.totalRevenue?.toLocaleString() || '0'}
                    </td>
                    <td className="py-3 text-center text-gray-300 text-sm">
                      {budgetTarget ? `$${budgetTarget.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(budgetStatus)}`}>
                          {budgetPercentage ? `${budgetPercentage}%` : 'N/A'}
                        </span>
                        {budgetTarget && getStatusIcon(budgetStatus)}
                      </div>
                    </td>
                    <td className="py-3 text-center text-gray-300 text-sm">
                      {dailyGoal ? `$${dailyGoal.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="py-3 text-center text-sm">
                      {adjustedDailyTarget === 'emoji' ? (
                        <span className="text-2xl">🍆</span>
                      ) : adjustedDailyTarget !== null ? (
                        <span className="text-yellow-400 font-medium">
                          ${adjustedDailyTarget.toLocaleString()}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="py-3 text-center text-gray-300 text-sm">{dept.techLeadJobs || 0}</td>
                    <td className="py-3 text-center text-gray-300 text-sm">{dept.marketingLeadJobs || 0}</td>
                    <td className="py-3 text-center text-gray-300 text-sm">{dept.opportunities || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

  const MembershipsView = () => {
    const membershipData = dashboardData.memberships || [];
    const membershipSummary = dashboardData.membershipSummary || {};
    
    // Get the first membership record (since we aggregate all into "Cool Club Memberships")
    const membership = membershipData.length > 0 ? membershipData[0] : {};
    
    return (
      <div className="space-y-4 md:space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <MetricCard 
            title="Total Active Memberships" 
            value={membership.activeAtEnd || 0} 
            showDetailedStatus={false}
            colorScheme="blue"
          />
          <MetricCard 
            title="New Memberships" 
            value={membership.newSales || 0} 
            unit=" new"
            showDetailedStatus={false}
            colorScheme="green"
          />
          <MetricCard 
            title="Memberships Lost" 
            value={membership.membershipsLost || 0} 
            unit=" lost"
            showDetailedStatus={false}
            colorScheme="red"
          />
          <MetricCard 
            title="Net Growth" 
            value={membership.netGrowth || 0} 
            unit={membership.netGrowth > 0 ? " gained" : membership.netGrowth < 0 ? " lost" : ""}
            showDetailedStatus={false}
            colorScheme={(membership.netGrowth || 0) >= 0 ? "purple" : "red"}
          />
        </div>

        {/* Membership Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Membership Status Overview */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cool Club Membership Status</h3>
            <div className="space-y-3 md:space-y-4">
              <div className="flex justify-between items-center p-2 md:p-3 bg-blue-900 bg-opacity-30 rounded-lg">
                <span className="text-blue-200 font-medium text-sm md:text-base">Active Memberships</span>
                <span className="text-blue-100 text-lg md:text-xl font-bold">{membership.activeAtEnd?.toLocaleString() || 0}</span>
              </div>
              
              <div className="flex justify-between items-center p-2 md:p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300 text-sm md:text-base">Started Period With</span>
                <span className="text-white font-semibold text-sm md:text-base">{membership.activeAtStart?.toLocaleString() || 0}</span>
              </div>
              
              <div className="flex justify-between items-center p-2 md:p-3 bg-green-900 bg-opacity-30 rounded-lg">
                <span className="text-green-200 text-sm md:text-base">New Sales</span>
                <span className="text-green-100 font-semibold text-sm md:text-base">+{membership.newSales?.toLocaleString() || 0}</span>
              </div>
              
              <div className="flex justify-between items-center p-2 md:p-3 bg-orange-900 bg-opacity-30 rounded-lg">
                <span className="text-orange-200 text-sm md:text-base">Reactivated</span>
                <span className="text-orange-100 font-semibold text-sm md:text-base">+{membership.reactivated?.toLocaleString() || 0}</span>
              </div>
              
              <div className="flex justify-between items-center p-2 md:p-3 bg-red-900 bg-opacity-30 rounded-lg">
                <span className="text-red-200 text-sm md:text-base">Memberships Lost</span>
                <span className="text-red-100 font-semibold text-sm md:text-base">-{membership.membershipsLost?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>

          {/* Membership Activity Breakdown */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Activity Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300 text-sm md:text-base">Renewals</span>
                <span className="text-white font-medium text-sm md:text-base">{membership.renewed?.toLocaleString() || 0}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300 text-sm md:text-base">Cancellations</span>
                <span className="text-white font-medium text-sm md:text-base">{membership.canceled?.toLocaleString() || 0}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300 text-sm md:text-base">Expired</span>
                <span className="text-white font-medium text-sm md:text-base">{membership.expired?.toLocaleString() || 0}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300 text-sm md:text-base">Deleted</span>
                <span className="text-white font-medium text-sm md:text-base">{membership.deleted?.toLocaleString() || 0}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-300 text-sm md:text-base">Suspended</span>
                <span className="text-white font-medium text-sm md:text-base">{membership.suspended?.toLocaleString() || 0}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 pt-3 mt-3 border-t border-gray-600">
                <span className="text-gray-300 font-medium text-sm md:text-base">Renewal Rate</span>
                <span className="text-blue-400 font-bold text-base md:text-lg">
                  {membership.renewalRatePercent || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Membership Growth Chart */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Membership Changes This Period</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Started With', value: membership.activeAtStart || 0, fill: '#6B7280' },
              { name: 'New Sales', value: membership.newSales || 0, fill: '#10B981' },
              { name: 'Reactivated', value: membership.reactivated || 0, fill: '#F59E0B' },
              { name: 'Lost', value: -(membership.membershipsLost || 0), fill: '#EF4444' },
              { name: 'Net Change', value: membership.netGrowth || 0, fill: (membership.netGrowth || 0) >= 0 ? '#3B82F6' : '#EF4444' }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#374151', 
                  border: 'none', 
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
                labelStyle={{ color: '#F9FAFB' }}
                formatter={(value, name) => [
                  Math.abs(value).toLocaleString(), 
                  name === 'Lost' ? 'Memberships Lost' : name === 'Net Change' ? 'Net Growth' : name
                ]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key Insights */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Key Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-3 md:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                <span className="text-blue-200 font-medium text-sm md:text-base">Growth Rate</span>
              </div>
              <div className="text-blue-100">
                <span className="text-xl md:text-2xl font-bold">
                  {membership.activeAtStart > 0 ? 
                    Math.round(((membership.netGrowth || 0) / membership.activeAtStart) * 100) : 0}%
                </span>
                <div className="text-xs md:text-sm text-blue-300">vs. period start</div>
              </div>
            </div>
            
            <div className="bg-green-900 bg-opacity-20 border border-green-500 rounded-lg p-3 md:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                <span className="text-green-200 font-medium text-sm md:text-base">Retention</span>
              </div>
              <div className="text-green-100">
                <span className="text-xl md:text-2xl font-bold">{membership.renewalRatePercent || 0}%</span>
                <div className="text-xs md:text-sm text-green-300">renewal rate</div>
              </div>
            </div>
            
            <div className="bg-purple-900 bg-opacity-20 border border-purple-500 rounded-lg p-3 md:p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                <span className="text-purple-200 font-medium text-sm md:text-base">Activity</span>
              </div>
              <div className="text-purple-100">
                <span className="text-xl md:text-2xl font-bold">
                  {((membership.newSales || 0) + (membership.reactivated || 0) + (membership.renewed || 0)).toLocaleString()}
                </span>
                <div className="text-xs md:text-sm text-purple-300">total actions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Technicians Grouped View
  const TechniciansView = () => {
    const renderTechnicianContent = () => {
      switch (technicianSubTab) {
        case 'comfort_advisor':
          return <ComfortAdvisorView />;
        case 'hvac_tech':
          return (
            <TechnicianView
              viewTitle="HVAC Technician"
              targetCategory="technician"
              dataKey="technician"
            />
          );
        case 'hvac_maintenance':
          return (
            <TechnicianView
              viewTitle="HVAC Maintenance Technician"
              targetCategory="hvac_maintenance"
              dataKey="hvac_maintenance"
            />
          );
        case 'commercial_hvac':
          return (
            <TechnicianView
              viewTitle="Commercial HVAC Technician"
              targetCategory="commercial_hvac"
              dataKey="commercial_hvac"
            />
          );
        case 'plumbing':
          return (
            <TechnicianView
              viewTitle="Plumbing Technician"
              targetCategory="plumbing"
              dataKey="plumbing"
            />
          );
        case 'electrical':
          return (
            <TechnicianView
              viewTitle="Electrical Technician"
              targetCategory="electrical"
              dataKey="electrical"
            />
          );
        default:
          return <ComfortAdvisorView />;
      }
    };

    return (
      <div className="space-y-4">
        <SubTabs
          tabs={technicianSubTabs}
          activeTab={technicianSubTab}
          onTabChange={setTechnicianSubTab}
          colorScheme="green"
          rightContent={<PeriodSelector />}
        />
        {renderTechnicianContent()}
      </div>
    );
  };

  // Operations Grouped View
  const OperationsView = () => {
    const renderOperationsContent = () => {
      switch (operationsSubTab) {
        case 'call_center':
          return <CallCenterView />;
        case 'memberships':
          return <MembershipsView />;
        default:
          return <CallCenterView />;
      }
    };

    return (
      <div className="space-y-4">
        <SubTabs
          tabs={operationsSubTabs}
          activeTab={operationsSubTab}
          onTabChange={setOperationsSubTab}
          colorScheme="purple"
          rightContent={<PeriodSelector periodOptions={operationsSubTab === 'call_center' ? callCenterPeriods : comfortAdvisorPeriods} />}
        />
        {renderOperationsContent()}
      </div>
    );
  };

  // Engagement Grouped View
  const EngagementView = () => {
    const renderEngagementContent = () => {
      switch (engagementSubTab) {
        case 'reviews':
          return <GoogleReviews />;
        case 'top_performers':
          return <TopPerformersDashboard />;
        case 'competition':
          return <CompetitionLeaderboard />;
        default:
          return <GoogleReviews />;
      }
    };

    return (
      <div className="space-y-4">
        <SubTabs
          tabs={engagementSubTabs}
          activeTab={engagementSubTab}
          onTabChange={setEngagementSubTab}
          colorScheme="amber"
          rightContent={engagementSubTab === 'top_performers' && <PeriodSelector />}
        />
        {renderEngagementContent()}
      </div>
    );
  };

  // Admin Dashboard View
  const AdminView = () => {
    return <AdminDashboard />;
  };

  const renderView = () => {
  switch (activeView) {
    case "financial":
      return <FinancialView />;
    case "technicians":
      return <TechniciansView />;
    case "operations":
      return <OperationsView />;
    case "engagement":
      return <EngagementView />;
    // Display mode still needs direct access to individual views
    case "comfort_advisor":
      return <ComfortAdvisorView />;
    case "call_center":
      return <CallCenterView />;
    case "technician":
      return <TechnicianView
        viewTitle="HVAC Technician"
        targetCategory="technician"
        dataKey="technician"
      />;
    case "hvac_maintenance":
      return <TechnicianView
        viewTitle="HVAC Maintenance Technician"
        targetCategory="hvac_maintenance"
        dataKey="hvac_maintenance"
      />;
    case "commercial_hvac":
      return <TechnicianView
        viewTitle="Commercial HVAC Technician"
        targetCategory="commercial_hvac"
        dataKey="commercial_hvac"
      />;
    case "plumbing":
      return <TechnicianView
        viewTitle="Plumbing Technician"
        targetCategory="plumbing"
        dataKey="plumbing"
      />;
    case "electrical":
      return <TechnicianView
        viewTitle="Electrical Technician"
        targetCategory="electrical"
        dataKey="electrical"
      />;
    case "memberships":
      return <MembershipsView />;
    case "reviews":
      return <GoogleReviews />;
    case "top_performers":
      return <TopPerformersDashboard />;
    case "competition":
      return <CompetitionLeaderboard />;
    case "top_comfort_advisor":
      return <TopPerformersDashboard initialTab="comfort_advisor" />;
    case "top_hvac_tech":
      return <TopPerformersDashboard initialTab="hvac_tech" />;
    case "top_hvac_maintenance":
      return <TopPerformersDashboard initialTab="hvac_maintenance" />;
    case "top_commercial_hvac":
      return <TopPerformersDashboard initialTab="commercial_hvac" />;
    case "top_plumbing":
      return <TopPerformersDashboard initialTab="plumbing" />;
    case "top_electrical":
      return <TopPerformersDashboard initialTab="electrical" />;
    case "top_call_center":
      return <TopPerformersDashboard initialTab="call_center" />;
    case "revenue-ttm":
      return (
        <RevenueTTMDashboard
          ttmData={dashboardData.revenueTTM || []}
          summary={dashboardData.ttmSummary || {}}
          loading={loading}
        />
      );
    case "admin":
      return <AdminView />;
    case "tools":
      return <ToolsPage />;
    default:
      return <FinancialView />;
  }
};
  if (authLoading) {
    const isDisplayMode = typeof window !== 'undefined' && 
      window.location.search.includes('display=true');
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <div className="text-white text-lg">Loading...</div>
      </div>
    </div>
  );
}

if (!isAuthenticated) {
  return <LoginScreen onLogin={handleLogin} />;
}
  return (
  <div className={`min-h-screen bg-gray-900 text-white ${currentUser?.role === 'display' ? 'tv-display' : ''}`}>
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
      {/* Header */}
      {!activeView.startsWith('top_') && (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 space-y-2 md:space-y-0">
    <h1 className="text-2xl md:text-3xl font-bold">
      KPI Dashboard
      {currentUser?.role === 'display' && (
        <span className="ml-2 text-sm bg-purple-600 text-purple-100 px-2 py-1 rounded-full">
          Display Mode
        </span>
      )}
    </h1>
    
    <div className="flex items-center space-x-4">
      <div className="text-xs md:text-sm text-gray-400">
        {lastUpdated && `Last updated: ${lastUpdated}`}
      </div>
      
      {/* User Info - Hide for display users */}
      {currentUser?.role !== 'display' && (
        <>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <User className="h-4 w-4" />
            <span>{currentUser?.name}</span>
            <span className={`px-2 py-1 rounded text-xs ${
              currentUser?.role === 'admin' ? 'bg-red-600 text-red-100' : 'bg-blue-600 text-blue-100'
            }`}>
              {currentUser?.role}
            </span>
          </div>

          {/* Admin Button - Only show for admin users */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveView('admin')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                activeView === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Admin Dashboard"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </>
      )}
    </div>
  </div>
)}

        {/* Tab Navigation */}
        {currentUser?.role !== 'display' && (
  <div className="flex flex-wrap gap-1 mb-4 md:mb-6">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => setActiveView(tab.id)}
        className={`flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm ${
          activeView === tab.id
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        <tab.icon className="h-3 w-3 md:h-4 md:w-4" />
        <span className="hidden sm:inline">{tab.label}</span>
      </button>
    ))}
  </div>
)}

        {/* Main Content */}
        {loading && activeView !== 'admin' && activeView !== 'tools' ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-base md:text-lg text-gray-400">Loading...</div>
          </div>
        ) : (
          renderView()
        )}
      </div>
    </div>
  );
};

export default KpiDashboard;