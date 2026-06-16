import React, { useMemo } from 'react';
import { MetricCard } from '../common/MetricCard';
import { Icons } from '../common/Icons';
import { generatePlatformSummary } from '../../utils/executiveSummaryEngine';
import { calculateConfidence } from '../../utils/confidenceEngine';

export const CitationIntelligenceTab = ({ posts, applyTimeFilter }) => {
  const platformStats = useMemo(() => {
    const filtered = applyTimeFilter(posts);
    if (!filtered.length) return [];

    const platforms = [
      { id: 'chatgpt', name: 'ChatGPT (OpenAI)', color: 'bg-emerald-500', icon: Icons.Cpu },
      { id: 'claude', name: 'Claude (Anthropic)', color: 'bg-orange-500', icon: Icons.Layers },
      { id: 'gemini', name: 'Google Gemini', color: 'bg-purple-500', icon: Icons.Globe },
      { id: 'perplexity', name: 'Perplexity AI', color: 'bg-indigo-500', icon: Icons.Search },
      { id: 'grok', name: 'Grok (xAI)', color: 'bg-gray-500', icon: Icons.Terminal },
      { id: 'deepseek', name: 'DeepSeek', color: 'bg-cyan-500', icon: Icons.Database }
    ];

    return platforms.map((plat) => {
      let totalMatch = 0;
      filtered.forEach(p => {
        let baseMultiplier = 1.0;
        if (plat.id === 'perplexity') baseMultiplier = p.type === 'comment' ? 1.4 : 1.1;
        if (plat.id === 'chatgpt') baseMultiplier = 1.0;
        if (plat.id === 'claude') baseMultiplier = p.type === 'post' ? 1.1 : 0.75;
        if (plat.id === 'gemini') baseMultiplier = 0.9;
        if (plat.id === 'grok') baseMultiplier = p.type === 'post' ? 1.2 : 0.8;
        if (plat.id === 'deepseek') baseMultiplier = 0.85;

        const textLengthFactor = (p.selftext || "").length > 200 ? 1.1 : 0.9;
        const hashScore = Math.abs(Math.sin(p.score * (p.title.length || 10))) * 40 + 35;
        totalMatch += (hashScore * baseMultiplier * textLengthFactor);
      });
      let avg = totalMatch / filtered.length;
      let finalScore = Math.max(1, Math.min(Math.round(avg), 99));

      return { ...plat, score: finalScore };
    }).sort((a, b) => b.score - a.score);
  }, [posts, applyTimeFilter]);

  const execSummary = useMemo(() => generatePlatformSummary(platformStats), [platformStats]);
  
  const confidence = calculateConfidence({
    sampleSize: posts.length,
    dataFreshnessDays: 1,
    sourceDiversity: 0.7,
    queryCoverage: 0.6,
    citationVolume: 10
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Citation Intelligence</h2>
          <p className="text-sm text-gray-400 mt-1">First-class visibility tracking across top LLM providers.</p>
        </div>
      </div>

      {platformStats.length > 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg border-l-4 border-l-emerald-500">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Icons.Cpu className="w-4 h-4" /> Executive Summary
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">{execSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platformStats.map(plat => {
          const Icon = plat.icon;
          return (
            <MetricCard
              key={plat.id}
              title={plat.name}
              value={`${plat.score}%`}
              icon={Icon}
              metricName="Platform Visibility"
              confidenceLabel={confidence.label}
              credibilityType="Simulated"
            >
              <div className="space-y-3">
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`${plat.color} h-1.5 rounded-full`} style={{ width: `${plat.score}%` }}></div>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-white/5">
                  <span className="text-gray-500">Top Source:</span>
                  <span className="text-gray-300 font-medium">Reddit (r/reactjs)</span>
                </div>
              </div>
            </MetricCard>
          );
        })}
      </div>
    </div>
  );
};
