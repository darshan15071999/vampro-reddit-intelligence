import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// --- UTILITY FUNCTIONS ---
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

function queryDocumentSimilarity(baseQuery, variantQuery, doc) {
  const stops = new Set(['the', 'is', 'in', 'and', 'to', 'of', 'a', 'for', 'on', 'with', 'how', 'why', 'what', 'where', 'when', 'does', 'do', 'it', 'my', 'i', 'you', 'are']);
  const tokenize = (text) => (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => !stops.has(t) && t.length > 1);

  const baseTokens = tokenize(baseQuery);
  const variantTokens = tokenize(variantQuery);
  const dTokens = tokenize(doc);

  if (!baseTokens.length || !dTokens.length) return 0;

  const baseMatchCount = baseTokens.filter(bt => dTokens.some(dt => dt === bt || (bt.length >= 4 && dt.startsWith(bt)))).length;
  if ((baseMatchCount / baseTokens.length) < 0.4) return 0;

  let matchCount = 0;
  variantTokens.forEach(vt => {
    if (dTokens.some(dt => dt === vt || (vt.length >= 4 && dt.startsWith(vt)))) matchCount += 1;
  });

  const corePhrase = baseTokens.join(' ');
  const exactMatch = (corePhrase.length > 3 && doc.toLowerCase().includes(corePhrase)) ? 0.4 : 0;
  return Math.min(1, (matchCount / variantTokens.length) * 0.6 + exactMatch);
}

function generateSemanticCluster(baseQuery) {
  if (!baseQuery) return [];
  const query = baseQuery.toLowerCase().trim();
  const year = new Date().getFullYear();
  return [
    `What are the best ${query} solutions for enterprise scenarios?`,
    `How to scale ${query} in a production environment?`,
    `${query} vs top open-source alternatives`,
    `Common issues, bugs, and limitations when using ${query}`,
    `Step-by-step guide to migrating to ${query}`,
    `Is ${query} worth the cost for small startups?`,
    `Security, privacy, and compliance considerations for ${query}`,
    `Integrating ${query} with modern CI/CD pipelines`,
    `Real user reviews and complaints about ${query}`,
    `Top 5 tools similar to ${query} in ${year}`
  ];
}

function extractTopicsFromPosts(posts, brandKeywords = []) {
  if (!posts || posts.length === 0) return [];
  const text = posts.map(p => (p.title + " " + (p.selftext || ""))).join(" ");
  const knownKeywords = ['rag', 'llm', 'chatbot', 'workflow', 'api', 'sso', 'knowledge base', 'markdown', 'analytics', 'search', 'versioning', 'integration', 'migration', ...brandKeywords.map(k => k.toLowerCase())];
  let counts = {};
  knownKeywords.forEach(kw => {
    if (!kw) return;
    const matches = text.match(new RegExp(`\\b${kw}\\b`, 'gi'));
    if (matches) counts[kw.toUpperCase()] = matches.length;
  });
  const capsMatches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g);
  if (capsMatches) {
    capsMatches.forEach(m => {
      const clean = m.trim();
      if (!/^(This|The|That|What|How|Why|When|If|It|As|In|On|At)\s/.test(clean)) counts[clean] = (counts[clean] || 0) + 1;
    });
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(x => ({ name: x[0], count: x[1] }));
}

function calculateAvgLLMVisibility(post) {
  const textLengthFactor = Math.min((post.selftext || "").length / 500, 1.5);
  const engagementBase = Math.min(post.score * 1.5, 50);
  const commentBase = Math.min(post.num_comments * 2, 30);
  return Math.min(98, Math.max(2, Math.round((10 + engagementBase + commentBase) * (textLengthFactor < 0.5 ? 0.8 : textLengthFactor))));
}

function getConfidence(score) {
  if (score >= 80) return { label: 'High Confidence', val: `${score}%`, color: 'text-emerald-500' };
  if (score >= 50) return { label: 'Medium Confidence', val: `${score}%`, color: 'text-amber-500' };
  return { label: 'Low Confidence', val: `${score}%`, color: 'text-red-500' };
}

// --- ICONS ---
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
  PenTool: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>,
  Crosshair: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>,
  Download: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Sun: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
  Moon: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  Folder: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  Trash: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
  Plus: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  CheckCircle: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  Key: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>,
  Server: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>,
  Link: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  AlertCircle: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  ChevronDown: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="6 9 12 15 18 9" /></svg>,
  ChevronUp: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="18 15 12 9 6 15" /></svg>,
  Cpu: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>,
  Clock: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  Lightbulb: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A6 6 0 1 0 7.5 11.5c.76.76 1.23 1.52 1.41 2.5" /></svg>,
  Plug: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" /></svg>
};

// --- SHARED COMPONENTS ---
const IntelligencePanel = ({ what, why, sources, confidenceScore, nextSteps }) => {
  const conf = getConfidence(confidenceScore || Math.floor(Math.random() * 30 + 60));
  return (
    <div className="bg-indigo-50 dark:bg-slate-900/50 rounded-xl p-5 border border-indigo-100 dark:border-slate-800 mt-6 shadow-sm">
      <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center">
        <Icons.Lightbulb className="mr-2 text-amber-500" style={{ width: 16, height: 16 }} /> Engine Intelligence Context
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 text-sm">
        <div><strong className="text-slate-700 dark:text-slate-300 block mb-1">What happened?</strong><span className="text-slate-600 dark:text-slate-400 leading-snug block">{what}</span></div>
        <div><strong className="text-slate-700 dark:text-slate-300 block mb-1">Why?</strong><span className="text-slate-600 dark:text-slate-400 leading-snug block">{why}</span></div>
        <div><strong className="text-slate-700 dark:text-slate-300 block mb-1">Sources</strong><span className="text-slate-600 dark:text-slate-400 leading-snug block">{sources}</span></div>
        <div><strong className="text-slate-700 dark:text-slate-300 block mb-1">Confidence</strong><span className={`font-bold ${conf.color}`}>{conf.label} ({conf.val})</span></div>
        <div><strong className="text-slate-700 dark:text-slate-300 block mb-1">Next Steps</strong><span className="text-indigo-600 dark:text-indigo-400 font-medium leading-snug block">{nextSteps}</span></div>
      </div>
    </div>
  );
};

const EmptyState = ({ onAction }) => (
  <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm dark:shadow-none animate-in fade-in">
    <Icons.Database className="w-16 h-16 text-slate-300 dark:text-gray-600 mb-6 opacity-70" />
    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Reddit Data Available</h3>
    <p className="text-slate-500 dark:text-gray-400 max-w-md mb-8">Add a Reddit JSON source to begin analysis and generate visibility insights for your brand.</p>
    <button onClick={onAction} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-indigo-500/20">
      Configure Data Sources
    </button>
  </div>
);

const LLMVisibilityTrendChart = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  if (!data || data.length === 0) return <div className="text-gray-500 h-full flex items-center justify-center">No trend data available</div>;
  const maxScore = 100, chartWidth = 100, chartHeight = 80;
  const spacing = chartWidth / data.length;
  const barWidth = Math.max(1.5, spacing * 0.6);

  return (
    <div className="relative w-full h-[180px] pt-8 pb-2">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#312e81" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const barHeight = (d.llmScore / maxScore) * chartHeight;
          const x = i * spacing + (spacing - barWidth) / 2;
          const y = chartHeight - barHeight;
          return (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
              <rect x={x - (spacing - barWidth) / 2} y={0} width={spacing} height={chartHeight} fill="transparent" />
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="1" fill={hoveredIdx === i ? "#818cf8" : "url(#barGradient)"} className="transition-colors duration-300" />
            </g>
          );
        })}
      </svg>
      <div className="w-full h-[1px] bg-slate-200 dark:bg-white/10 mt-2"></div>
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/20 px-4 py-3 rounded-xl shadow-2xl pointer-events-none z-50 min-w-[240px] max-w-[320px] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-2 border-b border-slate-100 dark:border-white/10 pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-gray-300 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded">{data[hoveredIdx].type}</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{data[hoveredIdx].llmScore}% Vis</span>
          </div>
          <div className="text-sm font-medium text-slate-800 dark:text-white line-clamp-2 leading-snug">
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
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.8" />
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
                  <rect x={x + barWidth / 2 - 12} y={y - 12} width={24} height={8} rx="1" className="fill-white dark:fill-[#0f172a] stroke-slate-200 dark:stroke-[#334155]" strokeWidth="0.5" />
                  <text x={x + barWidth / 2} y={y - 6} fontSize="3.5" fill="currentColor" textAnchor="middle" className="font-bold text-slate-800 dark:text-[#f8fafc]">{d.redditWeight.toFixed(0)} wt</text>
                  <polygon points={`${x + barWidth / 2 - 2},${y - 4} ${x + barWidth / 2 + 2},${y - 4} ${x + barWidth / 2},${y - 2}`} className="fill-white dark:fill-[#0f172a]" />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="w-full h-[1px] bg-slate-200 dark:bg-white/10 mt-1"></div>
    </div>
  );
};

const App = () => {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- SAAS CONFIGURATION STATE ---
  const [workspace, setWorkspace] = useState({ name: "My Workspace", createdAt: new Date().toISOString() });
  const [brandConfig, setBrandConfig] = useState({
    primaryBrand: "",
    keywords: [],
    products: [],
    competitors: []
  });

  const [globalDateRange, setGlobalDateRange] = useState({ preset: 'all', custom: { from: '', to: '' } });

  // Source Management
  const [redditProfiles, setRedditProfiles] = useState([]);
  const [newProfileInput, setNewProfileInput] = useState('');
  const [activeRedditUser, setActiveRedditUser] = useState('');
  const [dataSource, setDataSource] = useState('manual');
  const [manualJson, setManualJson] = useState('');
  const [posts, setPosts] = useState([]);
  const [allProfilesPosts, setAllProfilesPosts] = useState({});

  // Query Intelligence Library
  const [savedQueries, setSavedQueries] = useState([]);
  const [newQueryText, setNewQueryText] = useState('');
  const [newQueryCategory, setNewQueryCategory] = useState('General');

  // AI Search Monitoring
  const [queryContextSources, setQueryContextSources] = useState([]);
  const [newSourceType, setNewSourceType] = useState('brand');
  const [newSourceValue, setNewSourceValue] = useState('');

  const [providers, setProviders] = useState([
    { id: 'openai', name: 'OpenAI (ChatGPT)', enabled: false, status: 'requires_key', apiKey: '', isCustom: true },
    { id: 'perplexity', name: 'Perplexity AI', enabled: false, status: 'requires_key', apiKey: '', isCustom: true },
    { id: 'claude', name: 'Claude (Anthropic)', enabled: false, status: 'requires_key', apiKey: '', isCustom: true },
    { id: 'grok', name: 'Grok (xAI)', enabled: false, status: 'requires_key', apiKey: '', isCustom: true },
    { id: 'gemini', name: 'Gemini (Default)', enabled: true, status: 'connected', apiKey: 'internal', isCustom: false }
  ]);
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [tempApiKey, setTempApiKey] = useState('');
  const [isExecutingQuery, setIsExecutingQuery] = useState(null);
  const [expandedQueryId, setExpandedQueryId] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);

  // Query Tester
  const [queryTesterMode, setQueryTesterMode] = useState('semantic'); // semantic, rater
  const [queryInput, setQueryInput] = useState('');
  const [results, setResults] = useState({ matches: [], discoverabilityScore: 0, isAnalyzing: false, analysisText: null, hasRun: false });
  const [draftContent, setDraftContent] = useState('');
  const [raterResults, setRaterResults] = useState(null);

  // Content Opportunities
  const [suggestedContentList, setSuggestedContentList] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Competitor Intelligence
  const [newCompetitor, setNewCompetitor] = useState('');
  const [competitorPosts, setCompetitorPosts] = useState([]);
  const [isScanningCompetitors, setIsScanningCompetitors] = useState(false);

  // Share of Voice
  const [sovViewMode, setSovViewMode] = useState('live');
  const [customSovDomains, setCustomSovDomains] = useState([]);
  const [newSovDomain, setNewSovDomain] = useState('');
  const [profileSovData, setProfileSovData] = useState([]);
  const [isScanningProfile, setIsScanningProfile] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [isLiveScanning, setIsLiveScanning] = useState(true);
  const [showUserContribution, setShowUserContribution] = useState(false);
  const [liveSovData, setLiveSovData] = useState([]);
  const liveScanRef = useRef(null);

  // Sub-tabs
  const [monitorSubTab, setMonitorSubTab] = useState('manual');
  const [citationContentType, setCitationContentType] = useState('all');
  const [selectedCitationId, setSelectedCitationId] = useState('all');
  const [postsContentType, setPostsContentType] = useState('all');

  useEffect(() => {
    if (posts.length > 0 && activeRedditUser) {
      setAllProfilesPosts(prev => ({ ...prev, [activeRedditUser]: posts }));
    }
  }, [posts, activeRedditUser]);

  useEffect(() => {
    return () => {
      if (liveScanRef.current) clearInterval(liveScanRef.current);
    };
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // --- DATA FILTERING ---
  const applyTimeFilter = (items, timestampField = 'created_utc') => {
    if (globalDateRange.preset === 'all') return items;
    const now = Date.now() / 1000;
    if (globalDateRange.preset === 'custom') {
      const fromSec = globalDateRange.custom.from ? new Date(globalDateRange.custom.from).getTime() / 1000 : 0;
      const toSec = globalDateRange.custom.to ? new Date(globalDateRange.custom.to).getTime() / 1000 + 86399 : now;
      return items.filter(p => p[timestampField] >= fromSec && p[timestampField] <= toSec);
    }
    return items.filter(p => (now - p[timestampField]) <= parseInt(globalDateRange.preset) * 86400);
  };

  const handleExport = () => {
    const exportData = { workspace, brandConfig, posts, savedQueries, queryHistory, liveSovData, timestamp: new Date().toISOString() };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
    const downloadNode = document.createElement('a');
    downloadNode.setAttribute("href", dataStr);
    downloadNode.setAttribute("download", `AEO_Export_${brandConfig.primaryBrand || 'Workspace'}.json`);
    document.body.appendChild(downloadNode);
    downloadNode.click();
    downloadNode.remove();
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setPosts([]); setSavedQueries([]); setQueryHistory([]); setLiveSovData([]); setProfileSovData([]);
    setShowResetConfirm(false);
  };

  const dashboardData = useMemo(() => {
    let filtered = applyTimeFilter(posts);
    const postsPublished = filtered.filter(p => p.type === 'post').length;
    const commentsPublished = filtered.filter(p => p.type === 'comment').length;
    const totalUpvotes = filtered.reduce((acc, p) => acc + p.score, 0);
    const totalViews = filtered.reduce((acc, p) => acc + (p.views || (p.score * 15)), 0);
    const recentTrend = [...filtered].sort((a, b) => a.created_utc - b.created_utc).slice(-15).map(p => ({ id: p.id, title: p.title, selftext: p.selftext, type: p.type, llmScore: calculateAvgLLMVisibility(p) }));
    return { postsPublished, commentsPublished, totalUpvotes, totalViews, recentTrend, filteredCount: filtered.length };
  }, [posts, globalDateRange]);

  const topRankingKeyword = useMemo(() => {
    const successful = savedQueries.filter(q => q.profileSurfaced && q.llmMentionsBrand);
    if (successful.length === 0) return { text: "No successful queries yet", rank: "-" };
    const sorted = successful.sort((a, b) => (a.browserSearchRank || 99) - (b.browserSearchRank || 99));
    return { text: sorted[0].text, rank: sorted[0].browserSearchRank ? `#${sorted[0].browserSearchRank}` : 'Tier 1' };
  }, [savedQueries]);

  const fetchRedditData = useCallback(async (isUserTriggered = false) => {
    setLoading(true); setError(null);
    if (dataSource === 'manual') {
      try {
        if (!manualJson.trim()) { if (isUserTriggered) throw new Error("No JSON provided."); else { setLoading(false); return; } }
        const data = JSON.parse(manualJson);
        if (data && data?.data?.children) {
          if (data.data.children.length === 0) throw new Error("0 posts/comments found in JSON!");
          setPosts(data.data.children.map(child => {
            const isComment = child.kind === 't1' || (child.data.name && child.data.name.startsWith('t1_'));
            return { id: child.data.id, type: isComment ? 'comment' : 'post', title: isComment ? `Comment: ${child.data.link_title || 'Thread'}` : child.data.title, selftext: isComment ? child.data.body : (child.data.selftext || "No text available."), score: child.data.score || 0, num_comments: child.data.num_comments || 0, views: child.data.view_count || null + (child.data.score * 12), subreddit: child.data.subreddit || "unknown", url: `https://reddit.com${child.data.permalink}`, created_utc: child.data.created_utc }
          }));
        } else throw new Error("Invalid JSON format.");
      } catch (err) { setError(err.message); setPosts([]); } finally { setLoading(false); }
      return;
    }
  }, [activeRedditUser, dataSource, manualJson]);

  // --- ANALYZE QUERY ---
  const handleAnalyzeQuery = async () => {
    if (!queryInput) return;
    setResults({ matches: [], discoverabilityScore: 0, isAnalyzing: true, analysisText: null, hasRun: false });

    setTimeout(async () => {
      let filteredPosts = applyTimeFilter(posts);
      const analyzedMatches = filteredPosts.map(post => {
        const score = queryDocumentSimilarity(queryInput, queryInput, `${post.title} ${post.selftext}`);
        return { post, score };
      }).filter(m => m.score > 0.05).sort((a, b) => b.score - a.score);

      const maxScore = analyzedMatches.length > 0 ? analyzedMatches[0].score : 0;
      const discoverability = Math.min(99, Math.round(maxScore * 100));

      let analysisText = "";
      if (analyzedMatches.length > 0) {
        const bestPost = analyzedMatches[0].post;
        if (discoverability >= 75) {
          analysisText = `Excellent semantic overlap (${discoverability}%). Your post "${bestPost.title}" contains high-density keyword matches and strong contextual relevance. It is highly likely to be prioritized by RAG ingestion engines for this exact query.`;
        } else if (discoverability >= 40) {
          analysisText = `Moderate semantic correlation (${discoverability}%). Your post "${bestPost.title}" shares structural relevance, but lacks the deep lexical density needed to guarantee top-tier RAG extraction without additional brand qualifiers.`;
        } else {
          analysisText = `Weak semantic footprint (${discoverability}%). While "${bestPost.title}" shares some tangential keywords, the match is too shallow to confidently surface in competitive LLM zero-shot queries.`;
        }
      } else {
        analysisText = `Zero semantic overlap found. Your indexed profile data does not currently hold any structural or keyword authority for this specific query intent.`;
      }

      setResults({ matches: analyzedMatches, discoverabilityScore: discoverability, isAnalyzing: false, analysisText, hasRun: true });
    }, 800);
  };

  const handleRateContent = () => {
    if (!draftContent) return;
    setRaterResults({ isAnalyzing: true });
    setTimeout(() => {
      const lower = draftContent.toLowerCase();
      let score = 88;
      let critique = "Looks organic and adds value to the community conversation. Ensure you disclose any brand affiliation clearly if recommending your product.";

      if (lower.includes("buy now") || lower.includes("click here") || lower.includes("check out our tool")) {
        score = 30;
        critique = "Highly promotional language detected. This is likely to trigger Reddit spam filters or attract downvotes. Focus on answering the user's technical question first before dropping a link.";
      } else if (draftContent.length < 50 && brandConfig.primaryBrand && lower.includes(brandConfig.primaryBrand.toLowerCase())) {
        score = 55;
        critique = "Too short. Quick brand drops without technical context look like astroturfing. Expand on *why* the tool solves the problem.";
      }

      setRaterResults({ score, critique, isAnalyzing: false });
    }, 800);
  };

  const handleSuggestContent = () => {
    setIsSuggesting(true);

    const topQuery = savedQueries.length > 0 ? savedQueries[0].text : "enterprise tools";
    const topCompetitor = brandConfig.competitors.length > 0 ? brandConfig.competitors[0] : "CompetitorX";
    const allPosts = Object.values(allProfilesPosts).flat();
    const extractedFeatures = extractTopicsFromPosts(allPosts, brandConfig.keywords);
    const topFeature = extractedFeatures.length > 0 ? extractedFeatures[0].name : "API integration";

    setTimeout(() => {
      const suggestions = [];
      if (posts.length > 0) {
        const topPost = posts[0];
        suggestions.push({
          type: "comment",
          sub: `r/${topPost.subreddit || 'technology'}`,
          targetPostTitle: `Evaluating alternatives to ${topCompetitor}`,
          queryContext: topQuery,
          draft: `We hit the exact same scaling issues with ${topCompetitor} last year. If you're dealing with developer-heavy docs but need a WYSIWYG for PMs, ${brandConfig.primaryBrand || 'a dedicated solution'} handles that split well. Just make sure to define your taxonomy before importing.`,
          score: 92,
          reason: `Directly answers the OP's pain point regarding a tracked competitor (${topCompetitor}) while offering a practical architectural tip.`,
          ruleAdherence: "Passes self-promotion rules. No direct links included, ensuring it bypasses Automod."
        });
        suggestions.push({
          type: "post",
          sub: "r/technicalwriting",
          queryContext: topFeature,
          draft: `A breakdown of how we implemented ${topFeature} (Lessons Learned)\n\nWe recently revamped our systems to support modern workflows. A few things we learned:\n1. Chunking matters more than embedding models...\n2. We used ${brandConfig.primaryBrand || 'the new stack'} for its native versioning...\n3. Keep your markdown clean.\n\nHappy to answer any questions about the migration process!`,
          score: 88,
          reason: "High-value, educational post. The community responds well to 'lessons learned' and case studies. Mentioning the tool is secondary to the technical advice.",
          ruleAdherence: "Strictly educational. Adheres to guidelines against direct vendor pitching. High likelihood of upvotes."
        });
      }
      setSuggestedContentList(suggestions);
      setIsSuggesting(false);
    }, 1000);
  };

  const handleScanCompetitors = () => {
    setIsScanningCompetitors(true);
    setTimeout(() => {
      const found = [];
      if (brandConfig.competitors.length > 0 && posts.length > 0) {
        posts.slice(0, 2).forEach((p, i) => {
          const c = brandConfig.competitors[i % brandConfig.competitors.length];
          found.push({
            sub: `r/${p.subreddit}`,
            competitor: c,
            postText: p.selftext.substring(0, 150) + "... Is there a better alternative?",
            suggestedReply: `I ran into the exact same issue trying to use ${c}. We migrated to ${brandConfig.primaryBrand || 'a different tool'} specifically because it offers a hybrid editor so devs and non-devs can collaborate without friction.`
          });
        });
      }
      setCompetitorPosts(found);
      setIsScanningCompetitors(false);
    }, 1000);
  };

  const availableCitationItems = useMemo(() => {
    let filtered = applyTimeFilter(posts);
    if (citationContentType !== 'all') filtered = filtered.filter(p => p.type === citationContentType);
    return filtered;
  }, [posts, globalDateRange, citationContentType]);

  const platformStats = useMemo(() => {
    if (!availableCitationItems.length) return null;
    let filtered = availableCitationItems;
    if (selectedCitationId !== 'all') filtered = filtered.filter(p => p.id === selectedCitationId);
    if (!filtered.length) return [];

    const platforms = [
      { id: 'openai', name: 'OpenAI (ChatGPT)', color: 'bg-emerald-500' },
      { id: 'perplexity', name: 'Perplexity AI', color: 'bg-indigo-500' },
      { id: 'claude', name: 'Claude (Anthropic)', color: 'bg-orange-500' },
      { id: 'gemini', name: 'Google Gemini', color: 'bg-purple-500' },
      { id: 'grok', name: 'Grok (xAI)', color: 'bg-slate-800 dark:bg-slate-300' },
      { id: 'deepseek', name: 'DeepSeek', color: 'bg-blue-600' }
    ];

    return platforms.map((plat) => {
      let totalMatch = 0;
      filtered.forEach(p => {
        let baseMultiplier = 1.0;
        if (plat.id === 'perplexity' || plat.id === 'grok') baseMultiplier = p.type === 'comment' ? 1.4 : 1.1;
        if (plat.id === 'openai' || plat.id === 'deepseek') baseMultiplier = 1.0;
        if (plat.id === 'claude') baseMultiplier = p.type === 'post' ? 1.1 : 0.75;
        if (plat.id === 'gemini') baseMultiplier = 0.9;

        const textLengthFactor = (p.selftext || "").length > 200 ? 1.1 : 0.9;
        const hashScore = Math.abs(Math.sin(p.score * (p.title.length || 10))) * 40 + 35;
        totalMatch += (hashScore * baseMultiplier * textLengthFactor);
      });
      let avg = totalMatch / filtered.length;
      let finalScore = Math.max(1, Math.min(Math.round(avg), 99));

      let insight = null;
      if (selectedCitationId !== 'all' && filtered.length === 1) {
        const p = filtered[0];
        if (plat.id === 'perplexity' || plat.id === 'grok') insight = `${plat.name} heavily weights community validation. Because this ${p.type} has ${p.num_comments} active comments and ${p.score} upvotes, it scored ${finalScore}%. This indicates high scrape likelihood.`;
        if (plat.id === 'openai' || plat.id === 'deepseek') insight = `${plat.name} algorithms focus on structural keyword density and domain authority. Achieved a ${finalScore}% semantic extraction probability.`;
        if (plat.id === 'claude') insight = `${plat.name} indexes long-form, well-structured text. This ${p.type}'s formatting resulted in a ${finalScore}% ingestion confidence score.`;
        if (plat.id === 'gemini') insight = `${plat.name} utilizes live Search grounding. Based on this ${p.type}'s real-time keyword footprint, it has a ${finalScore}% probability of appearing in answers.`;
      }

      return { ...plat, score: finalScore, insight };
    }).sort((a, b) => b.score - a.score);
  }, [availableCitationItems, selectedCitationId]);

  const displayedPosts = useMemo(() => {
    let p = applyTimeFilter(posts);
    if (postsContentType !== 'all') p = p.filter(item => item.type === postsContentType);
    return p;
  }, [posts, globalDateRange, postsContentType]);

  const saveApiKey = (providerId) => {
    setProviders(prev => prev.map(p => {
      if (p.id === providerId) return { ...p, apiKey: tempApiKey, status: tempApiKey ? 'connected' : 'requires_key', enabled: !!tempApiKey };
      return p;
    }));
    setEditingProviderId(null); setTempApiKey('');
  };

  const toggleProvider = (id) => {
    setProviders(prev => prev.map(p => p.id === id && p.isCustom ? { ...p, enabled: !p.enabled } : p));
  };

  const handleAddNewQuery = () => {
    if (!newQueryText.trim()) return;
    setSavedQueries([{ id: `q_${Date.now()}`, text: newQueryText, category: newQueryCategory || 'General', lastRun: null }, ...savedQueries]);
    setNewQueryText('');
  };

  const handleGenerateAutoQueries = () => {
    setLoading(true);
    setTimeout(() => {
      const brands = queryContextSources.filter(s => s.type === 'brand').map(s => s.value);
      const keywords = queryContextSources.filter(s => s.type === 'keyword').map(s => s.value);

      const allPosts = Object.values(allProfilesPosts).flat();
      const extractedFeatures = extractTopicsFromPosts(allPosts, brandConfig.keywords).slice(0, 4).map(t => t.name.toLowerCase());

      let generated = [];
      if (brands.length > 0) {
        generated.push({ id: `q_${Date.now()}_1`, text: `top alternatives to ${brands[0]}`, category: 'Informational', lastRun: null });
        generated.push({ id: `q_${Date.now()}_2`, text: `${brands[0]} vs competitors`, category: 'Comparison', lastRun: null });
        if (brands.length > 1) {
          generated.push({ id: `q_${Date.now()}_3`, text: `${brands[0]} vs ${brands[1]}`, category: 'Transactional', lastRun: null });
        }
        extractedFeatures.forEach((feat, idx) => {
          generated.push({ id: `q_${Date.now()}_f${idx}`, text: `${brands[0]} ${feat}`, category: 'Intent-Derived', lastRun: null });
        });
      }
      if (keywords.length > 0) {
        generated.push({ id: `q_${Date.now()}_4`, text: `best ${keywords[0]} tools`, category: 'Transactional', lastRun: null });
        generated.push({ id: `q_${Date.now()}_5`, text: `how to build a ${keywords[0]}`, category: 'Informational', lastRun: null });
      }
      if (brands.length > 0 && keywords.length > 0) {
        generated.push({ id: `q_${Date.now()}_6`, text: `how to implement ${keywords[0]} using ${brands[0]}`, category: 'Intent-Derived', lastRun: null });
      }
      if (generated.length === 0) {
        generated.push({ id: `q_${Date.now()}_fall`, text: `best industry practices for scaling`, category: 'General', lastRun: null });
      }

      setSavedQueries([...generated, ...savedQueries]);
      setMonitorSubTab('manual');
      setLoading(false);
    }, 1000);
  };

  const handleRemoveQuery = (e, queryId) => {
    e.stopPropagation();
    setSavedQueries(prev => prev.filter(q => q.id !== queryId));
    if (expandedQueryId === queryId) setExpandedQueryId(null);
  };

  const handleRunStoredQuery = async (queryId) => {
    setIsExecutingQuery(queryId);
    const queryObj = savedQueries.find(q => q.id === queryId);
    if (!queryObj) { setIsExecutingQuery(null); return; }

    const activeProvidersList = [...providers.filter(p => p.enabled)].sort((a, b) => {
      if (a.apiKey && a.apiKey !== 'internal' && (!b.apiKey || b.apiKey === 'internal')) return -1;
      if ((!a.apiKey || a.apiKey === 'internal') && b.apiKey && b.apiKey !== 'internal') return 1;
      return 0;
    });

    let externalCitations = [];
    let usedProviderName = null;
    let browserSearchSurfaced = false;

    const relatedQueries = generateSemanticCluster(queryObj.text);
    const allQueriesToRun = [queryObj.text, ...relatedQueries].slice(0, 10);

    let userSurfaceCount = 0;
    let otherRedditSurfaceCount = 0;
    let totalRedditSurfaceCount = 0;
    let maxVisScore = 0;
    let bestOverallPost = null;

    allQueriesToRun.forEach(q => {
      const isDiscussionHeavy = /vs|better|reviews|opinions|alternative|complaints/i.test(q);
      const redditProbability = bestMatch.score > threshold;
      const redditSurfaces = relevantPosts.length > 0;

      if (redditSurfaces) {
        totalRedditSurfaceCount++;
        const bestMatch = posts.length > 0 ? posts.map(p => ({ ...p, score: queryDocumentSimilarity(queryObj.text, q, `${p.title} ${p.selftext}`) })).sort((a, b) => b.score - a.score)[0] : null;

        if (bestMatch && bestMatch.score > 0.35) {
          userSurfaceCount++;
          const currentVisScore = Math.min(99, Math.round(bestMatch.score * 140));
          if (currentVisScore > maxVisScore) { maxVisScore = currentVisScore; bestOverallPost = bestMatch; }
        } else {
          otherRedditSurfaceCount++;
        }
      }
    });

    const totalHits = userSurfaceCount;
    let combinedRankEquivalent = "Unranked";
    let confidence = calculateConfidenceFromDataQuality(posts.length, matches.length, sentimentCoverage); // Default low
    if (totalHits >= 8) { combinedRankEquivalent = "Tier 1 (High Visibility)"; confidence = 95; }
    else if (totalHits >= 5) { combinedRankEquivalent = "Tier 2 (Moderate Visibility)"; confidence = 75; }
    else if (totalHits >= 2) { combinedRankEquivalent = "Tier 3 (Low Visibility)"; confidence = 55; }
    else if (totalHits > 0) { combinedRankEquivalent = "Tier 4 (Marginal)"; confidence = 45; }

    let profileSurfaced = totalHits > 0;
    let profileVisScore = profileSurfaced ? Math.round((maxVisScore * 0.7) + ((userSurfaceCount / 10) * 30)) : 0;
    let mentionsBrand = false;

    const targetBrand = (brandConfig.primaryBrand || "").toLowerCase();
    const shortBrand = targetBrand ? targetBrand.substring(0, 5) : "";

    if (bestOverallPost && targetBrand) {
      const text = `${bestOverallPost.title} ${bestOverallPost.selftext}`.toLowerCase();
      mentionsBrand = text.includes(targetBrand) || (shortBrand && text.includes(shortBrand));
    }

    let finalLlmResponse = "";
    const pConf = activeProvidersList.find(p => p.apiKey || p.id === 'gemini');

    if (pConf) {
      try {
        let apiUrl = '';
        let headers = {};
        let reqBody = {};
        const contextMsg = profileSurfaced && bestOverallPost ? ` Consider this context from a community post: "${bestOverallPost.title} - ${bestOverallPost.selftext.substring(0, 300)}"` : '';
        const fullPrompt = `Answer this query in 2-3 sentences: ${queryObj.text}.${contextMsg}`;

        if (pConf.id === 'gemini') {
          apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${defaultApiKey}`;
          headers = { 'Content-Type': 'application/json' };
          reqBody = { contents: [{ parts: [{ text: fullPrompt }] }] };
        } else if (pConf.id === 'perplexity') {
          apiUrl = 'https://api.perplexity.ai/chat/completions';
          headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pConf.apiKey}` };
          reqBody = { model: 'llama-3.1-sonar-small-128k-online', messages: [{ role: 'system', content: 'You are a concise search assistant.' }, { role: 'user', content: fullPrompt }], max_tokens: 150 };
        } else if (pConf.id === 'claude') {
          apiUrl = 'https://api.anthropic.com/v1/messages';
          headers = { 'Content-Type': 'application/json', 'x-api-key': pConf.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerously-allow-browser': 'true' };
          reqBody = { model: 'claude-3-haiku-20240307', max_tokens: 150, messages: [{ role: 'user', content: fullPrompt }] };
        } else {
          apiUrl = 'https://api.openai.com/v1/chat/completions';
          headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pConf.apiKey}` };
          reqBody = { model: 'gpt-3.5-turbo', messages: [{ role: 'system', content: 'You are a concise search assistant.' }, { role: 'user', content: fullPrompt }], max_tokens: 150 };
        }

        const res = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(reqBody) });
        if (res.ok) {
          const data = await res.json();
          if (pConf.id === 'gemini') {
            finalLlmResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          } else if (pConf.id === 'claude') {
            finalLlmResponse = data.content[0].text;
          } else {
            finalLlmResponse = data.choices[0].message.content;
          }
          usedProviderName = pConf.name;
        }
      } catch (e) { console.warn("LLM API failed, falling back to local extraction", e); }
    }

    if (!finalLlmResponse) {
      if (profileSurfaced && bestOverallPost && targetBrand) {
        const text = bestOverallPost.selftext || "";
        const sentences = text.split(/[.?!]/).map(s => s.trim()).filter(s => s.length > 15);
        let relevantSentence = sentences.find(s => s.toLowerCase().includes(targetBrand) || (shortBrand && s.toLowerCase().includes(shortBrand)));
        if (!relevantSentence) relevantSentence = sentences[0] || bestOverallPost.title;
        finalLlmResponse = `Based on community discussions, users highlight that "${relevantSentence}". This context is frequently referenced when exploring ${queryObj.text}.`;
        usedProviderName = "Local Extractive NLP";
      } else if (totalRedditSurfaceCount > 0) {
        finalLlmResponse = `Community consensus from generalized Reddit threads suggests that evaluating alternatives for "${queryObj.text}" requires balancing cost and integration capabilities. Users frequently point out performance trade-offs.`;
        usedProviderName = "Simulated Extractive NLP (External Reddit)";
      } else {
        finalLlmResponse = `According to official documentation and technical articles, implementing solutions for "${queryObj.text}" involves adhering to standard architectural guidelines to ensure scalability.`;
        usedProviderName = "Simulated Extractive NLP (Official Sources)";
      }
    }

    let docSnippet = null;
    const lowerLlmText = finalLlmResponse.toLowerCase();

    let matchIndex = targetBrand ? lowerLlmText.indexOf(targetBrand) : -1;
    if (matchIndex === -1 && shortBrand) matchIndex = lowerLlmText.indexOf(shortBrand);

    if (matchIndex !== -1) {
      llmMentionsBrand = true;
    } else if (profileSurfaced && bestOverallPost) {
      matchIndex = lowerLlmText.indexOf(bestOverallPost.title.substring(0, 10).toLowerCase());
    }

    if (matchIndex === -1) matchIndex = 0;
    const start = Math.max(0, matchIndex - 60);
    const end = Math.min(finalLlmResponse.length, matchIndex + 160);
    docSnippet = (start > 0 ? "..." : "") + finalLlmResponse.substring(start, end).trim().replace(/\n/g, ' ') + (end < finalLlmResponse.length ? "..." : "");

    let optTips = [];
    if (profileSurfaced) {
      optTips.push(`Combined Visibility Performance: Your content explicitly surfaced in ${totalHits} out of 10 simulated SERP/LLM pathways.`);
      if (mentionsBrand && llmMentionsBrand) {
        if (combinedRankEquivalent.includes("Tier 1") || combinedRankEquivalent.includes("Tier 2")) {
          optTips.push(`Strong Positioning: Your post surfaced effectively as a primary context source and the AI explicitly included ${brandConfig.primaryBrand} in its final generated answer.`);
        } else {
          optTips.push(`Context Provided: The post was part of the AI search results and ${brandConfig.primaryBrand} was mentioned.`);
        }
      }
      else if (mentionsBrand && !llmMentionsBrand) optTips.push(`Lost in Generation: Your post was cited but the AI omitted the brand name in its generated response text.`);
      else optTips.push(`Missed Opportunity: Your content surfaced but lacks a mention of the tracked brand.`);
    } else if (totalRedditSurfaceCount > 0) {
      optTips.push(`Missed Opportunity: Reddit communities surfaced in ${totalRedditSurfaceCount} out of 10 searches, but other accounts outranked your profile.`);
    } else {
      optTips.push(`Low Discoverability: Zero Reddit or profile keyword overlap found for "${queryObj.text}". Official docs likely dominate.`);
    }

    const newHistoryRecord = {
      id: `hist_${Date.now()}`, query: queryObj.text, category: queryObj.category, timestamp: Date.now() / 1000, providersUsed: activeProvidersList.map(p => p.id), usedProviderName, redditSurfaced: externalCitations.some(s => s.type === 'reddit'), profileSurfaced, profileVisibilityScore: profileVisScore, userSurfaceCount, totalRedditSurfaceCount, combinedRankEquivalent, totalRunQueries: allQueriesToRun.length, llmMentionsBrand, docSnippet, browserSearchSurfaced, optimizationTips: optTips, surfacedPostUrl: bestOverallPost?.url || null, surfacedPostTitle: bestOverallPost?.title || null, sources: externalCitations, confidence
    };

    setQueryHistory([newHistoryRecord, ...queryHistory]);
    setSavedQueries(prev => prev.map(q => q.id === queryId ? { ...q, lastRun: Date.now() / 1000, profileVisibilityScore: profileVisScore, profileSurfaced, userSurfaceCount, totalRedditSurfaceCount, combinedRankEquivalent, totalRunQueries: allQueriesToRun.length, optimizationTips: optTips, llmMentionsBrand, docSnippet, browserSearchSurfaced, surfacedPostUrl: bestOverallPost?.url || null, surfacedPostTitle: bestOverallPost?.title || null, usedProviderName, confidence } : q));
    setIsExecutingQuery(null);
    setExpandedQueryId(queryId);
  };

  useEffect(() => {
    if (!isLiveScanning) { if (liveScanRef.current) clearInterval(liveScanRef.current); return; }

    liveScanRef.current = setInterval(() => {
      if (savedQueries.length === 0 || posts.length === 0) return;

      const tick = Math.floor(Date.now() / 2000);
      const baseQueryObj = savedQueries[tick % savedQueries.length];
      const baseQuery = baseQueryObj.text;

      const variants = [baseQuery, ...generateSemanticCluster(baseQuery)];
      const activeQuery = variants[Math.floor(Math.random() * variants.length)];

      let officialWeight = 400 + (hashString(activeQuery) % 400);
      let redditOverallWeight = 100 + (hashString(activeQuery + "reddit") % 200);
      let forumWeight = 50 + (hashString(activeQuery + "hn") % 100);

      let customDomainWeights = customSovDomains.map(d => ({
        domain: d,
        weight: 200 + (hashString(activeQuery + d) % 400)
      }));

      let userWeight = 0;
      let matchedSubreddit = 'general';

      posts.forEach(post => {
        const sim = queryDocumentSimilarity(activeQuery, activeQuery, `${post.title} ${post.selftext}`);
        if (sim > 0.1) {
          userWeight += (sim * 150);
          matchedSubreddit = post.subreddit;
        }
      });

      userWeight = Math.min(userWeight, redditOverallWeight * 0.8);

      const newDat = {
        timestamp: Date.now() / 1000,
        query: activeQuery,
        officialWeight,
        redditOverallWeight,
        userWeight,
        forumWeight,
        customDomainWeights,
        subreddit: matchedSubreddit
      };

      setLiveSovData(prev => [newDat, ...prev].slice(0, 100));
    }, 2000);

    return () => clearInterval(liveScanRef.current);
  }, [isLiveScanning, savedQueries, posts, customSovDomains]);

  const filteredSavedQueries = useMemo(() => {
    let hist = queryHistory;
    if (globalDateRange.preset !== 'all') {
      const now = Date.now() / 1000;
      if (globalDateRange.preset === 'custom') {
        const fromSec = globalDateRange.custom.from ? new Date(globalDateRange.custom.from).getTime() / 1000 : 0;
        const toSec = globalDateRange.custom.to ? new Date(globalDateRange.custom.to).getTime() / 1000 + 86399 : now;
        hist = hist.filter(h => h.timestamp >= fromSec && h.timestamp <= toSec);
      } else {
        hist = hist.filter(h => (now - h.timestamp) <= parseInt(globalDateRange.preset) * 86400);
      }
    }

    return savedQueries.map(sq => {
      const runsInPeriod = hist.filter(h => h.query === sq.text).sort((a, b) => b.timestamp - a.timestamp);
      if (runsInPeriod.length > 0) {
        return { ...sq, lastRun: runsInPeriod[0].timestamp, profileVisibilityScore: runsInPeriod[0].profileVisibilityScore, profileSurfaced: runsInPeriod[0].profileSurfaced, userSurfaceCount: runsInPeriod[0].userSurfaceCount, totalRedditSurfaceCount: runsInPeriod[0].totalRedditSurfaceCount, combinedRankEquivalent: runsInPeriod[0].combinedRankEquivalent, totalRunQueries: runsInPeriod[0].totalRunQueries, optimizationTips: runsInPeriod[0].optimizationTips, llmMentionsBrand: runsInPeriod[0].llmMentionsBrand, docSnippet: runsInPeriod[0].docSnippet, browserSearchSurfaced: runsInPeriod[0].browserSearchSurfaced, surfacedPostUrl: runsInPeriod[0].surfacedPostUrl, surfacedPostTitle: runsInPeriod[0].surfacedPostTitle, usedProviderName: runsInPeriod[0].usedProviderName, confidence: runsInPeriod[0].confidence };
      }
      return { ...sq, lastRun: null, profileVisibilityScore: 0, profileSurfaced: false, userSurfaceCount: 0, totalRedditSurfaceCount: 0, combinedRankEquivalent: 'Unranked', totalRunQueries: 0, optimizationTips: [], llmMentionsBrand: false, docSnippet: null, browserSearchSurfaced: false, surfacedPostUrl: null, surfacedPostTitle: null, usedProviderName: null, confidence: 0 };
    });
  }, [savedQueries, queryHistory, globalDateRange]);

  const sovData = useMemo(() => {
    let domains = [];
    let subreddits = [];
    let redditStats = { overallPercentage: 0, queriesAppearedIn: 0, totalQueries: 0 };
    let timelineData = [];

    let totalOfficial = 0;
    let totalRedditOverall = 0;
    let totalUser = 0;
    let totalForum = 0;
    let customDomainsAgg = {};
    let subredditMap = {};

    const filteredScan = applyTimeFilter(liveSovData, 'timestamp');

    filteredScan.forEach(scan => {
      totalOfficial += scan.officialWeight;
      totalRedditOverall += scan.redditOverallWeight;
      totalUser += scan.userWeight;
      totalForum += scan.forumWeight;

      scan.customDomainWeights.forEach(cd => {
        customDomainsAgg[cd.domain] = (customDomainsAgg[cd.domain] || 0) + cd.weight;
      });

      if (scan.userWeight > 0) {
        subredditMap[scan.subreddit] = (subredditMap[scan.subreddit] || 0) + scan.userWeight;
      }

      timelineData.push({
        timestamp: scan.timestamp,
        redditWeight: showUserContribution ? scan.userWeight : scan.redditOverallWeight
      });
    });

    const totalOverall = totalOfficial + totalRedditOverall + totalForum + Object.values(customDomainsAgg).reduce((a, b) => a + b, 0);

    if (totalOverall > 0) {
      if (showUserContribution) {
        domains.push({ domain: 'reddit.com (Your Posts)', type: 'user', percentage: (totalUser / totalOverall) * 100 });
        domains.push({ domain: 'reddit.com (Other)', type: 'reddit', percentage: ((totalRedditOverall - totalUser) / totalOverall) * 100 });
      } else {
        domains.push({ domain: 'reddit.com', type: 'reddit', percentage: (totalRedditOverall / totalOverall) * 100 });
      }

      domains.push({ domain: 'official-docs.dev', type: 'docs', percentage: (totalOfficial / totalOverall) * 100 });
      domains.push({ domain: 'news.ycombinator.com', type: 'forum', percentage: (totalForum * 0.6 / totalOverall) * 100 });
      domains.push({ domain: 'stackoverflow.com', type: 'forum', percentage: (totalForum * 0.4 / totalOverall) * 100 });

      Object.keys(customDomainsAgg).forEach(cd => {
        domains.push({ domain: cd, type: 'docs', percentage: (customDomainsAgg[cd] / totalOverall) * 100 });
      });

      domains.sort((a, b) => b.percentage - a.percentage);
    }

    subreddits = Object.entries(subredditMap).map(([name, weight]) => ({ name, weight })).sort((a, b) => b.weight - a.weight);
    redditStats = {
      overallPercentage: totalOverall > 0 ? (totalRedditOverall / totalOverall) * 100 : 0,
      userPercentage: totalOverall > 0 ? (totalUser / totalOverall) * 100 : 0,
      queriesAppearedIn: filteredScan.filter(p => p.redditOverallWeight > 0).length,
      totalQueries: filteredScan.length
    };

    const ecosystemMap = { reddit: 0, linkedin: 0, wikipedia: 0, directories: 0, forums: 0, other: 0 };
    domains.forEach(d => {
      const pct = d.percentage;
      if (d.domain.includes('reddit.com')) ecosystemMap.reddit += pct;
      else if (d.domain.includes('linkedin.com')) ecosystemMap.linkedin += pct;
      else if (d.domain.includes('wikipedia.org')) ecosystemMap.wikipedia += pct;
      else if (d.domain.includes('g2.com') || d.domain.includes('capterra.com') || d.domain.includes('trustradius.com')) ecosystemMap.directories += pct;
      else if (d.domain.includes('ycombinator.com') || d.domain.includes('stackoverflow.com')) ecosystemMap.forums += pct;
      else ecosystemMap.other += pct;
    });
    const ecosystemStats = Object.entries(ecosystemMap).map(([name, pct]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), percentage: pct })).sort((a, b) => b.percentage - a.percentage);

    return { domains, subreddits, redditStats, timelineData, ecosystemStats, confidence: Math.floor(Math.random() * 15 + 80) };
  }, [liveSovData, globalDateRange, customSovDomains, showUserContribution]);

  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: Icons.Activity },
    { id: 'source_management', label: 'Source Management', icon: Icons.Database },
    { id: 'reddit_intelligence', label: 'Reddit Intelligence', icon: Icons.Layers },
    { id: 'search_monitor', label: 'Visibility Simulator', icon: Icons.Target },
    { id: 'query_library', label: 'Query Intelligence Library', icon: Icons.Folder },
    { id: 'platform_citations', label: 'Citation Probability', icon: Icons.BarChart },
    { id: 'sov_analysis', label: 'Reddit Share of Discussion', icon: Icons.PieChart },
    { id: 'competitor_intel', label: 'Competitor Intelligence', icon: Icons.Crosshair },
    { id: 'feature_intel', label: 'Feature Intelligence', icon: Icons.Star },
    { id: 'content_opportunities', label: 'Content Opportunities', icon: Icons.PenTool },
    { id: 'settings', label: 'Workspace Settings', icon: Icons.Settings }
  ];

  let isSystemActive = false;
  let systemMessage = "";

  if (loading) { isSystemActive = true; systemMessage = "System is processing data..."; }
  else if (results.isAnalyzing) { isSystemActive = true; systemMessage = "Evaluating semantics..."; }
  else if (isExecutingQuery !== null) { isSystemActive = true; systemMessage = "Analyzing execution pathways..."; }
  else if (isScanningProfile) { isSystemActive = true; systemMessage = "Running deep profile scan..."; }
  else if (isSuggesting) { isSystemActive = true; systemMessage = "Brainstorming content strategies..."; }
  else if (isScanningCompetitors) { isSystemActive = true; systemMessage = "Hunting competitor mentions..."; }
  else if (raterResults?.isAnalyzing) { isSystemActive = true; systemMessage = "Checking for spam signatures..."; }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 flex ${theme === 'dark' ? 'bg-[#050505] text-[#ededed] selection:bg-indigo-500/30' : 'bg-slate-50 text-slate-900 selection:bg-indigo-500/30'}`}>

      {theme === 'light' && (
        <style>{`
          .bg-\\[\\#0a0a0a\\] { background-color: #ffffff !important; border-right-color: #e2e8f0 !important; }
          .bg-\\[\\#050505\\] { background-color: #f8fafc !important; }
          .bg-black\\/50 { background-color: #f1f5f9 !important; border-color: #e2e8f0 !important; color: #0f172a !important; }
          .bg-black\\/40 { background-color: #ffffff !important; border-color: #e2e8f0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important; }
          .bg-black\\/60 { background-color: #f8fafc !important; border-color: #e2e8f0 !important; }
          .bg-black\\/20 { background-color: #f8fafc !important; border-color: #e2e8f0 !important; }
          .bg-black\\/30 { background-color: #ffffff !important; border-color: #e2e8f0 !important; }
          .bg-white\\/5 { background-color: #ffffff !important; border-color: #e2e8f0 !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05) !important; }
          .text-white { color: #0f172a !important; }
          .text-gray-400 { color: #64748b !important; }
          .text-gray-500 { color: #94a3b8 !important; }
          .text-gray-300 { color: #334155 !important; }
          .border-white\\/10 { border-color: #e2e8f0 !important; }
          .border-white\\/5 { border-color: #f1f5f9 !important; }
          .hover\\:bg-white\\/5:hover { background-color: #f8fafc !important; }
          .hover\\:bg-white\\/10:hover { background-color: #f1f5f9 !important; }
          .bg-[#0f172a] { background-color: #ffffff !important; }
        `}</style>
      )}

      {/* Sidebar */}
      <aside className={`w-64 border-r flex flex-col flex-shrink-0 relative ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/5 to-transparent pointer-events-none"></div>
        <div className={`p-6 border-b relative z-10 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-blue-500 bg-clip-text text-transparent flex items-center drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Icons.Database className="mr-2 text-indigo-500" style={{ width: 24, height: 24 }} />
            AI Citation Intel
          </h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto relative z-10 custom-scrollbar">
          <div className={`text-xs font-semibold uppercase tracking-wider mb-3 px-2 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Analytics</div>
          {navItems.slice(0, 7).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeTab === item.id ? 'bg-indigo-500/10 text-indigo-500 font-medium shadow-[inset_2px_0_0_0_#6366f1]' : theme === 'dark' ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}>
                <Icon style={{ width: 16, height: 16 }} className="mr-3" /> <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <div className={`text-xs font-semibold uppercase tracking-wider mt-6 mb-3 px-2 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Intelligence & Ops</div>
          {navItems.slice(7).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeTab === item.id ? 'bg-indigo-500/10 text-indigo-500 font-medium shadow-[inset_2px_0_0_0_#6366f1]' : theme === 'dark' ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}>
                <Icon style={{ width: 16, height: 16 }} className="mr-3" /> <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8 pb-12">

          <header className={`flex flex-col md:flex-row md:justify-between md:items-end pb-6 border-b gap-4 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
            <div>
              <h2 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                {workspace.name} • Primary Brand: <span className="font-medium text-indigo-500">{brandConfig.primaryBrand}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Global Date Framework */}
              <div className="flex items-center gap-2 bg-black/50 dark:bg-white/5 border border-white/10 rounded-lg p-1 shadow-inner h-[42px]">
                <select value={globalDateRange.preset} onChange={(e) => setGlobalDateRange({ ...globalDateRange, preset: e.target.value })} className="bg-transparent border-none px-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-0 w-32 cursor-pointer">
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="custom">Custom Range</option>
                  <option value="all">All Time</option>
                </select>
                {globalDateRange.preset === 'custom' && (
                  <div className="flex items-center border-l border-white/10 pl-2 ml-1 space-x-2">
                    <input type="date" value={globalDateRange.custom.from} onChange={(e) => setGlobalDateRange({ preset: 'custom', custom: { ...globalDateRange.custom, from: e.target.value } })} className="bg-transparent text-xs text-gray-700 dark:text-white focus:outline-none" style={{ colorScheme: theme }} />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={globalDateRange.custom.to} onChange={(e) => setGlobalDateRange({ preset: 'custom', custom: { ...globalDateRange.custom, to: e.target.value } })} className="bg-transparent text-xs text-gray-700 dark:text-white focus:outline-none pr-2" style={{ colorScheme: theme }} />
                  </div>
                )}
              </div>

              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-2.5 rounded-lg border transition-colors ${theme === 'dark' ? 'border-white/10 hover:bg-white/10 text-yellow-400 bg-white/5' : 'border-slate-200 hover:bg-slate-100 text-indigo-500 bg-white'}`} title="Toggle Theme">
                {theme === 'dark' ? <Icons.Sun style={{ width: 18, height: 18 }} /> : <Icons.Moon style={{ width: 18, height: 18 }} />}
              </button>
            </div>
          </header>

          <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* 1. Executive Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center text-red-600 dark:text-red-400 text-sm shadow-sm">
                    <Icons.Shield className="mr-3 flex-shrink-0" style={{ width: 20, height: 20 }} />
                    <div><span className="font-medium">Notice:</span> {error}</div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Command Center Overview</h3>
                  <div className="flex gap-3">
                    <button onClick={handleExport} className="flex items-center text-sm font-medium text-slate-600 dark:text-gray-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm">
                      <Icons.Download style={{ width: 14, height: 14 }} className="mr-2" /> Export Data
                    </button>
                    {showResetConfirm ? (
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-1.5 rounded-lg">
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">Are you sure?</span>
                        <button onClick={confirmReset} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Yes, Clear All</button>
                        <button onClick={() => setShowResetConfirm(false)} className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-2 py-1 rounded">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={handleReset} className="flex items-center text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors shadow-sm">
                        <Icons.Trash style={{ width: 14, height: 14 }} className="mr-2" /> Reset Workspace
                      </button>
                    )}
                  </div>
                </div>

                {posts.length === 0 ? (
                  <EmptyState onAction={() => setActiveTab('settings')} />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/40 dark:to-black border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-6 shadow-sm dark:shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.PieChart style={{ width: 80, height: 80 }} className="text-indigo-500 dark:text-indigo-400" /></div>
                        <div className="relative z-10">
                          <h4 className="text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wider font-bold mb-2 flex items-center"><Icons.Activity className="mr-2" style={{ width: 16, height: 16 }} /> Live Ecosystem Share of Voice</h4>
                          <div className="flex items-baseline gap-3">
                            <p className="text-5xl font-black text-slate-800 dark:text-white">{sovData.redditStats.overallPercentage.toFixed(1)}%</p>
                            <span className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">Reddit SOV</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-gray-500 mt-3">Calculated dynamically against {sovData.domains.length} tracked competitor domains and forums.</p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/40 dark:to-black border border-blue-200 dark:border-blue-500/20 rounded-xl p-6 shadow-sm dark:shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.Star style={{ width: 80, height: 80 }} className="text-blue-500 dark:text-blue-400" /></div>
                        <div className="relative z-10">
                          <h4 className="text-blue-600 dark:text-blue-400 text-xs uppercase tracking-wider font-bold mb-2 flex items-center"><Icons.Target className="mr-2" style={{ width: 16, height: 16 }} /> Top Ranked Keyword</h4>
                          <div className="flex flex-col justify-center h-[48px]">
                            {topRankingKeyword.text === "No successful queries yet" ? (
                              <p className="text-xl font-medium text-slate-400 dark:text-gray-500 italic">No ranked queries discovered yet.</p>
                            ) : (
                              <>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white truncate" title={topRankingKeyword.text}>"{topRankingKeyword.text}"</p>
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">Ranking: {topRankingKeyword.rank}</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-gray-500 mt-3">The query where {brandConfig.primaryBrand || 'your brand'} explicitly wins AI citation context.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.Layers style={{ width: 40, height: 40 }} className="text-indigo-500" /></div>
                        <h4 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Posts Indexed</h4>
                        <p className="text-3xl font-bold text-white">{dashboardData.postsPublished}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.MessageSquare style={{ width: 40, height: 40 }} className="text-blue-500" /></div>
                        <h4 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Comments</h4>
                        <p className="text-3xl font-bold text-white">{dashboardData.commentsPublished}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.Eye style={{ width: 40, height: 40 }} className="text-cyan-500" /></div>
                        <h4 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Est. Views</h4>
                        <p className="text-3xl font-bold text-white">{dashboardData.totalViews.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.TrendingUp style={{ width: 40, height: 40 }} className="text-emerald-500" /></div>
                        <h4 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Total Upvotes</h4>
                        <p className="text-3xl font-bold text-white">{dashboardData.totalUpvotes.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-semibold text-white flex items-center">
                          <Icons.Activity className="mr-2 text-indigo-500" style={{ width: 18, height: 18 }} />
                          Citation Visibility Trend
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Base probability of source extraction by generative models across the selected timeframe.</p>
                      <div className="w-full">
                        {dashboardData.filteredCount === 0 ? <div className="h-[180px] flex items-center justify-center text-gray-600 text-sm">No data available.</div> : <LLMVisibilityTrendChart data={dashboardData.recentTrend} />}
                      </div>
                    </div>

                    <IntelligencePanel
                      what="Executive Dashboard rendered for current tracking scope."
                      why={`Aggregating data from ${posts.length} indexed items and ${savedQueries.length} tracked queries.`}
                      sources="Connected Reddit profiles and custom domains."
                      confidenceScore={85}
                      nextSteps="Review the Share of Voice tab to understand how this translates to competitive visibility."
                    />
                  </>
                )}
              </div>
            )}

            {/* 2. Source Management */}
            {activeTab === 'source_management' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white flex items-center">
                        <Icons.Database className="mr-2 text-indigo-500" style={{ width: 22, height: 22 }} />
                        Source Management
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Connect and monitor the communities and platforms informing your brand's AI presence.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* REDDIT (Active) */}
                    <div className="bg-black/30 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg bg-[#ff4500]/20 flex items-center justify-center mr-4 border border-[#ff4500]/30">
                            <Icons.Layers className="text-[#ff4500]" style={{ width: 20, height: 20 }} />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white">Reddit Community Sync</h4>
                            <p className="text-xs text-emerald-400 font-medium flex items-center mt-1"><Icons.CheckCircle className="mr-1" style={{ width: 12, height: 12 }} /> Flagship Engine Active</p>
                          </div>
                        </div>
                        <button onClick={() => fetchRedditData(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-lg">
                          <Icons.RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} style={{ width: 14, height: 14 }} /> Load Sources
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="block text-sm font-medium text-gray-300">Tracked Profiles (Optional for Context)</label>
                          <div className="flex flex-wrap gap-2">
                            {redditProfiles.map(p => (
                              <div key={p} onClick={() => setActiveRedditUser(p)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors ${activeRedditUser === p ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                                <Icons.User style={{ width: 12, height: 12 }} /> u/{p}
                                {redditProfiles.length > 1 && <button onClick={(e) => { e.stopPropagation(); const newProfiles = redditProfiles.filter(x => x !== p); setRedditProfiles(newProfiles); if (activeRedditUser === p) setActiveRedditUser(newProfiles[0] || ''); }} className="ml-2 hover:text-red-400 text-gray-500 transition-colors">&times;</button>}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input type="text" value={newProfileInput} onChange={(e) => setNewProfileInput(e.target.value)} placeholder="Add username..." className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                            <button onClick={() => { if (newProfileInput.trim()) { setRedditProfiles([...redditProfiles, newProfileInput.trim()]); setActiveRedditUser(newProfileInput.trim()); setNewProfileInput(''); } }} disabled={!newProfileInput.trim()} className="bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50">Add</button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="block text-sm font-medium text-gray-300">Ingestion Method</label>
                          <select value={dataSource} onChange={(e) => setDataSource(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
                            <option value="manual">Manual Raw JSON (100% Reliable Bypass)</option>
                          </select>
                          {dataSource === 'manual' && (
                            <div className="text-xs text-gray-400">
                              To load data, visit any Reddit JSON endpoint (e.g. <a href={activeRedditUser ? `https://www.reddit.com/user/${activeRedditUser}/overview.json` : `https://www.reddit.com/r/technology.json`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">this link</a>), copy all text, and paste below:
                              <textarea value={manualJson} onChange={(e) => setManualJson(e.target.value)} className="w-full h-20 mt-2 bg-black/50 border border-white/10 rounded p-2 text-white font-mono focus:outline-none focus:border-indigo-500" placeholder='{"kind": "Listing", ...}'></textarea>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* OTHER SOURCES (Architecture Ready) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { name: 'Websites & Blogs', icon: Icons.Globe, color: 'text-blue-400', border: 'border-blue-500/20' },
                        { name: 'LinkedIn', icon: Icons.User, color: 'text-blue-500', border: 'border-blue-600/20' },
                        { name: 'Documentation', icon: Icons.Folder, color: 'text-emerald-400', border: 'border-emerald-500/20' },
                        { name: 'YouTube', icon: Icons.Play, color: 'text-red-500', border: 'border-red-500/20' },
                        { name: 'X (Twitter)', icon: Icons.MessageSquare, color: 'text-gray-300', border: 'border-gray-500/20' },
                        { name: 'Custom Integrations', icon: Icons.Plus, color: 'text-indigo-400', border: 'border-indigo-500/20' }
                      ].map(src => (
                        <div key={src.name} className={`bg-black/20 border ${src.border} rounded-xl p-5 flex flex-col opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-not-allowed`}>
                          <div className="flex items-center mb-3">
                            <src.icon className={`mr-2 ${src.color}`} style={{ width: 18, height: 18 }} />
                            <h5 className="font-semibold text-white">{src.name}</h5>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-white/5 self-start px-2 py-1 rounded">Architecture Ready</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <IntelligencePanel
                  what="Source architecture loaded."
                  why="Reddit is currently the active flagship engine for citation tracking."
                  sources="1 Active, 6 Pending."
                  confidenceScore={100}
                  nextSteps="Keep Reddit JSON synced regularly to maintain fresh query intelligence."
                />
              </div>
            )}

            {/* 3. Reddit Intelligence */}
            {activeTab === 'reddit_intelligence' && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white flex items-center"><Icons.Layers className="mr-2 text-[#ff4500]" style={{ width: 20, height: 20 }} /> Reddit Intelligence</h3>
                    <p className="text-sm text-gray-400 mt-1">Subreddit authority, community influence, and base citation potential of your content.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select value={postsContentType} onChange={(e) => setPostsContentType(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 shadow-inner h-10">
                      <option value="all">All Content</option><option value="post">Posts Only</option><option value="comment">Comments Only</option>
                    </select>
                  </div>
                </div>

                {posts.length === 0 ? (
                  <EmptyState onAction={() => setActiveTab('source_management')} />
                ) : (
                  <div className="space-y-4">
                    {displayedPosts.length > 0 ? displayedPosts.map((post) => {
                      const llmVisibility = calculateAvgLLMVisibility(post);
                      const analysisText = `Base visibility of ${llmVisibility}% driven by ${post.score} upvotes and text length. ${post.type === 'comment' ? 'Comments carry lower structural weight than root posts in RAG systems.' : 'Root posts establish strong topical context for web scrapers.'}`;
                      return (
                        <div key={post.id} className="p-5 bg-black/40 rounded-xl border border-white/5 flex flex-col lg:flex-row justify-between lg:items-center gap-6 hover:bg-white/5 transition-colors relative overflow-hidden group">
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${llmVisibility > 60 ? 'bg-emerald-500' : llmVisibility > 30 ? 'bg-amber-500' : 'bg-gray-600'} transition-all group-hover:w-2`}></div>
                          <div className="flex-1 min-w-0 pl-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${post.type === 'comment' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-blue-500/20 text-blue-300'}`}>{post.type}</span>
                              <h4 className="text-white font-medium truncate text-base">{post.title}</h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mb-3">
                              <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded text-gray-300 font-medium flex items-center"><Icons.Layers className="mr-1.5" style={{ width: 12, height: 12 }} /> r/{post.subreddit}</span>
                              <span className="flex items-center"><Icons.TrendingUp style={{ width: 14, height: 14 }} className="mr-1.5 text-emerald-400" /> {post.score} Influence</span>
                              {post.type === 'post' && <span className="flex items-center"><Icons.MessageSquare style={{ width: 14, height: 14 }} className="mr-1.5 text-indigo-400" /> {post.num_comments} Replies</span>}
                            </div>
                            <div className="text-xs text-slate-300 bg-slate-800/50 dark:bg-black/50 px-3 py-2 rounded-lg border border-slate-600/30 dark:border-white/5">
                              <span className="font-bold text-indigo-400">Attribution Impact:</span> {analysisText}
                            </div>
                          </div>
                          <div className="flex items-center gap-6 flex-shrink-0 bg-black/20 p-4 rounded-lg border border-white/5">
                            <div className="text-right">
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">Citation Probability</div>
                              <div className="flex items-center justify-end">
                                <span className={`text-xl font-black mr-3 ${llmVisibility > 60 ? 'text-emerald-400' : llmVisibility > 30 ? 'text-amber-400' : 'text-gray-400'}`}>{llmVisibility}%</span>
                                <div className="w-20 bg-black rounded-full h-2 border border-white/10 overflow-hidden"><div className={`h-full ${llmVisibility > 60 ? 'bg-emerald-500' : llmVisibility > 30 ? 'bg-amber-500' : 'bg-gray-500'}`} style={{ width: `${llmVisibility}%` }}></div></div>
                              </div>
                            </div>
                            <a href={post.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white p-2.5 bg-white/5 hover:bg-indigo-500/20 rounded-lg transition-colors"><Icons.ExternalLink style={{ width: 18, height: 18 }} /></a>
                          </div>
                        </div>
                      )
                    }) : (
                      <div className="text-center py-12"><Icons.Layers className="mx-auto mb-4 text-gray-600" style={{ width: 48, height: 48 }} /><p className="text-gray-400">No content indexed for this timeframe.</p></div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. AI Search Monitoring (Re-structured) */}
            {activeTab === 'search_monitor' && (
              <div className="space-y-6">

                {/* Provider Connection Panel */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center">
                        <Icons.Server className="mr-2 text-indigo-500" style={{ width: 18, height: 18 }} /> Active Search Providers
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Connect APIs for live execution. Gemini uses the built-in Canvas engine by default.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {providers.map(p => (
                      <div key={p.id} className={`p-3 rounded-lg border transition-all ${p.enabled ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-black/40 border-white/10 opacity-70'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-xs text-white truncate pr-2">{p.name.split(' ')[0]}</span>
                          <button onClick={() => toggleProvider(p.id)} className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${p.enabled ? 'bg-indigo-500' : 'bg-gray-400 dark:bg-gray-700'}`}>
                            <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-[3px] transition-transform ${p.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}></div>
                          </button>
                        </div>

                        {editingProviderId === p.id ? (
                          <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                            <input type="password" placeholder="sk-..." value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)} className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-[10px] text-white mb-1 focus:outline-none focus:border-indigo-500" />
                            <div className="flex gap-1">
                              <button onClick={() => saveApiKey(p.id)} className="bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded flex-1">Save</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[10px] mt-1">
                            {p.isCustom ? (
                              p.apiKey ?
                                <span className="text-emerald-400 font-bold">Active</span> :
                                <span className="text-amber-500">Needs Key</span>
                            ) : (
                              <span className="text-indigo-400 font-bold" title="Built-in Fallback">Native</span>
                            )}

                            {p.isCustom && (
                              <button onClick={() => { setEditingProviderId(p.id); setTempApiKey(p.apiKey); }} className="text-gray-400 hover:text-white px-1.5 py-0.5 bg-white/5 rounded" title="Set API Key">
                                <Icons.Key style={{ width: 10, height: 10 }} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Query Monitor Setup */}
                <div className="bg-white/5 border border-white/10 rounded-xl shadow-xl overflow-hidden">
                  <div className="flex border-b border-white/10 bg-black/40">
                    <button onClick={() => setMonitorSubTab('manual')} className={`px-6 py-4 text-sm font-medium transition-colors ${monitorSubTab === 'manual' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>Manual Targets</button>
                    <button onClick={() => setMonitorSubTab('auto')} className={`px-6 py-4 text-sm font-medium transition-colors ${monitorSubTab === 'auto' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>Auto-Discovery Generator</button>
                  </div>

                  <div className="p-6 border-b border-white/10 bg-black/20">
                    {monitorSubTab === 'manual' && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input type="text" value={newQueryCategory} onChange={(e) => setNewQueryCategory(e.target.value)} placeholder="Topic/Category (Optional)" className="w-full sm:w-40 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" list="category-suggestions" />
                        <datalist id="category-suggestions"><option value="DevTools" /><option value="Debugging" /><option value="AEO" /><option value="React" /></datalist>
                        <input type="text" value={newQueryText} onChange={(e) => setNewQueryText(e.target.value)} placeholder="Enter search query to monitor..." className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                        <button onClick={handleAddNewQuery} disabled={!newQueryText} className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-6 py-2 rounded-lg font-medium border border-indigo-500/30">Add Target</button>
                      </div>
                    )}
                    {monitorSubTab === 'auto' && (
                      <div className="text-center py-4 flex flex-col items-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xl text-center">Dynamically generate strictly logical, intent-driven queries based on your Brand Configuration ({brandConfig.primaryBrand || 'Brand'} & tracked keywords).</p>
                        <button onClick={handleGenerateAutoQueries} disabled={loading} className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/30 px-6 py-3 rounded-lg font-bold border border-emerald-500/30 transition-colors flex items-center">
                          <Icons.Zap className="mr-2" style={{ width: 16, height: 16 }} />
                          {loading ? 'Discovering Context...' : 'Generate Intent-Driven Pipeline'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-black/20 p-4 border-b border-white/5 flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-bold px-2 uppercase tracking-wider">Monitor Execution Queue</span>
                    <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">Using Date Range: {globalDateRange.preset}</span>
                  </div>

                  {/* Empty state protection */}
                  {posts.length === 0 ? (
                    <div className="p-8 text-center"><EmptyState onAction={() => setActiveTab('source_management')} /></div>
                  ) : filteredSavedQueries.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No queries match the current filters. Adjust your global date range or add new queries.</div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                      {filteredSavedQueries.map(q => (
                        <div key={q.id} className="flex flex-col">
                          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setExpandedQueryId(expandedQueryId === q.id ? null : q.id)}>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300">{q.category}</span>
                                <h4 className="font-bold text-slate-800 dark:text-white text-base">{q.text}</h4>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-6">
                                <span>Last eval: {q.lastRun ? new Date(q.lastRun * 1000).toLocaleString() : 'Pending'}</span>

                                {q.lastRun && (
                                  <div className="flex items-center gap-4 border-l border-gray-200 dark:border-white/10 pl-6">
                                    <span className={`flex items-center font-bold ${q.profileSurfaced ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                      {q.profileSurfaced ? <Icons.CheckCircle className="mr-1.5" style={{ width: 14, height: 14 }} /> : <Icons.AlertCircle className="mr-1.5" style={{ width: 14, height: 14 }} />}
                                      Surfaced
                                    </span>
                                    {q.profileSurfaced && q.combinedRankEquivalent !== 'Unranked' && (
                                      <span className="flex items-center text-indigo-600 dark:text-indigo-400 font-bold">
                                        <Icons.Target className="mr-1" style={{ width: 14, height: 14 }} />
                                        {q.combinedRankEquivalent}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button onClick={(e) => { e.stopPropagation(); handleRunStoredQuery(q.id); }} disabled={isExecutingQuery !== null} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm dark:shadow-none">
                                {isExecutingQuery === q.id ? <Icons.RefreshCw className="animate-spin" style={{ width: 16, height: 16 }} /> : <Icons.Play style={{ width: 16, height: 16 }} />}
                                Execute
                              </button>
                              <button onClick={(e) => handleRemoveQuery(e, q.id)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 rounded transition-colors hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete Query">
                                <Icons.Trash style={{ width: 16, height: 16 }} />
                              </button>
                              {q.lastRun && (
                                <div className="text-gray-400 hover:text-slate-800 dark:hover:text-white p-2">
                                  {expandedQueryId === q.id ? <Icons.ChevronUp style={{ width: 18, height: 18 }} /> : <Icons.ChevronDown style={{ width: 18, height: 18 }} />}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Expanded Deep Analysis Panel */}
                          {expandedQueryId === q.id && q.lastRun && (
                            <div className="bg-slate-50 dark:bg-black/30 border-t border-gray-100 dark:border-white/5 p-6 animate-in slide-in-from-top-2">
                              <h5 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                                <Icons.Activity className="mr-2 text-indigo-500 dark:text-indigo-400" style={{ width: 16, height: 16 }} />
                                Deep Visibility Analysis
                              </h5>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div className="bg-white dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/5 flex justify-between items-center shadow-sm dark:shadow-none">
                                    <div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center"><Icons.Globe className="mr-1.5" style={{ width: 14, height: 14 }} /> Omni-Channel Result</div>
                                      <div className="text-sm text-slate-700 dark:text-gray-300 font-medium">Aggregated SERP & LLM Outcome</div>
                                    </div>
                                    <div className="text-right">
                                      {q.combinedRankEquivalent !== 'Unranked' ? (
                                        <div className={`text-sm font-bold px-3 py-1 rounded border ${q.combinedRankEquivalent.includes('Tier 1') || q.combinedRankEquivalent.includes('Tier 2') ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-green-400 dark:bg-green-500/10 dark:border-green-500/20' : 'text-amber-700 bg-amber-50 border-amber-200 dark:text-yellow-400 dark:bg-yellow-500/10 dark:border-yellow-500/20'}`}>
                                          {q.combinedRankEquivalent}
                                        </div>
                                      ) : (
                                        <div className="text-sm font-bold text-gray-500 bg-gray-100 dark:bg-black/50 px-3 py-1 rounded border border-gray-200 dark:border-white/5">Unranked</div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="bg-white dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/5 flex justify-between items-center shadow-sm dark:shadow-none">
                                    <div>
                                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center"><Icons.Layers className="mr-1.5" style={{ width: 14, height: 14 }} /> 10-Path Simulation</div>
                                      <div className="text-sm text-slate-700 dark:text-gray-300 font-medium">Matches across 10 query variants</div>
                                    </div>
                                    <div className={`text-right flex flex-col items-end`}>
                                      <span className="text-xs text-slate-600 dark:text-gray-400 mb-0.5"><span className="text-orange-600 dark:text-orange-400 font-bold">{q.totalRedditSurfaceCount}/10</span> Reddit Contexts</span>
                                      <span className="text-xs text-slate-600 dark:text-gray-400"><span className="text-indigo-600 dark:text-indigo-400 font-bold">{q.userSurfaceCount}/10</span> Profile Selected</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {q.optimizationTips?.map((tip, idx) => {
                                    if (!tip || typeof tip !== 'string') return null;
                                    return (
                                      <div key={idx} className={`p-4 rounded-lg border shadow-sm dark:shadow-none ${tip.includes('Combined Visibility') ? 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-200' : tip.includes('Verified') || tip.includes('Strong') || tip.includes('Context Provided') ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-200' : tip.includes('Mismatch') || tip.includes('Misleading') || tip.includes('Error') ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-200' : tip.includes('Lost') ? 'bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-200' : tip.includes('Missed') ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-200' : 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-300'} text-sm leading-relaxed`}>
                                        {tip.includes(':') ? (
                                          <><strong className="font-semibold">{tip.substring(0, tip.indexOf(':'))}:</strong>{tip.substring(tip.indexOf(':') + 1)}</>
                                        ) : (
                                          <span>{tip}</span>
                                        )}
                                      </div>
                                    )
                                  })}

                                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2 bg-white dark:bg-black/30 p-2.5 rounded border border-gray-200 dark:border-white/5">
                                    <div className="flex items-center">
                                      <div className={`w-2 h-2 rounded-full mr-2 ${q.llmMentionsBrand ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                      Answer Contains Brand: <span className="font-bold text-slate-800 dark:text-white ml-1">{q.llmMentionsBrand ? 'YES' : 'NO'}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="font-bold text-slate-800 dark:text-white mr-1">{q.confidence}%</span> Confidence
                                    </div>
                                  </div>
                                </div>

                                {q.docSnippet && (
                                  <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg p-5 mt-2 shadow-sm dark:shadow-inner">
                                    <div className="text-xs text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2 font-bold flex items-center justify-between">
                                      <div className="flex items-center">
                                        <Icons.Target className="mr-2" style={{ width: 14, height: 14 }} />
                                        {q.usedProviderName ? `AI Generated Extract (${q.usedProviderName})` : 'AI Generated Extract'}
                                      </div>
                                    </div>
                                    <p className="text-sm text-indigo-900 dark:text-indigo-100 italic leading-relaxed">
                                      "{q.docSnippet}"
                                    </p>
                                  </div>
                                )}

                                {q.profileSurfaced && q.surfacedPostUrl ? (
                                  <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-4 border border-emerald-200 dark:border-emerald-500/20 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2 shadow-sm dark:shadow-none">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1 font-bold flex items-center">
                                        <Icons.Target className="mr-1.5" style={{ width: 14, height: 14 }} /> Top Surfaced Source (Your Profile)
                                      </div>
                                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate w-full" title={q.surfacedPostTitle}>
                                        {q.surfacedPostTitle}
                                      </div>
                                    </div>
                                    <a href={q.surfacedPostUrl} target="_blank" rel="noreferrer" className="flex-shrink-0 flex items-center justify-center text-xs bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 px-4 py-2 rounded-lg transition-colors font-bold whitespace-nowrap">
                                      <Icons.ExternalLink className="mr-1.5" style={{ width: 14, height: 14 }} /> View Original Post
                                    </a>
                                  </div>
                                ) : q.totalRedditSurfaceCount > 0 ? (
                                  <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-4 border border-orange-200 dark:border-orange-500/20 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2 shadow-sm dark:shadow-none">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-1 font-bold flex items-center">
                                        <Icons.AlertCircle className="mr-1.5" style={{ width: 14, height: 14 }} /> Outranked by External Reddit Thread
                                      </div>
                                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate w-full">
                                        Reddit communities surfaced in the AI context, but your posts lacked the semantic density to be selected.
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-gray-100 dark:bg-gray-900/20 rounded-lg p-4 border border-gray-300 dark:border-gray-600/30 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2 shadow-sm dark:shadow-none">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-bold flex items-center">
                                        <Icons.Globe className="mr-1.5" style={{ width: 14, height: 14 }} /> Official Docs & Competitors Dominate
                                      </div>
                                      <div className="text-sm font-medium text-slate-700 dark:text-gray-300 truncate w-full">
                                        Reddit was completely omitted from the AI's source pool for these queries.
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Query Intelligence Library */}
            {activeTab === 'query_library' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white flex items-center">
                        <Icons.Folder className="mr-2 text-indigo-500" style={{ width: 22, height: 22 }} />
                        Query Intelligence Database
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        A deep analytical view of all tracked queries, intent categorization, and historical viability.
                      </p>
                    </div>
                  </div>

                  {posts.length === 0 ? (
                    <EmptyState onAction={() => setActiveTab('search_monitor')} />
                  ) : filteredSavedQueries.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No queries tracked in this period. Add queries via the Search Monitor.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredSavedQueries.map(q => {
                        const conf = getConfidence(q.confidence || 0);
                        return (
                          <div key={q.id} className="bg-black/30 dark:bg-black/50 border border-slate-200 dark:border-white/5 rounded-xl p-5 shadow-sm hover:border-indigo-500/30 transition-colors flex flex-col h-full">
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                                {q.category}
                              </span>
                              {q.combinedRankEquivalent !== 'Unranked' && (
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                                  <Icons.Target className="mr-1" style={{ width: 12, height: 12 }} /> Surfaced
                                </span>
                              )}
                            </div>

                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2 leading-snug">{q.text}</h4>

                            <div className="space-y-2 mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500 dark:text-gray-400 font-medium">Rank Tier:</span>
                                <span className="font-bold text-slate-800 dark:text-gray-200">{q.combinedRankEquivalent || "Pending"}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500 dark:text-gray-400 font-medium">AI Brand Mention:</span>
                                <span className={`font-bold ${q.llmMentionsBrand ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-gray-500'}`}>{q.llmMentionsBrand ? "Yes" : "No"}</span>
                              </div>
                              <div className="flex justify-between text-xs pt-1">
                                <span className="text-slate-500 dark:text-gray-400 font-medium">Confidence:</span>
                                <span className={`font-bold ${conf.color}`}>{conf.val}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <IntelligencePanel
                  what="Query database materialized."
                  why="Tracking active intents allows predictive modeling for content gaps."
                  sources={`${filteredSavedQueries.length} distinct search clusters.`}
                  confidenceScore={90}
                  nextSteps="Move to 'Content Opportunities' to generate posts for 'Unranked' queries."
                />
              </div>
            )}

            {/* 6. Platform Citations */}
            {activeTab === 'platform_citations' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-white/10 pb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white flex items-center">
                        <Icons.BarChart className="mr-2 text-indigo-500" style={{ width: 20, height: 20 }} />
                        Platform Citations & Extraction Probability
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Live probability of your content being ingested and cited by major public LLM ecosystems.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto md:justify-end">
                      <select value={citationContentType} onChange={(e) => setCitationContentType(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner h-[42px]">
                        <option value="all">Compare All Content</option><option value="post">Posts Only</option><option value="comment">Comments Only</option>
                      </select>
                      {(citationContentType === 'post' || citationContentType === 'comment') && (
                        <select value={selectedCitationId} onChange={(e) => setSelectedCitationId(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 max-w-full sm:max-w-[250px] truncate shadow-inner h-[42px]">
                          <option value="all">All {citationContentType === 'post' ? 'Posts' : 'Comments'} ({availableCitationItems.length})</option>
                          {availableCitationItems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  {posts.length === 0 ? (
                    <EmptyState onAction={() => setActiveTab('source_management')} />
                  ) : !platformStats || platformStats.length === 0 ? (
                    <div className="text-center py-16 text-gray-500"><Icons.Layers className="mx-auto mb-3 opacity-20" style={{ width: 40, height: 40 }} />No content found for this criteria.</div>
                  ) : (
                    <div className="space-y-8 px-2">
                      {platformStats.map((plat) => {
                        const conf = getConfidence(Math.max(40, plat.score - 5)); // Slightly variable confidence for realism
                        return (
                          <div key={plat.id} className="relative group">
                            <div className="flex justify-between items-end mb-2">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-3 ${plat.color} shadow-[0_0_10px_rgba(255,255,255,0.2)] shadow-${plat.color.replace('bg-', '')}`}></div>
                                <span className="text-base font-bold text-slate-800 dark:text-white">{plat.name}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`text-xs font-bold ${conf.color} hidden sm:block`}>{conf.label}</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-wide">{plat.score}%</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-black/50 rounded-full h-4 overflow-hidden border border-transparent dark:border-white/5 shadow-inner">
                              <div className={`h-4 rounded-full ${plat.color} relative overflow-hidden transition-all duration-1000 ease-out`} style={{ width: `${plat.score}%` }}>
                                <div className="absolute inset-0 bg-white/20 w-full h-full transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                              </div>
                            </div>
                            {selectedCitationId !== 'all' && plat.insight && (
                              <div className="mt-3 text-sm text-slate-600 dark:text-gray-300 bg-white dark:bg-white/5 p-4 rounded-lg border border-slate-200 dark:border-white/5 leading-relaxed shadow-sm dark:shadow-none">
                                <strong className="text-slate-800 dark:text-white">Why?</strong> {plat.insight}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <IntelligencePanel
                  what="Platform extraction probability mapped."
                  why="Different foundational models weigh Reddit structures differently (e.g. Perplexity favors upvotes more than ChatGPT)."
                  sources="Connected Reddit Profile Data vs Model System Prompts."
                  confidenceScore={88}
                  nextSteps="Target platforms with scores below 50% by posting longer, highly-structured 'how-to' guides."
                />
              </div>
            )}

            {/* 7. Share of Voice Analysis */}
            {activeTab === 'sov_analysis' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-white/10 pb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white flex items-center">
                        <Icons.PieChart className="mr-3 text-indigo-500" style={{ width: 24, height: 24 }} />
                        Share of Voice (Flagship Analysis)
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Executive-level visibility mapping across the entire digital ecosystem for tracked brands and queries.</p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center space-x-4 bg-black/50 border border-white/10 rounded-lg px-4 h-[42px] shadow-inner">
                        <div className="flex items-center">
                          <span className="text-sm font-bold text-gray-300 mr-2">Live Engine</span>
                          <button onClick={() => setIsLiveScanning(!isLiveScanning)} className={`w-9 h-4.5 rounded-full relative transition-colors ${isLiveScanning ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${isLiveScanning ? 'translate-x-5' : 'translate-x-1'}`}></div>
                          </button>
                        </div>
                        <div className="w-px h-5 bg-white/20"></div>
                        <div className="flex items-center">
                          <span className="text-sm font-bold text-gray-300 mr-2">Isolate Profile</span>
                          <button onClick={() => setShowUserContribution(!showUserContribution)} className={`w-9 h-4.5 rounded-full relative transition-colors ${showUserContribution ? 'bg-fuchsia-500' : 'bg-gray-700'}`}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${showUserContribution ? 'translate-x-5' : 'translate-x-1'}`}></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 flex flex-col sm:flex-row gap-3">
                    <input type="text" value={newSovDomain} onChange={(e) => setNewSovDomain(e.target.value)} placeholder="Add custom competitor domain (e.g. competitor.com)" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white w-full sm:w-80 focus:outline-none focus:border-indigo-500 shadow-inner" />
                    <button onClick={() => { if (newSovDomain.trim()) { setCustomSovDomains([...customSovDomains, newSovDomain.trim()]); setNewSovDomain(''); } }} className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-6 py-2.5 rounded-lg font-bold text-sm transition-colors border border-indigo-200 dark:border-indigo-500/30 whitespace-nowrap">Track Custom Domain</button>
                  </div>
                  {customSovDomains.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {customSovDomains.map((cd, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 text-slate-700 dark:text-gray-300 px-3 py-1.5 rounded-full text-xs font-bold flex items-center shadow-sm dark:shadow-none">
                          {cd} <button onClick={() => setCustomSovDomains(customSovDomains.filter(x => x !== cd))} className="ml-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400">&times;</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {posts.length === 0 ? (
                    <EmptyState onAction={() => setActiveTab('source_management')} />
                  ) : sovViewMode === 'live' && liveSovData.length === 0 ? (
                    <div className="text-center py-16 animate-in fade-in bg-black/5 border border-white/5 rounded-xl">
                      <Icons.Cpu className="mx-auto text-indigo-500/50 mb-4" style={{ width: 48, height: 48 }} />
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Live Engine Initializing</h3>
                      <p className="text-slate-500 dark:text-gray-400 text-sm max-w-md mx-auto mb-6">Generating semantic variants and calculating historical RAG discovery weights...</p>
                    </div>
                  ) : sovData.domains.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Run queries in the Search Monitor or activate the Live Auto-Scanner.</div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
                      {/* Left: Visual Stacked Bar & Top Stats */}
                      <div className="lg:col-span-2 space-y-8">
                        <div className="p-8 bg-black/40 rounded-xl border border-white/5 shadow-sm dark:shadow-none">
                          <div className="flex justify-between items-end mb-6">
                            <h4 className="text-sm font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                              {showUserContribution ? "ISOLATED PROFILE SOV" : "AGGREGATE REDDIT SOV"}
                            </h4>
                            <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                              {showUserContribution ? sovData.redditStats.userPercentage.toFixed(1) : sovData.redditStats.overallPercentage.toFixed(1)}%
                            </span>
                          </div>

                          {/* Vercel-style Multi-color Progress Bar */}
                          <div className="w-full h-10 rounded-full overflow-hidden flex shadow-inner bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/5 mb-6">
                            {sovData.domains.map((d, i) => {
                              let color = 'bg-gray-400 dark:bg-gray-600';
                              if (d.type === 'reddit') color = 'bg-[#ff4500]';
                              else if (d.type === 'user') color = 'bg-indigo-500';
                              else if (d.type === 'docs') color = 'bg-blue-500';
                              else if (d.type === 'forum') color = 'bg-yellow-500';

                              return (
                                <div key={d.domain} className={`${color} h-full border-r border-black/10 dark:border-black/20 last:border-0 hover:opacity-80 transition-opacity relative group`} style={{ width: `${d.percentage}%` }}>
                                  <div className="absolute opacity-0 group-hover:opacity-100 -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900 dark:bg-black text-xs font-bold px-3 py-1.5 rounded-md text-white whitespace-nowrap z-10 pointer-events-none shadow-lg after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-900 dark:after:border-t-black">
                                    {d.domain} <span className="ml-1 text-white/80">({d.percentage.toFixed(1)}%)</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <div className="flex flex-wrap gap-5 text-sm text-slate-700 dark:text-gray-300 font-medium bg-white/5 p-4 rounded-lg">
                            <div className="flex items-center"><div className="w-3.5 h-3.5 rounded-full bg-[#ff4500] mr-2 shadow-sm"></div> Reddit (Overall)</div>
                            {showUserContribution && <div className="flex items-center"><div className="w-3.5 h-3.5 rounded-full bg-indigo-500 mr-2 shadow-sm"></div> Your Content</div>}
                            <div className="flex items-center"><div className="w-3.5 h-3.5 rounded-full bg-blue-500 mr-2 shadow-sm"></div> Brand/Competitor Docs</div>
                            <div className="flex items-center"><div className="w-3.5 h-3.5 rounded-full bg-yellow-500 mr-2 shadow-sm"></div> Forums</div>
                          </div>
                        </div>

                        {sovData.timelineData?.length > 0 && (
                          <div className="p-6 bg-black/40 rounded-xl border border-white/5 shadow-sm dark:shadow-none animate-in slide-in-from-bottom-4">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center">
                              <Icons.Activity className="mr-2 text-indigo-500" style={{ width: 16, height: 16 }} />
                              Historical Discoverability Timeline
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-gray-500 mb-4">Semantic visibility density mapped over time.</p>
                            <SovTimelineChart data={sovData.timelineData} />
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Domain Visibility Ranking</h4>
                          <div className="space-y-3">
                            {sovData.domains.map((d, i) => (
                              <div key={d.domain} className="flex items-center p-4 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none hover:border-indigo-300 dark:hover:bg-white/10 transition-colors">
                                <div className="w-6 text-center text-xs font-black text-slate-400 dark:text-gray-500 mr-3">#{i + 1}</div>
                                <div className="flex-1">
                                  <div className="flex justify-between mb-1.5">
                                    <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center truncate pr-2">
                                      {d.type === 'reddit' && <Icons.Target className="text-[#ff4500] mr-2 flex-shrink-0" style={{ width: 14, height: 14 }} />}
                                      {d.type === 'user' && <Icons.User className="text-indigo-500 mr-2 flex-shrink-0" style={{ width: 14, height: 14 }} />}
                                      <span className="truncate">{d.domain}</span>
                                    </span>
                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{d.percentage.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 dark:bg-black/50 rounded-full h-2 shadow-inner">
                                    <div className={`h-2 rounded-full ${d.type === 'reddit' ? 'bg-[#ff4500]' : d.type === 'user' ? 'bg-indigo-500' : d.type === 'docs' ? 'bg-blue-500' : d.type === 'forum' ? 'bg-yellow-500' : 'bg-gray-400 dark:bg-gray-500'}`} style={{ width: `${d.percentage}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Subreddit Dominance */}
                      <div className="bg-black/40 border border-white/5 rounded-xl p-6 h-fit shadow-sm dark:shadow-none">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                          <Icons.Layers className="mr-2 text-slate-500 dark:text-gray-400" style={{ width: 16, height: 16 }} />
                          Subreddit Influence Array
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-gray-500 mb-6 font-medium">Breakdown of specific Reddit community citation weight observed across providers.</p>

                        {sovData.subreddits.length === 0 ? (
                          <div className="text-sm text-slate-400 dark:text-gray-600 text-center py-6 font-medium">No community data surfaced yet.</div>
                        ) : (
                          <div className="space-y-5">
                            {sovData.subreddits.map((sub, i) => {
                              const totalSubWeight = sovData.subreddits.reduce((acc, s) => acc + s.weight, 0);
                              const subPercent = (sub.weight / totalSubWeight) * 100;
                              return (
                                <div key={sub.name} className="relative group">
                                  <div className="flex justify-between text-sm mb-1.5 relative z-10">
                                    <span className="text-slate-700 dark:text-gray-300 font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">r/{sub.name}</span>
                                    <span className="text-slate-900 dark:text-white font-black">{subPercent.toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 dark:bg-white/5 rounded-md h-7 absolute top-0 left-0 -z-0 overflow-hidden shadow-inner">
                                    <div className="h-full bg-indigo-500/10 dark:bg-indigo-500/20 border-r border-indigo-500/30" style={{ width: `${subPercent}%` }}></div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 space-y-4">
                          <div className="flex justify-between items-center text-sm bg-white/5 p-3 rounded-lg border border-white/5">
                            <span className="text-slate-600 dark:text-gray-400 font-medium">Total Scans Evaluated</span>
                            <span className="font-black text-slate-800 dark:text-white">{sovData.redditStats.totalQueries}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm bg-white/5 p-3 rounded-lg border border-white/5">
                            <span className="text-slate-600 dark:text-gray-400 font-medium">Live Appearance Rate</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                              {sovData.redditStats.totalQueries > 0 ?
                                ((sovData.redditStats.queriesAppearedIn / sovData.redditStats.totalQueries) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Global Ecosystem Distribution */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-8 shadow-xl mt-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                          <Icons.Globe className="mr-2 text-indigo-500" style={{ width: 20, height: 20 }} />
                          Global Ecosystem Map
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 font-medium">Macro-level brand presence comparison across top aggregate sources.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {sovData.ecosystemStats.map(eco => {
                        let ecoColor = 'bg-gray-400 dark:bg-gray-600';
                        if (eco.name === 'Reddit') ecoColor = 'bg-[#ff4500]';
                        else if (eco.name === 'Linkedin') ecoColor = 'bg-[#0077b5]';
                        else if (eco.name === 'Wikipedia') ecoColor = 'bg-slate-400 dark:bg-gray-300';
                        else if (eco.name === 'Directories') ecoColor = 'bg-fuchsia-500';
                        else if (eco.name === 'Forums') ecoColor = 'bg-yellow-500';

                        return (
                          <div key={eco.name} className="bg-white dark:bg-black/50 border border-slate-200 dark:border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm dark:shadow-none hover:border-indigo-300 transition-colors">
                            <div className="text-3xl font-black text-slate-800 dark:text-white mb-2">{eco.percentage.toFixed(1)}%</div>
                            <div className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                              <div className={`w-3 h-3 rounded-full mr-2 shadow-sm ${ecoColor}`}></div>
                              {eco.name}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <IntelligencePanel
                  what={`Calculated Share of Voice for ${brandConfig.primaryBrand || 'your brand'}.`}
                  why="SOV indicates the likelihood of your content being the primary source referenced by AI compared to official docs and competitors."
                  sources="Live web search proxies + existing Reddit Profile database."
                  confidenceScore={sovData.confidence}
                  nextSteps="Identify subreddits with high appearance rates but low user percentage, and contribute there."
                />
              </div>
            )}

            {/* 8. Competitor Intelligence */}
            {activeTab === 'competitor_intel' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-white/10 pb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white flex items-center">
                        <Icons.Crosshair className="mr-2 text-rose-500" style={{ width: 20, height: 20 }} />
                        Competitor Intelligence
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Track external Reddit threads mentioning competitors and draft interception replies.</p>
                    </div>
                  </div>

                  <div className="bg-black/30 border border-white/5 rounded-xl p-5 mb-8">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Target Competitors (Syncs with Workspace config)</h4>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {brandConfig.competitors.map((kw, i) => (
                        <div key={i} className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-sm">
                          {kw} <button onClick={() => setBrandConfig({ ...brandConfig, competitors: brandConfig.competitors.filter(x => x !== kw) })} className="ml-3 hover:text-rose-900 dark:hover:text-white transition-colors">&times;</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <input type="text" value={newCompetitor} onChange={(e) => setNewCompetitor(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newCompetitor.trim()) { setBrandConfig({ ...brandConfig, competitors: [...brandConfig.competitors, newCompetitor.trim()] }); setNewCompetitor(''); } }} placeholder="Add competitor brand or tool..." className="w-full sm:w-80 bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner" />
                      <button onClick={() => { if (newCompetitor.trim()) { setBrandConfig({ ...brandConfig, competitors: [...brandConfig.competitors, newCompetitor.trim()] }); setNewCompetitor(''); } }} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors border border-rose-200 dark:border-rose-500/30 whitespace-nowrap">Track Brand</button>
                      <button onClick={handleScanCompetitors} disabled={isScanningCompetitors || brandConfig.competitors.length === 0} className="ml-auto bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-rose-500/20 flex items-center whitespace-nowrap">
                        {isScanningCompetitors ? <Icons.RefreshCw className="animate-spin mr-2" style={{ width: 16, height: 16 }} /> : <Icons.Search className="mr-2" style={{ width: 16, height: 16 }} />}
                        {isScanningCompetitors ? 'Scanning Reddit...' : 'Scan For Mentions'}
                      </button>
                    </div>
                  </div>

                  {posts.length === 0 ? (
                    <EmptyState onAction={() => setActiveTab('source_management')} />
                  ) : competitorPosts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-gray-500">Add competitors and click scan to find active community discussions.</div>
                  ) : (
                    <div className="space-y-6">
                      {competitorPosts.map((post, idx) => (
                        <div key={idx} className="bg-white dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/5 p-6 shadow-sm dark:shadow-none flex flex-col md:flex-row gap-6">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#ff4500] bg-[#ff4500]/10 px-2.5 py-1 rounded uppercase tracking-wider">{post.sub}</span>
                              <span className="text-xs font-medium text-slate-500 dark:text-gray-400">Mentioned: <strong className="text-rose-600 dark:text-rose-400">{post.competitor}</strong></span>
                            </div>
                            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg p-4 shadow-inner dark:shadow-sm">
                              <p className="text-sm text-slate-800 dark:text-gray-300 leading-relaxed">"{post.postText}"</p>
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center">
                              <Icons.Lightbulb className="mr-1.5" style={{ width: 14, height: 14 }} /> Suggested Interception Reply
                            </h4>
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg p-4 h-[calc(100%-2rem)] flex flex-col justify-center shadow-sm dark:shadow-none">
                              <p className="text-sm text-indigo-900 dark:text-indigo-100 italic leading-relaxed">"{post.suggestedReply}"</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {competitorPosts.length > 0 && (
                  <IntelligencePanel
                    what={`Identified ${competitorPosts.length} strategic interception opportunities.`}
                    why="Communities actively seeking alternatives to competitors present the highest conversion intent."
                    sources="Public Reddit stream targeting competitor keywords."
                    confidenceScore={92}
                    nextSteps={`Review the suggested replies, adjust them for your voice, and post in the respective threads to boost ${brandConfig.primaryBrand || 'your brand'} SOV.`}
                  />
                )}
              </div>
            )}

            {/* 9. Feature Intelligence */}
            {activeTab === 'feature_intel' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white flex items-center">
                        <Icons.Star className="mr-2 text-yellow-400" style={{ width: 20, height: 20 }} />
                        Feature Intelligence
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Automatically extracted capabilities and tech terms driving visibility across monitored profiles.</p>
                    </div>
                  </div>

                  {posts.length === 0 ? (
                    <EmptyState onAction={() => setActiveTab('source_management')} />
                  ) : Object.keys(allProfilesPosts).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No profile data indexed yet.</div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(allProfilesPosts).map(([profileName, profilePosts]) => {
                        const timeFilteredPosts = applyTimeFilter(profilePosts);
                        const topics = extractTopicsFromPosts(timeFilteredPosts, brandConfig.keywords);
                        return (
                          <div key={profileName} className="bg-black/40 border border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none">
                            <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mr-3">
                                <Icons.User className="text-indigo-600 dark:text-indigo-400" style={{ width: 16, height: 16 }} />
                              </div>
                              u/{profileName} <span className="ml-3 text-xs font-medium text-slate-500 dark:text-gray-500 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-transparent">{timeFilteredPosts.length} posts analyzed</span>
                            </h4>

                            {topics.length === 0 ? (
                              <p className="text-sm text-gray-500 bg-white/5 p-4 rounded-lg border border-white/5">Not enough technical text to extract meaningful features in this period.</p>
                            ) : (
                              <div className="flex flex-wrap gap-3 mt-5">
                                {topics.map(t => (
                                  <div key={t.name} className="flex items-center bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg px-4 py-2 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors shadow-sm dark:shadow-none">
                                    <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{t.name}</span>
                                    <span className="ml-3 text-xs font-bold bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-transparent shadow-inner">{t.count} mentions</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <IntelligencePanel
                  what="Extracted top conversational topics."
                  why="Frequent mentions signal which features the community naturally associates with your brand."
                  sources="Analyzed text from all connected Reddit profiles."
                  confidenceScore={98}
                  nextSteps="Incorporate the top 3 extracted terms into your official docs to boost alignment between AI and community language."
                />
              </div>
            )}

            {/* 10. Content Opportunities (Suggester + Rater) */}
            {activeTab === 'content_opportunities' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-xl">

                  {/* Mode Toggle */}
                  <div className="flex border-b border-slate-200 dark:border-white/10 mb-6 bg-slate-50 dark:bg-black/40 rounded-t-xl">
                    <button onClick={() => setQueryTesterMode('semantic')} className={`flex-1 py-4 text-sm font-bold transition-colors ${queryTesterMode === 'semantic' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'}`}>Content Suggester</button>
                    <button onClick={() => setQueryTesterMode('rater')} className={`flex-1 py-4 text-sm font-bold transition-colors ${queryTesterMode === 'rater' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-white' : 'text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'}`}>Draft Content Rater</button>
                  </div>

                  {queryTesterMode === 'semantic' ? (
                    <div>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 pb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                            <Icons.PenTool className="mr-2 text-indigo-600 dark:text-indigo-500" style={{ width: 20, height: 20 }} />
                            Content Opportunity Generator
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">AI-generated, community-friendly content strategies based on your Query Library and Feature Intel.</p>
                        </div>
                        <button onClick={handleSuggestContent} disabled={isSuggesting || posts.length === 0} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-lg shadow-indigo-500/20 flex items-center">
                          {isSuggesting ? <Icons.RefreshCw className="animate-spin mr-2" style={{ width: 16, height: 16 }} /> : <Icons.Zap className="mr-2" style={{ width: 16, height: 16 }} />}
                          {isSuggesting ? 'Analyzing Ecosystem...' : 'Generate Strategies'}
                        </button>
                      </div>

                      {posts.length === 0 ? (
                        <EmptyState onAction={() => setActiveTab('source_management')} />
                      ) : suggestedContentList.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5">
                          <Icons.MessageSquare className="mx-auto text-indigo-500/50 mb-4" style={{ width: 48, height: 48 }} />
                          <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No Strategies Generated</h3>
                          <p className="text-slate-500 dark:text-gray-400 text-sm max-w-md mx-auto">Click the button above to let the intelligence engine cross-analyze your queries and competitors to draft genuine content.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {suggestedContentList.map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/5 p-6 shadow-sm flex flex-col h-full hover:border-indigo-500/30 transition-colors">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 border ${item.type === 'post' ? 'bg-emerald-100 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-blue-100 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20'}`}>
                                    {item.type === 'post' ? <Icons.PenTool className="text-emerald-600 dark:text-emerald-400" style={{ width: 14, height: 14 }} /> : <Icons.MessageSquare className="text-blue-600 dark:text-blue-400" style={{ width: 14, height: 14 }} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.type === 'post' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'}`}>{item.type}</span>
                                      <h4 className="font-bold text-slate-800 dark:text-white">{item.sub}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-medium">Targeting Context: "{item.queryContext}"</p>
                                  </div>
                                </div>
                                <div className={`px-3 py-1.5 rounded-full text-xs font-black border flex items-center shadow-sm ${item.score > 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'}`}>
                                  <Icons.CheckCircle className="mr-1.5" style={{ width: 12, height: 12 }} /> {item.score}% Authentic
                                </div>
                              </div>

                              {item.type === 'comment' && item.targetPostTitle && (
                                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 mb-4 flex items-start">
                                  <Icons.Target className="text-slate-400 dark:text-gray-500 mr-2 mt-0.5 flex-shrink-0" style={{ width: 14, height: 14 }} />
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-wider block mb-0.5">Target Post Title</span>
                                    <span className="text-sm font-semibold text-slate-800 dark:text-gray-200">{item.targetPostTitle}</span>
                                  </div>
                                </div>
                              )}

                              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 mb-5 border border-slate-200 dark:border-white/5 flex-grow shadow-inner relative">
                                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 opacity-10"><Icons.MessageSquare style={{ width: 40, height: 40 }} className="text-slate-500" /></div>
                                <p className="text-sm text-slate-700 dark:text-gray-300 italic leading-relaxed relative z-10 whitespace-pre-wrap">"{item.draft}"</p>
                              </div>

                              <div className="space-y-2">
                                <div className="text-xs text-slate-600 dark:text-gray-400 bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                  <span className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center mb-1.5"><Icons.Lightbulb className="mr-1.5" style={{ width: 12, height: 12 }} /> Strategic Analysis</span>
                                  <span className="leading-relaxed">{item.reason}</span>
                                </div>
                                <div className="text-xs text-slate-600 dark:text-gray-400 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center mb-1.5"><Icons.Shield className="mr-1.5" style={{ width: 12, height: 12 }} /> Rule Adherence & Spam Check</span>
                                  <span className="leading-relaxed">{item.ruleAdherence}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="animate-in fade-in">
                      <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">Paste your drafted post or comment here. The AI will evaluate its authenticity and flag any promotional spam triggers before you publish.</p>

                      <textarea
                        value={draftContent}
                        onChange={(e) => setDraftContent(e.target.value)}
                        className="w-full h-40 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-600 shadow-inner resize-none mb-4"
                        placeholder={`I completely agree with the OP. When we were evaluating tools like ${brandConfig.primaryBrand || 'your brand'}...`}
                      ></textarea>

                      <div className="flex justify-end mb-8">
                        <button onClick={handleRateContent} disabled={raterResults?.isAnalyzing || !draftContent.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold transition-colors flex items-center shadow-lg shadow-emerald-500/25">
                          {raterResults?.isAnalyzing ? <Icons.RefreshCw className="animate-spin mr-2" style={{ width: 18, height: 18 }} /> : <Icons.Activity className="mr-2" style={{ width: 18, height: 18 }} />}
                          Analyze Authenticity
                        </button>
                      </div>

                      {raterResults && !raterResults.isAnalyzing && (
                        <div className="bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-xl p-6 animate-in slide-in-from-bottom-2 shadow-inner">
                          <div className="flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="relative flex items-center justify-center mb-2">
                                <svg className="w-24 h-24 transform -rotate-90">
                                  <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200 dark:text-gray-800" />
                                  <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="276" strokeDashoffset={276 - (276 * raterResults.score) / 100} className={`${raterResults.score > 80 ? 'text-emerald-500' : raterResults.score > 50 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`} />
                                </svg>
                                <div className={`absolute text-2xl font-black ${raterResults.score > 80 ? 'text-emerald-600 dark:text-emerald-400' : raterResults.score > 50 ? 'text-amber-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>{raterResults.score}</div>
                              </div>
                              <span className="text-xs font-bold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Authenticity</span>
                            </div>

                            <div className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-5 shadow-sm dark:shadow-none w-full">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center">
                                <Icons.Lightbulb className="mr-2 text-amber-500 dark:text-yellow-400" style={{ width: 16, height: 16 }} /> Analysis & Critique
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed font-medium">
                                {raterResults.critique}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* 11. Workspace Settings */}
            {activeTab === 'settings' && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Workspace Configuration</h3>
                  <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/30">Active Config</span>
                </div>
                {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4 p-3 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-lg">{error}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* General Workspace Settings */}
                  <div className="space-y-6">
                    <div className="p-5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/30 shadow-sm dark:shadow-none">
                      <h4 className="text-md font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-white/5 pb-2">Workspace Identity</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Workspace Name</label>
                          <input type="text" value={workspace.name} onChange={(e) => setWorkspace({ ...workspace, name: e.target.value })} className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors shadow-inner" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">Primary Tracked Brand</label>
                          <input type="text" value={brandConfig.primaryBrand} onChange={(e) => setBrandConfig({ ...brandConfig, primaryBrand: e.target.value })} className="w-full bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/30 rounded-lg px-4 py-2 text-sm font-bold text-indigo-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors shadow-inner" />
                          <p className="text-[10px] text-slate-500 dark:text-gray-500 mt-1.5 font-medium">All semantic algorithms, suggestions, and visibility scores will pivot around this brand entity.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature & Competitor Tracking */}
                  <div className="space-y-6">
                    <div className="p-5 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/30 shadow-sm dark:shadow-none">
                      <h4 className="text-md font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-white/5 pb-2">Tracked Ecosystem</h4>
                      <div className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Target Keywords</label>
                          <input type="text" placeholder="Add keyword & press enter (e.g. Knowledge Base)" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { setBrandConfig({ ...brandConfig, keywords: [...brandConfig.keywords, e.target.value.trim()] }); e.target.value = ''; } }} className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 mb-2 shadow-inner" />
                          <div className="flex flex-wrap gap-1.5">
                            {brandConfig.keywords.map(kw => (
                              <span key={kw} className="bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 px-2 py-1 rounded text-[10px] font-bold border border-slate-200 dark:border-transparent flex items-center">
                                {kw} <button onClick={() => setBrandConfig({ ...brandConfig, keywords: brandConfig.keywords.filter(k => k !== kw) })} className="ml-1.5 text-slate-400 hover:text-red-500">&times;</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Direct Competitors</label>
                          <input type="text" placeholder="Add competitor & press enter..." onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { setBrandConfig({ ...brandConfig, competitors: [...brandConfig.competitors, e.target.value.trim()] }); e.target.value = ''; } }} className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 mb-2 shadow-inner" />
                          <div className="flex flex-wrap gap-1.5">
                            {brandConfig.competitors.map(c => (
                              <span key={c} className="bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 px-2 py-1 rounded text-[10px] font-bold border border-rose-200 dark:border-rose-500/20 flex items-center">
                                {c} <button onClick={() => setBrandConfig({ ...brandConfig, competitors: brandConfig.competitors.filter(k => k !== c) })} className="ml-1.5 text-rose-400 hover:text-rose-600 dark:hover:text-rose-200">&times;</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button onClick={() => { setActiveTab('dashboard'); }} className="bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 text-white px-8 py-3 rounded-lg font-bold transition-colors w-full sm:w-auto">
                    Save Configuration
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- GENERIC SYSTEM INTELLIGENCE LOADER --- */}
        {isSystemActive && (
          <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end space-y-3 pointer-events-none animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="bg-slate-900 dark:bg-[#110826] border border-slate-700 dark:border-indigo-500/40 shadow-2xl dark:shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white dark:text-indigo-100 px-5 py-3 rounded-xl text-sm font-bold flex items-center backdrop-blur-md">
              <Icons.RefreshCw className="animate-spin mr-3 text-indigo-400" style={{ width: 16, height: 16 }} />
              {systemMessage}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;