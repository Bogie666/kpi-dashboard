'use client';

import React, { useState } from 'react';
import {
  Settings,
  Key,
  FileText,
  Palette,
  Users,
  Clock,
  ChevronRight,
  Check,
  AlertCircle,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Mail,
} from 'lucide-react';

interface AdminSettingsProps {
  tenantId?: string;
}

type SettingsTab = 'credentials' | 'reports' | 'branding' | 'team' | 'sync';

interface Credential {
  provider: string;
  stTenantId: string;
  connectionStatus: string;
  lastVerified: string | null;
}

interface Report {
  id: string;
  name: string;
  category: string;
  isEnabled: boolean;
  lastSynced: string | null;
  syncFrequency: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string | null;
}

const TABS: { key: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'credentials', label: 'API Credentials', icon: Key },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'branding', label: 'Branding', icon: Palette },
  { key: 'team', label: 'Team Members', icon: Users },
  { key: 'sync', label: 'Sync Schedule', icon: Clock },
];

export default function AdminSettings({ tenantId }: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Credentials State
  const [credentials, setCredentials] = useState<Credential>({
    provider: 'servicetitan',
    stTenantId: '',
    connectionStatus: 'pending',
    lastVerified: null,
  });
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // Reports State
  const [reports, setReports] = useState<Report[]>([
    { id: 'comfort_advisor', name: 'Comfort Advisor', category: 'sales', isEnabled: true, lastSynced: '2024-01-15T10:30:00', syncFrequency: 'hourly' },
    { id: 'hvac_technician', name: 'HVAC Technician', category: 'hvac', isEnabled: true, lastSynced: '2024-01-15T10:30:00', syncFrequency: 'hourly' },
    { id: 'call_center', name: 'Call Center', category: 'call_center', isEnabled: true, lastSynced: '2024-01-15T10:30:00', syncFrequency: 'realtime' },
    { id: 'financial', name: 'Department Financials', category: 'financial', isEnabled: false, lastSynced: null, syncFrequency: 'daily' },
  ]);

  // Branding State
  const [branding, setBranding] = useState({
    companyName: 'My Company',
    logoUrl: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
  });

  // Team State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: '1', name: 'John Smith', email: 'john@company.com', role: 'owner', lastLogin: '2024-01-15T10:30:00' },
    { id: '2', name: 'Jane Doe', email: 'jane@company.com', role: 'admin', lastLogin: '2024-01-14T09:15:00' },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');

  // Sync State
  const [syncSettings, setSyncSettings] = useState({
    defaultFrequency: 'hourly',
    timezone: 'America/New_York',
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
  });

  const handleTestConnection = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/credentials', {
        method: 'PUT',
        headers: { 'x-tenant-id': tenantId || '' },
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Connection successful!' });
        setCredentials((prev) => ({
          ...prev,
          connectionStatus: 'connected',
          lastVerified: new Date().toISOString(),
        }));
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to test connection' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId || '',
        },
        body: JSON.stringify({
          stTenantId: credentials.stTenantId,
          clientId,
          clientSecret,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Credentials saved and connected!' });
        setCredentials((prev) => ({
          ...prev,
          connectionStatus: 'connected',
          lastVerified: new Date().toISOString(),
        }));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save credentials' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save credentials' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleReport = (reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, isEnabled: !r.isEnabled } : r))
    );
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) return;

    // In a real app, this would send an invitation email
    setTeamMembers((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        lastLogin: null,
      },
    ]);
    setInviteEmail('');
    setMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
  };

  const removeMember = (memberId: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'credentials':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">ServiceTitan API Credentials</h3>
              <p className="text-slate-400 text-sm mb-6">
                Connect your ServiceTitan account to sync your performance data automatically.
              </p>
            </div>

            {/* Connection Status */}
            <div
              className={`p-4 rounded-lg border ${
                credentials.connectionStatus === 'connected'
                  ? 'bg-green-500/10 border-green-500/30'
                  : credentials.connectionStatus === 'error'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {credentials.connectionStatus === 'connected' ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : credentials.connectionStatus === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Clock className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      credentials.connectionStatus === 'connected'
                        ? 'text-green-400'
                        : credentials.connectionStatus === 'error'
                          ? 'text-red-400'
                          : 'text-slate-300'
                    }`}
                  >
                    {credentials.connectionStatus === 'connected'
                      ? 'Connected'
                      : credentials.connectionStatus === 'error'
                        ? 'Connection Error'
                        : 'Not Connected'}
                  </p>
                  {credentials.lastVerified && (
                    <p className="text-sm text-slate-500">
                      Last verified: {new Date(credentials.lastVerified).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Test
                </button>
              </div>
            </div>

            {/* Credentials Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  ServiceTitan Tenant ID
                </label>
                <input
                  type="text"
                  value={credentials.stTenantId}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, stTenantId: e.target.value }))
                  }
                  placeholder="1234567890"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Client ID</label>
                <div className="relative">
                  <input
                    type={showClientId ? 'text' : 'password'}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="cid.xxxxxxxx..."
                    className="w-full px-4 py-2.5 pr-12 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientId(!showClientId)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showClientId ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Client Secret</label>
                <div className="relative">
                  <input
                    type={showClientSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="cs.xxxxxxxx..."
                    className="w-full px-4 py-2.5 pr-12 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showClientSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveCredentials}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Save Credentials
            </button>
          </div>
        );

      case 'reports':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Report Configuration</h3>
              <p className="text-slate-400 text-sm mb-6">
                Enable or disable reports and configure their sync frequency.
              </p>
            </div>

            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleReport(report.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        report.isEnabled ? 'bg-blue-500' : 'bg-slate-600'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          report.isEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                    <div>
                      <p className="font-medium text-white">{report.name}</p>
                      <p className="text-sm text-slate-500">
                        {report.lastSynced
                          ? `Last synced: ${new Date(report.lastSynced).toLocaleString()}`
                          : 'Never synced'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <select
                      value={report.syncFrequency}
                      onChange={(e) =>
                        setReports((prev) =>
                          prev.map((r) =>
                            r.id === report.id ? { ...r, syncFrequency: e.target.value } : r
                          )
                        )
                      }
                      className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white"
                    >
                      <option value="realtime">Real-time</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="manual">Manual</option>
                    </select>
                    <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'branding':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Branding & Appearance</h3>
              <p className="text-slate-400 text-sm mb-6">
                Customize your dashboard appearance with your company branding.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                <input
                  type="text"
                  value={branding.companyName}
                  onChange={(e) => setBranding((prev) => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Logo URL</label>
                <input
                  type="url"
                  value={branding.logoUrl}
                  onChange={(e) => setBranding((prev) => ({ ...prev, logoUrl: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.primaryColor}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, secondaryColor: e.target.value }))
                      }
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.secondaryColor}
                      onChange={(e) =>
                        setBranding((prev) => ({ ...prev, secondaryColor: e.target.value }))
                      }
                      className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">
              <Check className="w-5 h-5" />
              Save Branding
            </button>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Team Members</h3>
              <p className="text-slate-400 text-sm mb-6">
                Manage who has access to your dashboard and their permissions.
              </p>
            </div>

            {/* Invite Form */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-3">Invite New Member</h4>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={handleInviteMember}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Invite
                </button>
              </div>
            </div>

            {/* Team List */}
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <span className="text-lg font-semibold text-white">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.role === 'owner'
                          ? 'bg-purple-500/20 text-purple-300'
                          : member.role === 'admin'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {member.role}
                    </span>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'sync':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Sync Schedule</h3>
              <p className="text-slate-400 text-sm mb-6">
                Configure when and how often your data syncs from ServiceTitan.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Default Sync Frequency
                </label>
                <select
                  value={syncSettings.defaultFrequency}
                  onChange={(e) =>
                    setSyncSettings((prev) => ({ ...prev, defaultFrequency: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="realtime">Real-time (every 5 minutes)</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                <select
                  value={syncSettings.timezone}
                  onChange={(e) =>
                    setSyncSettings((prev) => ({ ...prev, timezone: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Quiet Hours (no syncing)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="time"
                    value={syncSettings.quietHoursStart}
                    onChange={(e) =>
                      setSyncSettings((prev) => ({ ...prev, quietHoursStart: e.target.value }))
                    }
                    className="px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="time"
                    value={syncSettings.quietHoursEnd}
                    onChange={(e) =>
                      setSyncSettings((prev) => ({ ...prev, quietHoursEnd: e.target.value }))
                    }
                    className="px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">
                <Check className="w-5 h-5" />
                Save Settings
              </button>
              <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium">
                <RefreshCw className="w-5 h-5" />
                Sync Now
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-slate-400" />
            <h1 className="text-xl font-bold text-white">Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                    <ChevronRight className={`w-4 h-4 ml-auto ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
