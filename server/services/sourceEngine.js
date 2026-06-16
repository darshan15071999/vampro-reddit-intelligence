/**
 * Source Engine
 * Platform-Owned Intelligence
 * Responsible for Source Authority, Coverage Score, Health Score, Trust Weight, Visibility Weight, Source Contribution.
 */

export const analyzeSource = (source) => {
  // Extract base stats
  let authorityScore = 50;
  let trustWeight = 50;
  let visibilityWeight = 50;
  let coverageScore = 0;
  let healthScore = 100;

  if (source.source_type === 'reddit') {
    const rawData = JSON.parse(source.content || '{}');
    const score = rawData.score || 0;
    const num_comments = rawData.num_comments || 0;
    
    authorityScore = num_comments > 10 ? 80 : 40;
    trustWeight = Math.min(100, score > 0 ? score * 1.5 : 20);
    visibilityWeight = Math.min(100, (score * 15) / 100);
    coverageScore = Math.min(100, (rawData.selftext?.length || 0) / 10);
    healthScore = score < 0 ? 20 : 100;
  } else if (source.source_type === 'website' || source.source_type === 'documentation') {
    const textLength = source.content?.length || 0;
    authorityScore = 85;
    trustWeight = 90;
    visibilityWeight = 70;
    coverageScore = Math.min(100, textLength / 50); // E.g., 5000 chars = 100%
    healthScore = textLength > 100 ? 100 : 30; // 30 if basically empty
  }

  // Calculate generic contribution
  const sourceContribution = Math.round((authorityScore * 0.4) + (trustWeight * 0.4) + (coverageScore * 0.2));

  return {
    authorityScore: Math.round(authorityScore),
    trustWeight: Math.round(trustWeight),
    visibilityWeight: Math.round(visibilityWeight),
    coverageScore: Math.round(coverageScore),
    healthScore: Math.round(healthScore),
    sourceContribution
  };
};
