import { calculateAvgLLMVisibility, queryDocumentSimilarity } from '../../shared/semantic.js';

const PLATFORM_WEIGHTS = {
  perplexity: {
    commentBoost: 1.25,
    postBoost: 1.05,
    label: 'Perplexity AI',
    rationale: (post, score) =>
      `Perplexity favors community-validated sources. This ${post.type} scores ${score}% based on engagement (${post.score} upvotes, ${post.num_comments} comments) and semantic depth.`,
  },
  chatgpt: {
    commentBoost: 0.95,
    postBoost: 1.1,
    label: 'ChatGPT (OpenAI)',
    rationale: (post, score) =>
      `ChatGPT weighting reflects keyword density and structure. This ${post.type} achieved ${score}% based on content length and topical overlap potential.`,
  },
  claude: {
    commentBoost: 0.85,
    postBoost: 1.15,
    label: 'Claude (Anthropic)',
    rationale: (post, score) =>
      `Claude indexes long-form structured text. This ${post.type} scored ${score}% from content depth and formatting signals.`,
  },
  gemini: {
    commentBoost: 0.9,
    postBoost: 1.0,
    label: 'Google Gemini',
    rationale: (post, score) =>
      `Gemini grounding favors recent, high-engagement web sources. This ${post.type} scored ${score}% from engagement and recency proxies.`,
  },
};

export function scorePostForPlatform(post, platformId, queryText = '') {
  const config = PLATFORM_WEIGHTS[platformId] || PLATFORM_WEIGHTS.chatgpt;
  const base = calculateAvgLLMVisibility(post);
  const typeBoost = post.type === 'comment' ? config.commentBoost : config.postBoost;
  const lengthFactor = (post.selftext || '').length > 200 ? 1.08 : 0.92;

  let queryBoost = 1;
  if (queryText) {
    const sim = queryDocumentSimilarity(queryText, queryText, `${post.title} ${post.selftext}`);
    queryBoost = 0.85 + sim * 0.3;
  }

  const finalScore = Math.max(1, Math.min(99, Math.round(base * typeBoost * lengthFactor * queryBoost)));

  return {
    id: platformId,
    name: config.label,
    score: finalScore,
    insight: config.rationale(post, finalScore),
    methodology: 'Engagement + content depth + query similarity (deterministic)',
  };
}

export function scorePostsForAllPlatforms(posts, queryText = '') {
  const platforms = Object.keys(PLATFORM_WEIGHTS);
  if (!posts.length) return [];

  return platforms.map((platformId) => {
    const scores = posts.map((p) => scorePostForPlatform(p, platformId, queryText));
    const avg = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);
    const top = scores.sort((a, b) => b.score - a.score)[0];
    return {
      ...top,
      score: avg,
    };
  }).sort((a, b) => b.score - a.score);
}
