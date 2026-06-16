const STOPS = new Set([
  'the', 'is', 'in', 'and', 'to', 'of', 'a', 'for', 'on', 'with',
  'how', 'why', 'what', 'where', 'when', 'does', 'do', 'it', 'my', 'i', 'you', 'are',
]);

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
    (t) => !STOPS.has(t) && t.length > 1,
  );
}

export function queryDocumentSimilarity(baseQuery, variantQuery, doc) {
  const baseTokens = tokenize(baseQuery);
  const variantTokens = tokenize(variantQuery);
  const dTokens = tokenize(doc);
  if (!baseTokens.length || !dTokens.length) return 0;

  const baseMatchCount = baseTokens.filter((bt) =>
    dTokens.some((dt) => dt === bt || (bt.length >= 4 && dt.startsWith(bt))),
  ).length;
  if (baseMatchCount / baseTokens.length < 0.3) return 0;

  let matchCount = 0;
  variantTokens.forEach((vt) => {
    if (dTokens.some((dt) => dt === vt || (vt.length >= 4 && dt.startsWith(vt)))) {
      matchCount += 1;
    }
  });

  const corePhrase = baseTokens.join(' ');
  const exactMatch =
    corePhrase.length > 3 && doc.toLowerCase().includes(corePhrase) ? 0.3 : 0;

  return Math.min(1, (matchCount / variantTokens.length) * 0.7 + exactMatch);
}

export function extractTopicsFromPosts(posts, brandKeywords = []) {
  if (!posts?.length) return [];
  const text = posts.map((p) => `${p.title} ${p.selftext || ''}`).join(' ');
  const knownKeywords = brandKeywords.map((k) => String(k).toLowerCase()).filter(Boolean);
  const counts = {};

  knownKeywords.forEach((kw) => {
    const matches = text.match(new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'));
    if (matches) counts[kw.toUpperCase()] = matches.length;
  });

  const capsMatches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g);
  if (capsMatches) {
    capsMatches.forEach((m) => {
      const clean = m.trim();
      if (!/^(This|The|That|What|How|Why|When|If|It|As|In|On|At)\s/.test(clean)) {
        counts[clean] = (counts[clean] || 0) + 1;
      }
    });
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));
}

export function generateSemanticCluster(baseQuery, brandConfig = {}) {
  const query = baseQuery.toLowerCase().trim();
  let coreSubject = query;
  let context = brandConfig.industry || 'enterprise environments';
  const isComparison = query.includes(' vs ');

  if (query.includes(' with ')) {
    const parts = query.split(' with ');
    coreSubject = parts[0].trim();
    context = parts[1].trim();
  } else if (query.includes(' for ')) {
    const parts = query.split(' for ');
    coreSubject = parts[0].trim();
    context = parts[1].trim();
  } else if (query.includes(' in ')) {
    const parts = query.split(' in ');
    coreSubject = parts[0].trim();
    context = parts[1].trim();
  }

  let subjectAlternative = coreSubject;
  const keywords = brandConfig.keywords || brandConfig.tracked_keywords || [];
  if (keywords.length) subjectAlternative = keywords[0];

  if (isComparison) {
    const p = query.split(' vs ');
    return [
      `differences between ${p[0]} and ${p[1]}`,
      `which is better ${p[0]} or ${p[1]}`,
      `${p[0]} pros and cons compared to ${p[1]}`,
      `migrating from ${p[0]} to ${p[1]}`,
      `top alternatives to ${p[0]} and ${p[1]}`,
      `${p[0]} vs ${p[1]} for ${context}`,
    ];
  }

  return [
    `top ${subjectAlternative} supporting ${context}`,
    `how to implement ${context} in ${coreSubject}`,
    `best practices for ${query}`,
    `${coreSubject} vs alternatives for ${context}`,
    `${context} native ${subjectAlternative}`,
    `troubleshooting ${context} integration in ${coreSubject}`,
  ];
}

export function calculateAvgLLMVisibility(post) {
  const textLengthFactor = Math.min((post.selftext || '').length / 500, 1.5);
  const engagementBase = Math.min((post.score || 0) * 1.5, 50);
  const commentBase = Math.min((post.num_comments || 0) * 2, 30);
  return Math.min(
    98,
    Math.max(2, Math.round((10 + engagementBase + commentBase) * (textLengthFactor < 0.5 ? 0.8 : textLengthFactor))),
  );
}

export function mentionsBrand(text, brandName) {
  if (!text || !brandName) return false;
  const lower = text.toLowerCase();
  const brand = brandName.toLowerCase();
  const short = brand.split('.')[0];
  return lower.includes(brand) || (short.length > 2 && lower.includes(short));
}

export function classifyIntent(queryText) {
  const text = queryText.toLowerCase();
  if (text.includes('how to') || text.includes('what is') || text.includes('tutorial')) {
    return 'Informational';
  }
  if (text.includes('best') || text.includes('vs') || text.includes('compare') || text.includes('alternative')) {
    return 'Commercial Investigation';
  }
  if (text.includes('buy') || text.includes('pricing') || text.includes('discount')) {
    return 'Transactional';
  }
  return 'Navigational';
}
