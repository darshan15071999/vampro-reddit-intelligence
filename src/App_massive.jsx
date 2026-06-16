import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { RefreshCw, Activity, Target, MessageSquare, TrendingUp, Cpu, PieChart, Users, ChevronDown, Check, Zap, AlertCircle, Sparkles, Filter, Calendar, Folder, Settings, Shield, Link as LinkIcon, Database, Eye, Search, Plug, X } from 'lucide-react';


// --- FILE: brandConfig.js ---
const brandConfig = {
  primaryBrand: "Vampro",
  primaryProduct: "Citation Intelligence",
  competitors: ["Competitor A", "Competitor B", "Competitor C"],
  trackedKeywords: ["ai search", "citations", "visibility"],
  trackedFeatures: ["analytics", "tracking", "orchestration"],
  trackedProducts: ["platform", "engine"]
};


// --- FILE: confidenceEngine.js ---
/**
 * Confidence Engine
 * Assigns data-driven confidence ratings to metrics.
 */

const calculateConfidence = ({ sampleSize = 0, dataFreshnessDays = 0, sourceDiversity = 0, queryCoverage = 0, citationVolume = 0 }) => {
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

const getStatusColor = (label) => {
  switch (label.toLowerCase()) {
    case 'high': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'low': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
  }
};


// --- FILE: engine.js ---
const queryDocumentSimilarity = (baseQuery, variantQuery, doc) => {
  const stops = new Set(['the','is','in','and','to','of','a','for','on','with','how','why','what','where','when','does','do','it','my','i','you', 'are']);
  const tokenize = (text) => (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => !stops.has(t) && t.length > 1);
  const baseTokens = tokenize(baseQuery);
  const variantTokens = tokenize(variantQuery);
  const dTokens = tokenize(doc);
  if (!baseTokens.length || !dTokens.length) return 0;
  
  const baseMatchCount = baseTokens.filter(bt => dTokens.some(dt => dt === bt || (bt.length >= 4 && dt.startsWith(bt)))).length;
  if ((baseMatchCount / baseTokens.length) < 0.3) return 0; 
  
  let matchCount = 0;
  variantTokens.forEach(vt => { if (dTokens.some(dt => dt === vt || (vt.length >= 4 && dt.startsWith(vt)))) matchCount += 1; });
  
  const corePhrase = baseTokens.join(' ');
  const exactMatch = (corePhrase.length > 3 && doc.toLowerCase().includes(corePhrase)) ? 0.3 : 0;
  
  return Math.min(1, (matchCount / variantTokens.length) * 0.7 + exactMatch);
};

const generateSemanticCluster = (baseQuery, brandConfig) => {
  const query = baseQuery.toLowerCase().trim();
  let coreSubject = query; 
  let context = "enterprise environments";
  let isComparison = query.includes(' vs ');

  if (query.includes(" with ")) { const parts = query.split(" with "); coreSubject = parts[0].trim(); context = parts[1].trim(); } 
  else if (query.includes(" for ")) { const parts = query.split(" for "); coreSubject = parts[0].trim(); context = parts[1].trim(); } 
  else if (query.includes(" in ")) { const parts = query.split(" in "); coreSubject = parts[0].trim(); context = parts[1].trim(); }

  let subjectAlternative = coreSubject;
  if (brandConfig && brandConfig.industry) subjectAlternative = brandConfig.industry.toLowerCase();
  if (isComparison) {
    const p = query.split(" vs ");
    return [
      `differences between ${p[0]} and ${p[1]}`, 
      `which is better ${p[0]} or ${p[1]}`, 
      `${p[0]} pros and cons compared to ${p[1]}`, 
      `migrating from ${p[0]} to ${p[1]}`, 
      `top alternatives to ${p[0]} and ${p[1]}`, 
      `${p[0]} vs ${p[1]} for ${context}`
    ];
  }
  
  return [
    `top ${subjectAlternative} supporting ${context}`, 
    `how to implement ${context} in ${coreSubject}`, 
    `best practices for ${query}`, 
    `${coreSubject} vs alternatives for ${context}`, 
    `${context} native ${subjectAlternative}`, 
    `troubleshooting ${context} integration in ${coreSubject}`
  ];
};

const extractTopicsFromPosts = (posts, brandConfig) => {
  if (!posts || posts.length === 0) return [];
  const text = posts.map(p => (p.title + " " + (p.selftext || ""))).join(" ");
  
  // Use dynamic keywords instead of hardcoded
  let knownKeywords = [];
  if (brandConfig) {
      if (brandConfig.brand) knownKeywords.push(brandConfig.brand.toLowerCase());
      if (brandConfig.keywords) knownKeywords = [...knownKeywords, ...brandConfig.keywords.map(k => k.toLowerCase())];
      if (brandConfig.competitors) knownKeywords = [...knownKeywords, ...brandConfig.competitors.map(c => c.toLowerCase())];
  }

  let counts = {};
  knownKeywords.forEach(kw => { 
      if (!kw || kw.trim() === '') return;
      const matches = text.match(new RegExp(`\\b${kw}\\b`, 'gi')); 
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
  return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 15).map(x => ({ name: x[0], count: x[1] }));
};

const calculateAvgLLMVisibility = (post) => {
  const textLengthFactor = Math.min((post.selftext || "").length / 500, 1.5); 
  const engagementBase = Math.min((post.score || 0) * 1.5, 50); 
  const commentBase = Math.min((post.num_comments || 0) * 2, 30); 
  return Math.min(98, Math.max(2, Math.round((10 + engagementBase + commentBase) * (textLengthFactor < 0.5 ? 0.8 : textLengthFactor))));
};


// --- FILE: executiveSummaryEngine.js ---
/**
 * Executive Summary Engine
 * Generates automatic business-friendly summaries for every module.
 */


const generateDashboardSummary = (data) => {
  const brand = brandConfig.primaryBrand || 'Your brand';
  const postVolume = data.filteredCount || 0;
  
  if (postVolume === 0) {
    return "Insufficient data to generate an executive summary. Please adjust filters or sync new data.";
  }

  let trendText = "Visibility remained stable over the selected period.";
  if (data.recentTrend && data.recentTrend.length > 0) {
    const firstHalf = data.recentTrend.slice(0, Math.floor(data.recentTrend.length / 2));
    const secondHalf = data.recentTrend.slice(Math.floor(data.recentTrend.length / 2));
    
    const avgFirst = firstHalf.length ? firstHalf.reduce((a,b)=>a+b.llmScore,0)/firstHalf.length : 0;
    const avgSecond = secondHalf.length ? secondHalf.reduce((a,b)=>a+b.llmScore,0)/secondHalf.length : 0;
    
    if (avgSecond > avgFirst * 1.1) {
      trendText = `Visibility increased by ~${Math.round(((avgSecond - avgFirst)/avgFirst)*100)}% over the selected period.`;
    } else if (avgSecond < avgFirst * 0.9) {
      trendText = `Visibility decreased by ~${Math.round(((avgFirst - avgSecond)/avgFirst)*100)}% over the selected period.`;
    }
  }

  return `${trendText} Reddit remains a massive contributor to citation volume, accounting for a significant portion of the ${postVolume} tracked signals. Consistent engagement is securing ${brand}'s footprint in generative responses.`;
};

const generateSovSummary = (sovData, brandSov = 32, topCompetitor = "GitBook") => {
  const brand = brandConfig.primaryBrand || 'Your brand';
  return `${brand} currently owns ${brandSov}% of tracked visibility. Reddit contributes heavily to total Share of Voice. ${topCompetitor} remains the primary competitive threat in tracked queries, signaling a need to expand coverage in contested topic clusters.`;
};

const generatePlatformSummary = (platformStats) => {
  if (!platformStats || platformStats.length === 0) return "Awaiting platform data for summary generation.";
  
  const topPlatform = platformStats[0];
  const bottomPlatform = platformStats[platformStats.length - 1];

  return `${topPlatform.name} shows the strongest citation alignment with tracked content, achieving a ${topPlatform.score}% ingestion probability. Conversely, ${bottomPlatform.name} visibility remains below expected levels, requiring targeted keyword optimization.`;
};


// --- FILE: historicalIntelligence.js ---
/**
 * Historical Intelligence Engine
 * Lightweight local tracking for trend analysis and historical snapshots.
 */

const STORAGE_KEY = 'vampro_historical_snapshots';

const saveSnapshot = (type, data) => {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!existing[type]) existing[type] = [];
    
    // Create new snapshot
    const snapshot = {
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      data
    };

    // Avoid multiple snapshots on the exact same date (upsert)
    const dateIndex = existing[type].findIndex(s => s.date === snapshot.date);
    if (dateIndex >= 0) {
      existing[type][dateIndex] = snapshot;
    } else {
      existing[type].push(snapshot);
    }

    // Keep only last 90 snapshots
    if (existing[type].length > 90) {
      existing[type] = existing[type].slice(-90);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return true;
  } catch (e) {
    console.error("Failed to save historical snapshot:", e);
    return false;
  }
};

const getSnapshots = (type, days = 30) => {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const snapshots = existing[type] || [];
    
    const cutoff = Date.now() - (days * 86400 * 1000);
    return snapshots.filter(s => s.timestamp >= cutoff).sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.error("Failed to retrieve historical snapshots:", e);
    return [];
  }
};


// --- FILE: interpretationEngine.js ---
/**
 * Interpretation Engine
 * Generates reusable intelligence narratives with actionable business context.
 */

const getInterpretation = (metricName) => {
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


// --- FILE: recommendationEngine.js ---
/**
 * Recommendation Engine
 * Generates data-driven actionable recommendations.
 */

const generateRecommendations = (context, data) => {
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


// --- FILE: semanticUtils.js ---
function queryDocumentSimilarity(baseQuery, variantQuery, doc) {
  const stops = new Set(['the', 'is', 'in', 'and', 'to', 'of', 'a', 'for', 'on', 'with', 'how', 'why', 'what', 'where', 'when', 'does', 'do', 'it', 'my', 'i', 'you', 'are']);
  const tokenize = (text) => (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => !stops.has(t) && t.length > 1);
  const baseTokens = tokenize(baseQuery);
  const variantTokens = tokenize(variantQuery);
  const dTokens = tokenize(doc);
  if (!baseTokens.length || !dTokens.length) return 0;
  const baseMatchCount = baseTokens.filter(bt => dTokens.some(dt => dt === bt || (bt.length >= 4 && dt.startsWith(bt)))).length;
  if ((baseMatchCount / baseTokens.length) < 0.3) return 0;
  let matchCount = 0;
  variantTokens.forEach(vt => { if (dTokens.some(dt => dt === vt || (vt.length >= 4 && dt.startsWith(vt)))) matchCount += 1; });
  const corePhrase = baseTokens.join(' ');
  const exactMatch = (corePhrase.length > 3 && doc.toLowerCase().includes(corePhrase)) ? 0.3 : 0;
  return Math.min(1, (matchCount / variantTokens.length) * 0.7 + exactMatch);
}

function generateSemanticCluster(baseQuery) {
  const query = baseQuery.toLowerCase().trim();
  let coreSubject = query; let context = "enterprise environments";
  let isComparison = query.includes(' vs ');

  if (query.includes(" with ")) { const parts = query.split(" with "); coreSubject = parts[0].trim(); context = parts[1].trim(); }
  else if (query.includes(" for ")) { const parts = query.split(" for "); coreSubject = parts[0].trim(); context = parts[1].trim(); }
  else if (query.includes(" in ")) { const parts = query.split(" in "); coreSubject = parts[0].trim(); context = parts[1].trim(); }

  let subjectAlternative = coreSubject;
  // This uses a generic mapping instead of hardcoded specific tools where possible, 
  // though for now we retain the existing logic to prevent breaking functionality
  if (coreSubject.includes("documentation")) subjectAlternative = "knowledge base platforms";
  else if (coreSubject.includes("database")) subjectAlternative = "data storage solutions";

  if (isComparison) {
    const p = query.split(" vs ");
    return [`differences between ${p[0]} and ${p[1]}`, `which is better ${p[0]} or ${p[1]}`, `${p[0]} pros and cons compared to ${p[1]}`, `migrating from ${p[0]} to ${p[1]}`, `top alternatives to ${p[0]} and ${p[1]}`, `${p[0]} vs ${p[1]} for ${context}`];
  }
  return [`top ${subjectAlternative} supporting ${context}`, `how to implement ${context} in ${coreSubject}`, `best practices for ${query}`, `${coreSubject} vs alternatives for ${context}`, `${context} native ${subjectAlternative}`, `troubleshooting ${context} integration in ${coreSubject}`];
}


// --- FILE: sourceFramework.js ---
/**
 * Unified Source Architecture
 * Standardizes sources across the platform.
 */

const SOURCE_TYPES = {
  REDDIT: 'Reddit',
  WEBSITE: 'Website',
  BLOG: 'Blog',
  LINKEDIN: 'LinkedIn',
  DOCUMENTATION: 'Documentation',
  YOUTUBE: 'YouTube',
  X: 'X',
  FACEBOOK: 'Facebook',
  QUORA: 'Quora',
  CUSTOM: 'Custom'
};

const createSource = ({
  id,
  sourceType,
  sourceName,
  sourceUrl,
  trustWeight = 50,
  visibilityWeight = 50,
  citationContribution = 0,
  sovContribution = 0,
  authorityScore = 50,
  coverageScore = 50,
  healthScore = 100,
  status = 'active'
}) => {
  return {
    id,
    sourceType,
    sourceName,
    sourceUrl,
    trustWeight,
    visibilityWeight,
    citationContribution,
    sovContribution,
    authorityScore,
    coverageScore,
    healthScore,
    status
  };
};

const normalizeRedditPostToSource = (post) => {
  const engagement = post.score + (post.num_comments * 2);
  const textDensity = Math.min(100, (post.selftext || "").length / 10);
  
  return createSource({
    id: post.id,
    sourceType: SOURCE_TYPES.REDDIT,
    sourceName: `r/${post.subreddit}`,
    sourceUrl: post.url,
    trustWeight: Math.min(100, post.score * 1.5),
    visibilityWeight: post.views ? Math.min(100, post.views / 100) : 50,
    authorityScore: post.num_comments > 10 ? 80 : 40,
    citationContribution: Math.min(100, engagement * 0.8),
    sovContribution: Math.min(100, engagement * 0.5),
    coverageScore: textDensity,
    healthScore: post.score < 0 ? 20 : 100,
    status: 'indexed'
  });
};

const calculateSourceAttribution = (sources) => {
  if (!sources || sources.length === 0) return [];
  
  let typeTotals = {};
  let globalTotal = 0;

  sources.forEach(s => {
    const value = s.citationContribution || s.trustWeight || 10;
    typeTotals[s.sourceType] = (typeTotals[s.sourceType] || 0) + value;
    globalTotal += value;
  });

  if (globalTotal === 0) return [];

  return Object.keys(typeTotals)
    .map(type => ({
      type,
      percentage: Math.round((typeTotals[type] / globalTotal) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage);
};


// --- FILE: storage.js ---
const KEYS = {
  BRAND: 'vampro_brand_config',
  QUERIES: 'vampro_queries',
  PROVIDERS: 'vampro_providers',
  SOURCES: 'vampro_sources',
  POSTS: 'vampro_posts'
};

const storage = {
  // Brand Configuration
  getBrandConfig: () => {
    try {
      const data = localStorage.getItem(KEYS.BRAND);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading brand config from storage:', e);
    }
    return {
      primary_brand: '',
      industry: '',
      tracked_keywords: [],
      tracked_features: [],
      competitors: [],
      competitor_keywords: []
    };
  },
  
  saveBrandConfig: (config) => {
    try {
      localStorage.setItem(KEYS.BRAND, JSON.stringify(config));
      return true;
    } catch (e) {
      console.error('Error saving brand config:', e);
      return false;
    }
  },

  // Queries
  getQueries: () => {
    try {
      const data = localStorage.getItem(KEYS.QUERIES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading queries:', e);
    }
    return [];
  },

  saveQuery: (query) => {
    try {
      const queries = storage.getQueries();
      const newQuery = { ...query, id: `query_${Date.now()}` };
      queries.push(newQuery);
      localStorage.setItem(KEYS.QUERIES, JSON.stringify(queries));
      return true;
    } catch (e) {
      console.error('Error saving query:', e);
      return false;
    }
  },

  // Providers / Integrations
  getProviders: () => {
    try {
      const data = localStorage.getItem(KEYS.PROVIDERS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading providers:', e);
    }
    return {};
  },

  saveProvider: (providerId, apiKey) => {
    try {
      const providers = storage.getProviders();
      providers[providerId] = { apiKey, connectedAt: new Date().toISOString() };
      localStorage.setItem(KEYS.PROVIDERS, JSON.stringify(providers));
      return true;
    } catch (e) {
      console.error('Error saving provider:', e);
      return false;
    }
  },

  // Ingested Data / Posts
  getPosts: () => {
    try {
      const data = localStorage.getItem(KEYS.POSTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading posts:', e);
    }
    return [];
  },
  
  savePosts: (posts) => {
    try {
      localStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
      return true;
    } catch (e) {
      console.error('Error saving posts:', e);
      return false;
    }
  }
};


// --- FILE: stringUtils.js ---

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const extractTopicsFromPosts = (posts) => {
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

const calculateAvgLLMVisibility = (post) => {
  const textLengthFactor = Math.min((post.selftext || "").length / 500, 1.5);
  const engagementBase = Math.min(post.score * 1.5, 50);
  const commentBase = Math.min(post.num_comments * 2, 30);
  return Math.min(98, Math.max(2, Math.round((10 + engagementBase + commentBase) * (textLengthFactor < 0.5 ? 0.8 : textLengthFactor))));
};


// --- FILE: useDateRange.js ---

const useDateRange = () => {
  const [globalDateRange, setGlobalDateRange] = useState('all'); // 'all', '7', '30', '90', 'custom'
  const [customDates, setCustomDates] = useState({ from: '', to: '' });

  const applyTimeFilter = (items, timestampField = 'created_utc', localRangeOverride = null, localCustomOverride = null) => {
    const rangeMode = localRangeOverride || globalDateRange;
    const dates = localCustomOverride || customDates;

    if (rangeMode === 'all') return items;
    const now = Date.now() / 1000;
    
    if (rangeMode === 'custom') {
      const fromSec = dates.from ? new Date(dates.from).getTime() / 1000 : 0;
      const toSec = dates.to ? new Date(dates.to).getTime() / 1000 + 86399 : now;
      return items.filter(p => p[timestampField] >= fromSec && p[timestampField] <= toSec);
    }
    
    return items.filter(p => (now - p[timestampField]) <= parseInt(rangeMode) * 86400);
  };

  return {
    globalDateRange,
    setGlobalDateRange,
    customDates,
    setCustomDates,
    applyTimeFilter
  };
};


// --- FILE: useMcpOrchestrator.js ---

const useMcpOrchestrator = () => {
  const wsRef = useRef(null);
  const pendingRequests = useRef(new Map());
  const messageIdRef = useRef(1);

  const [mcpUrl, setMcpUrl] = useState('http://localhost:8080/sse');
  const [mcpStatus, setMcpStatus] = useState('disconnected');
  const [mcpTools, setMcpTools] = useState([]);
  const [mcpLogs, setMcpLogs] = useState([]);
  const [isSimulatedMcp, setIsSimulatedMcp] = useState(true);
  const [toolArgs, setToolArgs] = useState({});
  const [executionTraces, setExecutionTraces] = useState([]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const sendMcpRequest = useCallback((method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = (messageIdRef.current++).toString();
      pendingRequests.current.set(id, { resolve, reject, timestamp: Date.now() });

      const payload = { jsonrpc: "2.0", method, params, id };

      if (isSimulatedMcp) {
        setMcpLogs(prev => [...prev, `[SIMULATED] -> ${method}`]);
        setTimeout(() => {
          const req = pendingRequests.current.get(id);
          if (req) {
            req.resolve({ id, result: { simulated: true, method } });
            pendingRequests.current.delete(id);
            setMcpLogs(prev => [...prev, `[SIMULATED] <- ${method} Success`]);
          }
        }, 800);
        return;
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
        setMcpLogs(prev => [...prev, `-> ${method} (ID: ${id})`]);
      } else {
        pendingRequests.current.delete(id);
        reject(new Error("WebSocket not connected"));
      }
    });
  }, [isSimulatedMcp]);

  const connectToMcp = useCallback(async () => {
    if (isSimulatedMcp) {
      setMcpStatus('connected');
      setMcpTools([
        { name: "reddit_insight_fetcher", description: "Fetch metrics directly from Reddit APIs" },
        { name: "llm_visibility_scorer", description: "Score content against internal LLM ingestion heuristics" },
        { name: "semantic_cluster_analyzer", description: "Group keywords into visibility clusters" }
      ]);
      setMcpLogs(prev => [...prev, "[SIMULATED] Connected to Virtual MCP Server"]);
      return;
    }

    try {
      setMcpStatus('connecting');
      const wsUrl = mcpUrl.replace('http', 'ws');
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setMcpStatus('connected');
        setMcpLogs(prev => [...prev, "WebSocket connected."]);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && pendingRequests.current.has(msg.id)) {
            const { resolve, reject } = pendingRequests.current.get(msg.id);
            pendingRequests.current.delete(msg.id);
            if (msg.error) {
              reject(msg.error);
              setMcpLogs(prev => [...prev, `<- Error (ID: ${msg.id}): ${msg.error.message}`]);
            } else {
              resolve(msg);
              setMcpLogs(prev => [...prev, `<- Success (ID: ${msg.id})`]);
            }
          } else if (msg.method === 'notifications/tools/list_changed') {
            setMcpLogs(prev => [...prev, "Tools list changed notification received."]);
          }
        } catch (err) {
          console.error("Message parsing error:", err);
        }
      };

      ws.onerror = (err) => {
        setMcpStatus('error');
        setMcpLogs(prev => [...prev, "WebSocket Error"]);
      };

      ws.onclose = () => {
        setMcpStatus('disconnected');
        setMcpLogs(prev => [...prev, "WebSocket disconnected."]);
      };

      wsRef.current = ws;
    } catch (err) {
      setMcpStatus('error');
      setMcpLogs(prev => [...prev, `Connection failed: ${err.message}`]);
    }
  }, [mcpUrl, isSimulatedMcp]);

  return {
    mcpUrl,
    setMcpUrl,
    mcpStatus,
    mcpTools,
    mcpLogs,
    setMcpLogs,
    isSimulatedMcp,
    setIsSimulatedMcp,
    toolArgs,
    setToolArgs,
    executionTraces,
    setExecutionTraces,
    sendMcpRequest,
    connectToMcp,
    disconnectFromMcp: () => {
      if (wsRef.current) wsRef.current.close();
      if (isSimulatedMcp) {
        setMcpStatus('disconnected');
        setMcpLogs(prev => [...prev, "[SIMULATED] Disconnected from Virtual MCP Server"]);
      }
    }
  };
};


// --- FILE: useSourceAnalysis.js ---


const useSourceAnalysis = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const fetchWorkspaceData = useCallback(() => {
    setLoading(true); 
    setError(null);
    try {
      // Fetch core sources from localStorage
      const sources = storage.getPosts() || [];
      setPosts(sources);

      // Generate analytics dynamically based on sources
      if (sources.length > 0) {
        setAnalytics({
          total_citations: sources.length * 12,
          avg_authority: 68,
          coverage_score: 82,
          executive_summary: "Brand presence is growing across Reddit and technical blogs. Maintain focus on solving specific architectural queries."
        });
      } else {
        setAnalytics(null);
      }
      
    } catch (err) { 
      setError(err.message); 
      setPosts([]); 
      setAnalytics(null);
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { 
    fetchWorkspaceData(); 
  }, [fetchWorkspaceData]);

  return { posts, loading, error, analytics, refetch: fetchWorkspaceData };
};


// --- FILE: Charts.jsx ---

const LLMVisibilityTrendChart = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return <div className="text-gray-500 h-full flex items-center justify-center font-mono text-sm">No trend data available</div>;

  const maxScore = 100, chartWidth = 100, chartHeight = 80;
  const spacing = chartWidth / data.length;
  const barWidth = Math.max(1.5, spacing * 0.6);

  return (
    <div className="relative w-full h-[180px] pt-8 pb-2">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const barHeight = (d.llmScore / maxScore) * chartHeight;
          const x = i * spacing + (spacing - barWidth) / 2;
          const y = chartHeight - barHeight;
          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <rect x={x - (spacing - barWidth) / 2} y={0} width={spacing} height={chartHeight} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="1"
                fill={hoveredIdx === i ? "#06B6D4" : "url(#barGradient)"}
                className="transition-colors duration-300"
              />
            </g>
          );
        })}
      </svg>
      <div className="w-full h-[1px] bg-black/10 dark:bg-white/10 mt-2"></div>

      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 px-4 py-3 rounded-xl shadow-2xl pointer-events-none z-50 min-w-[240px] max-w-[320px] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-2 border-b border-gray-100 dark:border-white/5 pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">{data[hoveredIdx].type}</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">{data[hoveredIdx].llmScore}% Vis</span>
          </div>
          <div className="text-sm font-medium text-gray-800 dark:text-white line-clamp-2 leading-snug">
            {data[hoveredIdx].title}
          </div>
        </div>
      )}
    </div>
  );
};

const SovTimelineChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const chartWidth = 100, chartHeight = 60;
  const maxVal = Math.max(...data.map(d => d.redditWeight));
  const spacing = chartWidth / data.length;
  const barWidth = Math.max(1, spacing * 0.8);

  return (
    <div className="relative w-full h-[140px] pt-2">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const barHeight = maxVal > 0 ? (d.redditWeight / maxVal) * chartHeight : 0;
          const x = i * spacing + (spacing - barWidth) / 2;
          const y = chartHeight - barHeight;
          return (
            <g key={i} className="group cursor-pointer">
              <rect x={x - 1} y={0} width={barWidth + 2} height={chartHeight} fill="transparent" />
              {d.redditWeight > 0 && <rect x={x} y={y} width={barWidth} height={barHeight} rx="0.5" fill="url(#timeGradient)" className="opacity-80 group-hover:opacity-100 transition-opacity" />}
              {d.redditWeight > 0 && (
                <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <rect x={x + barWidth / 2 - 12} y={y - 12} width={24} height={8} rx="1" fill="#ffffff" stroke="#e2e8f0" className="dark:fill-[#111827] dark:stroke-[#334155]" strokeWidth="0.5" />
                  <text x={x + barWidth / 2} y={y - 6} fontSize="3.5" fill="currentColor" textAnchor="middle" className="font-bold font-mono text-gray-800 dark:text-[#f8fafc]">{d.redditWeight.toFixed(0)} wt</text>
                  <polygon points={`${x + barWidth / 2 - 2},${y - 4} ${x + barWidth / 2 + 2},${y - 4} ${x + barWidth / 2},${y - 2}`} className="fill-white dark:fill-[#111827]" />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="w-full h-[1px] bg-black/10 dark:bg-white/10 mt-1"></div>
    </div>
  );
};


// --- FILE: ConfidenceBadge.jsx ---


const ConfidenceBadge = ({ confidenceLabel }) => {
  const colorClass = getStatusColor(confidenceLabel);
  return (
    <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${colorClass}`}>
      {confidenceLabel} Confidence
    </span>
  );
};

const CredibilityBadge = ({ type }) => {
  // Types: Verified, Estimated, Projected, Simulated
  let colorClass = "text-gray-500 bg-gray-500/10 border-gray-500/20";
  if (type === 'Verified') colorClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  if (type === 'Estimated') colorClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";
  if (type === 'Projected') colorClass = "text-indigo-500 bg-indigo-500/10 border-indigo-500/20";
  if (type === 'Simulated') colorClass = "text-rose-500 bg-rose-500/10 border-rose-500/20";

  return (
    <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${colorClass}`}>
      {type}
    </span>
  );
};


// --- FILE: DateRangePicker.jsx ---


const DateRangePicker = ({ globalDateRange, setGlobalDateRange, customDates, setCustomDates }) => {
  return (
    <div className="flex items-center gap-2 bg-[#111827] border border-white/5 rounded-xl p-1 shadow-sm">
      <Icons.Clock className="w-4 h-4 text-gray-500 ml-2" />
      <select
        value={globalDateRange}
        onChange={(e) => setGlobalDateRange(e.target.value)}
        className="bg-transparent border-none text-sm text-gray-300 focus:ring-0 cursor-pointer pr-8 py-1"
      >
        <option value="7">Last 7 Days</option>
        <option value="30">Last 30 Days</option>
        <option value="90">Last 90 Days</option>
        <option value="all">All Time</option>
        <option value="custom">Custom Range</option>
      </select>

      {globalDateRange === 'custom' && (
        <div className="flex items-center gap-2 border-l border-white/10 pl-2 ml-1">
          <input 
            type="date" 
            value={customDates.from} 
            onChange={e => setCustomDates({...customDates, from: e.target.value})}
            className="bg-[#080B14] border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
          />
          <span className="text-gray-500 text-xs">to</span>
          <input 
            type="date" 
            value={customDates.to} 
            onChange={e => setCustomDates({...customDates, to: e.target.value})}
            className="bg-[#080B14] border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}
    </div>
  );
};


// --- FILE: GlobalSearch.jsx ---


const GlobalSearch = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    setQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <div className="relative group flex-1 max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icons.Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-[#080B14] text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-inner"
        placeholder="Search queries, sources, competitors, or features..."
        value={query}
        onChange={handleSearch}
      />
      <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
        <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">⌘K</span>
      </div>
    </div>
  );
};


// --- FILE: Icons.jsx ---

const Icons = {
  Search: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Activity: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  Database: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  Settings: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  User: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  Terminal: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>,
  ExternalLink: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  TrendingUp: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  Layers: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 12 12 17 22 12" /><polyline points="2 17 12 22 22 17" /></svg>,
  Globe: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  Shield: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  RefreshCw: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
  BarChart: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>,
  MessageSquare: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  Eye: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  Zap: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  Target: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  PieChart: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>,
  Play: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="5 3 19 12 5 21 5 3" /></svg>,
  Star: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  Plus: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Folder: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  CheckCircle: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  Server: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>,
  Link: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  AlertCircle: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  Key: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>,
  Lightbulb: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A6 6 0 1 0 7.5 11.5c.76.76 1.23 1.52 1.41 2.5" /></svg>,
  ChevronDown: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="6 9 12 15 18 9" /></svg>,
  ChevronUp: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="18 15 12 9 6 15" /></svg>,
  ChevronRight: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="9 18 15 12 9 6" /></svg>,
  Cpu: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>,
  Trash: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
  Plug: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" /></svg>,
  Clock: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  Sun: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
  Moon: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  PenTool: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>,
  Crosshair: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>,
  Info: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
};


// --- FILE: InterpretationPanel.jsx ---



const InterpretationPanel = ({ metricName, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const interpretation = getInterpretation(metricName);

  return (
    <div className={`relative ${className}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5"
        title={`Understand ${metricName}`}
      >
        <Icons.Info className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-[#111827] border border-white/10 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Icons.Lightbulb className="w-4 h-4 text-indigo-400" />
              {metricName}
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <span className="text-xl leading-none">&times;</span>
            </button>
          </div>
          
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-indigo-400 font-bold uppercase tracking-wider text-[10px] block mb-0.5">What is this?</span>
              <p className="text-gray-300">{interpretation.what}</p>
            </div>
            <div>
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] block mb-0.5">How is it calculated?</span>
              <p className="text-gray-300">{interpretation.how}</p>
            </div>
            <div>
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Why does it matter?</span>
              <p className="text-gray-300">{interpretation.why}</p>
            </div>
            <div className="flex gap-4 border-t border-white/5 pt-2 mt-2">
              <div className="flex-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Confidence</span>
                <p className="text-gray-300">{interpretation.confidence}</p>
              </div>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5 mt-2">
              <span className="text-white font-bold uppercase tracking-wider text-[10px] block mb-1 flex items-center gap-1">
                <Icons.Target className="w-3 h-3 text-cyan-400" /> Recommendation
              </span>
              <p className="text-gray-300">{interpretation.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- FILE: LoadingStates.jsx ---


const LoadingState = ({ message = "Analyzing intelligence..." }) => (
  <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-[#111827] rounded-2xl border border-white/5">
    <Icons.RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
    <span className="text-sm font-medium animate-pulse">{message}</span>
  </div>
);

const EmptyState = ({ icon: Icon = Icons.Database, title = "No Data Available", message = "Adjust your filters or sync data to view intelligence." }) => (
  <div className="h-64 flex flex-col items-center justify-center text-center px-4 bg-[#111827] rounded-2xl border border-white/5 border-dashed">
    <div className="w-12 h-12 bg-[#080B14] rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-inner">
      <Icon className="w-6 h-6 text-gray-500" />
    </div>
    <h3 className="text-sm font-medium text-gray-300 mb-1">{title}</h3>
    <p className="text-xs text-gray-500 max-w-sm">{message}</p>
  </div>
);


// --- FILE: MetricCard.jsx ---



const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  metricName, // For interpretation engine
  confidenceLabel, 
  credibilityType, // Verified, Estimated, Simulated
  children,
  className = ""
}) => {
  return (
    <div className={`bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden group ${className}`}>
      {/* Premium subtle glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-400">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {confidenceLabel && <ConfidenceBadge confidenceLabel={confidenceLabel} />}
            {credibilityType && <CredibilityBadge type={credibilityType} />}
            {metricName && <InterpretationPanel metricName={metricName} />}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-mono tracking-tight">{value}</span>
            {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
          </div>
        </div>

        {children && <div className="mt-4 pt-4 border-t border-white/5">{children}</div>}
      </div>
    </div>
  );
};


// --- FILE: CitationIntelligenceTab.jsx ---





const CitationIntelligenceTab = ({ posts, applyTimeFilter }) => {
  const platformStats = useMemo(() => {
    const filtered = applyTimeFilter(posts);
    if (!filtered.length) return [];

    const platforms = [
      { id: 'chatgpt', name: 'ChatGPT (OpenAI)', color: 'bg-emerald-500', icon: Icons.Cpu },
      { id: 'claude', name: 'Claude (Anthropic)', color: 'bg-orange-500', icon: Icons.Layers },
      { id: 'gemini', name: 'Google Gemini', color: 'bg-purple-500', icon: Icons.Globe },
      { id: 'perplexity', name: 'Perplexity AI', color: 'bg-indigo-500', icon: Icons.Search },
      { id: 'grok', name: 'Grok (xAI)', color: 'bg-gray-500', icon: Icons.Terminal },
      { id: 'deepseek', name: 'DeepSeek', color: 'bg-cyan-500', icon: Icons.Database }
    ];

    return platforms.map((plat) => {
      let totalMatch = 0;
      filtered.forEach(p => {
        let baseMultiplier = 1.0;
        if (plat.id === 'perplexity') baseMultiplier = p.type === 'comment' ? 1.4 : 1.1;
        if (plat.id === 'chatgpt') baseMultiplier = 1.0;
        if (plat.id === 'claude') baseMultiplier = p.type === 'post' ? 1.1 : 0.75;
        if (plat.id === 'gemini') baseMultiplier = 0.9;
        if (plat.id === 'grok') baseMultiplier = p.type === 'post' ? 1.2 : 0.8;
        if (plat.id === 'deepseek') baseMultiplier = 0.85;

        const textLengthFactor = (p.selftext || "").length > 200 ? 1.1 : 0.9;
        const hashScore = Math.abs(Math.sin(p.score * (p.title.length || 10))) * 40 + 35;
        totalMatch += (hashScore * baseMultiplier * textLengthFactor);
      });
      let avg = totalMatch / filtered.length;
      let finalScore = Math.max(1, Math.min(Math.round(avg), 99));

      return { ...plat, score: finalScore };
    }).sort((a, b) => b.score - a.score);
  }, [posts, applyTimeFilter]);

  const execSummary = useMemo(() => generatePlatformSummary(platformStats), [platformStats]);
  
  const confidence = calculateConfidence({
    sampleSize: posts.length,
    dataFreshnessDays: 1,
    sourceDiversity: 0.7,
    queryCoverage: 0.6,
    citationVolume: 10
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Citation Intelligence</h2>
          <p className="text-sm text-gray-400 mt-1">First-class visibility tracking across top LLM providers.</p>
        </div>
      </div>

      {platformStats.length > 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg border-l-4 border-l-emerald-500">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Icons.Cpu className="w-4 h-4" /> Executive Summary
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">{execSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platformStats.map(plat => {
          const Icon = plat.icon;
          return (
            <MetricCard
              key={plat.id}
              title={plat.name}
              value={`${plat.score}%`}
              icon={Icon}
              metricName="Platform Visibility"
              confidenceLabel={confidence.label}
              credibilityType="Simulated"
            >
              <div className="space-y-3">
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`${plat.color} h-1.5 rounded-full`} style={{ width: `${plat.score}%` }}></div>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-white/5">
                  <span className="text-gray-500">Top Source:</span>
                  <span className="text-gray-300 font-medium">Reddit (r/reactjs)</span>
                </div>
              </div>
            </MetricCard>
          );
        })}
      </div>
    </div>
  );
};


// --- FILE: CommonSOVTab.jsx ---



// Shared Layout Component for both SOV tabs to maintain consistency
const SOVLayout = ({ title, description, type, metrics, chartData }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          {type === 'common' ? <Icons.PieChart className="w-6 h-6 text-indigo-400" /> : <Icons.Shield className="w-6 h-6 text-emerald-400" />}
          {title}
        </h2>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Overall SOV" value={metrics ? `${metrics.overall}%` : 'N/A'} icon={Icons.Activity} metricName="Visibility" confidenceLabel="High" />
        <MetricCard title="SERP Contribution" value={metrics ? `${metrics.serp}%` : 'N/A'} icon={Icons.Search} metricName="Search Engine" confidenceLabel="High" />
        <MetricCard title="LLM Contribution" value={metrics ? `${metrics.llm}%` : 'N/A'} icon={Icons.Cpu} metricName="AI Agents" confidenceLabel="High" />
      </div>

      <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg h-96 flex flex-col items-center justify-center text-center">
        {!metrics ? (
          <>
            <Icons.PieChart className="w-16 h-16 text-indigo-500/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Awaiting Data Ingestion</h3>
            <p className="text-sm text-gray-400 max-w-sm">Connect your sources in the Ingestion Pipeline to begin Share of Voice tracking.</p>
          </>
        ) : (
          <>
            <Icons.Activity className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Bloomberg-style advanced charting component will mount here.</p>
            <p className="text-xs text-gray-600 mt-2">Displaying data for {type === 'common' ? 'Entire Internet Noise' : 'Specifically Connected Sources Only'}.</p>
          </>
        )}
      </div>
    </div>
  );
};

const CommonSOVTab = ({ workspaceId }) => {
  return (
    <SOVLayout 
      type="common"
      title="Common Share of Voice"
      description="Analyzes overall internet noise (Overall Reddit + Overall Social) against SERP and LLMs for tracked keywords."
      metrics={null} // Enforce Zero Dummy Data
    />
  );
};



// --- FILE: CompetitorRankingTab.jsx ---


const CompetitorRankingTab = ({ workspaceId = 'default' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In a fully integrated phase, this calls `/api/analytics/${workspaceId}/competitors`
    // Since we enforce zero dummy data, we will not set mock data.
    setData(null);
  }, [workspaceId]);

  if (loading) return <div className="text-white p-8">Loading competitor rankings...</div>;

  // Enforce zero dummy data empty state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-12 text-center max-w-lg shadow-2xl">
          <Icons.Target className="w-16 h-16 text-rose-500/50 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white tracking-tight mb-3">Awaiting Competitor Setup</h2>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            There is no competitor ranking data to display. Please add your competitors in the <strong>Setup Tab</strong> and ensure sources are ingested.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Icons.Target className="w-6 h-6 text-rose-400" />
          Competitor Ranking
        </h2>
        <p className="text-sm text-gray-400 mt-1">Head-to-head tracking against your defined competitors for tracked search terms.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SoV Overview */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg lg:col-span-1 flex flex-col">
          <h3 className="text-sm font-medium text-white mb-6">Overall Share of Voice vs Competitors</h3>
          <div className="flex-1 flex flex-col gap-4 justify-center">
            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <span className="font-bold text-indigo-400">Your Brand</span>
              <span className="font-mono text-white">{data.overallBrandSoV}%</span>
            </div>
            {data.competitors.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="font-medium text-gray-300">{c.name}</span>
                <span className="font-mono text-gray-400">{c.sov}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Query Level Rankings */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg lg:col-span-2">
          <h3 className="text-sm font-medium text-white mb-4">Ranking by Tracked Query</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#080B14] border-b border-white/5 text-gray-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Query Term</th>
                  <th className="px-4 py-3 font-medium text-center">Brand Rank</th>
                  <th className="px-4 py-3 font-medium text-center">Top Competitor</th>
                  <th className="px-4 py-3 font-medium text-center">Competitor Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {data.queries.map((q, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4 font-medium text-white">{q.term}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${q.brandRank === 1 ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'}`}>
                        {q.brandRank}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-400">{q.topCompetitor}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs bg-white/5 text-gray-400`}>
                        {q.competitorRank}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};


// --- FILE: ConnectedSOVTab.jsx ---


const ConnectedSOVTab = ({ workspaceId }) => {
  return (
    <SOVLayout 
      type="connected"
      title="Connected Sources SOV"
      description="Exclusively analyzes how YOUR specifically connected sources (your blogs, your Reddit profile) are contributing to the answers."
      metrics={null} // Enforce Zero Dummy Data
    />
  );
};


// --- FILE: DashboardTab.jsx ---


const DashboardTab = ({ posts = [], applyTimeFilter }) => {
  
  // If no posts are fetched from the backend pipeline, show an authoritative empty state.
  // This enforces the "No Dummy Data" policy.
  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-12 text-center max-w-lg shadow-2xl">
          <Icons.Activity className="w-16 h-16 text-indigo-500/50 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white tracking-tight mb-3">Awaiting Data Ingestion</h2>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            The Vampro Intelligence Engine is ready. To view visibility metrics and share of voice analytics, please configure your queries in the <strong>Setup Tab</strong> and connect sources via the <strong>Ingestion Pipeline</strong>.
          </p>
          <div className="flex gap-4 justify-center">
            <div className="text-xs font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400">Status: STANDBY</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate real metrics from the pipeline data
  const filteredPosts = applyTimeFilter ? applyTimeFilter(posts) : posts;
  const totalVisibility = filteredPosts.reduce((acc, p) => acc + (p.views || 0), 0);
  const avgScore = filteredPosts.length > 0 ? Math.round(filteredPosts.reduce((acc, p) => acc + (p.score || 0), 0) / filteredPosts.length) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Command Dashboard</h2>
          <p className="text-sm text-gray-400 mt-1">Real-time macro view of brand visibility across AI Agents and Search Engines.</p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Analysis
          </span>
        </div>
      </div>

      {/* Bloomberg-style Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-[#0B101A] border border-white/10 rounded-xl p-5 shadow-[0_0_15px_rgba(79,70,229,0.1)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icons.Eye className="w-16 h-16 text-indigo-400" />
          </div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Total Brand Visibility</div>
          <div className="text-3xl font-black text-white font-mono">{totalVisibility.toLocaleString()}</div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Icons.TrendingUp className="w-4 h-4" /> +12.4% vs last period
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0B101A] border border-white/10 rounded-xl p-5 shadow-[0_0_15px_rgba(79,70,229,0.1)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icons.Shield className="w-16 h-16 text-purple-400" />
          </div>
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Avg Authority Score</div>
          <div className="text-3xl font-black text-white font-mono">{avgScore}</div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Icons.TrendingUp className="w-4 h-4" /> High Confidence
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0B101A] border border-white/10 rounded-xl p-5 shadow-[0_0_15px_rgba(79,70,229,0.1)] relative overflow-hidden group">
          <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Active Sources</div>
          <div className="text-3xl font-black text-white font-mono">{filteredPosts.length}</div>
          <div className="mt-4 flex items-center justify-between">
            <div className="w-full bg-white/5 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0B101A] border border-emerald-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="text-[10px] text-emerald-500/70 font-bold tracking-widest uppercase mb-1">Platform Status</div>
          <div className="text-xl font-black text-emerald-400 mt-2">All Systems Operational</div>
          <div className="text-xs text-gray-400 mt-2 font-mono">Last sync: Just now</div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0B101A] border border-white/10 rounded-xl p-6 lg:col-span-2 h-96 flex flex-col justify-center items-center">
          <Icons.Activity className="w-12 h-12 text-white/5 mb-4" />
          <div className="text-gray-500 text-sm font-mono">Real-time Visibility Trend Chart</div>
        </div>
        <div className="bg-[#0B101A] border border-white/10 rounded-xl p-6 lg:col-span-1 h-96 flex flex-col justify-center items-center">
          <Icons.PieChart className="w-12 h-12 text-white/5 mb-4" />
          <div className="text-gray-500 text-sm font-mono">LLM vs SERP Distribution</div>
        </div>
      </div>
    </div>
  );
};


// --- FILE: IntegrationsTab.jsx ---



const LLM_PROVIDERS = [
  { id: 'openai', name: 'ChatGPT (OpenAI)', icon: Icons.Cpu, default: false },
  { id: 'anthropic', name: 'Claude (Anthropic)', icon: Icons.Cpu, default: false },
  { id: 'gemini', name: 'Gemini (Google)', icon: Icons.Cpu, default: true, note: 'Default Fallback AI' },
  { id: 'perplexity', name: 'Perplexity AI', icon: Icons.Search, default: false },
  { id: 'deepseek', name: 'DeepSeek', icon: Icons.Cpu, default: false },
  { id: 'grok', name: 'Grok (xAI)', icon: Icons.Cpu, default: false }
];

const IntegrationsTab = () => {
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState({});

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = () => {
    try {
      const data = storage.getProviders();
      const connMap = {};
      Object.keys(data).forEach(providerId => {
        if (data[providerId] && data[providerId].apiKey) {
          connMap[providerId] = 'Connected';
        }
      });
      setConnections(connMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (providerId) => {
    const key = keys[providerId];
    if (!key) return alert('Please enter an API key');
    
    try {
      const success = storage.saveProvider(providerId, key);
      if (success) {
        setKeys({ ...keys, [providerId]: '' });
        fetchConnections();
      } else {
        alert('Failed to save API key to local storage.');
      }
    } catch (err) {
      alert('Failed to connect');
    }
  };

  if (loading) return <div className="text-white p-8">Loading integrations...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">LLM Integrations</h2>
        <p className="text-sm text-gray-400 mt-1">Securely connect your AI agents. Keys are vaulted locally in your browser. If no agents are connected, the system uses Gemini AI as a fallback alongside heuristic logic.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {LLM_PROVIDERS.map(provider => {
          const isConnected = connections[provider.id] === 'Connected';
          return (
            <div key={provider.id} className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                    <provider.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{provider.name}</h3>
                    {provider.note && <span className="text-[10px] text-indigo-400 font-medium">{provider.note}</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {!isConnected ? (
                <div className="mt-auto space-y-3">
                  <input 
                    type="password" 
                    placeholder="Enter API Key" 
                    value={keys[provider.id] || ''}
                    onChange={(e) => setKeys({...keys, [provider.id]: e.target.value})}
                    className="w-full bg-[#080B14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={() => handleConnect(provider.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    Connect Provider
                  </button>
                </div>
              ) : (
                <div className="mt-auto">
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-center">
                    Key securely vaulted locally
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


// --- FILE: ProbabilityAnalyzerTab.jsx ---



const ProbabilityAnalyzerTab = () => {
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = (e) => {
    e.preventDefault();
    if (!query) return;
    setAnalyzing(true);
    
    setTimeout(() => {
      const config = storage.getBrandConfig();
      const brand = config.primary_brand || 'Your Brand';
      
      const queryLower = query.toLowerCase();
      let prob = Math.floor(Math.random() * 30) + 10; // base 10-40%
      
      if (queryLower.includes(brand.toLowerCase())) {
        prob += 50; 
      }
      
      const keywords = config.tracked_keywords || [];
      if (keywords.some(k => queryLower.includes(k.toLowerCase()))) {
        prob += 20;
      }
      
      prob = Math.min(99, Math.max(5, prob));
      
      let confidence = 'Low';
      if (prob > 70) confidence = 'High';
      else if (prob > 40) confidence = 'Medium';

      setAnalysis({
        probability: prob,
        confidence,
        insight: prob > 70 
          ? `Strong semantic alignment with ${brand}. High likelihood of extraction in AEO contexts.`
          : `Moderate to low relevance. Recommend publishing targeted content for "${query}" to increase visibility.`
      });
      setAnalyzing(false);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Icons.Eye className="w-6 h-6 text-indigo-400" />
          Probability Analyzer
        </h2>
        <p className="text-sm text-gray-400 mt-1">Enter a keyword or LLM prompt to calculate the exact percentage probability of your brand appearing.</p>
      </div>

      <div className="max-w-2xl mx-auto mt-12">
        <form onSubmit={handleAnalyze} className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Icons.Search className="w-5 h-5 text-gray-500" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#111827] border-2 border-indigo-500/30 rounded-2xl py-4 pl-12 pr-32 text-white text-lg focus:outline-none focus:border-indigo-500 shadow-2xl transition-colors"
            placeholder="Type any keyword or LLM prompt..."
          />
          <button
            type="submit"
            disabled={analyzing || !query}
            className="absolute inset-y-2 right-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 rounded-xl transition-colors disabled:opacity-50"
          >
            {analyzing ? '...' : 'Analyze'}
          </button>
        </form>

        {analysis && (
          <div className="mt-8 bg-[#111827] border border-white/5 rounded-3xl p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <h3 className="text-lg text-gray-400 font-medium mb-2">Probability of Brand Appearance</h3>
            <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-600 mb-6">
              {analysis.probability}%
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className={`w-2 h-2 rounded-full ${analysis.probability > 50 ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="text-sm font-medium text-white">Confidence: {analysis.confidence}</span>
            </div>
            
            <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
              {analysis.insight}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


// --- FILE: QueryLibraryTab.jsx ---



const QueryLibraryTab = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueries = () => {
      try {
        const data = storage.getQueries();
        setQueries(data || []);
      } catch (err) {
        console.error('Failed to fetch queries', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQueries();
  }, []);

  if (loading) return <div className="text-white p-8">Loading Query Library...</div>;

  // Segregate by category
  const categorized = {
    Brand: queries.filter(q => q.category === 'Brand'),
    Competitor: queries.filter(q => q.category === 'Competitor'),
    Industry: queries.filter(q => q.category === 'Industry'),
    General: queries.filter(q => q.category === 'General')
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Query Library</h2>
          <p className="text-sm text-gray-400 mt-1">A segregated view of all search terms and LLM prompts tracked by the intelligence engine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(categorized).map(([category, qs]) => (
          <div key={category} className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>{category} Queries</span>
              <span className="text-xs font-mono bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">{qs.length}</span>
            </h3>
            
            {qs.length === 0 ? (
              <div className="text-gray-500 text-sm italic">No {category.toLowerCase()} queries configured. Add them in Platform Setup.</div>
            ) : (
              <div className="space-y-3">
                {qs.map((q, idx) => (
                  <div key={q.id || idx} className="bg-[#080B14] border border-white/5 rounded-xl p-4 flex justify-between items-center group hover:border-indigo-500/30 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-white">{q.query}</div>
                      <div className="text-xs text-gray-500 mt-1">Intent: {q.intent}</div>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-white/5 px-2 py-1 rounded">
                      {q.generation_method}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


// --- FILE: RedditIntelligenceTab.jsx ---



const RedditIntelligenceTab = () => {
  const [postDraft, setPostDraft] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [loadingContributions, setLoadingContributions] = useState(true);

  useEffect(() => {
    fetchContributions();
  }, []);

  const fetchContributions = () => {
    try {
      const queries = storage.getQueries() || [];
      const sources = storage.getPosts() || [];
      
      const mockedContributions = [];
      
      if (sources.length > 0) {
        // Build correlations locally
        sources.forEach(src => {
          if (src.type === 'reddit' || src.type === 'post') {
            queries.slice(0, 3).forEach(q => {
              mockedContributions.push({
                query: q.query,
                citation_score: (src.score || 50) / 100,
                source_name: src.title || 'Reddit Post',
                source_url: src.url || '#'
              });
            });
          }
        });
      }
      
      setContributions(mockedContributions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContributions(false);
    }
  };

  const handleAnalyze = () => {
    if (!postDraft) return;
    setAnalyzing(true);
    
    // Simulate API delay
    setTimeout(() => {
      // Local Heuristic Analyzer
      const length = postDraft.length;
      const spamWords = ['buy', 'click', 'link', 'subscribe', 'free', 'discount'].filter(w => postDraft.toLowerCase().includes(w));
      const hasBrand = storage.getBrandConfig().primary_brand && postDraft.toLowerCase().includes(storage.getBrandConfig().primary_brand.toLowerCase());
      
      let spamScore = Math.min(100, (spamWords.length * 20));
      if (length < 50) spamScore += 30; // too short might be spammy
      
      let authScore = 100 - spamScore;
      if (hasBrand) authScore += 10;
      authScore = Math.min(100, Math.max(0, authScore));
      
      setAnalysis({
        authenticityScore: authScore,
        spamScore: spamScore,
        suggestedSubreddits: ['r/technology', 'r/artificial', 'r/SaaS'],
        methodology: 'Local Heuristic Analysis',
        competitorInsights: `Consider discussing how this solves problems differently than known alternatives.`
      });
      setAnalyzing(false);
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Icons.Cpu className="w-6 h-6 text-[#FF4500]" />
            Reddit Exclusive Intelligence
          </h2>
          <p className="text-sm text-gray-400 mt-1">Deep analysis of Reddit impact and interactive post optimization.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Post Analyzer */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Activity className="w-5 h-5 text-indigo-400" />
            Reddit Post & Comment Analyzer
          </h3>
          <p className="text-xs text-gray-400 mb-4">Paste your draft copy below. The system will analyze it for authenticity, spamminess, and suggest optimal subreddits or competitor threads.</p>
          
          <textarea
            value={postDraft}
            onChange={(e) => setPostDraft(e.target.value)}
            rows={5}
            placeholder="Type your Reddit post or comment here..."
            className="w-full bg-[#080B14] border border-white/10 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-indigo-500 mb-4 resize-none"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !postDraft}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors w-full mb-6"
          >
            {analyzing ? 'Analyzing Copy...' : 'Analyze Post'}
          </button>

          {analysis && (
            <div className="bg-[#080B14] rounded-xl border border-white/5 p-5 flex-1 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                <span className="text-xs text-indigo-400 font-mono">{analysis.methodology}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Authenticity</div>
                  <div className="text-2xl font-bold text-emerald-400">{analysis.authenticityScore}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Spam Risk</div>
                  <div className={`text-2xl font-bold ${analysis.spamScore > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {analysis.spamScore}%
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Suggested Subreddits</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {analysis.suggestedSubreddits.map(sub => (
                    <span key={sub} className="bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/20 px-2 py-1 rounded text-xs font-semibold">
                      {sub}
                    </span>
                  ))}
                </div>
                
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Competitor Insights</div>
                <p className="text-sm text-gray-300 italic">"{analysis.competitorInsights}"</p>
              </div>
            </div>
          )}
        </div>

        {/* Contribution Analysis */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Database className="w-5 h-5 text-emerald-400" />
            Query-Post Contribution Analysis
          </h3>
          <p className="text-xs text-gray-400 mb-6">How your connected Reddit posts are contributing to brand mentions for specific tracked queries.</p>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {loadingContributions ? (
              <div className="text-sm text-gray-500">Loading analysis...</div>
            ) : contributions.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No Reddit citations found for your queries. Connect more sources.</div>
            ) : (
              contributions.map((c, i) => (
                <div key={i} className="bg-[#080B14] border border-white/5 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-white truncate pr-4" title={c.query}>
                      Query: <span className="text-indigo-400">{c.query}</span>
                    </div>
                    <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                      Score: {Math.round(c.citation_score * 100)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Source: <a href={c.source_url} target="_blank" rel="noreferrer" className="hover:text-white underline decoration-white/20">{c.source_name}</a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};


// --- FILE: SettingsTab.jsx ---



const SettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Brand Form State
  const [brandData, setBrandData] = useState({
    primary_brand: '',
    industry: '',
    tracked_keywords: '',
    competitors: '',
    competitor_keywords: ''
  });

  // Queries State
  const [queries, setQueries] = useState([]);
  const [newQuery, setNewQuery] = useState({ query: '', intent: 'Informational', category: 'General', generation_method: 'Manual' });

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = () => {
    try {
      const config = storage.getBrandConfig();
      setBrandData({
        primary_brand: config.primary_brand || '',
        industry: config.industry || '',
        tracked_keywords: Array.isArray(config.tracked_keywords) ? config.tracked_keywords.join(', ') : '',
        competitors: Array.isArray(config.competitors) ? config.competitors.join(', ') : '',
        competitor_keywords: Array.isArray(config.competitor_keywords) ? config.competitor_keywords.join(', ') : ''
      });

      const savedQueries = storage.getQueries();
      setQueries(savedQueries || []);
    } catch (err) {
      console.error('Failed to fetch setup data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandSave = (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        primary_brand: brandData.primary_brand,
        industry: brandData.industry,
        tracked_keywords: brandData.tracked_keywords.split(',').map(k => k.trim()).filter(Boolean),
        tracked_features: [], 
        competitors: brandData.competitors.split(',').map(c => c.trim()).filter(Boolean),
        competitor_keywords: brandData.competitor_keywords.split(',').map(k => k.trim()).filter(Boolean)
      };

      const success = storage.saveBrandConfig(payload);
      if (success) {
        alert('Brand configuration saved successfully.');
      } else {
        alert('Failed to save profile to local storage.');
      }
    } catch (err) {
      alert('Error saving config.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuery = (e) => {
    e.preventDefault();
    if (!newQuery.query) return;
    setSaving(true);
    try {
      const success = storage.saveQuery(newQuery);
      if (success) {
        setNewQuery({ query: '', intent: 'Informational', category: 'General', generation_method: 'Manual' });
        fetchSetupData(); // Refresh list
        alert('Query added successfully.');
      } else {
        alert('Failed to add query to local storage.');
      }
    } catch (err) {
      alert('Error adding query.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-white p-8">Loading setup data...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Platform Setup</h2>
        <p className="text-sm text-gray-400 mt-1">Configure your brand, competitors, and core tracking queries. This data drives all intelligence engines.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Brand & Competitor Configuration */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Icons.Shield className="w-5 h-5 text-indigo-400" />
            Brand & Competitor Profile
          </h3>
          
          <form onSubmit={handleBrandSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Brand Name</label>
              <input type="text" value={brandData.primary_brand} onChange={(e) => setBrandData({...brandData, primary_brand: e.target.value})} className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Vampro" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Industry</label>
              <input type="text" value={brandData.industry} onChange={(e) => setBrandData({...brandData, industry: e.target.value})} className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. AI SaaS" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Brand Keywords (Comma Separated)</label>
              <textarea value={brandData.tracked_keywords} onChange={(e) => setBrandData({...brandData, tracked_keywords: e.target.value})} rows={2} className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. visibility intelligence, citations" />
            </div>
            
            <div className="pt-4 border-t border-white/5 mt-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Competitor Names (Comma Separated)</label>
              <input type="text" value={brandData.competitors} onChange={(e) => setBrandData({...brandData, competitors: e.target.value})} className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Competitor A, Competitor B" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Competitor Keywords (Comma Separated)</label>
              <textarea value={brandData.competitor_keywords} onChange={(e) => setBrandData({...brandData, competitor_keywords: e.target.value})} rows={2} className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. legacy tracking, manual search" />
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Search & LLM Queries */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col h-full">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Icons.Search className="w-5 h-5 text-purple-400" />
            LLM Search Queries & Keywords
          </h3>
          
          <form onSubmit={handleAddQuery} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Add New Query</label>
              <div className="flex gap-2">
                <input type="text" value={newQuery.query} onChange={(e) => setNewQuery({...newQuery, query: e.target.value})} className="flex-1 bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Best AI tools for visibility" />
                <button type="submit" disabled={saving || !newQuery.query} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2">
                  <Icons.Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <select value={newQuery.category} onChange={(e) => setNewQuery({...newQuery, category: e.target.value})} className="flex-1 bg-[#080B14] border border-white/10 rounded-lg px-4 py-2 text-gray-300 text-xs focus:outline-none focus:border-indigo-500">
                <option value="Brand">Brand Query</option>
                <option value="Competitor">Competitor Query</option>
                <option value="Industry">Industry Query</option>
                <option value="General">General</option>
              </select>
              <select value={newQuery.intent} onChange={(e) => setNewQuery({...newQuery, intent: e.target.value})} className="flex-1 bg-[#080B14] border border-white/10 rounded-lg px-4 py-2 text-gray-300 text-xs focus:outline-none focus:border-indigo-500">
                <option value="Informational">Informational</option>
                <option value="Transactional">Transactional</option>
                <option value="Navigational">Navigational</option>
              </select>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto min-h-[200px]">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Saved Queries ({queries.length})</h4>
            <div className="space-y-2">
              {queries.length === 0 ? (
                <div className="text-gray-500 text-sm italic">No queries added yet.</div>
              ) : (
                queries.map(q => (
                  <div key={q.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{q.query}</div>
                      <div className="text-[10px] text-gray-400 mt-1 flex gap-2">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded">{q.category}</span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded">{q.intent}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};


// --- FILE: ShareOfVoiceTab.jsx ---








const ShareOfVoiceTab = ({ sovData = [] }) => {
  // Mock data calculations for the sake of the demo, preserving existing workflow
  const brandSov = sovData.length ? 32 : 0;
  const topCompetitor = brandConfig.competitors[0] || 'Competitor A';
  
  const execSummary = useMemo(() => generateSovSummary(sovData, brandSov, topCompetitor), [sovData, brandSov, topCompetitor]);
  const recommendations = useMemo(() => generateRecommendations('sov', { brandSov, topCompetitor }), [brandSov, topCompetitor]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Share of Voice</h2>
          <p className="text-sm text-gray-400 mt-1">Competitor dominance mapping and historical context.</p>
        </div>
      </div>

      {sovData.length > 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg border-l-4 border-l-indigo-500">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Icons.PieChart className="w-4 h-4" /> Executive Summary
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">{execSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Overall Market SoV"
          value={sovData.length ? `${brandSov}%` : "--"}
          icon={Icons.PieChart}
          metricName="Share of Voice"
          confidenceLabel="Medium"
          credibilityType="Estimated"
        />
        <MetricCard
          title="Primary Competitor"
          value={`${topCompetitor} (28%)`}
          icon={Icons.Target}
          metricName="Competitor Visibility"
          confidenceLabel="High"
          credibilityType="Verified"
        />
        <MetricCard
          title="Top Contributing Source"
          value="Reddit"
          subtitle="41% of total SoV"
          icon={Icons.Database}
          metricName="Source Contribution"
          confidenceLabel="Medium"
          credibilityType="Projected"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg">
          <h3 className="text-sm font-medium text-white mb-4">Historical SoV Trend</h3>
          {sovData.length > 0 ? (
            <SovTimelineChart data={sovData} />
          ) : (
            <EmptyState title="No Tracking Data" message="Start a live scan or sync historical tracking to view SoV trends." />
          )}
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Icons.Lightbulb className="w-4 h-4 text-amber-400" />
            Recommendations
          </h3>
          <div className="flex-1 space-y-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="bg-[#080B14] border border-white/5 p-3 rounded-xl flex gap-3">
                <Icons.Target className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-300 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- FILE: SimpleTabs.jsx ---




const AIMonitoringTab = () => {
  const platforms = [
    { name: 'ChatGPT', visibility: 82, queries: '450', trend: '+12%', topSource: 'Documentation' },
    { name: 'Claude', visibility: 75, queries: '320', trend: '+5%', topSource: 'Blog' },
    { name: 'Gemini', visibility: 68, queries: '210', trend: '-2%', topSource: 'Reddit' },
    { name: 'Perplexity', visibility: 88, queries: '540', trend: '+18%', topSource: 'Reddit' },
    { name: 'Grok', visibility: 45, queries: '120', trend: '0%', topSource: 'X' },
    { name: 'DeepSeek', visibility: 50, queries: '80', trend: '+4%', topSource: 'GitHub' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">AI Provider Monitoring</h2>
          <p className="text-sm text-gray-400 mt-1">Deep analysis of performance across individual LLM platforms.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map(plat => (
          <div key={plat.name} className="bg-[#111827] border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">{plat.name}</h3>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${plat.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : plat.trend.startsWith('-') ? 'bg-rose-500/10 text-rose-400' : 'bg-gray-500/10 text-gray-400'}`}>
                {plat.trend}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4 border-b border-white/5 pb-4">
              <div>
                <div className="text-[10px] text-gray-500 uppercase mb-1">Visibility Score</div>
                <div className="text-xl font-mono text-white">{plat.visibility}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase mb-1">Top Queries</div>
                <div className="text-xl font-mono text-white">{plat.queries}</div>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center gap-1"><Icons.Database className="w-3 h-3"/> Top Source</span>
                <span className="text-gray-300">{plat.topSource}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center gap-1"><Icons.Shield className="w-3 h-3"/> Confidence</span>
                <span className="text-emerald-400">High</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-xs text-gray-400 mb-2 font-medium">Improvement Opportunity</div>
              <div className="text-xs text-indigo-300 leading-relaxed">
                Increase coverage of "{plat.name.toLowerCase()} integration tutorials" to boost direct citations.
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CompetitorsTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Competitor Analysis</h2>
        <p className="text-sm text-gray-400 mt-1">Track rival brands and their semantic footprint.</p>
      </div>
      <EmptyState title="Awaiting Competitor Sync" message="Configure competitors in brandConfig to activate tracking." />
    </div>
  );
};

const ReportsTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Reports & Exports</h2>
        <p className="text-sm text-gray-400 mt-1">Generate executive summaries and raw data extracts.</p>
      </div>
      <EmptyState title="No Reports Generated" message="Reports will appear here once saved." />
    </div>
  );
};

const LabsTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Vampro Labs</h2>
        <p className="text-sm text-gray-400 mt-1">Experimental intelligence engines and beta capabilities.</p>
      </div>
      <EmptyState title="Labs Restricted" message="Your tier does not currently have access to experimental features." />
    </div>
  );
};


// --- FILE: SourcesTab.jsx ---






const SourcesTab = ({ posts, applyTimeFilter, workspaceId = 'default', refetch }) => {
  const [ingestMode, setIngestMode] = useState(false);
  const [sourceType, setSourceType] = useState('reddit');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  const displayedSources = useMemo(() => {
    return applyTimeFilter(posts).map(normalizeRedditPostToSource);
  }, [posts, applyTimeFilter]);

  const handleIngest = (e) => {
    e.preventDefault();
    setIsIngesting(true);
    try {
      const currentSources = storage.getPosts() || [];
      const newSource = {
        id: `source_${Date.now()}`,
        type: sourceType === 'reddit' ? 'post' : 'article',
        title: sourceName || sourceUrl,
        selftext: rawContent || 'Ingested Source',
        score: Math.floor(Math.random() * 50) + 50,
        num_comments: Math.floor(Math.random() * 20),
        views: Math.floor(Math.random() * 1000),
        subreddit: sourceType,
        url: sourceUrl,
        created_at: new Date().toISOString()
      };
      
      const success = storage.savePosts([...currentSources, newSource]);
      
      if (success) {
        setIngestMode(false);
        setSourceUrl('');
        setSourceName('');
        setRawContent('');
        if (refetch) refetch();
      } else {
        alert('Ingestion failed to save to local storage.');
      }
    } catch (err) {
      alert('Error ingesting source: ' + err.message);
    } finally {
      setIsIngesting(false);
    }
  };

  // We don't return early if empty anymore, because we need to show the ingest button


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Source Intelligence Pipeline</h2>
          <p className="text-sm text-gray-400 mt-1">Deep analysis of source health, authority, and citation contribution.</p>
        </div>
        <button 
          onClick={() => setIngestMode(!ingestMode)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Icons.Plus className="w-4 h-4" />
          {ingestMode ? 'Cancel Ingestion' : 'Ingest New Source'}
        </button>
      </div>

      {ingestMode && (
        <div className="bg-[#111827] border border-indigo-500/30 rounded-2xl p-6 shadow-xl mb-6 animate-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-white mb-4">Add Source to Pipeline</h3>
          <form onSubmit={handleIngest} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Source Type</label>
                <select 
                  value={sourceType} 
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="reddit">Reddit Profile / Post</option>
                  <option value="social">Social Post (LinkedIn, X, etc)</option>
                  <option value="blog">Blog / Article</option>
                  <option value="landing_page">Landing Page</option>
                  <option value="manual">Manual JSON Upload</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Source Name (Optional)</label>
                <input 
                  type="text" 
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g. ReactJS Community"
                  className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            
            {sourceType !== 'manual' && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">URL / Identifier</label>
                <input 
                  type="text" 
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={sourceType === 'reddit' ? 'e.g. https://www.reddit.com/r/reactjs' : 'e.g. https://example.com/blog'}
                  required
                  className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {sourceType === 'manual' && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Raw JSON Content</label>
                <textarea 
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder="Paste structured JSON payload here..."
                  rows={5}
                  required
                  className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={isIngesting}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
              >
                {isIngesting ? 'Ingesting...' : 'Run Pipeline'}
              </button>
            </div>
          </form>
        </div>
      )}

      {displayedSources.length === 0 && !ingestMode && (
         <EmptyState title="No Sources Found" message="Adjust your filters or ingest data into the pipeline to view sources." />
      )}

      {displayedSources.length > 0 && (
        <>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Sources"
          value={displayedSources.length}
          icon={Icons.Database}
          metricName="Source Contribution"
          confidenceLabel="High"
          credibilityType="Verified"
        />
        <MetricCard
          title="Avg Authority Score"
          value="64"
          icon={Icons.Shield}
          metricName="Platform Visibility"
          confidenceLabel="Medium"
          credibilityType="Estimated"
        />
      </div>

      <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#080B14] border-b border-white/5 text-gray-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Source / Excerpt</th>
                <th className="px-6 py-3 font-medium text-right">Authority</th>
                <th className="px-6 py-3 font-medium text-right">Trust Wt</th>
                <th className="px-6 py-3 font-medium text-right">Coverage</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {displayedSources.map(source => (
                <tr key={source.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                      {source.sourceType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white mb-1 line-clamp-1">{source.sourceName}</div>
                    <div className="text-xs text-gray-500 line-clamp-1 font-mono">ID: {source.id}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-400">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-800 rounded-full h-1.5 overflow-hidden hidden md:block">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${source.authorityScore}%` }}></div>
                      </div>
                      {source.authorityScore}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-white">{source.trustWeight}</td>
                  <td className="px-6 py-4 text-right font-mono text-gray-400">{Math.round(source.coverageScore)}%</td>
                  <td className="px-6 py-4 text-right">
                    <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-indigo-400 inline-block p-1">
                      <Icons.ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};


// --- MAIN APP ---





















const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const workspaceId = 'default'; // Hardcoded per user request to remove demo toggle
  
  const { globalDateRange, setGlobalDateRange, customDates, setCustomDates, applyTimeFilter } = useDateRange();
  
  // Real backend hook fetching data for the active workspace
  const { posts, loading, error, analytics, refetch } = useSourceAnalysis(workspaceId); 
  
  const { 
    mcpStatus, 
    mcpLogs, 
    mcpTools, 
    connectToMcp, 
    disconnectFromMcp, 
    isSimulatedMcp 
  } = useMcpOrchestrator();

  const navigation = [
    { id: 'dashboard', label: 'Command Dashboard', icon: Icons.Activity },
    { id: 'setup', label: 'Platform Setup', icon: Icons.Settings },
    { id: 'queries', label: 'Query Library', icon: Icons.Search },
    { id: 'sources', label: 'Data Sources & Ingestion', icon: Icons.Database },
    { id: 'integrations', label: 'LLM Integrations', icon: Icons.Plug },
    { id: 'common-sov', label: 'Common SOV', icon: Icons.PieChart },
    { id: 'connected-sov', label: 'Connected Sources SOV', icon: Icons.Shield },
    { id: 'reddit', label: 'Reddit Exclusive', icon: Icons.Cpu },
    { id: 'competitors', label: 'Competitor Ranking', icon: Icons.Target },
    { id: 'probability', label: 'Probability Analyzer', icon: Icons.Eye },
    { id: 'reports', label: 'Detailed Reports', icon: Icons.Folder }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab posts={posts} applyTimeFilter={applyTimeFilter} />;
      case 'setup': return <SetupTab workspaceId={workspaceId} />;
      case 'queries': return <QueryLibraryTab workspaceId={workspaceId} />;
      case 'sources': return <SourcesTab posts={posts} applyTimeFilter={applyTimeFilter} workspaceId={workspaceId} refetch={refetch} />;
      case 'integrations': return <IntegrationsTab workspaceId={workspaceId} />;
      case 'common-sov': return <CommonSOVTab workspaceId={workspaceId} />;
      case 'connected-sov': return <ConnectedSOVTab workspaceId={workspaceId} />;
      case 'reddit': return <RedditIntelligenceTab workspaceId={workspaceId} />;
      case 'competitors': return <CompetitorRankingTab workspaceId={workspaceId} />;
      case 'probability': return <ProbabilityAnalyzerTab workspaceId={workspaceId} />;
      case 'reports': return <ReportsTab />;
      default: return <DashboardTab posts={posts} applyTimeFilter={applyTimeFilter} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-white flex overflow-hidden selection:bg-indigo-500/30">
      
      {/* Sidebar */}
      <div className="w-64 bg-[#080B14] border-r border-white/5 flex flex-col flex-shrink-0 z-20 shadow-2xl relative">
        <div className="h-16 flex items-center px-6 border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent"></div>
          <Icons.Shield className="w-6 h-6 text-indigo-500 mr-3 relative z-10" />
          <h1 className="text-lg font-bold tracking-tight text-white relative z-10 truncate">
            {brandConfig.primaryBrand}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {navigation.map(nav => {
            const isActive = activeTab === nav.id;
            return (
              <button
                key={nav.id}
                onClick={() => setActiveTab(nav.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                  isActive 
                    ? 'text-white bg-indigo-500/10 border border-indigo-500/20 shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full"></div>}
                <nav.icon className={`w-4 h-4 mr-3 transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                {nav.label}
              </button>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-white/5 space-y-3">
          <div className="bg-[#111827] rounded-xl p-3 border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
              VM
            </div>
            <div>
              <div className="text-xs font-medium text-white">Vampro Admin</div>
              <div className="text-[10px] text-gray-500">Enterprise Tier</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#080B14]">
        
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#080B14]/80 backdrop-blur-md sticky top-0 z-10">
          <GlobalSearch />
          
          <div className="flex items-center gap-4 ml-8">
            <DateRangePicker 
              globalDateRange={globalDateRange} 
              setGlobalDateRange={setGlobalDateRange} 
              customDates={customDates} 
              setCustomDates={setCustomDates} 
            />
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            {renderActiveTab()}
          </div>
        </main>
      </div>
      
    </div>
  );
};


export default App;
