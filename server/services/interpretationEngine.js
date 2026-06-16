/**
 * Interpretation Engine
 * LLM-Assisted Intelligence
 * Responsible for "What happened", "Why it happened", "Business significance".
 */

// In a real implementation, this would call OpenAI/Anthropic using the provider_connections.
// For this foundational phase, we build the scaffolding that accepts the metrics and returns the structured LLM output.

export const interpretMetrics = async (metrics, providerKey = null) => {
  // Scaffolded LLM Response
  
  if (providerKey) {
    // LLM execution path
    // const response = await fetchLLM(...);
    return {
      whatHappened: "Visibility increased by 14% this week across major platforms.",
      whyItHappened: `The increase is driven primarily by high coverage on ${metrics.topSourceType || 'Reddit'} and improved semantic matching.`,
      businessSignificance: "This indicates stronger community penetration, reducing reliance on paid channels.",
      confidence: "High"
    };
  }

  // Fallback heuristic path if no LLM key
  return {
    whatHappened: `Visibility score is currently ${metrics.visibility || 0}.`,
    whyItHappened: `Calculated from ${metrics.sourceCount || 0} active sources.`,
    businessSignificance: "Baseline tracking established.",
    confidence: "Medium" // LLM-less fallback is always Medium/Low
  };
};
