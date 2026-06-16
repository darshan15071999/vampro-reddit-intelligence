/**
 * Interpretation Engine
 * Generates reusable intelligence narratives with actionable business context.
 */

export const getInterpretation = (metricName) => {
  const interpretations = {
    'Visibility Score': {
      what: 'Measures likelihood of being surfaced across tracked AI engines.',
      how: 'Calculated from query coverage, citation signals, and source authority.',
      why: 'Higher visibility increases probability of AI citations in generative responses.',
      confidence: 'Driven by query sample size and API sync freshness.',
      recommendation: 'Expand coverage in underperforming topic clusters and increase high-authority backlinks.'
    },
    'Citation Score': {
      what: 'Measures how frequently your content is cited by LLMs as a definitive source.',
      how: 'Aggregation of Reddit mentions, query semantic similarity, and indexed source authority.',
      why: 'Directly impacts organic AI visibility and positions the brand as an industry authority.',
      confidence: 'Based on cross-platform validation rates.',
      recommendation: 'Publish more deeply technical guides and actively answer community questions.'
    },
    'Share of Voice': {
      what: 'The percentage of AI query responses dominated by your brand vs. competitors.',
      how: 'Weighted calculation of your brand mentions versus competitor mentions in AI output.',
      why: 'Indicates market dominance and top-of-mind awareness in LLM environments.',
      confidence: 'Calculated from tracked competitor dataset completeness.',
      recommendation: 'Target competitor weak points and launch comparison campaigns.'
    },
    'Query Relevance': {
      what: 'How well your indexed content maps to high-value generative queries.',
      how: 'Semantic similarity matching between user intent queries and your documented features.',
      why: 'Ensures that when users ask AI for solutions, your specific features are extracted.',
      confidence: 'Derived from lexical overlap density and historical search volume.',
      recommendation: 'Optimize documentation to match exact user intent phrasing.'
    },
    'Source Contribution': {
      what: 'The individual impact of a single content piece on your overall AI visibility.',
      how: 'Calculated using engagement metrics, domain authority, and text density.',
      why: 'Helps identify which types of content perform best for RAG ingestion.',
      confidence: 'Based on real-time engagement data stability.',
      recommendation: 'Replicate the structure and depth of high-contributing sources.'
    },
    'Competitor Visibility': {
      what: 'The tracked AI visibility footprint of defined market competitors.',
      how: 'Analyzed using the same engine parameters as your primary brand tracking.',
      why: 'Identifies areas where competitors are out-ranking you in LLM outputs.',
      confidence: 'Determined by competitor keyword sampling depth.',
      recommendation: 'Perform a gap analysis on topics where competitor visibility outpaces yours.'
    },
    'Platform Visibility': {
      what: 'The algorithmic weight of specific platforms (e.g., Reddit vs. LinkedIn) in AI responses.',
      how: 'Derived from global crawler prioritization weights and historical citation rates.',
      why: 'Guides resource allocation for community engagement and content syndication.',
      confidence: 'Measured against global LLM crawler behavior datasets.',
      recommendation: 'Focus efforts on high-influence platforms showing low brand saturation.'
    },
    'Feature Impact': {
      what: 'The correlation between specific product features and overall brand visibility.',
      how: 'Topic extraction matched against core feature lists in your documentation.',
      why: 'Reveals which capabilities drive the most organic discussion and AI citations.',
      confidence: 'Tied to semantic mapping accuracy of your documentation.',
      recommendation: 'Highlight high-impact features in marketing and prioritize related documentation.'
    }
  };

  return interpretations[metricName] || {
    what: 'A tracked metric within the intelligence platform.',
    how: 'Calculated via internal intelligence engines.',
    why: 'Provides actionable insights into performance.',
    confidence: 'Derived from platform averages.',
    recommendation: 'Monitor trends over time.'
  };
};
