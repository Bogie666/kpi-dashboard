"use client";

import React from 'react';
import { Wrench } from 'lucide-react';
import UnsoldEstimateProcessor from './UnsoldEstimateProcessor';

const ToolsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Wrench className="h-6 w-6 text-blue-400" />
        <h2 className="text-xl font-semibold">Tools</h2>
      </div>

      <UnsoldEstimateProcessor />
    </div>
  );
};

export default ToolsPage;
