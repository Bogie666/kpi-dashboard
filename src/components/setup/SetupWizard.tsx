'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plug, Network, FileBarChart, Star, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import StepCompany from './StepCompany';
import StepServiceTitan from './StepServiceTitan';
import StepDivisions from './StepDivisions';
import StepReports from './StepReports';
import StepGoogleReviews from './StepGoogleReviews';

const STEPS = [
  { id: 1, name: 'Company', icon: Building2, description: 'Company name, logo, and timezone' },
  { id: 2, name: 'ServiceTitan', icon: Plug, description: 'Connect your ServiceTitan account' },
  { id: 3, name: 'Divisions', icon: Network, description: 'Map divisions and business units' },
  { id: 4, name: 'Reports', icon: FileBarChart, description: 'Configure ServiceTitan reports' },
  { id: 5, name: 'Reviews', icon: Star, description: 'Connect Google Business Profile' },
];

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [stepData, setStepData] = useState<Record<number, unknown>>({});

  useEffect(() => {
    fetch('/api/setup?step=status')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          if (json.setupCompleted) {
            setSetupComplete(true);
          }
          setCurrentStep(json.currentStep || 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStepDataChange = useCallback((step: number, data: unknown) => {
    setStepData(prev => ({ ...prev, [step]: data }));
  }, []);

  const handleSaveStep = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: currentStep, data: stepData[currentStep] }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (currentStep === 5) {
        setSetupComplete(true);
      } else {
        setCurrentStep(prev => prev + 1);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Setup Complete!</h1>
          <p className="text-gray-400 mb-8">
            Your KPI dashboard is configured and ready to use. You can modify these settings
            anytime from the Admin panel.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors">
              Open Dashboard
            </a>
            <button
              onClick={() => { setSetupComplete(false); setCurrentStep(1); }}
              className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Reconfigure
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">KPI Platform Setup</h1>
          <p className="text-gray-400">Configure your dashboard in a few steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-10">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = step.id === currentStep;
            const isComplete = step.id < currentStep;
            return (
              <React.Fragment key={step.id}>
                {index > 0 && (
                  <div className={`h-0.5 w-12 md:w-20 ${isComplete ? 'bg-blue-500' : 'bg-gray-700'}`} />
                )}
                <button
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex flex-col items-center gap-1.5 transition-colors ${
                    isActive ? 'text-blue-400' : isComplete ? 'text-green-400 cursor-pointer' : 'text-gray-600'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isActive ? 'border-blue-500 bg-blue-500/20' :
                    isComplete ? 'border-green-500 bg-green-500/20' :
                    'border-gray-700 bg-gray-800'
                  }`}>
                    {isComplete ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-medium hidden md:block">{step.name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 md:p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              Step {currentStep}: {STEPS[currentStep - 1].name}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {STEPS[currentStep - 1].description}
            </p>
          </div>

          {currentStep === 1 && (
            <StepCompany
              data={stepData[1] as Record<string, string> | undefined}
              onChange={(d) => handleStepDataChange(1, d)}
            />
          )}
          {currentStep === 2 && (
            <StepServiceTitan
              data={stepData[2] as Record<string, string> | undefined}
              onChange={(d) => handleStepDataChange(2, d)}
            />
          )}
          {currentStep === 3 && (
            <StepDivisions
              data={stepData[3] as Record<string, unknown> | undefined}
              onChange={(d) => handleStepDataChange(3, d)}
            />
          )}
          {currentStep === 4 && (
            <StepReports
              data={stepData[4] as Record<string, unknown> | undefined}
              onChange={(d) => handleStepDataChange(4, d)}
            />
          )}
          {currentStep === 5 && (
            <StepGoogleReviews
              data={stepData[5] as Record<string, unknown> | undefined}
              onChange={(d) => handleStepDataChange(5, d)}
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors
              disabled:text-gray-600 disabled:cursor-not-allowed
              text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <button
            onClick={handleSaveStep}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium
              hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : currentStep === 5 ? (
              <><Check className="w-4 h-4" /> Complete Setup</>
            ) : (
              <>Save & Continue <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
