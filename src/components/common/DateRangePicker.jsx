import React from 'react';
import { Icons } from './Icons';

export const DateRangePicker = ({ globalDateRange, setGlobalDateRange, customDates, setCustomDates }) => {
  return (
    <div className="flex items-center gap-2 bg-[#111827] border border-white/5 rounded-xl p-1 shadow-sm">
      <Icons.Clock className="w-4 h-4 text-gray-500 ml-2" />
      <select
        value={globalDateRange}
        onChange={(e) => setGlobalDateRange(e.target.value)}
        className="bg-transparent border-none text-sm text-gray-300 focus:ring-0 cursor-pointer pr-8 py-1"
      >
        <option value="7">Last 7 Days</option>
        <option value="30">Last 30 Days</option>
        <option value="90">Last 90 Days</option>
        <option value="all">All Time</option>
        <option value="custom">Custom Range</option>
      </select>

      {globalDateRange === 'custom' && (
        <div className="flex items-center gap-2 border-l border-white/10 pl-2 ml-1">
          <input 
            type="date" 
            value={customDates.from} 
            onChange={e => setCustomDates({...customDates, from: e.target.value})}
            className="bg-[#080B14] border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
          />
          <span className="text-gray-500 text-xs">to</span>
          <input 
            type="date" 
            value={customDates.to} 
            onChange={e => setCustomDates({...customDates, to: e.target.value})}
            className="bg-[#080B14] border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}
    </div>
  );
};
