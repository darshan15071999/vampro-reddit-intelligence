import React from 'react';
import { getStatusColor } from '../../utils/confidenceEngine';

export const ConfidenceBadge = ({ confidenceLabel }) => {
  const colorClass = getStatusColor(confidenceLabel);
  return (
    <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${colorClass}`}>
      {confidenceLabel} Confidence
    </span>
  );
};

export const CredibilityBadge = ({ type }) => {
  // Types: Verified, Estimated, Projected, Simulated
  let colorClass = "text-gray-500 bg-gray-500/10 border-gray-500/20";
  if (type === 'Verified') colorClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  if (type === 'Estimated') colorClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";
  if (type === 'Projected') colorClass = "text-indigo-500 bg-indigo-500/10 border-indigo-500/20";
  if (type === 'Simulated') colorClass = "text-rose-500 bg-rose-500/10 border-rose-500/20";

  return (
    <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${colorClass}`}>
      {type}
    </span>
  );
};
