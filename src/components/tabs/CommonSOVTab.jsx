import React from 'react';
import { Icons } from '../common/Icons';
import { MetricCard } from '../common/MetricCard';

// Shared Layout Component for both SOV tabs to maintain consistency
export const SOVLayout = ({ title, description, type, metrics, chartData }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          {type === 'common' ? <Icons.PieChart className="w-6 h-6 text-indigo-400" /> : <Icons.Shield className="w-6 h-6 text-emerald-400" />}
          {title}
        </h2>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Overall SOV" value={metrics ? `${metrics.overall}%` : 'N/A'} icon={Icons.Activity} metricName="Visibility" confidenceLabel="High" />
        <MetricCard title="SERP Contribution" value={metrics ? `${metrics.serp}%` : 'N/A'} icon={Icons.Search} metricName="Search Engine" confidenceLabel="High" />
        <MetricCard title="LLM Contribution" value={metrics ? `${metrics.llm}%` : 'N/A'} icon={Icons.Cpu} metricName="AI Agents" confidenceLabel="High" />
      </div>

      <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg h-96 flex flex-col items-center justify-center text-center">
        {!metrics ? (
          <>
            <Icons.PieChart className="w-16 h-16 text-indigo-500/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Awaiting Data Ingestion</h3>
            <p className="text-sm text-gray-400 max-w-sm">Connect your sources in the Ingestion Pipeline to begin Share of Voice tracking.</p>
          </>
        ) : (
          <>
            <Icons.Activity className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Bloomberg-style advanced charting component will mount here.</p>
            <p className="text-xs text-gray-600 mt-2">Displaying data for {type === 'common' ? 'Entire Internet Noise' : 'Specifically Connected Sources Only'}.</p>
          </>
        )}
      </div>
    </div>
  );
};

export const CommonSOVTab = ({ workspaceId }) => {
  return (
    <SOVLayout 
      type="common"
      title="Common Share of Voice"
      description="Analyzes overall internet noise (Overall Reddit + Overall Social) against SERP and LLMs for tracked keywords."
      metrics={null} // Enforce Zero Dummy Data
    />
  );
};

