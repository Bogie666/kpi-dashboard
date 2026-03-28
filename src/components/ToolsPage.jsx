"use client";

import React, { useState } from 'react';
import { Wrench, FileSpreadsheet, Globe, Mail, Calendar, Zap, ChevronDown, ChevronRight, Code, Copy, Check } from 'lucide-react';
import UnsoldEstimateProcessor from './UnsoldEstimateProcessor';
import WordPressReviewPlugin from './WordPressReviewPlugin';
import EmailSignatureGenerator from './EmailSignatureGenerator';
import SchedulerWidget from './SchedulerWidget';
import SeerSavingsCalculator from './SeerSavingsCalculator';

const CollapsibleSection = ({ icon: Icon, iconColor, title, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-3 w-full p-6 text-left hover:bg-gray-750 transition-colors rounded-lg"
      >
        {open ? <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />}
        <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0`} />
        <h3 className="text-lg font-medium">{title}</h3>
      </button>
      {open && (
        <div className="px-6 pb-6 -mt-2">
          {children}
        </div>
      )}
    </div>
  );
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-xs font-medium transition-colors"
    >
      {copied ? <><Check className="h-3.5 w-3.5 text-green-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
    </button>
  );
};

const WIDGET_CONFIGS = [
  {
    name: 'Revenue by Department',
    path: '/widgets/revenue',
    description: 'Shows MTD or YTD revenue broken down by department with targets and progress bars.',
    defaultHeight: 400,
    params: [
      { key: 'theme', values: 'light | dark', default: 'light' },
      { key: 'period', values: 'mtd | ytd | last_month', default: 'mtd' },
      { key: 'location', values: 'lex | lex-etx | lyons', default: 'lex' },
      { key: 'compact', values: 'true | false', default: 'false' },
      { key: 'refresh', values: 'seconds', default: '300' },
    ],
  },
  {
    name: 'Top Performers',
    path: '/widgets/leaderboard',
    description: 'Displays the #1 performer from each department (Sales, Service, Maint, Plumbing, Electrical, Call Center).',
    defaultHeight: 420,
    params: [
      { key: 'theme', values: 'light | dark', default: 'light' },
      { key: 'period', values: 'mtd | ytd | last_month', default: 'mtd' },
      { key: 'mode', values: 'top_per_dept | combined', default: 'top_per_dept' },
      { key: 'location', values: 'lex | lex-etx | lyons', default: 'lex' },
      { key: 'limit', values: '1-20 (combined mode)', default: '6' },
      { key: 'compact', values: 'true | false', default: 'false' },
      { key: 'refresh', values: 'seconds', default: '300' },
    ],
  },
  {
    name: 'Cool Club Members',
    path: '/widgets/coolclub',
    description: 'Membership count with goal progress ring, net growth, and 6-month sparkline.',
    defaultHeight: 300,
    params: [
      { key: 'theme', values: 'dark | light', default: 'dark' },
      { key: 'location', values: 'lex | lex-etx | lyons', default: 'lex' },
      { key: 'goal', values: 'number', default: '3000' },
      { key: 'compact', values: 'true | false', default: 'false' },
      { key: 'refresh', values: 'seconds', default: '300' },
    ],
  },
  {
    name: 'Google Reviews',
    path: '/widgets/reviews',
    description: 'Auto-scrolling carousel of recent Google reviews with star ratings.',
    defaultHeight: 340,
    params: [
      { key: 'theme', values: 'light | dark', default: 'light' },
      { key: 'location', values: 'lex | lex-etx | lyons', default: 'lex' },
      { key: 'minRating', values: '1-5', default: '4' },
      { key: 'maxReviews', values: 'number', default: '16' },
      { key: 'autoScroll', values: 'true | false', default: 'true' },
      { key: 'speed', values: 'ms', default: '5000' },
      { key: 'compact', values: 'true | false', default: 'false' },
      { key: 'refresh', values: 'seconds', default: '300' },
    ],
  },
];

const BASE_URL = 'https://lexkpi.app';

const SharePointWidgetEmbeds = () => {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">
        Embed these widgets in SharePoint pages using the Embed web part. Paste the iframe code below into the web part's HTML editor.
      </p>

      {WIDGET_CONFIGS.map((widget) => {
        const iframeCode = `<iframe src="${BASE_URL}${widget.path}" style="width:100%;height:${widget.defaultHeight}px;border:none;" loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe>`;
        return (
          <div key={widget.path} className="bg-gray-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">{widget.name}</h4>
              <CopyButton text={iframeCode} />
            </div>
            <p className="text-sm text-gray-400">{widget.description}</p>

            {/* Iframe code */}
            <pre className="bg-gray-900 rounded p-3 text-xs text-green-400 overflow-x-auto whitespace-pre-wrap break-all select-all">
              {iframeCode}
            </pre>

            {/* Params table */}
            <details className="group">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300 select-none">
                URL Parameters
              </summary>
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-1 pr-4 font-medium">Param</th>
                    <th className="pb-1 pr-4 font-medium">Options</th>
                    <th className="pb-1 font-medium">Default</th>
                  </tr>
                </thead>
                <tbody className="text-gray-400">
                  {widget.params.map((p) => (
                    <tr key={p.key}>
                      <td className="py-0.5 pr-4 font-mono text-blue-400">{p.key}</td>
                      <td className="py-0.5 pr-4">{p.values}</td>
                      <td className="py-0.5 text-gray-500">{p.default}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-500">
                Add params to the URL: <span className="font-mono text-gray-400">{BASE_URL}{widget.path}?theme=dark&period=ytd</span>
              </p>
            </details>
          </div>
        );
      })}
    </div>
  );
};

const ToolsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Wrench className="h-6 w-6 text-blue-400" />
        <h2 className="text-xl font-semibold">Tools</h2>
      </div>

      <CollapsibleSection icon={FileSpreadsheet} iconColor="text-green-400" title="Unsold Estimate Processor">
        <UnsoldEstimateProcessor hideHeader />
      </CollapsibleSection>

      <CollapsibleSection icon={Globe} iconColor="text-purple-400" title="Review Carousel Embed">
        <WordPressReviewPlugin hideHeader />
      </CollapsibleSection>

      <CollapsibleSection icon={Mail} iconColor="text-yellow-400" title="Email Signature Generator">
        <EmailSignatureGenerator hideHeader />
      </CollapsibleSection>

      <CollapsibleSection icon={Calendar} iconColor="text-blue-300" title="Scheduler Widget">
        <SchedulerWidget hideHeader />
      </CollapsibleSection>

      <CollapsibleSection icon={Zap} iconColor="text-cyan-400" title="SEER Savings Calculator">
        <SeerSavingsCalculator hideHeader />
      </CollapsibleSection>

      <CollapsibleSection icon={Code} iconColor="text-orange-400" title="SharePoint Widget Embeds">
        <SharePointWidgetEmbeds />
      </CollapsibleSection>
    </div>
  );
};

export default ToolsPage;
