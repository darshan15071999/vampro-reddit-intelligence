/**
 * SOV Engine
 * Platform-Owned Intelligence
 * Responsible for Brand Share of Voice, Competitor Share of Voice, Source Share of Voice.
 */

export const calculateSOV = (brandName, competitors, citations) => {
  let brandVisibility = 0;
  let competitorVisibility = {};
  
  competitors.forEach(c => competitorVisibility[c] = 0);

  // Analyze citations for brand vs competitors
  citations.forEach(citation => {
    // In a real system, citation would link to query_id which links to brand/competitor keywords
    // For now, we abstract it.
    if (citation.confidence === 'High' || citation.confidence === 'Medium') {
      brandVisibility += citation.citation_score;
    }
  });

  // Example heuristic normalization
  const totalVisibility = brandVisibility + Object.values(competitorVisibility).reduce((a, b) => a + b, 0) || 100;
  
  return {
    brandSOV: Math.round((brandVisibility / totalVisibility) * 100),
    competitorSOV: competitorVisibility
  };
};
