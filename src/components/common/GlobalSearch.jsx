import React, { useState } from 'react';
import { Icons } from './Icons';

export const GlobalSearch = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    setQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <div className="relative group flex-1 max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icons.Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-[#080B14] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-inner"
        placeholder="Search queries, sources, competitors, or features..."
        value={query}
        onChange={handleSearch}
      />
      <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
        <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">⌘K</span>
      </div>
    </div>
  );
};
