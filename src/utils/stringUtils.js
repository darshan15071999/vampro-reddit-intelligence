import { brandConfig } from '../constants/brandConfig';

export const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const extractTopicsFromPosts = (posts) => {
  if (!posts || posts.length === 0) return [];
  const text = posts.map(p => (p.title + " " + (p.selftext || ""))).join(" ");
  
  // Use dynamically provided keywords from brandConfig along with base tech keywords
  const knownKeywords = [
    'mcp', 'rag', 'llm', 'chatbot', 'workflow', 'api', 'sso', 'markdown', 'mermaid', 'analytics', 'search', 'versioning', 'integration', 'migration',
    ...(brandConfig.trackedKeywords || []),
    ...(brandConfig.trackedFeatures || []),
    ...(brandConfig.competitors || []),
    brandConfig.primaryBrand,
    brandConfig.primaryProduct
  ].filter(Boolean);

  let counts = {};
  knownKeywords.forEach(kw => {
    // Escape keyword for regex, and run case-insensitive match
    const escapedKw = kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const matches = text.match(new RegExp(`\\b${escapedKw}\\b`, 'gi'));
    if (matches) counts[kw.toUpperCase()] = matches.length;
  });

  const capsMatches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g);
  if (capsMatches) {
    capsMatches.forEach(m => {
      const clean = m.trim();
      if (!/^(This|The|That|What|How|Why|When|If|It|As|In|On|At)\s/.test(clean)) {
        counts[clean] = (counts[clean] || 0) + 1;
      }
    });
  }
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(x => ({ name: x[0], count: x[1] }));
};

export const calculateAvgLLMVisibility = (post) => {
  const textLengthFactor = Math.min((post.selftext || "").length / 500, 1.5);
  const engagementBase = Math.min(post.score * 1.5, 50);
  const commentBase = Math.min(post.num_comments * 2, 30);
  return Math.min(98, Math.max(2, Math.round((10 + engagementBase + commentBase) * (textLengthFactor < 0.5 ? 0.8 : textLengthFactor))));
};
