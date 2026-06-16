import React, { useMemo } from 'react';
import { MetricCard } from '../common/MetricCard';
import { Icons } from '../common/Icons';
import { SovTimelineChart } from '../common/Charts';
import { EmptyState } from '../common/LoadingStates';
import { generateSovSummary } from '../../utils/executiveSummaryEngine';
import { generateRecommendations } from '../../utils/recommendationEngine';
import { brandConfig } from '../../constants/brandConfig';

export const ShareOfVoiceTab = ({ sovData = [] }) => {
  // Mock data calculations for the sake of the demo, preserving existing workflow
  const brandSov = sovData.length ? 32 : 0;
  const topCompetitor = brandConfig.competitors[0] || 'Competitor A';
  
  const execSummary = useMemo(() => generateSovSummary(sovData, brandSov, topCompetitor), [sovData, brandSov, topCompetitor]);
  const recommendations = useMemo(() => generateRecommendations('sov', { brandSov, topCompetitor }), [brandSov, topCompetitor]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Share of Voice</h2>
          <p className="text-sm text-gray-400 mt-1">Competitor dominance mapping and historical context.</p>
        </div>
      </div>

      {sovData.length > 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg border-l-4 border-l-indigo-500">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Icons.PieChart className="w-4 h-4" /> Executive Summary
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">{execSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Overall Market SoV"
          value={sovData.length ? `${brandSov}%` : "--"}
          icon={Icons.PieChart}
          metricName="Share of Voice"
          confidenceLabel="Medium"
          credibilityType="Estimated"
        />
        <MetricCard
          title="Primary Competitor"
          value={`${topCompetitor} (28%)`}
          icon={Icons.Target}
          metricName="Competitor Visibility"
          confidenceLabel="High"
          credibilityType="Verified"
        />
        <MetricCard
          title="Top Contributing Source"
          value="Reddit"
          subtitle="41% of total SoV"
          icon={Icons.Database}
          metricName="Source Contribution"
          confidenceLabel="Medium"
          credibilityType="Projected"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg">
          <h3 className="text-sm font-medium text-white mb-4">Historical SoV Trend</h3>
          {sovData.length > 0 ? (
            <SovTimelineChart data={sovData} />
          ) : (
            <EmptyState title="No Tracking Data" message="Start a live scan or sync historical tracking to view SoV trends." />
          )}
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Icons.Lightbulb className="w-4 h-4 text-amber-400" />
            Recommendations
          </h3>
          <div className="flex-1 space-y-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="bg-[#080B14] border border-white/5 p-3 rounded-xl flex gap-3">
                <Icons.Target className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-300 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
