/**
 * Recommendation Engine
 * Generates data-driven actionable recommendations.
 */

export const generateRecommendations = (context, data) => {
  const recommendations = [];

  if (context === 'dashboard') {
    if (data.totalViews < 5000) {
      recommendations.push("Target underrepresented query clusters to boost community reach.");
    } else {
      recommendations.push("Capitalize on high community reach by linking documentation to active discussions.");
    }
    
    if (data.commentsPublished < data.postsPublished) {
      recommendations.push("Increase direct comment engagement to balance the post-to-comment ratio.");
    }

    if (data.recentTrend && data.recentTrend.length > 0) {
      const avgVis = data.recentTrend.reduce((a,b)=>a+b.llmScore,0)/data.recentTrend.length;
      if (avgVis < 50) {
        recommendations.push("Improve presence in high-opportunity communities; recent visibility trends are below optimal thresholds.");
      }
    }
  } else if (context === 'sov') {
    if (data.brandSov < 40) {
      recommendations.push("Expand visibility in documentation workflows where competitors currently dominate.");
    }
    if (data.topCompetitor) {
      recommendations.push(`Increase content around implementation topics specifically targeting ${data.topCompetitor} alternatives.`);
    }
  }

  // Fallbacks if no specific rules hit
  if (recommendations.length === 0) {
    recommendations.push("Continue publishing technical, highly-structured content across targeted platforms.");
    recommendations.push("Monitor key feature keywords for emerging competitive threats.");
  }

  return recommendations;
};
