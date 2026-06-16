import React from 'react';
import { InterpretationPanel } from './InterpretationPanel';
import { ConfidenceBadge, CredibilityBadge } from './ConfidenceBadge';

export const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  metricName, // For interpretation engine
  confidenceLabel, 
  credibilityType, // Verified, Estimated, Simulated
  children,
  className = ""
}) => {
  return (
    <div className={`bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group ${className}`}>
      {/* Premium subtle glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-400">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {confidenceLabel && <ConfidenceBadge confidenceLabel={confidenceLabel} />}
            {credibilityType && <CredibilityBadge type={credibilityType} />}
            {metricName && <InterpretationPanel metricName={metricName} />}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tracking-tight">{value}</span>
            {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
          </div>
        </div>

        {children && <div className="mt-4 pt-4 border-t border-white/5">{children}</div>}
      </div>
    </div>
  );
};
