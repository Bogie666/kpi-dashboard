import React, { useState, useEffect } from 'react';
import TechnicianPhotoManager from './TechnicianPhotoManager';
import CompetitionAdmin from './CompetitionAdmin';

// Helper function to format relative time
const formatRelativeTime = (utcTimeString) => {
  if (!utcTimeString) return 'Never';

  try {
    const date = new Date(utcTimeString);

    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (seconds > 0) return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
    return 'Just now';
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid Date';
  }
};

// Helper function to format time in Central Time
const formatCentralTime = (utcTimeString) => {
  if (!utcTimeString) return 'Never';

  try {
    const utcDate = new Date(utcTimeString);

    if (isNaN(utcDate.getTime())) {
      return 'Invalid Date';
    }
    // Convert to Central Time
    const centralTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(utcDate);

    // Get the timezone abbreviation
    const now = new Date();
    const centralDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    const centralOffset = centralDate.getTimezoneOffset();
    const isDST = centralOffset !== -360; // Central Standard Time is UTC-6 (-360 minutes)
    const tzAbbr = isDST ? 'CDT' : 'CST';

    return centralTime + ' ' + tzAbbr;
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Date';
  }
};

import {
  Settings,
  Users,
  Target,
  Database,
  Bell,
  Save,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  DollarSign,
  Percent,
  Hash,
  Calendar,
  ChevronDown,
  ChevronUp,
  Wrench,
  Droplets,
  Zap,
  Activity,
  Clock,
  Camera,
  Play,
  Eye,
  EyeOff,
  Shield,
  Monitor,
  UserPlus,
  Key,
  Trophy,
  MessageCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('targets');
  const [widgets, setWidgets] = useState([]);
  const [targets, setTargets] = useState({});
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [systemStatus, setSystemStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSyncPeriods, setSelectedSyncPeriods] = useState(['today', 'mtd']);
  const [selectedSyncYear, setSelectedSyncYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [syncingMonthly, setSyncingMonthly] = useState(false);
  const [syncingReviews, setSyncingReviews] = useState(false);
  const [reviewsSyncStatus, setReviewsSyncStatus] = useState(null);
  
  // 1. Set all sections collapsed by default
  const [collapsedSections, setCollapsedSections] = useState({
    comfort_advisor: true,
    technician: true,
    hvac_maintenance: true,
    plumbing: true,
    electrical: true,
    call_center: true,
    financial: true
  });

  // API base URL
  const API_BASE = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api';
  const SYNC_API = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/sync_servicetitan_data';

  // Enhanced Target configuration - now includes separate sections for plumbing and electrical
  const TARGET_DEFINITIONS = {
    comfort_advisor: {
      label: 'Comfort Advisors',
      icon: Target,
      targets: [
        { 
          key: 'avg_ticket', 
          label: 'Average Ticket', 
          unit: 'dollars',
          description: 'Average dollar amount per closed opportunity',
          dataField: 'closed_average_sale_cents'
        },
        { 
          key: 'close_rate', 
          label: 'Close Rate', 
          unit: 'percent',
          description: 'Percentage of opportunities closed',
          dataField: 'close_rate_percent'
        }
      ]
    },
    technician: {
      label: 'HVAC Service Technicians',
      icon: Wrench,
      targets: [
        { 
          key: 'avg_ticket', 
          label: 'Average Ticket', 
          unit: 'dollars',
          description: 'Average dollar amount per service call',
          dataField: 'total_job_average_cents'
        },
        { 
          key: 'close_rate', 
          label: 'Close Rate', 
          unit: 'percent',
          description: 'Percentage of service calls that result in sales',
          dataField: 'close_rate_percent'
        },
        { 
          key: 'recall_rate', 
          label: 'Recall Rate', 
          unit: 'percent',
          description: 'Percentage of jobs requiring return visits (lower is better)',
          dataField: 'tech_recall_percent'
        },
        { 
          key: 'memberships_sold', 
          label: 'Memberships Sold', 
          unit: 'number',
          description: 'Number of memberships sold per month',
          dataField: 'memberships_sold'
        }
      ]
    },
    hvac_maintenance: {  // NEW CATEGORY
    label: 'HVAC Maintenance Technicians',
    icon: Wrench,
    targets: [
      { 
        key: 'avg_ticket', 
        label: 'Average Ticket', 
        unit: 'dollars',
        description: 'Average dollar amount per maintenance call',
        dataField: 'total_job_average_cents'
      },
      { 
        key: 'close_rate', 
        label: 'Close Rate', 
        unit: 'percent',
        description: 'Percentage of maintenance calls that result in sales',
        dataField: 'close_rate_percent'
      },
      { 
        key: 'recall_rate', 
        label: 'Recall Rate', 
        unit: 'percent',
        description: 'Percentage of jobs requiring return visits (lower is better)',
        dataField: 'tech_recall_percent'
      },
      { 
        key: 'memberships_sold', 
        label: 'Memberships Sold', 
        unit: 'number',
        description: 'Number of memberships sold per month',
        dataField: 'memberships_sold'
      }
      ]
    },
    plumbing: {
      label: 'Plumbing Technicians',
      icon: Droplets,
      targets: [
        { 
          key: 'avg_ticket', 
          label: 'Average Ticket', 
          unit: 'dollars',
          description: 'Average dollar amount per service call',
          dataField: 'total_job_average_cents'
        },
        { 
          key: 'close_rate', 
          label: 'Close Rate', 
          unit: 'percent',
          description: 'Percentage of service calls that result in sales',
          dataField: 'close_rate_percent'
        },
        { 
          key: 'recall_rate', 
          label: 'Recall Rate', 
          unit: 'percent',
          description: 'Percentage of jobs requiring return visits (lower is better)',
          dataField: 'tech_recall_percent'
        },
        { 
          key: 'memberships_sold', 
          label: 'Memberships Sold', 
          unit: 'number',
          description: 'Number of memberships sold per month',
          dataField: 'memberships_sold'
        }
      ]
    },
    electrical: {
      label: 'Electrical Technicians',
      icon: Zap,
      targets: [
        { 
          key: 'avg_ticket', 
          label: 'Average Ticket', 
          unit: 'dollars',
          description: 'Average dollar amount per service call',
          dataField: 'total_job_average_cents'
        },
        { 
          key: 'close_rate', 
          label: 'Close Rate', 
          unit: 'percent',
          description: 'Percentage of service calls that result in sales',
          dataField: 'close_rate_percent'
        },
        { 
          key: 'recall_rate', 
          label: 'Recall Rate', 
          unit: 'percent',
          description: 'Percentage of jobs requiring return visits (lower is better)',
          dataField: 'tech_recall_percent'
        },
        { 
          key: 'memberships_sold', 
          label: 'Memberships Sold', 
          unit: 'number',
          description: 'Number of memberships sold per month',
          dataField: 'memberships_sold'
        }
      ]
    },
    call_center: {
      label: 'Call Center',
      icon: Target,
      targets: [
        { 
          key: 'booking_rate', 
          label: 'Booking Rate', 
          unit: 'percent',
          description: 'Percentage of calls that result in booked appointments',
          dataField: 'booking_percent'
        },
        { 
          key: 'memberships_sold', 
          label: 'Memberships Sold', 
          unit: 'number',
          description: 'Number of memberships sold through calls',
          dataField: 'cool_club_memberships'
        }
      ]
    },
    financial: {
      label: 'Financial',
      icon: DollarSign,
      departments: [
        { key: 'total', label: 'Total Company' },
        { key: 'hvac_service', label: 'HVAC Service' },
        { key: 'hvac_maintenance', label: 'HVAC Maintenance' },
        { key: 'hvac_replacement', label: 'HVAC Replacement' },
        { key: 'plumbing', label: 'Plumbing' },
        { key: 'electrical', label: 'Electrical' },
        { key: 'commercial_hvac', label: 'Commercial HVAC' },
        { key: 'tyler', label: 'Tyler' }
      ],
      targets: [
        { 
          key: 'monthly_budget', 
          label: 'Monthly Budget', 
          unit: 'dollars',
          description: 'Revenue target for each month',
          dataField: 'revenue_cents'
        }
      ]
    }
  };

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Toggle section collapse
  const toggleSection = (sectionKey) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Load data functions
  useEffect(() => {
    loadAllData();
    loadReviewsSyncStatus();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTargets(),
        loadUsers(),
        loadSettings(),
        loadSystemStatus()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTargets = async () => {
    try {
      const response = await fetch(`${API_BASE}/targets`);
      const data = await response.json();
      if (data.status === 'success') {
        setTargets(data.data);
      }
    } catch (error) {
      console.error('Error loading targets:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('dashboardToken');
      
      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadSettings = async () => {
  try {
    const token = localStorage.getItem('dashboardToken');
    
    const response = await fetch(`${API_BASE}/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (data.status === 'success') {
      setSettings(data.data);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

  const loadSystemStatus = async () => {
  try {
    const token = localStorage.getItem('dashboardToken');
    
    const response = await fetch(`${API_BASE}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (data.status === 'success') {
      setSystemStatus(data.data);
    }
  } catch (error) {
    console.error('Error loading system status:', error);
  }
};

  // 2. Manual sync trigger function
  const triggerManualSync = async () => {
    setRefreshing(true);
    try {
      const periodsParam = selectedSyncPeriods.join(',');
      const response = await fetch(`${SYNC_API}?periods=${periodsParam}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.status === 'success') {
        alert(`Data sync triggered successfully for: ${selectedSyncPeriods.join(', ')}! Dashboard will update in a few minutes.`);
        // Reload system status to show updated sync time
        await loadSystemStatus();
      } else {
        alert('Sync failed: ' + data.message);
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      alert('Error triggering sync: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Toggle period selection
  const toggleSyncPeriod = (period) => {
    setSelectedSyncPeriods(prev => {
      if (prev.includes(period)) {
        // Don't allow deselecting all periods
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== period);
      } else {
        return [...prev, period];
      }
    });
  };

  // Trigger monthly financial sync
  const triggerMonthlySync = async () => {
    setSyncingMonthly(true);
    try {
      const response = await fetch(`${SYNC_API}/yearly-financial?year=${selectedSyncYear}&start_month=${selectedMonth}&end_month=${selectedMonth}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.status === 'success') {
        const monthName = MONTHS[selectedMonth - 1];
        alert(`✅ ${monthName} ${selectedSyncYear} financial data sync completed successfully!\n\nMonths synced: ${data.months_synced || 1}\nTotal revenue synced: $${(data.total_revenue || 0).toLocaleString()}\n\nDashboard will update momentarily.`);
        await loadSystemStatus();
      } else {
        alert('❌ Monthly sync failed: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error triggering monthly sync:', error);
      alert('❌ Error triggering monthly sync: ' + error.message);
    } finally {
      setSyncingMonthly(false);
    }
  };

  // Load Google Reviews sync status
  const loadReviewsSyncStatus = async () => {
    try {
      const response = await fetch('/api/google/reviews');
      const data = await response.json();

      if (data.success && data.syncStatus) {
        setReviewsSyncStatus(data.syncStatus);
      }
    } catch (error) {
      console.error('Error loading reviews sync status:', error);
    }
  };

  // Trigger Google Reviews sync
  const triggerReviewsSync = async () => {
    setSyncingReviews(true);
    try {
      const response = await fetch('/api/google/reviews/sync', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        alert(`✅ Google Reviews synced successfully!\n\nTotal reviews: ${data.totalReviews}\n\nLocation breakdown:\n${Object.entries(data.locationStats).map(([loc, count]) => `  ${loc}: ${count} reviews`).join('\n')}\n\nReviews page will now load instantly!`);
        await loadReviewsSyncStatus();
      } else {
        alert('❌ Reviews sync failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error triggering reviews sync:', error);
      alert('❌ Error triggering reviews sync: ' + error.message);
    } finally {
      setSyncingReviews(false);
    }
  };

  const saveTarget = async (targetData) => {
    try {
      const method = editingTarget ? 'PUT' : 'POST';
      const url = editingTarget 
        ? `${API_BASE}/targets/${editingTarget.id}` 
        : `${API_BASE}/targets`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetData)
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        await loadTargets();
        setShowTargetModal(false);
        setEditingTarget(null);
      }
    } catch (error) {
      console.error('Error saving target:', error);
    }
  };

  const deleteTarget = async (targetId) => {
    if (!confirm('Are you sure you want to delete this target?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/targets/${targetId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.status === 'success') {
        await loadTargets();
      }
    } catch (error) {
      console.error('Error deleting target:', error);
    }
  };

  // User management functions
  const saveUser = async (userData) => {
  try {
    console.log('saveUser called with:', userData);
    
    const token = localStorage.getItem('dashboardToken');
    const method = editingUser ? 'PUT' : 'POST';
    const url = editingUser 
      ? `${API_BASE}/users/${editingUser.id}` 
      : `${API_BASE}/users`;
    
    console.log('Making request to:', url, 'Method:', method);
    
    const response = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.status === 'success') {
      await loadUsers();
      setShowUserModal(false);
      setEditingUser(null);
      alert(`User ${editingUser ? 'updated' : 'created'} successfully!`);
    } else {
      throw new Error(data.message || 'Failed to save user');
    }
  } catch (error) {
    console.error('Error saving user:', error);
    alert('Error saving user: ' + error.message);
    throw error;
  }
};

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.status === 'success') {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const updateSettings = async (newSettings) => {
  console.log('updateSettings called with:', newSettings);
  
  try {
    const token = localStorage.getItem('dashboardToken');
    
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newSettings)
    });
    
    console.log('Settings update response status:', response.status);
    
    const data = await response.json();
    console.log('Settings update response data:', data);
    
    if (data.status === 'success') {
      await loadSettings();
      console.log('Settings updated successfully');
      
      // Show success feedback
      const settingName = Object.keys(newSettings)[0];
      const settingValue = Object.values(newSettings)[0];
      alert(`Setting "${settingName}" updated to "${settingValue}" successfully!`);
    } else {
      console.error('Failed to update settings:', data.message);
      throw new Error(data.message || 'Failed to update settings');
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    alert('Error updating settings: ' + error.message);
    throw error;
  }
};

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-yellow-400" />;
      case 'danger':
        return <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-400" />;
      default:
        return <XCircle className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'danger': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatValue = (value, unit) => {
    if (unit === 'dollars') return `$${value.toLocaleString()}`;
    if (unit === 'percent') return `${value}%`;
    return value.toString();
  };

  // Enhanced Collapsible Section Component
  const CollapsibleSection = ({ sectionKey, title, icon: Icon, children, targetCount = 0 }) => {
    const isCollapsed = collapsedSections[sectionKey];
    
    return (
      <div className="mb-4 md:mb-6">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between bg-gray-700 hover:bg-gray-600 p-3 md:p-4 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-2 md:space-x-3">
            <Icon className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
            <h3 className="text-base md:text-lg font-medium text-white">{title}</h3>
            <span className="bg-blue-600 text-blue-100 px-2 py-1 rounded-full text-xs">
              {targetCount} {targetCount === 1 ? 'target' : 'targets'}
            </span>
          </div>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
          ) : (
            <ChevronUp className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
          )}
        </button>
        
        {!isCollapsed && (
          <div className="mt-3 md:mt-4 space-y-2 md:space-y-3 pl-2 md:pl-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Enhanced Target Card Component
  const TargetCard = ({ target }) => (
    <div className="flex items-center justify-between bg-gray-700 hover:bg-gray-650 p-3 md:p-4 rounded-lg transition-colors">
      <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
        {getStatusIcon(target.status)}
        <div className="min-w-0 flex-1">
          <div className="text-white font-medium text-sm md:text-base truncate">{target.name}</div>
          <div className="text-xs md:text-sm text-gray-400 truncate">
            Target: {formatValue(target.value, target.unit)} | 
            Current: {formatValue(target.currentValue || 0, target.unit)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
        <div className="hidden sm:block w-20 md:w-32 bg-gray-600 rounded-full h-1.5 md:h-2">
          <div 
            className={`h-1.5 md:h-2 rounded-full ${getStatusColor(target.status)}`}
            style={{ width: `${Math.min(target.completionPercentage || 0, 100)}%` }}
          ></div>
        </div>
        <span className="text-xs md:text-sm text-gray-400 w-8 md:w-12 text-right">
          {target.completionPercentage || 0}%
        </span>
        
        <button
          onClick={() => {
            setEditingTarget(target);
            setShowTargetModal(true);
          }}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <Edit className="h-3 w-3 md:h-4 md:w-4" />
        </button>
        <button
          onClick={() => deleteTarget(target.id)}
          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
        </button>
      </div>
    </div>
  );

  // Target Modal Component (existing, but making it more mobile-friendly)
  const TargetModal = () => {
    const [formData, setFormData] = useState(() => {
      if (editingTarget) {
        return {
          ...editingTarget,
          category: editingTarget.category || 'comfort_advisor',
          target_key: editingTarget.target_key || '',
          department: editingTarget.department || '',
          value: editingTarget.value || '',
          year: editingTarget.year || new Date().getFullYear(),
          month: editingTarget.month || null,
          alertThreshold: editingTarget.alertThreshold || ''
        };
      }
      return {
        category: 'comfort_advisor',
        target_key: '',
        department: '',
        value: '',
        year: new Date().getFullYear(),
        month: null,
        alertThreshold: '',
        isMonthly: false
      };
    });

    const [selectedTargetDef, setSelectedTargetDef] = useState(null);

    useEffect(() => {
      if (formData.category && formData.target_key) {
        const targetDef = TARGET_DEFINITIONS[formData.category]?.targets?.find(
          t => t.key === formData.target_key
        );
        setSelectedTargetDef(targetDef);
      }
    }, [formData.category, formData.target_key]);

    const handleSubmit = (e) => {
      e.preventDefault();
      
      // For financial monthly budgets, create targets for all 12 months
      if (formData.category === 'financial' && formData.isMonthly) {
        const monthlyTargets = [];
        for (let month = 1; month <= 12; month++) {
          monthlyTargets.push({
            ...formData,
            month,
            target_name: `${formData.target_key}_${formData.department}_${month}`,
            name: `${MONTHS[month-1]} Budget - ${TARGET_DEFINITIONS.financial.departments.find(d => d.key === formData.department)?.label}`
          });
        }
        // Send batch create request
        saveBatchTargets(monthlyTargets);
      } else {
        saveTarget({
          ...formData,
          target_name: `${formData.target_key}_${formData.department || 'all'}`,
          name: `${selectedTargetDef?.label || formData.target_key} ${formData.department ? `- ${TARGET_DEFINITIONS[formData.category]?.departments?.find(d => d.key === formData.department)?.label || formData.department}` : ''}`
        });
      }
    };

    const saveBatchTargets = async (targets) => {
      try {
        for (const target of targets) {
          await fetch(`${API_BASE}/targets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(target)
          });
        }
        await loadTargets();
        setShowTargetModal(false);
        setEditingTarget(null);
      } catch (error) {
        console.error('Error saving batch targets:', error);
      }
    };

    if (!showTargetModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 className="text-base md:text-lg font-semibold text-white mb-4">
            {editingTarget ? 'Edit Target' : 'Add New Target'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            {/* Category Selection */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({...formData, category: e.target.value, target_key: '', department: ''})}
                className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm md:text-base"
                required
              >
                {Object.entries(TARGET_DEFINITIONS).map(([key, def]) => (
                  <option key={key} value={key}>{def.label}</option>
                ))}
              </select>
            </div>

            {/* Target Type Selection */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Target Type</label>
              <select
                value={formData.target_key || ''}
                onChange={(e) => setFormData({...formData, target_key: e.target.value})}
                className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm md:text-base"
                required
              >
                <option value="">Select Target Type</option>
                {TARGET_DEFINITIONS[formData.category]?.targets?.map((target) => (
                  <option key={target.key} value={target.key}>
                    {target.label} ({target.unit === 'dollars' ? '$' : target.unit === 'percent' ? '%' : '#'})
                  </option>
                ))}
              </select>
            </div>

            {/* Department Selection (for financial and others that need it) */}
            {(formData.category === 'financial' || TARGET_DEFINITIONS[formData.category]?.departments) && (
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                  {formData.category === 'financial' ? 'Department' : 'Team/Department'}
                </label>
                <select
                  value={formData.department || ''}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm md:text-base"
                  required={formData.category === 'financial'}
                >
                  <option value="">Select Department</option>
                  {TARGET_DEFINITIONS[formData.category]?.departments?.map((dept) => (
                    <option key={dept.key} value={dept.key}>{dept.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Target Value</label>
                <input
                  type="number"
                  value={formData.value || ''}
                  onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value)})}
                  className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm md:text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Alert Threshold</label>
                <input
                  type="number"
                  value={formData.alertThreshold || ''}
                  onChange={(e) => setFormData({...formData, alertThreshold: parseFloat(e.target.value)})}
                  className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm md:text-base"
                  placeholder="Warning level"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowTargetModal(false);
                  setEditingTarget(null);
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors text-sm md:text-base"
              >
                {editingTarget ? 'Update' : 'Create'} Target
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 3. Enhanced User Modal Component
  const UserModal = () => {
  const [formData, setFormData] = useState(() => {
    if (editingUser) {
      return {
        name: editingUser.name || '',
        email: editingUser.email || '',
        role: editingUser.role || 'viewer',
        status: editingUser.status || 'active',
        password: '',
        confirmPassword: ''
      };
    }
    return {
      name: '',
      email: '',
      role: 'viewer',
      status: 'active',
      password: '',
      confirmPassword: ''
    };
  });

  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePasswords = () => {
    console.log('Validating passwords...', { formData });
    
    if (formData.role === 'display') {
      setPasswordError('');
      return true;
    }

    if (!editingUser && !formData.password) {
      setPasswordError('Password is required for new users');
      return false;
    }

    if (formData.password) {
      if (formData.password.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        setPasswordError('Passwords do not match');
        return false;
      }
    }

    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted', formData);
    
    setIsSubmitting(true);
    
    if (!validatePasswords()) {
      console.log('Password validation failed');
      setIsSubmitting(false);
      return;
    }

    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status
      };

      if (formData.password && formData.role !== 'display') {
        userData.password = formData.password;
      }

      console.log('Sending user data:', userData);
      await saveUser(userData);
      
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (formData.role === 'display') {
      setPasswordError('');
    }
  }, [formData.role]);

  if (!showUserModal) return null;

  const isDisplayUser = formData.role === 'display';
  const needsPassword = !editingUser && !isDisplayUser;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-4 md:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-base md:text-lg font-semibold text-white mb-4">
          {editingUser ? 'Edit User' : 'Add New User'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm md:text-base"
              required
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm md:text-base"
              required
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm md:text-base"
              required
            >
              <option value="viewer">Viewer - Dashboard access only</option>
              <option value="admin">Admin - Full access including admin panel</option>
              <option value="display">Display - For TVs and kiosks (no password required)</option>
            </select>
          </div>

          {!isDisplayUser && (
            <>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                  Password {needsPassword && <span className="text-red-400">*</span>}
                  {editingUser && <span className="text-gray-400 text-xs">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-gray-600 text-white rounded px-3 py-2 pr-10 text-sm md:text-base"
                    required={needsPassword}
                    minLength={8}
                    placeholder={editingUser ? "Enter new password (optional)" : "Enter password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">
                  Confirm Password {needsPassword && <span className="text-red-400">*</span>}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm md:text-base"
                  required={needsPassword}
                  placeholder="Confirm password"
                />
              </div>

              {passwordError && (
                <div className="text-red-400 text-xs md:text-sm bg-red-900 bg-opacity-20 border border-red-500 rounded p-2">
                  {passwordError}
                </div>
              )}
            </>
          )}

          {isDisplayUser && (
            <div className="text-purple-400 text-xs md:text-sm bg-purple-900 bg-opacity-20 border border-purple-500 rounded p-3">
              <strong>Display User:</strong> This account is designed for TV screens and kiosks. No password is required.
            </div>
          )}

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm md:text-base"
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowUserModal(false);
                setEditingUser(null);
                setPasswordError('');
              }}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm md:text-base"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors text-sm md:text-base flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  {editingUser ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {editingUser ? 'Update' : 'Create'} User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

  const tabs = [
    { id: 'targets', label: 'Performance Targets', icon: Target },
    { id: 'competitions', label: 'Competitions', icon: Trophy },
    { id: 'photos', label: 'Tech Photos', icon: Camera },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'system', label: 'System Settings', icon: Database }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Admin Dashboard</h1>
      
      {/* Navigation Tabs - Mobile Responsive */}
      <div className="flex flex-wrap gap-1 mb-4 md:mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <tab.icon className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Performance Targets Tab */}
      {activeTab === 'targets' && (
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 space-y-2 sm:space-y-0">
            <h2 className="text-lg md:text-xl font-semibold text-white">Performance Targets</h2>
            <button
              onClick={() => {
                setEditingTarget(null);
                setShowTargetModal(true);
              }}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 text-sm md:text-base transition-colors"
            >
              <Plus className="h-3 w-3 md:h-4 md:w-4" />
              <span>Add Target</span>
            </button>
          </div>

          {/* Display existing targets with collapsible sections */}
          <div className="space-y-4 md:space-y-6">
            
            {/* Comfort Advisor Targets */}
            {targets.comfort_advisor && Array.isArray(targets.comfort_advisor) && (
              <CollapsibleSection
                sectionKey="comfort_advisor"
                title="Comfort Advisors"
                icon={TARGET_DEFINITIONS.comfort_advisor.icon}
                targetCount={targets.comfort_advisor.length}
              >
                {targets.comfort_advisor.map((target) => (
                  <TargetCard key={target.id} target={target} />
                ))}
              </CollapsibleSection>
            )}

            {/* HVAC Service Technician Targets */}
            {targets.technician && Array.isArray(targets.technician) && (
              <CollapsibleSection
                sectionKey="technician"
                title="HVAC Technicians"
                icon={TARGET_DEFINITIONS.technician.icon}
                targetCount={targets.technician.length}
              >
                {targets.technician.map((target) => (
                  <TargetCard key={target.id} target={target} />
                ))}
              </CollapsibleSection>
            )}

            {/* HVAC Maintenance Technician Targets */}
            {targets.hvac_maintenance && Array.isArray(targets.hvac_maintenance) && (
              <CollapsibleSection
                sectionKey="hvac_maintenance"
                title="HVAC Maintenance Technicians"
                icon={TARGET_DEFINITIONS.hvac_maintenance.icon}
                targetCount={targets.hvac_maintenance.length}
              >
                {targets.hvac_maintenance.map((target) => (
                  <TargetCard key={target.id} target={target} />
                ))}
              </CollapsibleSection>
            )}

            {/* Plumbing Technician Targets */}
            {targets.plumbing && Array.isArray(targets.plumbing) && (
              <CollapsibleSection
                sectionKey="plumbing"
                title="Plumbing Technicians"
                icon={TARGET_DEFINITIONS.plumbing.icon}
                targetCount={targets.plumbing.length}
              >
                {targets.plumbing.map((target) => (
                  <TargetCard key={target.id} target={target} />
                ))}
              </CollapsibleSection>
            )}

            {/* Electrical Technician Targets */}
            {targets.electrical && Array.isArray(targets.electrical) && (
              <CollapsibleSection
                sectionKey="electrical"
                title="Electrical Technicians"
                icon={TARGET_DEFINITIONS.electrical.icon}
                targetCount={targets.electrical.length}
              >
                {targets.electrical.map((target) => (
                  <TargetCard key={target.id} target={target} />
                ))}
              </CollapsibleSection>
            )}

            {/* Call Center Targets */}
            {targets.call_center && Array.isArray(targets.call_center) && (
              <CollapsibleSection
                sectionKey="call_center"
                title="Call Center"
                icon={TARGET_DEFINITIONS.call_center.icon}
                targetCount={targets.call_center.length}
              >
                {targets.call_center.map((target) => (
                  <TargetCard key={target.id} target={target} />
                ))}
              </CollapsibleSection>
            )}

            {/* Financial Targets - Enhanced Mobile Layout */}
            {targets.financial?.monthly && Object.keys(targets.financial.monthly).length > 0 && (
              <CollapsibleSection
                sectionKey="financial"
                title="Financial - Monthly Department Budgets"
                icon={TARGET_DEFINITIONS.financial.icon}
                targetCount={Object.values(targets.financial.monthly).reduce((sum, dept) => sum + dept.length, 0)}
              >
                {/* Company Total Row - Auto-calculated */}
                <div className="mb-4 md:mb-6 p-3 md:p-4 bg-blue-900 bg-opacity-50 rounded-lg">
                  <h4 className="text-blue-200 font-medium mb-3 flex items-center text-sm md:text-base">
                    Total Company Budget (Auto-calculated)
                  </h4>
                  
                  {/* Mobile-responsive grid for months */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {MONTHS.slice(0, 6).map((month, index) => {
                      const monthNum = index + 1;
                      let monthlyTotal = 0;
                      
                      Object.values(targets.financial.monthly).forEach(departmentTargets => {
                        const monthTarget = departmentTargets.find(t => t.month === monthNum);
                        if (monthTarget) {
                          monthlyTotal += monthTarget.value || 0;
                        }
                      });
                      
                      return (
                        <div key={month} className="bg-blue-800 bg-opacity-50 p-2 rounded text-center">
                          <div className="text-blue-200 text-xs">{month.slice(0, 3)}</div>
                          <div className="text-blue-100 font-medium text-xs md:text-sm">
                            ${monthlyTotal.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-2">
                    {MONTHS.slice(6, 12).map((month, index) => {
                      const monthNum = index + 7;
                      let monthlyTotal = 0;
                      
                      Object.values(targets.financial.monthly).forEach(departmentTargets => {
                        const monthTarget = departmentTargets.find(t => t.month === monthNum);
                        if (monthTarget) {
                          monthlyTotal += monthTarget.value || 0;
                        }
                      });
                      
                      return (
                        <div key={month} className="bg-blue-800 bg-opacity-50 p-2 rounded text-center">
                          <div className="text-blue-200 text-xs">{month.slice(0, 3)}</div>
                          <div className="text-blue-100 font-medium text-xs md:text-sm">
                            ${monthlyTotal.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Individual Department Budgets */}
                {['hvac_service', 'hvac_maintenance', 'hvac_replacement', 'commercial_hvac', 'plumbing', 'electrical', 'tyler']
                  .filter(deptKey => targets.financial.monthly[deptKey])
                  .map(deptKey => {
                    const monthlyTargets = targets.financial.monthly[deptKey];
                    return (
                      <div key={deptKey} className="mb-4 md:mb-6 p-3 md:p-4 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 space-y-2 sm:space-y-0">
                          <h4 className="text-white font-medium text-sm md:text-base">
                            {TARGET_DEFINITIONS.financial.departments.find(d => d.key === deptKey)?.label}
                          </h4>
                          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                            <button 
                              onClick={() => {
                                setEditingTarget({
                                  category: 'financial',
                                  department: deptKey,
                                  isMonthly: true,
                                  value: monthlyTargets[0]?.value || 0
                                });
                                setShowTargetModal(true);
                              }}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                            >
                              Edit All Months
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(`Delete all monthly targets for ${TARGET_DEFINITIONS.financial.departments.find(d => d.key === deptKey)?.label}?`)) {
                                  monthlyTargets.forEach(target => deleteTarget(target.id));
                                }
                              }}
                              className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
                            >
                              Delete All
                            </button>
                          </div>
                        </div>
                        
                        {/* Mobile-responsive month grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                          {MONTHS.slice(0, 6).map((month, index) => {
                            const monthNum = index + 1;
                            const target = monthlyTargets.find(t => t.month === monthNum);
                            
                            return (
                              <div key={month} className="bg-gray-800 p-2 md:p-3 rounded border border-gray-600">
                                <div className="flex justify-between items-center mb-1 md:mb-2">
                                  <span className="text-gray-300 text-xs font-medium">{month.slice(0, 3)}</span>
                                  {target && (
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => {
                                          setEditingTarget(target);
                                          setShowTargetModal(true);
                                        }}
                                        className="p-0.5 text-gray-400 hover:text-white transition-colors"
                                      >
                                        <Edit className="h-2 w-2 md:h-3 md:w-3" />
                                      </button>
                                      <button
                                        onClick={() => deleteTarget(target.id)}
                                        className="p-0.5 text-gray-400 hover:text-red-400 transition-colors"
                                      >
                                        <Trash2 className="h-2 w-2 md:h-3 md:w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {target ? (
                                  <>
                                    <div className="text-white font-medium text-xs md:text-sm">
                                      ${target.value.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      ${(target.currentValue || 0).toLocaleString()} ({target.completionPercentage || 0}%)
                                    </div>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingTarget({
                                        category: 'financial',
                                        department: deptKey,
                                        month: monthNum,
                                        target_key: 'monthly_budget'
                                      });
                                      setShowTargetModal(true);
                                    }}
                                    className="text-xs text-gray-400 hover:text-white w-full text-left transition-colors"
                                  >
                                    + Add Target
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3 mt-2 md:mt-3">
                          {MONTHS.slice(6, 12).map((month, index) => {
                            const monthNum = index + 7;
                            const target = monthlyTargets.find(t => t.month === monthNum);
                            
                            return (
                              <div key={month} className="bg-gray-800 p-2 md:p-3 rounded border border-gray-600">
                                <div className="flex justify-between items-center mb-1 md:mb-2">
                                  <span className="text-gray-300 text-xs font-medium">{month.slice(0, 3)}</span>
                                  {target && (
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => {
                                          setEditingTarget(target);
                                          setShowTargetModal(true);
                                        }}
                                        className="p-0.5 text-gray-400 hover:text-white transition-colors"
                                      >
                                        <Edit className="h-2 w-2 md:h-3 md:w-3" />
                                      </button>
                                      <button
                                        onClick={() => deleteTarget(target.id)}
                                        className="p-0.5 text-gray-400 hover:text-red-400 transition-colors"
                                      >
                                        <Trash2 className="h-2 w-2 md:h-3 md:w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {target ? (
                                  <>
                                    <div className="text-white font-medium text-xs md:text-sm">
                                      ${target.value.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      ${(target.currentValue || 0).toLocaleString()} ({target.completionPercentage || 0}%)
                                    </div>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingTarget({
                                        category: 'financial',
                                        department: deptKey,
                                        month: monthNum,
                                        target_key: 'monthly_budget'
                                      });
                                      setShowTargetModal(true);
                                    }}
                                    className="text-xs text-gray-400 hover:text-white w-full text-left transition-colors"
                                  >
                                    + Add Target
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                
                {/* Quick Add Department Button */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      setEditingTarget({
                        category: 'financial',
                        target_key: 'monthly_budget',
                        isMonthly: true
                      });
                      setShowTargetModal(true);
                    }}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base"
                  >
                    Add New Department Budget (12 months)
                  </button>
                </div>
              </CollapsibleSection>
            )}

            {/* Empty State */}
            {(!targets.comfort_advisor || targets.comfort_advisor.length === 0) &&
             (!targets.call_center || targets.call_center.length === 0) &&
             (!targets.technician || targets.technician.length === 0) &&
             (!targets.plumbing || targets.plumbing.length === 0) &&
             (!targets.electrical || targets.electrical.length === 0) &&
             (!targets.financial?.monthly || Object.keys(targets.financial.monthly).length === 0) && (
              <div className="text-center py-8 md:py-12">
                <Target className="h-10 w-10 md:h-12 md:w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-base md:text-lg font-medium text-gray-400 mb-2">No targets configured</h3>
                <p className="text-sm md:text-base text-gray-500 mb-4">Get started by adding your first performance target.</p>
                <button
                  onClick={() => {
                    setEditingTarget(null);
                    setShowTargetModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base"
                >
                  Add Your First Target
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Competitions Tab */}
      {activeTab === 'competitions' && (
        <div className="bg-gray-800 rounded-lg">
          <CompetitionAdmin />
        </div>
      )}

      {/* Technician Photos Tab */}
      {activeTab === 'photos' && (
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <TechnicianPhotoManager />
        </div>
      )}
      
      {/* 3. Enhanced User Management Tab */}
      {activeTab === 'users' && (
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 space-y-2 sm:space-y-0">
            <h2 className="text-lg md:text-xl font-semibold text-white">User Management</h2>
            <button
              onClick={() => {
                setEditingUser(null);
                setShowUserModal(true);
              }}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 text-sm md:text-base transition-colors"
            >
              <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
              <span>Add User</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-300 pb-3 text-sm font-medium">Name</th>
                  <th className="text-left text-gray-300 pb-3 text-sm font-medium">Email</th>
                  <th className="text-center text-gray-300 pb-3 text-sm font-medium">Role</th>
                  <th className="text-center text-gray-300 pb-3 text-sm font-medium">Password</th>
                  <th className="text-center text-gray-300 pb-3 text-sm font-medium">Status</th>
                  <th className="text-center text-gray-300 pb-3 text-sm font-medium">Last Login</th>
                  <th className="text-center text-gray-300 pb-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="py-3 text-white font-medium text-sm">{user.name}</td>
                    <td className="py-3 text-gray-300 text-sm">{user.email}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center">
                        {user.role === 'admin' && <Shield className="h-4 w-4 text-red-400 mr-1" />}
                        {user.role === 'display' && <Monitor className="h-4 w-4 text-purple-400 mr-1" />}
                        {user.role === 'viewer' && <Eye className="h-4 w-4 text-blue-400 mr-1" />}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-600 text-red-100' :
                          user.role === 'display' ? 'bg-purple-600 text-purple-100' :
                          'bg-blue-600 text-blue-100'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : user.role === 'display' ? 'Display' : 'Viewer'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                        {user.role === 'display' ? (
                        <span className="text-xs text-purple-400 bg-purple-900 bg-opacity-20 px-2 py-1 rounded">
                          Not Required
                        </span>
                      ) : user.hasPassword ? (
                        <div className="flex items-center justify-center space-x-1">
                          <Key className="h-3 w-3 text-green-400" />
                          <span className="text-xs text-green-400">Set</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-1">
                          <AlertTriangle className="h-3 w-3 text-red-400" />
                          <span className="text-xs text-red-400">Missing</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.status === 'active' ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 text-center text-gray-300 text-sm">{user.lastLogin}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowUserModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* User Role Explanations */}
          <div className="mt-6 space-y-3">
            <h3 className="text-white font-medium mb-3">User Role Descriptions:</h3>
            
            <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Eye className="h-4 w-4 text-blue-400" />
                <span className="text-blue-200 font-medium">Viewer</span>
              </div>
              <p className="text-blue-100 text-sm">Can access and view all dashboard screens. Perfect for managers and team members who need to monitor performance metrics.</p>
            </div>

            <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-red-400" />
                <span className="text-red-200 font-medium">Admin</span>
              </div>
              <p className="text-red-100 text-sm">Full access to dashboards and admin panel. Can manage users, set targets, and configure system settings.</p>
            </div>

            <div className="bg-purple-900 bg-opacity-20 border border-purple-500 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Monitor className="h-4 w-4 text-purple-400" />
                <span className="text-purple-200 font-medium">Display</span>
              </div>
              <p className="text-purple-100 text-sm">Designed for TVs and kiosks throughout the office. Auto-cycles through dashboard views with optimized display settings.</p>
            </div>
          </div>

          {/* Empty State */}
          {users.length === 0 && (
            <div className="text-center py-8 md:py-12">
              <Users className="h-10 w-10 md:h-12 md:w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-medium text-gray-400 mb-2">No users configured</h3>
              <p className="text-sm md:text-base text-gray-500 mb-4">Add your first user to get started with dashboard access management.</p>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setShowUserModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm md:text-base"
              >
                Add Your First User
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Enhanced System Settings Tab */}
      {activeTab === 'system' && (
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 space-y-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">System Settings</h2>

          {/* Automated Sync Schedule */}
          <div className="bg-gray-700 rounded-lg p-4 md:p-6">
            <div className="flex items-center mb-4">
              <Clock className="h-5 w-5 text-purple-400 mr-2" />
              <h3 className="text-white font-medium">Automated Sync Schedule</h3>
              <span className="ml-2 text-xs bg-purple-600 text-purple-100 px-2 py-0.5 rounded">America/Chicago</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gray-800 p-3 rounded border border-gray-600">
                <div className="text-sm font-medium text-blue-400 mb-2">High Frequency</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Financial MTD</span>
                    <span className="text-gray-400">:00, :15, :30, :45 (6am-7pm)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Call Center</span>
                    <span className="text-gray-400">:00, :30 (6am-7pm)</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-3 rounded border border-gray-600">
                <div className="text-sm font-medium text-green-400 mb-2">Hourly (Staggered)</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Comfort Advisor</span>
                    <span className="text-gray-400">:05 (6am-7pm)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Technician</span>
                    <span className="text-gray-400">:10 (6am-7pm)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Competition</span>
                    <span className="text-gray-400">:20 (6am-7pm)</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-3 rounded border border-gray-600">
                <div className="text-sm font-medium text-yellow-400 mb-2">Daily</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-300">YTD Summary</span>
                    <span className="text-gray-400">6:00 AM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Membership</span>
                    <span className="text-gray-400">9:00 AM, 3:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Smart Monthly</span>
                    <span className="text-gray-400">11:00 PM</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-3 rounded border border-gray-600">
                <div className="text-sm font-medium text-gray-400 mb-2">Weekly/Monthly</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Last Month</span>
                    <span className="text-gray-400">2:00 AM (1st-7th only)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Cleanup</span>
                    <span className="text-gray-400">1st of month, 1:00 AM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 p-2 bg-purple-900 bg-opacity-20 border border-purple-500 rounded">
              <p className="text-purple-200 text-xs">
                Data syncs automatically based on the schedule above. Use the manual sync options below only when you need immediate updates.
              </p>
            </div>
          </div>

          {/* Manual Data Sync */}
          <div className="bg-gray-700 rounded-lg p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
              <h3 className="text-white font-medium flex items-center">
                <Activity className="h-5 w-5 text-blue-400 mr-2" />
                Manual Data Sync
              </h3>
            </div>

            {/* Period Selection */}
            <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
              <label className="block text-sm text-gray-300 mb-3 font-medium">Select Periods to Sync:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { id: 'today', label: 'Today', description: 'Current day data' },
                  { id: 'week', label: 'Week', description: 'Current week data' },
                  { id: 'mtd', label: 'Month to Date', description: 'Current month data' },
                  { id: 'ytd', label: 'Year to Date', description: 'Current year data' },
                  { id: 'last_month', label: 'Last Month', description: 'Previous month data' }
                ].map(period => (
                  <label
                    key={period.id}
                    className={`flex items-start space-x-2 p-3 rounded border cursor-pointer transition-all ${
                      selectedSyncPeriods.includes(period.id)
                        ? 'bg-blue-900 bg-opacity-40 border-blue-500'
                        : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSyncPeriods.includes(period.id)}
                      onChange={() => toggleSyncPeriod(period.id)}
                      className="mt-0.5 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">{period.label}</div>
                      <div className="text-gray-400 text-xs mt-0.5">{period.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-400">
                <strong>Selected:</strong> {selectedSyncPeriods.join(', ')}
                {selectedSyncPeriods.length === 1 && ' (minimum 1 period required)'}
              </div>
            </div>

            {/* Sync Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={triggerManualSync}
                disabled={refreshing || selectedSyncPeriods.length === 0}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm transition-colors ${
                  refreshing || selectedSyncPeriods.length === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {refreshing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Syncing {selectedSyncPeriods.join(', ')}...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Sync Selected Periods ({selectedSyncPeriods.length})</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Database Status */}
              <div className="bg-gray-800 p-3 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">Database Connection</span>
                  {systemStatus.database === 'connected' ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  systemStatus.database === 'connected' 
                    ? 'bg-green-600 text-green-100' 
                    : 'bg-red-600 text-red-100'
                }`}>
                  {systemStatus.database === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* ServiceTitan API Status */}
              <div className="bg-gray-800 p-3 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">ServiceTitan API</span>
                  {systemStatus.serviceTitan === 'connected' ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  systemStatus.serviceTitan === 'connected' 
                    ? 'bg-green-600 text-green-100' 
                    : 'bg-red-600 text-red-100'
                }`}>
                  {systemStatus.serviceTitan === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Last Sync Status */}
              <div className="bg-gray-800 p-3 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">Last Sync</span>
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-white text-sm font-medium">
                  {formatRelativeTime(systemStatus.lastSync)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatCentralTime(systemStatus.lastSync)}
                </div>
                <div className={`text-xs mt-1 ${
                systemStatus.syncStatus === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {systemStatus.syncStatus === 'success' ? 'Successful' : 'Failed'}
                </div>
              </div>

            <div className="mt-4 p-3 bg-blue-900 bg-opacity-20 border border-blue-500 rounded">
              <p className="text-blue-200 text-sm">
                <strong>Note:</strong> Use manual sync for immediate updates. Select periods and click sync to refresh dashboard metrics from ServiceTitan.
              </p>
            </div>
          </div>

          {/* Historical Monthly Financial Data Sync */}
          <div className="bg-gray-700 rounded-lg p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
              <h3 className="text-white font-medium flex items-center">
                <Calendar className="h-5 w-5 text-green-400 mr-2" />
                Historical Monthly Financial Data Sync
              </h3>
            </div>

            <div className="space-y-4">
              {/* Year and Month Selection */}
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                {/* Year Selection */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-2 font-medium">Select Year:</label>
                  <div className="flex gap-2">
                    {[2024, 2025].map((year) => (
                      <button
                        key={year}
                        onClick={() => {
                          setSelectedSyncYear(year);
                          // Reset to valid month when switching years
                          if (year === new Date().getFullYear() && selectedMonth > new Date().getMonth() + 1) {
                            setSelectedMonth(new Date().getMonth() + 1);
                          }
                        }}
                        className={`px-4 py-2 rounded border text-sm font-medium transition-all ${
                          selectedSyncYear === year
                            ? 'bg-blue-900 bg-opacity-40 border-blue-500 text-blue-100'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-650'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Month Selection */}
                <label className="block text-sm text-gray-300 mb-3 font-medium">Select Month to Sync:</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {MONTHS.map((month, index) => {
                    const monthNum = index + 1;
                    const currentYear = new Date().getFullYear();
                    const currentMonth = new Date().getMonth() + 1;
                    const isCurrentMonth = selectedSyncYear === currentYear && monthNum === currentMonth;
                    const isFutureMonth = selectedSyncYear === currentYear && monthNum > currentMonth;

                    return (
                      <button
                        key={month}
                        onClick={() => setSelectedMonth(monthNum)}
                        disabled={isFutureMonth}
                        className={`px-3 py-2 rounded border text-sm font-medium transition-all ${
                          selectedMonth === monthNum
                            ? 'bg-green-900 bg-opacity-40 border-green-500 text-green-100'
                            : isFutureMonth
                            ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-650'
                        } ${isCurrentMonth && selectedMonth === monthNum ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        {month.slice(0, 3)}
                        {isCurrentMonth && <span className="block text-xs text-blue-400 mt-0.5">Current</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  <strong>Selected:</strong> {MONTHS[selectedMonth - 1]} {selectedSyncYear}
                  {selectedSyncYear === new Date().getFullYear() && selectedMonth === new Date().getMonth() + 1 && ' (Current Month - will sync up to today)'}
                </div>
              </div>

              {/* Sync Button and Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-300">
                  <p>Syncs complete financial data for <strong className="text-white">{MONTHS[selectedMonth - 1]} {selectedSyncYear}</strong></p>
                  <p className="text-xs text-gray-400 mt-1">Updates YTD Performance Trend and TTM Revenue screens</p>
                </div>

                <button
                  onClick={triggerMonthlySync}
                  disabled={syncingMonthly}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm transition-colors whitespace-nowrap ${
                    syncingMonthly
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {syncingMonthly ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Syncing {MONTHS[selectedMonth - 1]} {selectedSyncYear}...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      <span>Sync {MONTHS[selectedMonth - 1]} {selectedSyncYear}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Info Box */}
              <div className="p-3 bg-green-900 bg-opacity-20 border border-green-500 rounded">
                <p className="text-green-200 text-sm">
                  <strong>Monthly Sync:</strong> Use this to re-sync specific months when you notice discrepancies
                  or when late revenue entries are added to ServiceTitan. This ensures your historical financial
                  reports (YTD and TTM) show accurate data with proper rounding. Syncing 2024 months updates the prior year comparison line on the YTD chart.
                </p>
              </div>
            </div>
          </div>

          {/* Google Reviews Sync */}
          <div className="bg-gray-700 rounded-lg p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
              <h3 className="text-white font-medium flex items-center">
                <MessageCircle className="h-5 w-5 text-yellow-400 mr-2" />
                Google Reviews Cache
              </h3>
            </div>

            <div className="space-y-4">
              {/* Sync Status */}
              {reviewsSyncStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800 p-3 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 text-sm">Last Sync</span>
                      <Clock className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div className="text-white text-sm font-medium">
                      {formatRelativeTime(reviewsSyncStatus.lastSync)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatCentralTime(reviewsSyncStatus.lastSync)}
                    </div>
                  </div>

                  <div className="bg-gray-800 p-3 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 text-sm">Sync Status</span>
                      {reviewsSyncStatus.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      reviewsSyncStatus.status === 'success'
                        ? 'bg-green-600 text-green-100'
                        : 'bg-red-600 text-red-100'
                    }`}>
                      {reviewsSyncStatus.status === 'success' ? 'Success' : 'Failed'}
                    </span>
                  </div>
                </div>
              )}

              {/* Sync Button */}
              <div className="flex justify-end">
                <button
                  onClick={triggerReviewsSync}
                  disabled={syncingReviews}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm transition-colors ${
                    syncingReviews
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  {syncingReviews ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Syncing Reviews...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>Refresh Reviews Cache</span>
                    </>
                  )}
                </button>
              </div>

              {/* Info Box */}
              <div className="p-3 bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded">
                <p className="text-yellow-200 text-sm">
                  <strong>Reviews Cache:</strong> Reviews are cached in the database for fast loading.
                  Click "Refresh Reviews Cache" to fetch the latest reviews from Google Business Profile API.
                  This typically takes 30-60 seconds depending on how many reviews you have. Cache refreshes
                  automatically every 24 hours, but you can manually refresh anytime.
                </p>
              </div>
            </div>
          </div>

          {/* General Settings - WITH AUTHENTICATION */}
<div className="bg-gray-700 rounded-lg p-4 md:p-6">
  <h3 className="text-white font-medium mb-4 flex items-center">
    <Settings className="h-5 w-5 text-green-400 mr-2" />
    General Settings
  </h3>
  
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Refresh Interval */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">Dashboard Refresh Interval</label>
        <select 
          value={settings.refresh_interval?.value || 300}
          onChange={(e) => updateSettings({ refresh_interval: parseInt(e.target.value) })}
          className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
        >
          <option value={60}>1 minute</option>
          <option value={300}>5 minutes</option>
          <option value={600}>10 minutes</option>
          <option value={1800}>30 minutes</option>
          <option value={3600}>1 hour</option>
        </select>
      </div>

      {/* Auto Sync */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">Auto Sync</label>
        <select 
          value={settings.auto_sync?.value ? 'true' : 'false'}
          onChange={(e) => updateSettings({ auto_sync: e.target.value === 'true' })}
          className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      </div>

      {/* Company Name */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">Company Name</label>
        <input
          type="text"
          value={settings.company_name?.value || 'Lex HVAC'}
          onChange={(e) => {
            // Update local state immediately for responsive UI
            setSettings(prev => ({
              ...prev,
              company_name: { ...prev.company_name, value: e.target.value }
            }));
          }}
          onBlur={(e) => updateSettings({ company_name: e.target.value })}
          className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">Timezone</label>
        <select 
          value={settings.timezone?.value || 'America/Chicago'}
          onChange={(e) => updateSettings({ timezone: e.target.value })}
          className="w-full bg-gray-600 text-white rounded px-3 py-2 text-sm"
        >
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
        </select>
      </div>
    </div>

    <div className="flex justify-end">
      <button
        onClick={() => {
          alert('Settings are automatically saved when changed!');
        }}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm transition-colors"
      >
        <Save className="h-4 w-4" />
        <span>Auto-Save Enabled</span>
      </button>
    </div>
  </div>
</div>

          {/* TV Display URLs */}
          <div className="bg-gray-700 rounded-lg p-4 md:p-6">
            <h3 className="text-white font-medium mb-4 flex items-center">
              <Monitor className="h-5 w-5 text-purple-400 mr-2" />
              TV Display URLs
            </h3>

            <div className="space-y-4">
              <div className="p-3 bg-purple-900 bg-opacity-20 border border-purple-500 rounded">
                <p className="text-purple-200 text-sm">
                  Use these URLs on office TVs for automatic display without login.
                </p>
              </div>

              {/* URL Examples */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Auto-Rotation (all screens)</label>
                  <code className="block bg-gray-800 text-green-400 px-3 py-2 rounded text-xs break-all">
                    {window.location.origin}/?display=true
                  </code>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Custom Interval (seconds)</label>
                  <code className="block bg-gray-800 text-green-400 px-3 py-2 rounded text-xs break-all">
                    {window.location.origin}/?display=true&interval=45
                  </code>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Single Page (no rotation)</label>
                  <code className="block bg-gray-800 text-green-400 px-3 py-2 rounded text-xs break-all">
                    {window.location.origin}/?display=true&page=competition
                  </code>
                </div>
              </div>

              {/* Valid Page IDs */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Valid Page Values</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">financial</span>
                    <span className="text-gray-400 ml-1">- Financial</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">revenue-ttm</span>
                    <span className="text-gray-400 ml-1">- Revenue TTM</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">comfort_advisor</span>
                    <span className="text-gray-400 ml-1">- Comfort Advisor</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">technician</span>
                    <span className="text-gray-400 ml-1">- HVAC Tech</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">hvac_maintenance</span>
                    <span className="text-gray-400 ml-1">- HVAC Maint</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">plumbing</span>
                    <span className="text-gray-400 ml-1">- Plumbing</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">electrical</span>
                    <span className="text-gray-400 ml-1">- Electrical</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">call_center</span>
                    <span className="text-gray-400 ml-1">- Call Center</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">memberships</span>
                    <span className="text-gray-400 ml-1">- Memberships</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">reviews</span>
                    <span className="text-gray-400 ml-1">- Reviews</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">top_performers</span>
                    <span className="text-gray-400 ml-1">- Top Performers</span>
                  </div>
                  <div className="bg-gray-800 px-2 py-1 rounded">
                    <span className="text-green-400">competition</span>
                    <span className="text-gray-400 ml-1">- Competition</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-gray-700 rounded-lg p-4 md:p-6">
            <h3 className="text-white font-medium mb-4 flex items-center">
              <Database className="h-5 w-5 text-gray-400 mr-2" />
              System Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Dashboard Version:</span>
                <span className="text-white ml-2">v2.1.0</span>
              </div>
              <div>
                <span className="text-gray-400">Database:</span>
                <span className="text-white ml-2">PostgreSQL</span>
              </div>
              <div>
                <span className="text-gray-400">Last System Restart:</span>
                <span className="text-white ml-2">{new Date().toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-gray-400">Active Users:</span>
                <span className="text-white ml-2">{users.filter(u => u.status === 'active').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Modals */}
      <TargetModal />
      <UserModal />
    </div>
  );
};

export default AdminDashboard;