import React from 'react';
import { Icons } from './Icons';

export const LoadingState = ({ message = "Analyzing intelligence..." }) => (
  <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-[#111827] rounded-2xl border border-white/5">
    <Icons.RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
    <span className="text-sm font-medium animate-pulse">{message}</span>
  </div>
);

export const EmptyState = ({ icon: Icon = Icons.Database, title = "No Data Available", message = "Adjust your filters or sync data to view intelligence." }) => (
  <div className="h-64 flex flex-col items-center justify-center text-center px-4 bg-[#111827] rounded-2xl border border-white/5 border-dashed">
    <div className="w-12 h-12 bg-[#080B14] rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-inner">
      <Icon className="w-6 h-6 text-gray-500" />
    </div>
    <h3 className="text-sm font-medium text-gray-300 mb-1">{title}</h3>
    <p className="text-xs text-gray-500 max-w-sm">{message}</p>
  </div>
);
