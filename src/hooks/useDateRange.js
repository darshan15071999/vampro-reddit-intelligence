import { useState, useMemo } from 'react';

export const useDateRange = () => {
  const [globalDateRange, setGlobalDateRange] = useState('all'); // 'all', '7', '30', '90', 'custom'
  const [customDates, setCustomDates] = useState({ from: '', to: '' });

  const applyTimeFilter = (items, timestampField = 'created_utc', localRangeOverride = null, localCustomOverride = null) => {
    const rangeMode = localRangeOverride || globalDateRange;
    const dates = localCustomOverride || customDates;

    if (rangeMode === 'all') return items;
    const now = Date.now() / 1000;
    
    if (rangeMode === 'custom') {
      const fromSec = dates.from ? new Date(dates.from).getTime() / 1000 : 0;
      const toSec = dates.to ? new Date(dates.to).getTime() / 1000 + 86399 : now;
      return items.filter(p => p[timestampField] >= fromSec && p[timestampField] <= toSec);
    }
    
    return items.filter(p => (now - p[timestampField]) <= parseInt(rangeMode) * 86400);
  };

  return {
    globalDateRange,
    setGlobalDateRange,
    customDates,
    setCustomDates,
    applyTimeFilter
  };
};
