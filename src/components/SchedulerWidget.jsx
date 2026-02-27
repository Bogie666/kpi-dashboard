"use client";

import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

const CopyBlock = ({ label, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-300">{label}</h4>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
};

const WORDPRESS_CODE = `<!-- LEX Scheduler Widget -->
<link rel="stylesheet" href="https://scheduler-mu-three.vercel.app/lex-scheduler.css">
<script>
  window.LEXSchedulerConfig = {
    apiEndpoint: 'https://scheduler-mu-three.vercel.app/api/lex-booking',
    autoButton: true,
    buttonText: 'Book Online',
    position: 'bottom-right'
  };
</script>
<script src="https://scheduler-mu-three.vercel.app/lex-scheduler.iife.js"></script>`;

const EMBED_BOX_CODE = `<div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <h2 style="margin: 0 0 16px; font-size: 20px; color: #0e2a4a;">Schedule Service Online</h2>
  <p style="color: #64748b; line-height: 1.7; margin: 0 0 16px;">
    Need HVAC, plumbing, or electrical service? Click the button below to schedule an appointment.
  </p>
  <button onclick="LEXScheduler.open()" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: #133865; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">
    Book Appointment Now
  </button>
</div>`;

const CONFIG_CODE = `{
  // URL to backend API that handles ServiceTitan integration
  apiEndpoint: '/api/lex-booking',

  // Show floating button automatically
  autoButton: true,

  // Text for the floating button
  buttonText: 'Book Online',

  // Button position: 'bottom-right' or 'bottom-left'
  position: 'bottom-right',

  // CSS selector for existing buttons to trigger the scheduler
  buttonSelector: '.book-online-btn',

  // Custom logo URL (defaults to LEX logo if not set)
  logoUrl: 'https://example.com/your-logo.png',

  // Header background color (default: '#133865')
  headerColor: '#133865',

  // Floating button color (default: '#0A5C8C')
  buttonColor: '#0A5C8C',

  // Footer tagline text
  tagline: 'The Gold Standard of White Glove Service',

  // Support phone number (shown in footer and confirmation)
  phoneNumber: '(972) 466-1917'
}`;

const MANUAL_CONTROL_CODE = `// Open the scheduler
LEXScheduler.open();

// Close the scheduler
LEXScheduler.close();

// Toggle open/closed
LEXScheduler.toggle();`;

const SchedulerWidget = ({ hideHeader }) => {
  return (
    <div>
      {!hideHeader && (
        <h3 className="text-lg font-medium mb-4">Scheduler Widget</h3>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-400 mb-3">
          Embeddable scheduling widget that integrates with ServiceTitan for online booking.
        </p>
        <a
          href="https://scheduler-mu-three.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View live preview
        </a>
      </div>

      <CopyBlock label="WordPress Installation" code={WORDPRESS_CODE} />
      <CopyBlock label="Embeddable Schedule Box" code={EMBED_BOX_CODE} />
      <CopyBlock label="Configuration Options" code={CONFIG_CODE} />
      <CopyBlock label="Manual Control (JavaScript)" code={MANUAL_CONTROL_CODE} />

      {/* Live Preview */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Live Preview</h4>
        <div className="bg-white rounded-lg overflow-hidden border border-gray-700">
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="https://scheduler-mu-three.vercel.app/lex-scheduler.css"><style>body{margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;}</style></head><body>${EMBED_BOX_CODE}<script>window.LEXSchedulerConfig={apiEndpoint:'https://scheduler-mu-three.vercel.app/api/lex-booking',autoButton:false,buttonText:'Book Online',position:'bottom-right'};</script><script src="https://scheduler-mu-three.vercel.app/lex-scheduler.iife.js"></script></body></html>`}
            title="Scheduler Widget Preview"
            className="w-full border-0"
            style={{ height: '280px' }}
            sandbox="allow-scripts allow-forms allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};

export default SchedulerWidget;
