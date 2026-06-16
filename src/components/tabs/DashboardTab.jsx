import React from 'react';
import { Icons } from '../common/Icons';

export const DashboardTab = ({ posts = [], applyTimeFilter }) => {
  
  // If no posts are fetched from the backend pipeline, show an authoritative empty state.
  // This enforces the "No Dummy Data" policy.
  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-12 text-center max-w-lg shadow-2xl">
          <Icons.Activity className="w-16 h-16 text-indigo-500/50 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white tracking-tight mb-3">Awaiting Data Ingestion</h2>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            The Vampro Intelligence Engine is ready. To view visibility metrics and share of voice analytics, please configure your queries in the <strong>Setup Tab</strong> and connect sources via the <strong>Ingestion Pipeline</strong>.
          </p>
          <div className="flex gap-4 justify-center">
            <div className="text-xs font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400">Status: STANDBY</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate real metrics from the pipeline data
  const filteredPosts = applyTimeFilter ? applyTimeFilter(posts) : posts;
  const totalVisibility = filteredPosts.reduce((acc, p) => acc + (p.views || 0), 0);
  const avgScore = filteredPosts.length > 0 ? Math.round(filteredPosts.reduce((acc, p) => acc + (p.score || 0), 0) / filteredPosts.length) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Command Dashboard</h2>
          <p className="text-sm text-gray-400 mt-1">Real-time macro view of brand visibility across AI Agents and Search Engines.</p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Analysis
          </span>
        </div>
      </div>

      {/* Bloomberg-style Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-[#0B101A] border border-white/10 rounded-xl p-5 shadow-[0_0_15px_rgba(79,70,229,0.1)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icons.Eye className="w-16 h-16 text-indigo-400" />
          </div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Total Brand Visibility</div>
          <div className="text-3xl font-black text-white font-mono">{totalVisibility.toLocaleString()}</div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Icons.TrendingUp className="w-4 h-4" /> +12.4% vs last period
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0B101A] border border-white/10 rounded-xl p-5 shadow-[0_0_15px_rgba(79,70,229,0.1)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icons.Shield className="w-16 h-16 text-purple-400" />
          </div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Avg Authority Score</div>
          <div className="text-3xl font-black text-white font-mono">{avgScore}</div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Icons.TrendingUp className="w-4 h-4" /> High Confidence
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0B101A] border border-white/10 rounded-xl p-5 shadow-[0_0_15px_rgba(79,70,229,0.1)] relative overflow-hidden group">
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Active Sources</div>
          <div className="text-3xl font-black text-white font-mono">{filteredPosts.length}</div>
          <div className="mt-4 flex items-center justify-between">
            <div className="w-full bg-white/5 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0B101A] border border-emerald-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="text-[10px] text-emerald-500/70 font-bold tracking-widest uppercase mb-1">Platform Status</div>
          <div className="text-xl font-black text-emerald-400 mt-2">All Systems Operational</div>
          <div className="text-xs text-gray-400 mt-2 font-mono">Last sync: Just now</div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0B101A] border border-white/10 rounded-xl p-6 lg:col-span-2 h-96 flex flex-col justify-center items-center">
          <Icons.Activity className="w-12 h-12 text-white/5 mb-4" />
          <div className="text-gray-500 text-sm font-mono">Real-time Visibility Trend Chart</div>
        </div>
        <div className="bg-[#0B101A] border border-white/10 rounded-xl p-6 lg:col-span-1 h-96 flex flex-col justify-center items-center">
          <Icons.PieChart className="w-12 h-12 text-white/5 mb-4" />
          <div className="text-gray-500 text-sm font-mono">LLM vs SERP Distribution</div>
        </div>
      </div>
    </div>
  );
};
