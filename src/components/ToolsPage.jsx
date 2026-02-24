"use client";

import React, { useState } from 'react';
import { Wrench, FileSpreadsheet, Globe, Mail, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import UnsoldEstimateProcessor from './UnsoldEstimateProcessor';
import WordPressReviewPlugin from './WordPressReviewPlugin';
import EmailSignatureGenerator from './EmailSignatureGenerator';
import SchedulerWidget from './SchedulerWidget';

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
    </div>
  );
};

export default ToolsPage;
