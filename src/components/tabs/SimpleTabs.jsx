import React from 'react';
import { EmptyState } from '../common/LoadingStates';
import { Icons } from '../common/Icons';
import { MetricCard } from '../common/MetricCard';

export const AIMonitoringTab = () => {
  const platforms = [
    { name: 'ChatGPT', visibility: 82, queries: '450', trend: '+12%', topSource: 'Documentation' },
    { name: 'Claude', visibility: 75, queries: '320', trend: '+5%', topSource: 'Blog' },
    { name: 'Gemini', visibility: 68, queries: '210', trend: '-2%', topSource: 'Reddit' },
    { name: 'Perplexity', visibility: 88, queries: '540', trend: '+18%', topSource: 'Reddit' },
    { name: 'Grok', visibility: 45, queries: '120', trend: '0%', topSource: 'X' },
    { name: 'DeepSeek', visibility: 50, queries: '80', trend: '+4%', topSource: 'GitHub' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">AI Provider Monitoring</h2>
          <p className="text-sm text-gray-400 mt-1">Deep analysis of performance across individual LLM platforms.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map(plat => (
          <div key={plat.name} className="bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">{plat.name}</h3>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${plat.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : plat.trend.startsWith('-') ? 'bg-rose-500/10 text-rose-400' : 'bg-gray-500/10 text-gray-400'}`}>
                {plat.trend}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4 border-b border-white/5 pb-4">
              <div>
                <div className="text-[10px] text-gray-500 uppercase mb-1">Visibility Score</div>
                <div className="text-xl font-mono text-white">{plat.visibility}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase mb-1">Top Queries</div>
                <div className="text-xl font-mono text-white">{plat.queries}</div>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center gap-1"><Icons.Database className="w-3 h-3"/> Top Source</span>
                <span className="text-gray-300">{plat.topSource}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center gap-1"><Icons.Shield className="w-3 h-3"/> Confidence</span>
                <span className="text-emerald-400">High</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-xs text-gray-400 mb-2 font-medium">Improvement Opportunity</div>
              <div className="text-xs text-indigo-300 leading-relaxed">
                Increase coverage of "{plat.name.toLowerCase()} integration tutorials" to boost direct citations.
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CompetitorsTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Competitor Analysis</h2>
        <p className="text-sm text-gray-400 mt-1">Track rival brands and their semantic footprint.</p>
      </div>
      <EmptyState title="Awaiting Competitor Sync" message="Configure competitors in brandConfig to activate tracking." />
    </div>
  );
};

export const ReportsTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Reports & Exports</h2>
        <p className="text-sm text-gray-400 mt-1">Generate executive summaries and raw data extracts.</p>
      </div>
      <EmptyState title="No Reports Generated" message="Reports will appear here once saved." />
    </div>
  );
};

export const LabsTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Vampro Labs</h2>
        <p className="text-sm text-gray-400 mt-1">Experimental intelligence engines and beta capabilities.</p>
      </div>
      <EmptyState title="Labs Restricted" message="Your tier does not currently have access to experimental features." />
    </div>
  );
};
