'use client';

import React, { useState, useEffect } from 'react';
import DashboardBuilder, { DashboardState } from '@/components/builder/DashboardBuilder';

export default function BuilderPage() {
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load dashboard from API or create new one
    const loadDashboard = async () => {
      try {
        const tenantId = sessionStorage.getItem('tenantId');

        if (tenantId) {
          // Try to load existing dashboard
          const response = await fetch('/api/dashboards/default', {
            headers: { 'x-tenant-id': tenantId },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.dashboard) {
              setDashboard(data.dashboard);
              setIsLoading(false);
              return;
            }
          }
        }

        // Create default empty dashboard
        setDashboard({
          id: 'new',
          name: 'My Dashboard',
          layout: [],
          widgets: {},
        });
      } catch (error) {
        console.error('Failed to load dashboard:', error);
        setDashboard({
          id: 'new',
          name: 'My Dashboard',
          layout: [],
          widgets: {},
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleSave = async (updatedDashboard: DashboardState) => {
    const tenantId = sessionStorage.getItem('tenantId');

    if (!tenantId) {
      // For demo mode, just save to localStorage
      localStorage.setItem('dashboard', JSON.stringify(updatedDashboard));
      return;
    }

    const response = await fetch('/api/dashboards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify(updatedDashboard),
    });

    if (!response.ok) {
      throw new Error('Failed to save dashboard');
    }

    const data = await response.json();
    setDashboard(data.dashboard);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-red-400">Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <DashboardBuilder
      initialDashboard={dashboard}
      onSave={handleSave}
      tenantId={sessionStorage.getItem('tenantId') || undefined}
    />
  );
}
