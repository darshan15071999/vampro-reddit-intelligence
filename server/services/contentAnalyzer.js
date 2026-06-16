import { extractTopicsFromPosts } from '../../shared/semantic.js';
import { searchReddit } from './redditService.js';

const SPAM_PHRASES = [
  'buy now',
  'click here',
  'check out our tool',
  'limited time offer',
  'use my referral',
  'dm me for',
];

const SUBREDDIT_HINTS = {
  devops: ['devops', 'kubernetes', 'docker', 'ci/cd', 'terraform'],
  reactjs: ['react', 'jsx', 'next.js', 'frontend'],
  webdev: ['web', 'javascript', 'css', 'html'],
  programming: ['code', 'algorithm', 'software', 'developer'],
  saas: ['saas', 'startup', 'b2b', 'pricing'],
  technicalwriting: ['documentation', 'docs', 'technical writing', 'api docs'],
  datascience: ['machine learning', 'data', 'ml', 'ai model'],
};

function scoreSubredditFit(content, subreddit, keywords) {
  const text = content.toLowerCase();
  const hints = SUBREDDIT_HINTS[subreddit.replace(/^r\//, '')] || [];
  let score = 0;
  hints.forEach((h) => {
    if (text.includes(h)) score += 15;
  });
  keywords.forEach((kw) => {
    if (text.includes(kw.toLowerCase())) score += 10;
  });
  return score;
}

export function analyzePostContent(postContent, brandConfig = {}) {
  const lower = postContent.toLowerCase();
  const brand = brandConfig.primaryBrand || brandConfig.primary_brand || '';
  let spamScore = 0;

  if (postContent.length < 50) spamScore += 35;
  const linkCount = (postContent.match(/https?:\/\//g) || []).length;
  if (linkCount > 2) spamScore += 25;
  else if (linkCount === 1) spamScore += 10;

  SPAM_PHRASES.forEach((phrase) => {
    if (lower.includes(phrase)) spamScore += 30;
  });

  if (brand && lower.includes(brand.toLowerCase()) && postContent.length < 80) {
    spamScore += 20;
  }

  spamScore = Math.min(100, spamScore);
  const authenticityScore = Math.max(0, 100 - spamScore);

  let critique;
  if (spamScore >= 60) {
    critique =
      'Highly promotional patterns detected. Lead with technical value, reduce links, and disclose brand affiliation transparently.';
  } else if (spamScore >= 35) {
    critique =
      'Moderate risk. Expand technical context and avoid sales language to improve community trust.';
  } else {
    critique =
      'Content appears organic. Ensure brand mentions are contextual and add genuine expertise to the thread.';
  }

  const keywords = [
    ...(brandConfig.keywords || brandConfig.tracked_keywords || []),
    ...(brandConfig.competitors || []),
  ];

  const subredditScores = Object.keys(SUBREDDIT_HINTS)
    .map((sub) => ({
      sub: `r/${sub}`,
      score: scoreSubredditFit(postContent, sub, keywords),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    authenticityScore,
    spamScore,
    critique,
    suggestedSubreddits: subredditScores.map((s) => s.sub),
    methodology: 'Rule-based authenticity scoring + keyword-to-subreddit mapping',
  };
}

export async function generateContentSuggestions(brandConfig, savedQueries, indexedPosts) {
  const topQuery = savedQueries[0]?.text || 'best tools for workflow automation';
  const competitors = brandConfig.competitors || [];
  const topCompetitor = competitors[0] || 'leading competitor';
  const brand = brandConfig.primaryBrand || brandConfig.primary_brand || 'Your Brand';
  const topics = extractTopicsFromPosts(indexedPosts, [
    brand,
    ...(brandConfig.keywords || brandConfig.tracked_keywords || []),
    ...competitors,
  ]);
  const topFeature = topics[0]?.name || 'API integration';

  let liveSubreddits = [];
  try {
    const hits = await searchReddit(topQuery, 10);
    const subs = [...new Set(hits.map((h) => h.subreddit).filter(Boolean))];
    liveSubreddits = subs.slice(0, 3).map((s) => `r/${s}`);
  } catch {
    liveSubreddits = ['r/devops', 'r/SaaS'];
  }

  return [
    {
      type: 'comment',
      sub: liveSubreddits[0] || 'r/devops',
      targetPostTitle: `Migrating away from ${topCompetitor} — need recommendations`,
      queryContext: topQuery,
      draft: `We faced similar scaling issues with ${topCompetitor}. For teams balancing dev docs and PM-friendly editing, ${brand} handled that split well — define your taxonomy before importing.`,
      score: 88,
      reason: `Targets active discussion space (${liveSubreddits[0] || 'r/devops'}) with competitor-intent query overlap.`,
      ruleAdherence: 'Educational tone, no direct links, answers OP pain point first.',
    },
    {
      type: 'post',
      sub: liveSubreddits[1] || 'r/technicalwriting',
      queryContext: topFeature,
      draft: `Lessons learned implementing ${topFeature}\n\n1. Chunking matters more than embedding model choice\n2. We used ${brand} for native versioning\n3. Keep markdown sources clean\n\nHappy to share migration details.`,
      score: 84,
      reason: 'Case-study format performs well in technical communities.',
      ruleAdherence: 'Educational framing with brand as secondary reference.',
    },
    {
      type: 'comment',
      sub: liveSubreddits[2] || 'r/SaaS',
      targetPostTitle: 'What stack do you use for user documentation?',
      queryContext: topQuery,
      draft: `Evaluated several KB platforms last quarter. Notion got messy at scale. We landed on ${brand} for versioning — might be overkill pre-seed but saves headaches later.`,
      score: 80,
      reason: 'Acknowledges trade-offs which increases Reddit trust signals.',
      ruleAdherence: 'Conversational evaluation story, not a pitch.',
    },
  ];
}
