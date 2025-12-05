'use client';

import React, { useState } from 'react';
import { Key, Building, Eye, EyeOff, HelpCircle, ExternalLink } from 'lucide-react';
import { SetupData } from '../SetupWizard';

interface CredentialsStepProps {
  data: SetupData;
  onChange: (data: Partial<SetupData>) => void;
}

export default function CredentialsStep({ data, onChange }: CredentialsStepProps) {
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Connect ServiceTitan
        </h2>
        <p className="text-slate-400">
          Enter your ServiceTitan API credentials to sync your data
        </p>
      </div>

      {/* Help Section */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
      >
        <HelpCircle className="w-5 h-5" />
        <span className="text-sm">Where do I find my API credentials?</span>
      </button>

      {showHelp && (
        <div className="p-4 bg-slate-900/70 rounded-lg border border-slate-600 space-y-3">
          <h4 className="font-medium text-white">How to get your credentials:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
            <li>Log into your ServiceTitan account</li>
            <li>Go to <strong>Settings</strong> &rarr; <strong>Integrations</strong> &rarr; <strong>API Application Access</strong></li>
            <li>Create a new application or use existing credentials</li>
            <li>Copy the <strong>Tenant ID</strong>, <strong>Client ID</strong>, and <strong>Client Secret</strong></li>
          </ol>
          <a
            href="https://developer.servicetitan.io/docs/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm mt-2"
          >
            View full documentation
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      <div className="space-y-4">
        {/* Tenant ID */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            ServiceTitan Tenant ID
          </label>
          <div className="relative">
            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={data.stTenantId}
              onChange={(e) => onChange({ stTenantId: e.target.value })}
              placeholder="1234567890"
              className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Your unique ServiceTitan account identifier
          </p>
        </div>

        {/* Client ID */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Client ID
          </label>
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type={showClientId ? 'text' : 'password'}
              value={data.clientId}
              onChange={(e) => onChange({ clientId: e.target.value })}
              placeholder="cid.xxxxxxxx..."
              className="w-full pl-12 pr-12 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowClientId(!showClientId)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showClientId ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Client Secret */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Client Secret
          </label>
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type={showClientSecret ? 'text' : 'password'}
              value={data.clientSecret}
              onChange={(e) => onChange({ clientSecret: e.target.value })}
              placeholder="cs.xxxxxxxx..."
              className="w-full pl-12 pr-12 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowClientSecret(!showClientSecret)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showClientSecret ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-green-300">Your credentials are secure</h4>
            <p className="text-sm text-green-300/80 mt-1">
              All API credentials are encrypted at rest using AES-256 encryption.
              We never store your credentials in plain text.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
