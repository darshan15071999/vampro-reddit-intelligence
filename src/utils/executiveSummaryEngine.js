/**
 * Executive Summary Engine
 * Generates automatic business-friendly summaries for every module.
 */

import { brandConfig } from '../constants/brandConfig';

export const generateDashboardSummary = (data) => {
  const brand = brandConfig.primaryBrand || 'Your brand';
  const postVolume = data.filteredCount || 0;
  
  if (postVolume === 0) {
    return "Insufficient data to generate an executive summary. Please adjust filters or sync new data.";
  }

  let trendText = "Visibility remained stable over the selected period.";
  if (data.recentTrend && data.recentTrend.length > 0) {
    const firstHalf = data.recentTrend.slice(0, Math.floor(data.recentTrend.length / 2));
    const secondHalf = data.recentTrend.slice(Math.floor(data.recentTrend.length / 2));
    
    const avgFirst = firstHalf.length ? firstHalf.reduce((a,b)=>a+b.llmScore,0)/firstHalf.length : 0;
    const avgSecond = secondHalf.length ? secondHalf.reduce((a,b)=>a+b.llmScore,0)/secondHalf.length : 0;
    
    if (avgSecond > avgFirst * 1.1) {
      trendText = `Visibility increased by ~${Math.round(((avgSecond - avgFirst)/avgFirst)*100)}% over the selected period.`;
    } else if (avgSecond < avgFirst * 0.9) {
      trendText = `Visibility decreased by ~${Math.round(((avgFirst - avgSecond)/avgFirst)*100)}% over the selected period.`;
    }
  }

  return `${trendText} Reddit remains a massive contributor to citation volume, accounting for a significant portion of the ${postVolume} tracked signals. Consistent engagement is securing ${brand}'s footprint in generative responses.`;
};

export const generateSovSummary = (sovData, brandSov = 32, topCompetitor = "GitBook") => {
  const brand = brandConfig.primaryBrand || 'Your brand';
  return `${brand} currently owns ${brandSov}% of tracked visibility. Reddit contributes heavily to total Share of Voice. ${topCompetitor} remains the primary competitive threat in tracked queries, signaling a need to expand coverage in contested topic clusters.`;
};

export const generatePlatformSummary = (platformStats) => {
  if (!platformStats || platformStats.length === 0) return "Awaiting platform data for summary generation.";
  
  const topPlatform = platformStats[0];
  const bottomPlatform = platformStats[platformStats.length - 1];

  return `${topPlatform.name} shows the strongest citation alignment with tracked content, achieving a ${topPlatform.score}% ingestion probability. Conversely, ${bottomPlatform.name} visibility remains below expected levels, requiring targeted keyword optimization.`;
};
