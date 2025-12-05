'use client';

import React, { useState } from 'react';
import {
  Building2,
  Key,
  FileSearch,
  LayoutDashboard,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import AccountStep from './steps/AccountStep';
import CredentialsStep from './steps/CredentialsStep';
import ReportsStep from './steps/ReportsStep';
import DashboardStep from './steps/DashboardStep';

export interface SetupData {
  // Account
  companyName: string;
  email: string;
  password: string;
  name: string;

  // Credentials
  stTenantId: string;
  clientId: string;
  clientSecret: string;

  // Reports
  selectedReports: string[];

  // Dashboard
  selectedTemplate: string | null;
}

const STEPS = [
  { id: 'account', title: 'Create Account', icon: Building2 },
  { id: 'credentials', title: 'Connect ServiceTitan', icon: Key },
  { id: 'reports', title: 'Select Reports', icon: FileSearch },
  { id: 'dashboard', title: 'Choose Dashboard', icon: LayoutDashboard },
];

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [setupData, setSetupData] = useState<SetupData>({
    companyName: '',
    email: '',
    password: '',
    name: '',
    stTenantId: '',
    clientId: '',
    clientSecret: '',
    selectedReports: [],
    selectedTemplate: null,
  });

  const updateSetupData = (data: Partial<SetupData>) => {
    setSetupData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Handle step-specific actions
      if (currentStep === 0) {
        // Create account
        const response = await fetch('/api/tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: setupData.companyName,
            email: setupData.email,
            password: setupData.password,
            name: setupData.name,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create account');
        }

        setTenantId(data.tenant.id);
        // Store in session
        sessionStorage.setItem('tenantId', data.tenant.id);
        sessionStorage.setItem('userId', data.user.id);
      } else if (currentStep === 1) {
        // Save credentials
        const response = await fetch('/api/credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId || sessionStorage.getItem('tenantId') || '',
          },
          body: JSON.stringify({
            stTenantId: setupData.stTenantId,
            clientId: setupData.clientId,
            clientSecret: setupData.clientSecret,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to connect to ServiceTitan');
        }
      }

      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setError(null);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Save report selections and dashboard template
      const tid = tenantId || sessionStorage.getItem('tenantId');

      // Enable selected reports
      if (setupData.selectedReports.length > 0) {
        await fetch('/api/reports/enable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tid || '',
          },
          body: JSON.stringify({ reports: setupData.selectedReports }),
        });
      }

      // Apply dashboard template
      if (setupData.selectedTemplate) {
        await fetch('/api/dashboards/apply-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tid || '',
          },
          body: JSON.stringify({ templateId: setupData.selectedTemplate }),
        });
      }

      // Redirect to dashboard builder
      window.location.href = '/builder';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return (
          setupData.companyName.length > 0 &&
          setupData.email.includes('@') &&
          setupData.password.length >= 8 &&
          setupData.name.length > 0
        );
      case 1:
        return (
          setupData.stTenantId.length > 0 &&
          setupData.clientId.length > 0 &&
          setupData.clientSecret.length > 0
        );
      case 2:
        return setupData.selectedReports.length > 0;
      case 3:
        return true; // Template is optional
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <AccountStep data={setupData} onChange={updateSetupData} />;
      case 1:
        return <CredentialsStep data={setupData} onChange={updateSetupData} />;
      case 2:
        return <ReportsStep data={setupData} onChange={updateSetupData} />;
      case 3:
        return <DashboardStep data={setupData} onChange={updateSetupData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Logo/Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">
            KPI Dashboard Setup
          </h1>
          <p className="text-slate-400">
            Connect your ServiceTitan account and build your custom dashboard
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isComplete = index < currentStep;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        transition-all duration-300
                        ${isComplete
                          ? 'bg-green-500 text-white'
                          : isActive
                            ? 'bg-blue-500 text-white ring-4 ring-blue-500/30'
                            : 'bg-slate-700 text-slate-400'
                        }
                      `}
                    >
                      {isComplete ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span
                      className={`
                        mt-2 text-sm font-medium
                        ${isActive ? 'text-white' : 'text-slate-500'}
                      `}
                    >
                      {step.title}
                    </span>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div
                      className={`
                        flex-1 h-1 mx-4 rounded
                        ${index < currentStep ? 'bg-green-500' : 'bg-slate-700'}
                      `}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {renderStep()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || isLoading}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium
                transition-all
                ${currentStep === 0
                  ? 'opacity-0 pointer-events-none'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }
              `}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid() || isLoading}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg font-medium
                  transition-all
                  ${isStepValid() && !isLoading
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-3 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Complete Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-slate-500 text-sm mt-8">
          Need help?{' '}
          <a href="#" className="text-blue-400 hover:underline">
            View setup guide
          </a>{' '}
          or{' '}
          <a href="#" className="text-blue-400 hover:underline">
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}
