/**
 * Unified Source Architecture
 * Standardizes sources across the platform.
 */

export const SOURCE_TYPES = {
  REDDIT: 'Reddit',
  WEBSITE: 'Website',
  BLOG: 'Blog',
  LINKEDIN: 'LinkedIn',
  DOCUMENTATION: 'Documentation',
  YOUTUBE: 'YouTube',
  X: 'X',
  FACEBOOK: 'Facebook',
  QUORA: 'Quora',
  CUSTOM: 'Custom'
};

export const createSource = ({
  id,
  sourceType,
  sourceName,
  sourceUrl,
  trustWeight = 50,
  visibilityWeight = 50,
  citationContribution = 0,
  sovContribution = 0,
  authorityScore = 50,
  coverageScore = 50,
  healthScore = 100,
  status = 'active'
}) => {
  return {
    id,
    sourceType,
    sourceName,
    sourceUrl,
    trustWeight,
    visibilityWeight,
    citationContribution,
    sovContribution,
    authorityScore,
    coverageScore,
    healthScore,
    status
  };
};

export const normalizeRedditPostToSource = (post) => {
  const engagement = post.score + (post.num_comments * 2);
  const textDensity = Math.min(100, (post.selftext || "").length / 10);
  
  return createSource({
    id: post.id,
    sourceType: SOURCE_TYPES.REDDIT,
    sourceName: `r/${post.subreddit}`,
    sourceUrl: post.url,
    trustWeight: Math.min(100, post.score * 1.5),
    visibilityWeight: post.views ? Math.min(100, post.views / 100) : 50,
    authorityScore: post.num_comments > 10 ? 80 : 40,
    citationContribution: Math.min(100, engagement * 0.8),
    sovContribution: Math.min(100, engagement * 0.5),
    coverageScore: textDensity,
    healthScore: post.score < 0 ? 20 : 100,
    status: 'indexed'
  });
};

export const calculateSourceAttribution = (sources) => {
  if (!sources || sources.length === 0) return [];
  
  let typeTotals = {};
  let globalTotal = 0;

  sources.forEach(s => {
    const value = s.citationContribution || s.trustWeight || 10;
    typeTotals[s.sourceType] = (typeTotals[s.sourceType] || 0) + value;
    globalTotal += value;
  });

  if (globalTotal === 0) return [];

  return Object.keys(typeTotals)
    .map(type => ({
      type,
      percentage: Math.round((typeTotals[type] / globalTotal) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage);
};
