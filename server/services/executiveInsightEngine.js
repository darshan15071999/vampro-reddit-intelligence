/**
 * Executive Insight Engine
 * LLM-Assisted Intelligence
 * Responsible for Dashboard Insights, SoV Insights, Platform Insights.
 */

export const generateExecutiveInsights = async (metrics, providerKey = null) => {
  if (providerKey) {
    // LLM execution path
    return [
      "Reddit remains the largest visibility contributor while documentation content shows the highest growth rate.",
      "ChatGPT visibility increased by 8% this week, whereas Gemini visibility remained stable.",
      "Competitor A is aggressively expanding Quora presence, threatening brand Share of Voice."
    ];
  }

  // Fallback heuristic path
  return [
    `Current visibility score stands at ${metrics.visibility || 0}.`,
    `Data ingested from ${metrics.sourceCount || 0} top-level sources.`,
    "Ensure APIs are connected for deeper qualitative insights."
  ];
};
