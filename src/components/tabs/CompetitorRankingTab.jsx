import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';

export const CompetitorRankingTab = ({ workspaceId = 'default' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In a fully integrated phase, this calls `/api/analytics/${workspaceId}/competitors`
    // Since we enforce zero dummy data, we will not set mock data.
    setData(null);
  }, [workspaceId]);

  if (loading) return <div className="text-white p-8">Loading competitor rankings...</div>;

  // Enforce zero dummy data empty state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-12 text-center max-w-lg shadow-2xl">
          <Icons.Target className="w-16 h-16 text-rose-500/50 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white tracking-tight mb-3">Awaiting Competitor Setup</h2>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            There is no competitor ranking data to display. Please add your competitors in the <strong>Setup Tab</strong> and ensure sources are ingested.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Icons.Target className="w-6 h-6 text-rose-400" />
          Competitor Ranking
        </h2>
        <p className="text-sm text-gray-400 mt-1">Head-to-head tracking against your defined competitors for tracked search terms.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SoV Overview */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg lg:col-span-1 flex flex-col">
          <h3 className="text-sm font-medium text-white mb-6">Overall Share of Voice vs Competitors</h3>
          <div className="flex-1 flex flex-col gap-4 justify-center">
            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <span className="font-bold text-indigo-400">Your Brand</span>
              <span className="font-mono text-white">{data.overallBrandSoV}%</span>
            </div>
            {data.competitors.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="font-medium text-gray-300">{c.name}</span>
                <span className="font-mono text-gray-400">{c.sov}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Query Level Rankings */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg lg:col-span-2">
          <h3 className="text-sm font-medium text-white mb-4">Ranking by Tracked Query</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#080B14] border-b border-white/5 text-gray-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Query Term</th>
                  <th className="px-4 py-3 font-medium text-center">Brand Rank</th>
                  <th className="px-4 py-3 font-medium text-center">Top Competitor</th>
                  <th className="px-4 py-3 font-medium text-center">Competitor Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {data.queries.map((q, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4 font-medium text-white">{q.term}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${q.brandRank === 1 ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'}`}>
                        {q.brandRank}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-400">{q.topCompetitor}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs bg-white/5 text-gray-400`}>
                        {q.competitorRank}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
