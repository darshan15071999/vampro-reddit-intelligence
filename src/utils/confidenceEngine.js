/**
 * Confidence Engine
 * Assigns data-driven confidence ratings to metrics.
 */

export const calculateConfidence = ({ sampleSize = 0, dataFreshnessDays = 0, sourceDiversity = 0, queryCoverage = 0, citationVolume = 0 }) => {
  let score = 100;

  // Evaluate Sample Size
  if (sampleSize < 10) score -= 25;
  else if (sampleSize < 50) score -= 10;

  // Evaluate Data Freshness
  if (dataFreshnessDays > 30) score -= 20;
  else if (dataFreshnessDays > 7) score -= 10;

  // Evaluate Source Diversity
  if (sourceDiversity < 0.3) score -= 15;
  else if (sourceDiversity < 0.6) score -= 5;

  // Evaluate Query Coverage
  if (queryCoverage < 0.3) score -= 15;
  else if (queryCoverage < 0.6) score -= 5;

  // Evaluate Citation Volume
  if (citationVolume < 5) score -= 15;

  const finalScore = Math.max(0, Math.min(100, score));
  
  let label = 'Low';
  if (finalScore >= 80) label = 'High';
  else if (finalScore >= 50) label = 'Medium';

  return {
    value: finalScore,
    label
  };
};

export const getStatusColor = (label) => {
  switch (label.toLowerCase()) {
    case 'high': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'low': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
  }
};
