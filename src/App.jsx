import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { cosineSimilarity, generateEmbedding } from './utils/aiClient';
import { trackEvent } from './utils/telemetry';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { useRedditStore } from './store/useRedditStore';

// --- GLOBAL SETTINGS ---
const defaultApiKey = "";

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

  const allPosts = Object.values(allProfilesPosts || {}).flat();
  const extractedTopics = extractTopicsFromPosts(
    allPosts,
    [
      brandConfig.primaryBrand,
      ...(brandConfig.keywords || []),
      ...(brandConfig.competitors || [])
    ]
  );

  let subjectAlternative = coreSubject;

  if (extractedTopics.length > 0) {
    const alternativeTopic = extractedTopics.find(
      topic =>
        topic.name &&
        topic.name.toLowerCase() !== coreSubject.toLowerCase()
    );

    if (alternativeTopic) {
      subjectAlternative = alternativeTopic.name;
    }
  }

  // Find a different topic from the extracted list
  const alternativeTopic = extractedTopics.find(
    topic =>
      topic.name &&
      topic.name.toLowerCase() !== coreSubject.toLowerCase()
  );

  if (alternativeTopic) {
    subjectAlternative = alternativeTopic.name;
  }

  if (isComparison) {
    const p = query.split(" vs ");
    return [`differences between ${p[0]} and ${p[1]}`, `which is better ${p[0]} or ${p[1]}`, `${p[0]} pros and cons compared to ${p[1]}`, `migrating from ${p[0]} to ${p[1]}`, `top alternatives to ${p[0]} and ${p[1]}`, `${p[0]} vs ${p[1]} for ${context}`];
  }
  return [`top ${subjectAlternative} supporting ${context}`, `how to implement ${context} in ${coreSubject}`, `best practices for ${query}`, `${coreSubject} vs alternatives for ${context}`, `${context} native ${subjectAlternative}`, `troubleshooting ${context} integration in ${coreSubject}`];
}

function extractTopicsFromPosts(posts, brandKeywords = []) {
  if (!posts || posts.length === 0) return [];
  const text = posts.map(p => (p.title + " " + (p.selftext || ""))).join(" ");
  const knownKeywords = [...brandKeywords.map(k => k.toLowerCase())];
  let counts = {};
  knownKeywords.forEach(kw => { const matches = text.match(new RegExp(`\\b${kw}\\b`, 'gi')); if (matches) counts[kw.toUpperCase()] = matches.length; });
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
  if (!post.embedding) return 0;
  const appStore = useAppStore.getState();
  if (!appStore.brandConfigEmbedding) return 0;
  const sim = cosineSimilarity(post.embedding, appStore.brandConfigEmbedding);
  return Math.max(0, Math.round(sim * 100));
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
  Cpu: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>,
  Trash: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
  Plug: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" /></svg>,
  Clock: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  Sun: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
  Moon: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  PenTool: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>,
  Crosshair: (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>
};

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
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.8" />
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
                fill={hoveredIdx === i ? "#a78bfa" : "url(#barGradient)"}
                className="transition-colors duration-300"
              />
            </g>
          );
        })}
      </svg>
      <div className="w-full h-[1px] bg-black/10 dark:bg-white/10 mt-2"></div>

      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/20 px-4 py-3 rounded-xl shadow-2xl pointer-events-none z-50 min-w-[240px] max-w-[320px] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-2 border-b border-gray-100 dark:border-white/10 pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">{data[hoveredIdx].type}</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{data[hoveredIdx].llmScore}% Vis</span>
          </div>
          <div className={`text-sm font-medium text-gray-800 dark:text-white line-clamp-2 leading-snug`}>
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
            <stop offset="0%" stopColor="#a855f7" />
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
                  <rect x={x + barWidth / 2 - 12} y={y - 12} width={24} height={8} rx="1" fill="#ffffff" stroke="#e2e8f0" className="dark:fill-[#0f172a] dark:stroke-[#334155]" strokeWidth="0.5" />
                  <text x={x + barWidth / 2} y={y - 6} fontSize="3.5" fill="currentColor" textAnchor="middle" className="font-bold text-gray-800 dark:text-[#f8fafc]">{d.redditWeight.toFixed(0)} wt</text>
                  <polygon points={`${x + barWidth / 2 - 2},${y - 4} ${x + barWidth / 2 + 2},${y - 4} ${x + barWidth / 2},${y - 2}`} className="fill-white dark:fill-[#0f172a]" />
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

const fallbackDemoData = [
  { id: '1', type: 'post', title: 'How to fix hydration mismatch in Next.js 14?', selftext: 'To solve hydration issues, ensure standard setup and read documentation carefully.', score: 450, num_comments: 82, views: 12450, subreddit: 'reactjs', url: 'https://reddit.com/r/reactjs/1', created_utc: Date.now() / 1000 - (80 * 86400) },
  { id: '2', type: 'post', title: 'Why is Tailwind not loading in my app directory?', selftext: 'Make sure your tailwind.config.js content array includes the app/ folder.', score: 320, num_comments: 45, views: 8900, subreddit: 'nextjs', url: 'https://reddit.com/r/nextjs/2', created_utc: Date.now() / 1000 - (50 * 86400) },
  { id: 'c1', type: 'comment', title: 'Comment on: Understanding React Server Components', selftext: 'Server components run exclusively on the server, reducing the JS bundle size.', score: 120, num_comments: 0, views: 1500, subreddit: 'reactjs', url: 'https://reddit.com/r/reactjs/c1', created_utc: Date.now() / 1000 - (45 * 86400) }
];

const App = () => {
  const { theme, setTheme } = useAppStore();
  const { brandConfig, setBrandConfig } = useAppStore();
  const { isBrandConfigSaved, setIsBrandConfigSaved } = useAppStore();
  const { isRedditIntelligenceExpanded, setIsRedditIntelligenceExpanded } = useAppStore();

  
  const { profiles, setProfiles } = useRedditStore();
  const [newProfileInput, setNewProfileInput] = useState('');
  const { username, setUsername } = useRedditStore();
  const { dataSource, setDataSource } = useRedditStore();
  const { manualJson, setManualJson } = useRedditStore();
  const { posts, setPosts } = useRedditStore();
  const { loading, setLoading } = useRedditStore();
  const { error, setError } = useRedditStore();
  const [isManualJsonOpen, setIsManualJsonOpen] = useState(false);

  // Custom Date Filters
  const [dashboardTimeRange, setDashboardTimeRange] = useState('all');
  const [dashboardCustomDates, setDashboardCustomDates] = useState({ from: '', to: '' });
  const [dashboardContentType, setDashboardContentType] = useState('all');

  const [citationTimeRange, setCitationTimeRange] = useState('all');
  const [citationCustomDates, setCitationCustomDates] = useState({ from: '', to: '' });
  const [citationContentType, setCitationContentType] = useState('all');
  const [selectedCitationId, setSelectedCitationId] = useState('all');

  const [postsTimeRange, setPostsTimeRange] = useState('all');
  const [postsCustomDates, setPostsCustomDates] = useState({ from: '', to: '' });
  const [postsContentType, setPostsContentType] = useState('all');

  const [spotlightTimeRange, setSpotlightTimeRange] = useState('all');
  const [spotlightCustomDates, setSpotlightCustomDates] = useState({ from: '', to: '' });

  const [queryTimeRange, setQueryTimeRange] = useState('all');
  const [queryCustomDates, setQueryCustomDates] = useState({ from: '', to: '' });

  // Query Tester State
  const [queryTesterMode, setQueryTesterMode] = useState('semantic'); // semantic, rater
  const [queryInput, setQueryInput] = useState('');
  const [results, setResults] = useState({ matches: [], discoverabilityScore: 0, isAnalyzing: false, analysisText: null, hasRun: false });
  const [draftContent, setDraftContent] = useState('');
  const [raterResults, setRaterResults] = useState(null);

  // Content Suggester State
  const [suggestedContentList, setSuggestedContentList] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Competitor Analyzer State
  const [competitorKeywords, setCompetitorKeywords] = useState([(brandConfig.competitors[0] || "Competitor A"), (brandConfig.competitors[1] || "Competitor B")]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [competitorPosts, setCompetitorPosts] = useState([]);
  const [isScanningCompetitors, setIsScanningCompetitors] = useState(false);

  // --- AI Search Monitoring State ---
  const [monitorTimeRange, setMonitorTimeRange] = useState('all');
  const [monitorCustomDates, setMonitorCustomDates] = useState({ from: '', to: '' });
  const [monitorSubTab, setMonitorSubTab] = useState('manual');
  const [savedQueries, setSavedQueries] = useState([
    { id: 'q1', text: 'enter keyword', category: 'General', lastRun: null },
    { id: 'q2', text: 'enter keyword', category: 'General', lastRun: null },
  ]);
  const [newQueryText, setNewQueryText] = useState('');
  const [newQueryCategory, setNewQueryCategory] = useState('General');

  const [queryContextSources, setQueryContextSources] = useState([
    { id: 's1', type: 'brand', value: (brandConfig.primaryBrand || "Your Brand") },
    { id: 's2', type: 'url', value: 'example.com' }
  ]);
  const [newSourceType, setNewSourceType] = useState('brand');
  const [newSourceValue, setNewSourceValue] = useState('');

  const { providers, setProviders } = useAppStore();
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [tempApiKey, setTempApiKey] = useState('');
  const [isExecutingQuery, setIsExecutingQuery] = useState(null);
  const [expandedQueryId, setExpandedQueryId] = useState(null);

  // --- Share of Voice State ---
  const [sovViewMode, setSovViewMode] = useState('queries');
  const [queryHistory, setQueryHistory] = useState([]);
  const [sovTimeRange, setSovTimeRange] = useState('all');
  const [sovCustomDates, setSovCustomDates] = useState({ from: '', to: '' });
  const [customSovDomains, setCustomSovDomains] = useState([]);
  const [newSovDomain, setNewSovDomain] = useState('');

  const [profileSovData, setProfileSovData] = useState([]);
  const [isScanningProfile, setIsScanningProfile] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [showUserContribution, setShowUserContribution] = useState(false);
  const [liveSovData, setLiveSovData] = useState([]);
  const liveScanRef = useRef(null);

  const { allProfilesPosts, setAllProfilesPosts } = useRedditStore();

  // --- Real MCP Orchestration State ---
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

  useEffect(() => { setSelectedCitationId('all'); }, [citationContentType, citationTimeRange, citationCustomDates]);
  useEffect(() => { if (posts.length > 0) setAllProfilesPosts(prev => ({ ...prev, [username]: posts })); }, [posts, username]);
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (liveScanRef.current) clearInterval(liveScanRef.current);
    };
  }, []);

  // Theme Toggle Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleAddProfile = () => {
    const cleanProfile = newProfileInput.trim();
    if (cleanProfile && !profiles.includes(cleanProfile)) {
      setProfiles([...profiles, cleanProfile]); setUsername(cleanProfile); setNewProfileInput('');
    }
  };

  const applyTimeFilter = (items, rangeMode, customDates, timestampField = 'created_utc') => {
    if (rangeMode === 'all') return items;
    const now = Date.now() / 1000;
    if (rangeMode === 'custom') {
      const fromSec = customDates.from ? new Date(customDates.from).getTime() / 1000 : 0;
      const toSec = customDates.to ? new Date(customDates.to).getTime() / 1000 + 86399 : now;
      return items.filter(p => p[timestampField] >= fromSec && p[timestampField] <= toSec);
    }
    return items.filter(p => (now - p[timestampField]) <= parseInt(rangeMode) * 86400);
  };

  const dashboardData = useMemo(() => {
    let filtered = applyTimeFilter(posts, dashboardTimeRange, dashboardCustomDates);
    const postsPublished = filtered.filter(p => p.type === 'post').length;
    const commentsPublished = filtered.filter(p => p.type === 'comment').length;
    if (dashboardContentType !== 'all') filtered = filtered.filter(p => p.type === dashboardContentType);
    const totalUpvotes = filtered.reduce((acc, p) => acc + p.score, 0);
    const totalViews = filtered.reduce((acc, p) => acc + (p.views || (p.score * 15)), 0);
    const recentTrend = [...filtered].sort((a, b) => a.created_utc - b.created_utc).slice(-15).map(p => ({ id: p.id, title: p.title, selftext: p.selftext, type: p.type, llmScore: calculateAvgLLMVisibility(p) }));
    return { postsPublished, commentsPublished, totalUpvotes, totalViews, recentTrend, filteredCount: filtered.length };
  }, [posts, dashboardTimeRange, dashboardCustomDates, dashboardContentType]);

  const topRankingKeyword = useMemo(() => {
    const successful = savedQueries.filter(q => q.profileSurfaced && q.llmMentionsDoc360);
    if (successful.length === 0) return { text: "No successful queries yet", rank: "-" };
    const sorted = successful.sort((a, b) => (a.browserSearchRank || 99) - (b.browserSearchRank || 99));
    return { text: sorted[0].text, rank: sorted[0].browserSearchRank ? `#${sorted[0].browserSearchRank}` : 'Page 1' };
  }, [savedQueries]);

  const { fetchRedditData } = useRedditStore();

  useEffect(() => { fetchRedditData(false); }, [dataSource, username]);

  const handleAnalyzeQuery = async () => {
    if (!queryInput) return;
    setResults({ matches: [], discoverabilityScore: 0, isAnalyzing: true, analysisText: null, hasRun: false });

    setTimeout(async () => {
      let filteredPosts = applyTimeFilter(posts, queryTimeRange, queryCustomDates);
      const analyzedMatches = filteredPosts.map(post => {
        const score = queryDocumentSimilarity(queryInput, queryInput, `${post.title} ${post.selftext}`);
        return { post, score };
      }).filter(m => m.score > 0.05).sort((a, b) => b.score - a.score);

      const maxScore = analyzedMatches.length > 0 ? analyzedMatches[0].score : 0;
      const discoverability = Math.min(99, Math.round(maxScore * 100));
      
      trackEvent('query_tested', { 
        query: queryInput, 
        score: discoverability,
        matches_found: analyzedMatches.length 
      });

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
      let critique = "Looks organic and adds value to the community conversation. Ensure you disclose any brand affiliation clearly if recommending " + (brandConfig.primaryBrand || "Your Brand") + ".";

      if (lower.includes("buy now") || lower.includes("click here") || lower.includes("check out our tool")) {
        score = 30;
        critique = "Highly promotional language detected. This is likely to trigger Reddit spam filters or attract downvotes. Focus on answering the user's technical question first before dropping a link.";
      } else if (draftContent.length < 50 && lower.includes((brandConfig.brandName || "").toLowerCase())) {
        score = 55;
        critique = "Too short. Quick brand drops without technical context look like astroturfing. Expand on *why* the tool solves the problem.";
      }

      setRaterResults({ score, critique, isAnalyzing: false });
    }, 800);
  };

  const handleSuggestContent = () => {
    setIsSuggesting(true);

    // Simulating deep analysis of current tracking states
    const topQuery = savedQueries.length > 0 ? savedQueries[0].text : brandConfig.searchTerms[0] || "industry solutions";
    const topCompetitor = competitorKeywords.length > 0 ? competitorKeywords[0] : (brandConfig.competitors[1] || "the competition");
    const allPosts = Object.values(allProfilesPosts).flat();
    const extractedFeatures = extractTopicsFromPosts(allPosts, [brandConfig.primaryBrand, ...brandConfig.keywords, ...brandConfig.competitors]);
    const topFeature = extractedFeatures.length > 0 ? extractedFeatures[0].name : brandConfig.keywords[0] || "core feature";
    const industry = brandConfig.industry || "the industry";

    setTimeout(() => {
      const suggestions = [
        {
          type: "comment",
          sub: "r/devops",
          targetPostTitle: `Migrating away from ${topCompetitor} - need recommendations`,
          queryContext: topQuery,
          draft: `We hit the exact same scaling issues with ${topCompetitor} last year. If you're dealing with complex requirements in ${industry}, ${brandConfig.primaryBrand || "Your Brand"} handles that split well. Just make sure to define your architecture before migrating.`,
          score: 92,
          reason: "Highly organic. Directly answers the OP's pain point regarding a tracked competitor while offering a practical architectural tip.",
          ruleAdherence: "Passes self-promotion rules (10:1 ratio observed in profile). No direct links included, ensuring it bypasses Automod."
        },
        {
          type: "post",
          sub: "r/technology",
          queryContext: topFeature,
          draft: `A breakdown of how we implemented ${topFeature} (Lessons Learned)\n\nWe recently revamped our setup to support modern workflows. A few things we learned:\n1. Planning matters more than raw features...\n2. We used ${brandConfig.primaryBrand || "Your Brand"} for its native capabilities...\n3. Keep your configurations clean.\n\nHappy to answer any questions about the migration process!`,
          score: 88,
          reason: "High-value, educational post. The community responds well to 'lessons learned' and case studies. Mentioning the tool is secondary to the technical advice.",
          ruleAdherence: "Strictly educational. Adheres to community guidelines against direct vendor pitching. High likelihood of upvotes."
        },
        {
          type: "comment",
          sub: "r/SaaS",
          targetPostTitle: `What is your stack for ${industry}?`,
          queryContext: "platform solutions",
          draft: `We evaluated a bunch of tools last quarter. The generic ones got messy at scale. We ended up with ${brandConfig.primaryBrand || "Your Brand"} for the pure versioning features. Might be overkill if you're pre-seed, but saves headaches later.`,
          score: 85,
          reason: "Contributes a real-world evaluation story. Acknowledges a drawback (overkill for pre-seed) which dramatically increases Reddit trust.",
          ruleAdherence: "Conversational and non-promotional. Safe to post under standard SaaS community guidelines."
        }
      ];
      setSuggestedContentList(suggestions);
      setIsSuggesting(false);
    }, 1500);
  };

  const handleScanCompetitors = () => {
    setIsScanningCompetitors(true);
    setTimeout(() => {

      setCompetitorPosts(mockPosts);
      setIsScanningCompetitors(false);
    }, 1500);
  };

  const opportunities = [];

  posts.forEach(post => {
    const text = `${post.title} ${post.selftext}`.toLowerCase();

    let score = 0;
    let reason = null;

    if (
      text.includes("alternative") ||
      text.includes("replace") ||
      text.includes("migration")
    ) {
      score += 40;
      reason = "Migration intent detected";
    }

    if (
      text.includes("problem") ||
      text.includes("issue") ||
      text.includes("slow")
    ) {
      score += 25;
      reason = "Pain point discussion";
    }

    if (
      text.includes("best") ||
      text.includes("recommendation")
    ) {
      score += 20;
      reason = "Purchase research intent";
    }

    if (score > 0) {
      opportunities.push({
        id: post.id,
        subreddit: post.subreddit,
        title: post.title,
        url: post.url,
        score,
        reason
      });
    }
  });

  const availableCitationItems = useMemo(() => {
    let filtered = applyTimeFilter(posts, citationTimeRange, citationCustomDates);
    if (citationContentType !== 'all') filtered = filtered.filter(p => p.type === citationContentType);
    return filtered;
  }, [posts, citationTimeRange, citationCustomDates, citationContentType]);

  const platformStats = useMemo(() => {
    if (!availableCitationItems.length) return null;
    let filtered = availableCitationItems;
    if (selectedCitationId !== 'all') filtered = filtered.filter(p => p.id === selectedCitationId);
    if (!filtered.length) return [];

    const platforms = [
      { id: 'perplexity', name: 'Perplexity AI', color: 'bg-indigo-500' },
      { id: 'chatgpt', name: 'ChatGPT (OpenAI)', color: 'bg-emerald-500' },
      { id: 'claude', name: 'Claude (Anthropic)', color: 'bg-orange-500' },
      { id: 'gemini', name: 'Google Gemini', color: 'bg-purple-500' }
    ];

    return platforms.map((plat) => {
      let totalMatch = 0;
      filtered.forEach(p => {
        let baseMultiplier = 1.0;
        if (plat.id === 'perplexity') baseMultiplier = p.type === 'comment' ? 1.4 : 1.1;
        if (plat.id === 'chatgpt') baseMultiplier = 1.0;
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
        if (plat.id === 'perplexity') insight = `Perplexity heavily weights community validation. Because this ${p.type} has ${p.num_comments} active comments and ${p.score} upvotes, it scored ${finalScore}%. This indicates it is highly likely to be scraped as a primary source for conversational RAG queries.`;
        if (plat.id === 'chatgpt') insight = `ChatGPT Search algorithms focus on structural keyword density and domain authority. With its length and formatting, it achieved a ${finalScore}% semantic extraction probability.`;
        if (plat.id === 'claude') insight = `Claude indexes long-form, well-structured text. This ${p.type}'s formatting resulted in a ${finalScore}% ingestion confidence score.`;
        if (plat.id === 'gemini') insight = `Gemini utilizes live Google Search grounding. Based on this ${p.type}'s real-time keyword footprint on Reddit, it has a ${finalScore}% probability of appearing in SGE answers.`;
      }

      return { ...plat, score: finalScore, insight };
    }).sort((a, b) => b.score - a.score);
  }, [availableCitationItems, selectedCitationId]);

  const displayedPosts = useMemo(() => {
    let p = applyTimeFilter(posts, postsTimeRange, postsCustomDates);
    if (postsContentType !== 'all') p = p.filter(item => item.type === postsContentType);
    return p;
  }, [posts, postsTimeRange, postsCustomDates, postsContentType]);

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

      // Extract features dynamically from indexed posts (Feature Spotlight Engine)
      const allPosts = Object.values(allProfilesPosts).flat();
      const extractedFeatures = extractTopicsFromPosts(allPosts, [brandConfig.primaryBrand, ...brandConfig.keywords, ...brandConfig.competitors]).slice(0, 4).map(t => t.name.toLowerCase());

      let generated = [];
      if (brands.length > 0) {
        generated.push({ id: `q_${Date.now()}_1`, text: `top alternatives to ${brands[0]}`, category: 'Informational', lastRun: null });
        generated.push({ id: `q_${Date.now()}_2`, text: `${brands[0]} vs competitors`, category: 'Comparison', lastRun: null });
        if (brands.length > 1) {
          generated.push({ id: `q_${Date.now()}_3`, text: `${brands[0]} vs ${brands[1]}`, category: 'Transactional', lastRun: null });
        }

        // Inject extracted spotlight features paired with the brand
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

  // --- MCP ORCHESTRATION PIPELINE ---
  const sendMcpRequest = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = (messageIdRef.current++).toString();
      pendingRequests.current.set(id, { resolve, reject });
      const payload = { jsonrpc: "2.0", id, method, params };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
        setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] -> ${method}`]);
      } else reject(new Error("WebSocket is not connected."));
    });
  };

  const connectMCP = async () => {
    setMcpStatus('connecting'); setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Connecting...`]);
    if (isSimulatedMcp) {
      setTimeout(() => {
        setMcpStatus('connected');
        setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Connection established!`, `[${new Date().toLocaleTimeString()}] Client successfully registered as AEO-Dashboard-v1`]);
        setTimeout(() => {
          setMcpTools([{ name: "deep_serp_search", description: "Multi-engine deep SERP scraping.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } }]);
          setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Server exposed local adapter tools.`]);
        }, 800);
      }, 1000);
      return;
    }
  };

  const disconnectMCP = () => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setMcpStatus('disconnected'); setMcpTools([]); setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Disconnected from MCP server.`]);
  };

  const mcpCallTool = async (toolName, args, traceId = null) => {
    const startTime = Date.now();
    setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] -> Calling tool: ${toolName}...`]);
    if (traceId) setExecutionTraces(prev => [...prev, { id: traceId, tool: toolName, status: 'running', time: 0 }]);
    try {
      let result;
      if (isSimulatedMcp) {
        result = { text: "Local Tool Execution Successful", source: "Local Sandbox" };
      } else {
        const remoteRes = await sendMcpRequest('tools/call', { name: toolName, arguments: args });
        if (remoteRes.content && remoteRes.content[0]?.text) {
          try { result = JSON.parse(remoteRes.content[0].text); }
          catch (e) { result = { text: remoteRes.content[0].text, source: "Remote MCP Server" }; }
        } else result = remoteRes;
      }
      const duration = Date.now() - startTime;
      setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] <- [Success] ${toolName} executed in ${duration}ms`]);
      if (traceId) setExecutionTraces(prev => prev.map(t => t.id === traceId ? { ...t, status: 'success', time: duration, data: result } : t));
      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] <- [Error] ${toolName} failed: ${err.message}`]);
      if (traceId) setExecutionTraces(prev => prev.map(t => t.id === traceId ? { ...t, status: 'error', time: duration, error: err.message } : t));
      throw err;
    }
  };

  const runMCPTool = async (toolName) => {
    try { await mcpCallTool(toolName, JSON.parse(toolArgs[toolName] || '{}')); } catch (err) { }
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
    let realLlmResponse = null;
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
      const redditProbability = isDiscussionHeavy ? 0.85 : 0.35;
      const redditSurfaces = Math.random() < redditProbability;

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
    if (totalHits >= 8) combinedRankEquivalent = "Tier 1 (High Visibility)";
    else if (totalHits >= 5) combinedRankEquivalent = "Tier 2 (Moderate Visibility)";
    else if (totalHits >= 2) combinedRankEquivalent = "Tier 3 (Low Visibility)";
    else if (totalHits > 0) combinedRankEquivalent = "Tier 4 (Marginal)";

    let profileSurfaced = totalHits > 0;
    let profileVisScore = profileSurfaced ? Math.round((maxVisScore * 0.7) + ((userSurfaceCount / 10) * 30)) : 0;
    let mentionsBrand = false;

    const brandSources = queryContextSources.filter(s => s.type === 'brand');
    const targetBrand = brandSources.length > 0 ? brandSources[0].value.toLowerCase() : 'brand';
    const shortBrand = targetBrand.split('.')[0];

    if (bestOverallPost) {
      const text = `${bestOverallPost.title} ${bestOverallPost.selftext}`.toLowerCase();
      mentionsBrand = text.includes(targetBrand) || text.includes(shortBrand);
    }

    try {
      const hnRes = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(queryObj.text)}&hitsPerPage=4`).then(r => r.json());
      hnRes.hits?.forEach((hit, idx) => {
        const score = Math.round(queryDocumentSimilarity(queryObj.text, queryObj.text, `${hit.title} ${hit.story_text || ''}`) * 110);
        if (score > 15) externalCitations.push({ domain: 'news.ycombinator.com', type: 'forum', weight: score, url: hit.url || `news.ycombinator.com/item?id=${hit.objectID}` });
      });
      if (profileSurfaced) {
        browserSearchSurfaced = true;
        externalCitations.push({ domain: 'reddit.com', type: 'reddit', weight: Math.max(profileVisScore, 40), url: `reddit.com/r/${bestOverallPost?.subreddit || 'technology'}` });
      }
    } catch (err) { }

    let finalLlmResponse = "";
    const pConf = activeProvidersList.find(p => p.apiKey && p.apiKey !== 'internal');

    if (pConf) {
      try {
        let apiUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://api.openai.com/v1/chat/completions');
        let model = 'gpt-3.5-turbo';
        if (pConf.id === 'perplexity') {
          apiUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://api.perplexity.ai/chat/completions');
          model = 'llama-3-sonar-small-32k-chat';
        }
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pConf.apiKey}` };
        const contextMsg = profileSurfaced && bestOverallPost ? ` Consider this context from a community post: "${bestOverallPost.title} - ${bestOverallPost.selftext.substring(0, 300)}"` : '';
        const reqBody = { model: model, messages: [{ role: 'system', content: 'You are a concise search assistant.' }, { role: 'user', content: `Answer this query in 2-3 sentences: ${queryObj.text}.${contextMsg}` }], max_tokens: 150 };
        const res = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(reqBody) });
        if (res.ok) {
          const data = await res.json();
          finalLlmResponse = data.choices[0].message.content;
          usedProviderName = pConf.name;
        }
      } catch (e) { console.warn("LLM API failed, falling back to local extraction", e); }
    }

    if (!finalLlmResponse) {
      if (profileSurfaced && bestOverallPost) {
        const text = bestOverallPost.selftext || "";
        const sentences = text.split(/[.?!]/).map(s => s.trim()).filter(s => s.length > 15);
        let relevantSentence = sentences.find(s => s.toLowerCase().includes(targetBrand) || s.toLowerCase().includes(shortBrand));
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

    let llmMentionsBrand = false; let docSnippet = null;
    const lowerLlmText = finalLlmResponse.toLowerCase();

    let matchIndex = lowerLlmText.indexOf(targetBrand);
    if (matchIndex === -1) matchIndex = lowerLlmText.indexOf(shortBrand);

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
          optTips.push(`Strong Positioning: Your post surfaced effectively as a primary context source and the AI explicitly included ${brandSources.length > 0 ? brandSources[0].value : 'the target brand'} in its final generated answer.`);
        } else {
          optTips.push(`Context Provided: The post was part of the AI search results and ${brandSources.length > 0 ? brandSources[0].value : 'the target brand'} was mentioned.`);
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
      id: `hist_${Date.now()}`, query: queryObj.text, category: queryObj.category, timestamp: Date.now() / 1000, providersUsed: activeProvidersList.map(p => p.id), usedProviderName, redditSurfaced: externalCitations.some(s => s.type === 'reddit'), profileSurfaced, profileVisibilityScore: profileVisScore, userSurfaceCount, totalRedditSurfaceCount, combinedRankEquivalent, totalRunQueries: allQueriesToRun.length, llmMentionsDoc360: llmMentionsBrand, doc360Snippet: docSnippet, browserSearchSurfaced, optimizationTips: optTips, surfacedPostUrl: bestOverallPost?.url || null, surfacedPostTitle: bestOverallPost?.title || null, sources: externalCitations
    };

    setQueryHistory(prev => [newHistoryRecord, ...prev]);
    setSavedQueries(prev => prev.map(q => q.id === queryId ? { ...q, lastRun: Date.now() / 1000, profileVisibilityScore: profileVisScore, profileSurfaced, userSurfaceCount, totalRedditSurfaceCount, combinedRankEquivalent, totalRunQueries: allQueriesToRun.length, optimizationTips: optTips, llmMentionsDoc360: llmMentionsBrand, doc360Snippet: docSnippet, browserSearchSurfaced, surfacedPostUrl: bestOverallPost?.url || null, surfacedPostTitle: bestOverallPost?.title || null, usedProviderName } : q));
    setIsExecutingQuery(null);
    setExpandedQueryId(queryId);
  };

  useEffect(() => {
    if (!isLiveScanning) { if (liveScanRef.current) clearInterval(liveScanRef.current); return; }

    liveScanRef.current = setInterval(() => {
      if (savedQueries.length === 0) return;

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
    if (monitorTimeRange !== 'all') {
      const now = Date.now() / 1000;
      const days = monitorTimeRange === 'custom' ? monitorCustomDates : { from: '', to: '' };
      if (monitorTimeRange === 'custom') {
        const fromSec = days.from ? new Date(days.from).getTime() / 1000 : 0;
        const toSec = days.to ? new Date(days.to).getTime() / 1000 + 86399 : now;
        hist = hist.filter(h => h.timestamp >= fromSec && h.timestamp <= toSec);
      } else {
        hist = hist.filter(h => (now - h.timestamp) <= parseInt(monitorTimeRange) * 86400);
      }
    }

    return savedQueries.map(sq => {
      const runsInPeriod = hist.filter(h => h.query === sq.text).sort((a, b) => b.timestamp - a.timestamp);
      if (runsInPeriod.length > 0) {
        return { ...sq, lastRun: runsInPeriod[0].timestamp, profileVisibilityScore: runsInPeriod[0].profileVisibilityScore, profileSurfaced: runsInPeriod[0].profileSurfaced, userSurfaceCount: runsInPeriod[0].userSurfaceCount, totalRedditSurfaceCount: runsInPeriod[0].totalRedditSurfaceCount, combinedRankEquivalent: runsInPeriod[0].combinedRankEquivalent, totalRunQueries: runsInPeriod[0].totalRunQueries, optimizationTips: runsInPeriod[0].optimizationTips, llmMentionsDoc360: runsInPeriod[0].llmMentionsDoc360, doc360Snippet: runsInPeriod[0].doc360Snippet, browserSearchSurfaced: runsInPeriod[0].browserSearchSurfaced, surfacedPostUrl: runsInPeriod[0].surfacedPostUrl, surfacedPostTitle: runsInPeriod[0].surfacedPostTitle, usedProviderName: runsInPeriod[0].usedProviderName };
      }
      return { ...sq, lastRun: null, profileVisibilityScore: 0, profileSurfaced: false, userSurfaceCount: 0, totalRedditSurfaceCount: 0, combinedRankEquivalent: 'Unranked', totalRunQueries: 0, optimizationTips: [], llmMentionsDoc360: false, doc360Snippet: null, browserSearchSurfaced: false, surfacedPostUrl: null, surfacedPostTitle: null, usedProviderName: null };
    });
  }, [savedQueries, queryHistory, monitorTimeRange, monitorCustomDates]);

  // --- Real Share of Voice Calculations ---
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

    const filteredScan = applyTimeFilter(sovViewMode === 'live' ? liveSovData : queryHistory, sovTimeRange, sovCustomDates, 'timestamp');

    filteredScan.forEach(scan => {
      if (sovViewMode === 'queries') {
        let thisRedditOverall = 0;
        let thisUser = 0;
        let thisForum = 0;
        let thisOfficial = 0;
        if (scan.profileSurfaced) {
          thisUser = scan.profileVisibilityScore || 50;
          thisRedditOverall = Math.max(thisUser, scan.totalRedditSurfaceCount * 10);
        } else if (scan.totalRedditSurfaceCount > 0) {
          thisRedditOverall = scan.totalRedditSurfaceCount * 10;
        }
        if (scan.sources) {
          scan.sources.forEach(src => {
            if (src.type === 'forum') thisForum += src.weight;
            else if (src.type === 'reddit') thisRedditOverall = Math.max(thisRedditOverall, src.weight);
            else if (src.type === 'docs') thisOfficial += src.weight;
            else customDomainsAgg[src.domain] = (customDomainsAgg[src.domain] || 0) + src.weight;
          });
        }
        if (thisOfficial === 0 && thisRedditOverall === 0) thisOfficial = 100;

        totalOfficial += thisOfficial;
        totalRedditOverall += thisRedditOverall;
        totalUser += thisUser;
        totalForum += thisForum;

        if (thisUser > 0 && scan.surfacedPostUrl) {
          const match = scan.surfacedPostUrl.match(/r\/([^\/]+)/);
          const sub = match ? match[1] : 'general';
          subredditMap[sub] = (subredditMap[sub] || 0) + thisUser;
        }

        timelineData.push({
          timestamp: scan.timestamp,
          redditWeight: showUserContribution ? thisUser : thisRedditOverall
        });
      } else {
        totalOfficial += scan.officialWeight || 0;
        totalRedditOverall += scan.redditOverallWeight || 0;
        totalUser += scan.userWeight || 0;
        totalForum += scan.forumWeight || 0;

        if (scan.customDomainWeights) {
          scan.customDomainWeights.forEach(cd => {
            customDomainsAgg[cd.domain] = (customDomainsAgg[cd.domain] || 0) + cd.weight;
          });
        }

        if (scan.userWeight > 0) {
          subredditMap[scan.subreddit] = (subredditMap[scan.subreddit] || 0) + scan.userWeight;
        }

        timelineData.push({
          timestamp: scan.timestamp,
          redditWeight: showUserContribution ? scan.userWeight : scan.redditOverallWeight
        });
      }
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

    return { domains, subreddits, redditStats, timelineData, ecosystemStats };
  }, [liveSovData, queryHistory, sovViewMode, sovTimeRange, sovCustomDates, customSovDomains, showUserContribution]);

  
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: Icons.Activity, path: '/dashboard' },
    { id: 'search_monitor', label: 'AI Search Monitoring', icon: Icons.Target, path: '/monitor' },
    { id: 'sov_analysis', label: 'Share of Voice', icon: Icons.PieChart, path: '/sov' },
    { id: 'subreddit_suggester', label: 'Subreddit Suggester', icon: Icons.PenTool, path: '/suggester' },
    { id: 'competitor_analyzer', label: 'Competitor Mentions', icon: Icons.Crosshair, path: '/competitors' },
    { id: 'spotlight', label: 'Feature Spotlight', icon: Icons.Star, path: '/spotlight' },
    { id: 'analytics', label: 'Platform Citations', icon: Icons.BarChart, path: '/analytics' },
    { id: 'query', label: 'Query Tester', icon: Icons.Terminal, path: '/query' },
    { id: 'mcp_integration', label: 'MCP Connect & Observe', icon: Icons.Plug, path: '/mcp' },
    { id: 'posts', label: 'Indexed Posts', icon: Icons.Layers, path: '/posts' },
    { id: 'settings', label: 'Architecture & Settings', icon: Icons.Settings, path: '/settings' }
  ];
  
  const activeTab = location.pathname === '/' ? 'brand_setup' : navItems.find(i => i.path === location.pathname)?.id || 'brand_setup';
  const setActiveTab = (id) => {
    if (id === 'brand_setup') navigate('/');
    else {
      const item = navItems.find(i => i.id === id);
      if (item) navigate(item.path);
    }
  };


  let isSignalScopeActive = false;
  let signalMessage = "";

  if (loading) { isSignalScopeActive = true; signalMessage = "SignalScope is processing data..."; }
  else if (results.isAnalyzing) { isSignalScopeActive = true; signalMessage = "SignalScope is evaluating semantics..."; }
  else if (isExecutingQuery !== null) { isSignalScopeActive = true; signalMessage = "SignalScope is analyzing execution pathways..."; }
  else if (isScanningProfile) { isSignalScopeActive = true; signalMessage = "SignalScope is running a deep profile scan..."; }
  else if (mcpStatus === 'connecting') { isSignalScopeActive = true; signalMessage = "SignalScope is initializing the MCP bridge..."; }
  else if (isSuggesting) { isSignalScopeActive = true; signalMessage = "SignalScope is brainstorming subreddit strategies..."; }
  else if (isScanningCompetitors) { isSignalScopeActive = true; signalMessage = "SignalScope is hunting for competitor mentions..."; }
  else if (raterResults?.isAnalyzing) { isSignalScopeActive = true; signalMessage = "SignalScope is checking for spamminess..."; }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 flex bg-[#050505] text-[#ededed] selection:bg-indigo-500/30`}>

      {/* Global Space Dashboard UI Effects */}
      <div className="mesh-bg"></div>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
      </svg>

      <div className="light-rays"></div>
      <div className="particle-orb orb-1"></div>
      <div className="particle-orb orb-2"></div>
      <div className="particle-orb orb-3"></div>
      <div className="scanner-line"></div>

      {/* Light Mode Specific Overrides to preserve Tailwind structure */}
      {theme === 'light' && (
        <style>{`
          .bg-\[\#0a0a0a\] { background-color: #ffffff !important; border-right-color: #e2e8f0 !important; }
          .bg-\[\#050505\] { background-color: #f8fafc !important; }
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
        
          @keyframes mesh {
            0% { background-position: 0% 0%; }
            50% { background-position: 100% 100%; }
            100% { background-position: 0% 0%; }
          }
          .mesh-bg {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 0;
            background: radial-gradient(circle at 15% 50%, rgba(79, 70, 229, 0.12), transparent 30%),
                        radial-gradient(circle at 85% 30%, rgba(217, 70, 239, 0.12), transparent 30%);
            background-size: 200% 200%;
            animation: mesh 20s ease infinite;
            pointer-events: none;
          }
          .glass-panel {
            background: rgba(10, 10, 15, 0.4) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .glass-panel:hover {
            box-shadow: 0 12px 40px 0 rgba(99, 102, 241, 0.15) !important;
          }
        `}</style>
      )}

      {/* Sidebar */}
      <aside className={`w-80 border-r flex flex-col flex-shrink-0 relative bg-[#0a0a0a] border-white/10`}>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/5 to-transparent pointer-events-none"></div>
        <div className={`p-6 border-b relative z-10 border-white/5`}>
          <a href="https://vampro.in/signalscope" target="_blank" rel="noreferrer" className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent flex flex-row items-center whitespace-nowrap drop-shadow-[0_0_15px_rgba(99,102,241,0.8)] hover:opacity-80 transition-opacity">
            <img src="/favicon.png" alt="SignalScope Logo" className="mr-2 w-6 h-6 object-contain" />
            <span className="mr-2">SignalScope</span>
            <span className="inline-flex items-center justify-center text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono tracking-wider shadow-[0_0_10px_rgba(99,102,241,0.4)]">v1.0 BETA</span>
          </a>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto relative z-10 custom-scrollbar">

          {/* REDDIT INTELLIGENCE ACCORDION */}
          <div className="mb-4">
            <button
              onClick={() => setIsRedditIntelligenceExpanded(!isRedditIntelligenceExpanded)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${isRedditIntelligenceExpanded ? 'text-indigo-500' : (theme === 'dark' ? 'text-gray-300' : 'text-slate-700')} hover:bg-indigo-500/10`}
            >
              <div className="flex items-center">
                <Icons.MessageSquare style={{ width: 16, height: 16 }} className="mr-2" />
                Reddit Intelligence
              </div>
              {isRedditIntelligenceExpanded ? <Icons.ChevronUp style={{ width: 14, height: 14 }} /> : <Icons.ChevronDown style={{ width: 14, height: 14 }} />}
            </button>

            {isRedditIntelligenceExpanded && (
              <div className="mt-1 ml-4 pl-3 border-l border-indigo-500/20 space-y-1">
                <button onClick={() => setActiveTab('brand_setup')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-xs ${activeTab === 'brand_setup' ? 'bg-indigo-500/10 text-indigo-500 font-medium' : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                  Brand Setup & Configuration
                </button>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-xs ${activeTab === item.id ? 'bg-indigo-500/10 text-indigo-500 font-medium' : theme === 'dark' ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}>
                      <Icon style={{ width: 14, height: 14 }} className="mr-2" /> {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* COMING SOON MODULES */}
          <div className={`text-xs font-semibold uppercase tracking-wider mt-8 mb-3 px-3 text-gray-500`}>Coming Soon</div>

          <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-500 opacity-60 cursor-not-allowed group" disabled>
            <div className="flex items-center">
              <Icons.Globe style={{ width: 16, height: 16 }} className="mr-3" />
              SERP Intelligence
            </div>
            <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded">Waitlist</span>
          </button>

          <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-500 opacity-60 cursor-not-allowed group" disabled>
            <div className="flex items-center">
              <Icons.User style={{ width: 16, height: 16 }} className="mr-3" />
              Social Intelligence
            </div>
            <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded">Waitlist</span>
          </button>

          <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-500 opacity-60 cursor-not-allowed group" disabled>
            <div className="flex items-center">
              <Icons.PenTool style={{ width: 16, height: 16 }} className="mr-3" />
              Blog Intelligence
            </div>
            <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded">Waitlist</span>
          </button>

          <text className="text-[10px] text-center text-gray-500/80 uppercase tracking-wider">Beta version can have inconsistencies, verify data manually till stable version is launched. Bug fixes are updated on a regular basis. In case of any issues feel free to reach out to support. </text>

        </nav>
        <div className="p-4 mt-auto border-t border-white/5 bg-black/10">
          <a href="https://vampro.in/" target="_blank" rel="noreferrer" className={`flex items-center justify-center w-full px-4 py-2.5 mb-3 text-xs font-semibold text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors`}>
            <img src="/favicon.png" alt="Vampro Logo" className="w-4 h-4 mr-2" />
            Visit Vampro.in
          </a>
          <p className="text-[10px] text-center text-gray-500/80 uppercase tracking-wider">Copyright Vampro 2026<br />Built by Darshan</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          <header className={`flex flex-col sm:flex-row sm:justify-between sm:items-end pb-6 border-b gap-4 border-white/10`}>
            <div>
              <h2 className={`text-3xl font-bold tracking-tight text-white`}>
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className={`mt-1 text-gray-400`}>
                {activeTab === 'search_monitor' ? 'Track custom keywords & API-connected search engines' :
                  activeTab === 'sov_analysis' ? 'Competitive source distribution mapping' :
                    activeTab === 'mcp_integration' ? 'AI Retrieval Intelligence & Generative Search Observability' :
                      activeTab === 'subreddit_suggester' ? 'Discover high-ROI subreddits & draft genuine content' :
                        activeTab === 'competitor_analyzer' ? 'Track competitor mentions & generate strategic replies' :
                          'Attribution & semantic knowledge tracking'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`p-2 rounded-full border transition-colors border-white/10 hover:bg-white/10 text-yellow-400`}
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Icons.Sun style={{ width: 18, height: 18 }} /> : <Icons.Moon style={{ width: 18, height: 18 }} />}
              </button>

              <div className={`flex items-center space-x-3 rounded-full px-5 py-2.5 border shadow-sm cursor-pointer transition-colors bg-gradient-to-r from-white/10 to-white/5 border-white/10 hover:bg-white/10`} onClick={() => setActiveTab('settings')}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-indigo-500/20`}>
                  <Icons.User style={{ width: 14, height: 14 }} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className={`text-sm font-semibold tracking-wide text-white`}>{username}</span>
              </div>
            </div>
          </header>

          <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* 1. Overview Dashboard */}

            {activeTab === 'brand_setup' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className={`p-6 rounded-xl border bg-[#0f172a]/60 border-white/5 shadow-sm`}>
                  <h2 className={`text-lg font-bold mb-6 flex items-center text-white`}>
                    <Icons.Settings className="mr-2 text-indigo-500" style={{ width: 20, height: 20 }} /> Brand Setup & Configuration
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Primary Brand Name</label>
                      <input type="text" value={brandConfig.primaryBrand} onChange={(e) => setBrandConfig({ ...brandConfig, primaryBrand: e.target.value })} className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500`} placeholder="e.g. Acme Corp" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Industry / Category</label>
                      <input type="text" value={brandConfig.industry} onChange={(e) => setBrandConfig({ ...brandConfig, industry: e.target.value })} className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500`} placeholder="e.g. AI Agents, Dev Tools" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Competitors (Comma Separated)</label>
                      <input type="text" value={brandConfig.competitors.join(', ')} onChange={(e) => setBrandConfig({ ...brandConfig, competitors: e.target.value.split(',').map(s => s.trim()) })} className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500`} placeholder="e.g. Competitor A, Competitor B" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Target Keywords (Comma Separated)</label>
                      <input type="text" value={brandConfig.keywords.join(', ')} onChange={(e) => setBrandConfig({ ...brandConfig, keywords: e.target.value.split(',').map(s => s.trim()) })} className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500`} placeholder="e.g. workflow, automation, rpa" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">Common Search Terms (Comma Separated)</label>
                      <input type="text" value={brandConfig.searchTerms.join(', ')} onChange={(e) => setBrandConfig({ ...brandConfig, searchTerms: e.target.value.split(',').map(s => s.trim()) })} className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500`} placeholder="e.g. best automation tools, how to build workflows" />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button onClick={() => { setIsBrandConfigSaved(true); setActiveTab('dashboard'); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all text-sm uppercase tracking-wider">Save Configuration</button>
                  </div>
                </div>
              </div>
            )}


            {(!manualJson || manualJson.trim() === '' || profiles.length === 0 || !isBrandConfigSaved) && activeTab !== 'settings' && activeTab !== 'brand_setup' ? (
              <div className="flex flex-col items-center justify-center h-[75vh] animate-in fade-in zoom-in duration-700">
                <div className="glass-panel p-16 rounded-3xl max-w-2xl text-center relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                  {/* Futuristic radar circles */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-indigo-500/20 rounded-full animate-[spin_10s_linear_infinite] pointer-events-none"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-fuchsia-500/20 rounded-full animate-[spin_7s_linear_infinite_reverse] pointer-events-none border-dashed"></div>

                  <Icons.AlertCircle className="w-24 h-24 text-fuchsia-500 mx-auto mb-8 drop-shadow-[0_0_25px_rgba(217,70,239,0.8)] animate-pulse relative z-10" />

                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 mb-6 drop-shadow-[0_0_15px_rgba(99,102,241,0.6)] tracking-tight relative z-10 uppercase">Awaiting Telemetry</h2>

                  <p className="text-indigo-200/80 mb-10 font-mono text-sm leading-relaxed max-w-md mx-auto relative z-10">
                    <span className="block text-cyan-400 mb-2">{">>"} STATUS: SYSTEM OFFLINE</span>
                    SignalScope requires a primary target profile and valid JSON dataset to initialize the intelligence dashboard.
                  </p>

                  <button onClick={() => setActiveTab('settings')} className="relative z-10 bg-indigo-600/80 hover:bg-fuchsia-600/80 backdrop-blur-md border border-white/20 text-white px-10 py-5 rounded-xl font-bold transition-all duration-500 shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:shadow-[0_0_50px_rgba(217,70,239,0.9)] transform hover:scale-105 active:scale-95 tracking-[0.2em] uppercase text-sm group overflow-hidden">
                    <span className="relative z-10">Configure Dashboard</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && <Dashboard />}

                {/* 2. AI Search Monitoring */}
                {activeTab === 'search_monitor' && (
                  <div className="space-y-6">

                    {/* Provider Connection Panel */}
                    <div className="glass-panel rounded-xl p-6 relative z-10">
                      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                        <div>
                          <h3 className={`text-lg font-semibold text-white flex items-center`}>
                            <Icons.Server className="mr-2 text-indigo-500" style={{ width: 18, height: 18 }} /> Search Providers
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">Connect APIs for live execution. Gemini uses the built-in Canvas engine by default.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {providers.map(p => (
                          <div key={p.id} className={`p-4 rounded-lg border transition-all ${p.enabled ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-black/40 border-white/10 opacity-70'}`}>
                            <div className="flex justify-between items-start mb-3">
                              <span className={`font-medium text-sm text-white`}>{p.name}</span>
                              <button onClick={() => toggleProvider(p.id)} className={`w-10 h-5 rounded-full relative transition-colors ${p.enabled ? 'bg-indigo-500' : 'bg-gray-400 dark:bg-gray-700'}`}>
                                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${p.enabled ? 'translate-x-5' : 'translate-x-1'}`}></div>
                              </button>
                            </div>

                            {editingProviderId === p.id ? (
                              <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                                <input type="password" placeholder="sk-..." value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)} className={`w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-xs text-white mb-2 focus:outline-none focus:border-indigo-500`} />
                                <div className="flex gap-2">
                                  <button onClick={() => saveApiKey(p.id)} className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs px-2 py-1 rounded hover:bg-indigo-500/30 flex-1 font-medium">Save</button>
                                  <button onClick={() => setEditingProviderId(null)} className="bg-gray-500/20 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded hover:bg-gray-500/30 font-medium">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-xs mt-1">
                                {p.isCustom ? (
                                  p.apiKey ?
                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center font-medium"><Icons.CheckCircle className="mr-1" style={{ width: 12, height: 12 }} /> API Active</span> :
                                    <span className="text-amber-600 dark:text-yellow-500 flex items-center font-medium"><Icons.AlertCircle className="mr-1" style={{ width: 12, height: 12 }} /> Needs Key</span>
                                ) : (
                                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center font-medium" title="Using secure built-in environment API"><Icons.Globe className="mr-1" style={{ width: 12, height: 12 }} /> Built-In Fallback</span>
                                )}

                                {p.isCustom && (
                                  <button onClick={() => { setEditingProviderId(p.id); setTempApiKey(p.apiKey); }} className={`text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-white px-2 py-1 bg-indigo-50 dark:bg-white/5 rounded transition-colors font-medium`} title="Set API Key">
                                    Set Key
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Query Library */}
                    <div className="bg-white/5 border border-white/10 rounded-xl shadow-xl overflow-hidden">
                      <div className="flex border-b border-white/10 bg-black/40">
                        <button onClick={() => setMonitorSubTab('manual')} className={`px-6 py-4 text-sm font-medium transition-colors ${monitorSubTab === 'manual' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>Manual Queries</button>
                        <button onClick={() => setMonitorSubTab('context')} className={`px-6 py-4 text-sm font-medium transition-colors ${monitorSubTab === 'context' ? 'border-b-2 border-fuchsia-500 text-fuchsia-600 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>Context & Sources</button>
                        <button onClick={() => setMonitorSubTab('auto')} className={`px-6 py-4 text-sm font-medium transition-colors ${monitorSubTab === 'auto' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}>Auto-Discovery</button>
                      </div>

                      <div className="p-6 border-b border-white/10 bg-black/20">
                        {monitorSubTab === 'manual' && (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input type="text" value={newQueryCategory} onChange={(e) => setNewQueryCategory(e.target.value)} placeholder="Topic/Category (Optional)" className={`w-full sm:w-40 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500`} list="category-suggestions" />
                            <datalist id="category-suggestions"><option value="DevTools" /><option value="Debugging" /><option value="AEO" /><option value="React" /></datalist>
                            <input type="text" value={newQueryText} onChange={(e) => setNewQueryText(e.target.value)} placeholder="Enter search query..." className={`flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500`} />
                            <button onClick={handleAddNewQuery} disabled={!newQueryText} className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-6 py-2 rounded-lg font-medium">Add Query</button>
                          </div>
                        )}
                        {monitorSubTab === 'context' && (
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Structure your tracking ecosystem. Define core brands, specific topics, and target URLs to drive logical Auto-Discovery analysis.</p>
                            <div className="flex gap-3 mb-4">
                              <select value={newSourceType} onChange={(e) => setNewSourceType(e.target.value)} className={`bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none w-36`}>
                                <option value="brand">Brand / Product</option>
                                <option value="keyword">Topic / Keyword</option>
                                <option value="url">Domain / URL</option>
                              </select>
                              <input type="text" value={newSourceValue} onChange={(e) => setNewSourceValue(e.target.value)} placeholder={newSourceType === 'url' ? 'e.g. docs.domain.com' : 'e.g. Enterprise AI'} className={`flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-fuchsia-500`} />
                              <button onClick={() => { if (newSourceValue.trim()) { setQueryContextSources([...queryContextSources, { id: Date.now().toString(), type: newSourceType, value: newSourceValue.trim() }]); setNewSourceValue(''); } }} className="bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-400 px-6 py-2 rounded-lg font-medium hover:bg-fuchsia-500/30 transition-colors">Add Source</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {queryContextSources.map((src) => (
                                <div key={src.id} className="bg-white/5 border border-white/10 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full text-xs flex items-center">
                                  <span className="opacity-50 uppercase mr-2 text-[10px] tracking-wider">{src.type}</span> {src.value} <button onClick={() => setQueryContextSources(queryContextSources.filter(s => s.id !== src.id))} className="ml-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400">&times;</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {monitorSubTab === 'auto' && (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Dynamically generate strictly logical, intent-driven queries based on your structured Brands and Keywords.</p>
                            <button onClick={handleGenerateAutoQueries} disabled={loading} className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/30 px-6 py-2.5 rounded-lg font-medium mx-auto border border-emerald-500/30 transition-colors">
                              {loading ? 'Discovering Context...' : 'Generate Intent-Driven Queries'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-black/20 p-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium px-2">Library Execution History</span>
                        <div className="flex gap-2 items-center">
                          {monitorTimeRange === 'custom' && (
                            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-2 shadow-inner h-8 animate-in fade-in slide-in-from-right-4 duration-300">
                              <input type="date" value={monitorCustomDates.from} onChange={(e) => setMonitorCustomDates(prev => ({ ...prev, from: e.target.value }))} className={`bg-transparent text-xs text-white focus:outline-none`} style={{ colorScheme: theme }} />
                              <span className="text-gray-600">-</span>
                              <input type="date" value={monitorCustomDates.to} onChange={(e) => setMonitorCustomDates(prev => ({ ...prev, to: e.target.value }))} className={`bg-transparent text-xs text-white focus:outline-none`} style={{ colorScheme: theme }} />
                            </div>
                          )}
                          <select value={monitorTimeRange} onChange={(e) => setMonitorTimeRange(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 focus:outline-none focus:border-indigo-500 shadow-inner">
                            <option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="custom">Custom Range...</option><option value="all">All Time</option>
                          </select>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[600px] overflow-y-auto">
                        {filteredSavedQueries.map(q => (
                          <div key={q.id} className="flex flex-col">
                            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setExpandedQueryId(expandedQueryId === q.id ? null : q.id)}>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-500/20">{q.category}</span>
                                  <h4 className={`font-medium text-slate-800 dark:text-white text-base`}>{q.text}</h4>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-6">
                                  <span>Last run: {q.lastRun ? new Date(q.lastRun * 1000).toLocaleString() : 'Never in selected period'}</span>

                                  {q.lastRun && (
                                    <div className="flex items-center gap-4 border-l border-gray-200 dark:border-white/10 pl-6">
                                      <span className={`flex items-center font-medium ${q.profileSurfaced ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                        {q.profileSurfaced ? <Icons.CheckCircle className="mr-1.5" style={{ width: 14, height: 14 }} /> : <Icons.AlertCircle className="mr-1.5" style={{ width: 14, height: 14 }} />}
                                        Profile Surfaced
                                      </span>
                                      {q.profileSurfaced && q.combinedRankEquivalent !== 'Unranked' && (
                                        <span className="flex items-center text-indigo-600 dark:text-indigo-400 font-medium">
                                          <Icons.Target className="mr-1" style={{ width: 14, height: 14 }} />
                                          {q.combinedRankEquivalent}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <button onClick={(e) => { e.stopPropagation(); handleRunStoredQuery(q.id); }} disabled={isExecutingQuery !== null} className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                  {isExecutingQuery === q.id ? <Icons.RefreshCw className="animate-spin" style={{ width: 16, height: 16 }} /> : <Icons.Play style={{ width: 16, height: 16 }} />}
                                  Test Source
                                </button>
                                <button onClick={(e) => handleRemoveQuery(e, q.id)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 rounded transition-colors hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete Query">
                                  <Icons.Trash style={{ width: 16, height: 16 }} />
                                </button>
                                {q.lastRun && (
                                  <div className={`text-gray-400 hover:text-slate-800 dark:hover:text-white p-2`}>
                                    {expandedQueryId === q.id ? <Icons.ChevronUp style={{ width: 18, height: 18 }} /> : <Icons.ChevronDown style={{ width: 18, height: 18 }} />}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Expanded Details Panel with Optimization Tips */}
                            {expandedQueryId === q.id && q.lastRun && (
                              <div className="bg-slate-50 dark:bg-black/30 border-t border-gray-100 dark:border-white/5 p-6 animate-in slide-in-from-top-2">
                                <h5 className={`text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center`}>
                                  <Icons.Lightbulb className="mr-2 text-amber-500 dark:text-yellow-400" style={{ width: 16, height: 16 }} />
                                  Context & Optimization Analysis
                                </h5>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Execution Stats */}
                                  <div className="space-y-4">
                                    <div className="bg-white dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/5 flex justify-between items-center shadow-sm dark:shadow-none">
                                      <div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center"><Icons.Globe className="mr-1.5" style={{ width: 14, height: 14 }} /> Omni-Channel Ranking</div>
                                        <div className="text-sm text-slate-700 dark:text-gray-300">Combined SERP & LLM Search</div>
                                      </div>
                                      <div className="text-right">
                                        {q.combinedRankEquivalent !== 'Unranked' ? (
                                          <div className={`text-sm font-bold px-3 py-1 rounded ${q.combinedRankEquivalent.includes('Tier 1') || q.combinedRankEquivalent.includes('Tier 2') ? 'text-emerald-700 bg-emerald-100 dark:text-green-400 dark:bg-green-500/10' : 'text-amber-700 bg-amber-100 dark:text-yellow-400 dark:bg-yellow-500/10'}`}>
                                            {q.combinedRankEquivalent}
                                          </div>
                                        ) : (
                                          <div className="text-sm font-bold text-gray-500 bg-gray-100 dark:bg-black/50 px-3 py-1 rounded border border-transparent dark:border-white/5">Unranked</div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="bg-white dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/5 flex justify-between items-center shadow-sm dark:shadow-none">
                                      <div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center"><Icons.Layers className="mr-1.5" style={{ width: 14, height: 14 }} /> 10-Path Simulation</div>
                                        <div className="text-sm text-slate-700 dark:text-gray-300">Profile matches across 10 query variants</div>
                                      </div>
                                      <div className={`text-right flex flex-col items-end`}>
                                        <span className="text-xs text-slate-600 dark:text-gray-400 mb-0.5"><span className="text-orange-600 dark:text-orange-400 font-bold">{q.totalRedditSurfaceCount}/10</span> Reddit Contexts</span>
                                        <span className="text-xs text-slate-600 dark:text-gray-400"><span className="text-indigo-600 dark:text-purple-400 font-bold">{q.userSurfaceCount}/10</span> Profile Selected</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Optimization Tips */}
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

                                    <div className="flex items-center text-xs text-gray-500 mt-2">
                                      <div className={`w-2 h-2 rounded-full mr-2 ${q.llmMentionsDoc360 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                      AI Answer Contains Brand Mention: <span className={`font-bold text-slate-800 dark:text-white ml-1`}>{q.llmMentionsDoc360 ? 'YES' : 'NO'}</span>
                                    </div>
                                  </div>

                                  {/* Dynamic AI Generated Snippet Box */}
                                  {q.doc360Snippet && (
                                    <div className="md:col-span-2 bg-fuchsia-50 dark:bg-fuchsia-900/10 border border-fuchsia-200 dark:border-fuchsia-500/20 rounded-lg p-5 mt-2 shadow-sm dark:shadow-inner">
                                      <div className="text-xs text-fuchsia-700 dark:text-fuchsia-400 uppercase tracking-wider mb-2 font-bold flex items-center justify-between">
                                        <div className="flex items-center">
                                          <Icons.Target className="mr-2" style={{ width: 14, height: 14 }} />
                                          {q.usedProviderName ? `AI Generated Answer Snippet (${q.usedProviderName})` : 'AI Generated Answer Snippet'}
                                        </div>
                                      </div>
                                      <p className="text-sm text-fuchsia-900 dark:text-fuchsia-100 italic leading-relaxed">
                                        "{q.doc360Snippet}"
                                      </p>
                                    </div>
                                  )}

                                  {/* Surfaced Source Exact Link */}
                                  {q.profileSurfaced && q.surfacedPostUrl ? (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-lg p-4 border border-indigo-200 dark:border-indigo-500/20 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2 shadow-sm dark:shadow-none">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1 font-semibold flex items-center">
                                          <Icons.Target className="mr-1.5" style={{ width: 14, height: 14 }} /> Top Surfaced Source (Your Profile)
                                        </div>
                                        <div className={`text-sm font-medium text-slate-900 dark:text-white truncate w-full`} title={q.surfacedPostTitle}>
                                          {q.surfacedPostTitle}
                                        </div>
                                      </div>
                                      <a
                                        href={q.surfacedPostUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-shrink-0 flex items-center justify-center text-xs bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/40 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/30 px-4 py-2 rounded-lg transition-colors font-medium whitespace-nowrap"
                                      >
                                        <Icons.ExternalLink className="mr-1.5" style={{ width: 14, height: 14 }} /> View Original Post
                                      </a>
                                    </div>
                                  ) : q.totalRedditSurfaceCount > 0 ? (
                                    <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-4 border border-orange-200 dark:border-orange-500/20 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2 shadow-sm dark:shadow-none">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-1 font-semibold flex items-center">
                                          <Icons.AlertCircle className="mr-1.5" style={{ width: 14, height: 14 }} /> Outranked by External Reddit Thread
                                        </div>
                                        <div className={`text-sm font-medium text-slate-900 dark:text-white truncate w-full`}>
                                          Reddit communities surfaced in the AI context, but your posts lacked the semantic density to be selected.
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-gray-100 dark:bg-gray-900/20 rounded-lg p-4 border border-gray-300 dark:border-gray-600/30 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2 shadow-sm dark:shadow-none">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-semibold flex items-center">
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
                    </div>
                  </div>
                )}

                {/* 3. Share of Voice Analysis */}
                {activeTab === 'sov_analysis' && (
                  <div className="space-y-6">
                    <div className="glass-panel rounded-xl p-6 relative z-10">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-white/10 pb-6">
                        <div>
                          <h3 className={`text-xl font-semibold text-white flex items-center`}>
                            <Icons.PieChart className="mr-2 text-emerald-500" style={{ width: 20, height: 20 }} />
                            Competitive Source Distribution
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">Live semantic analysis of Reddit's ecosystem contribution benchmarked against official domains.</p>
                        </div>

                        <div className="flex flex-wrap gap-4 items-center">
                          <div className="bg-black/50 border border-white/10 rounded-lg p-1 flex shadow-inner">
                            <button onClick={() => { setSovViewMode('live'); setIsLiveScanning(!isLiveScanning); }} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center ${sovViewMode === 'live' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'}`}>
                              {isLiveScanning ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span> : <Icons.Play style={{ width: 12, height: 12 }} className="mr-1" />} Live Auto-Scanner
                            </button>
                          </div>

                          <div className="h-6 w-px bg-gray-300 dark:bg-white/20 mx-1 hidden sm:block"></div>

                          <div className="flex items-center" title="Split overall Reddit visibility to show your specific profile contribution">
                            <span className="text-sm font-medium text-slate-700 dark:text-gray-300 mr-2">Isolate Profile</span>
                            <button onClick={() => setShowUserContribution(!showUserContribution)} className={`w-9 h-4.5 rounded-full relative transition-colors ${showUserContribution ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                              <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${showUserContribution ? 'translate-x-5' : 'translate-x-1'}`}></div>
                            </button>
                          </div>

                          <div className="flex gap-2 items-center">
                            {sovTimeRange === 'custom' && (
                              <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-2 shadow-inner h-[38px] animate-in fade-in slide-in-from-right-4 duration-300">
                                <input type="date" value={sovCustomDates.from} onChange={(e) => setSovCustomDates(prev => ({ ...prev, from: e.target.value }))} className={`bg-transparent text-xs text-white focus:outline-none`} style={{ colorScheme: theme }} />
                                <span className="text-gray-600">-</span>
                                <input type="date" value={sovCustomDates.to} onChange={(e) => setSovCustomDates(prev => ({ ...prev, to: e.target.value }))} className={`bg-transparent text-xs text-white focus:outline-none`} style={{ colorScheme: theme }} />
                              </div>
                            )}
                            <select value={sovTimeRange} onChange={(e) => setSovTimeRange(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-700 dark:text-gray-300 focus:outline-none focus:border-indigo-500 shadow-inner h-[38px]">
                              <option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="custom">Custom Range...</option><option value="all">All Time</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6 flex flex-col sm:flex-row gap-3">
                        <input type="text" value={newSovDomain} onChange={(e) => setNewSovDomain(e.target.value)} placeholder="Add custom competitor domain (e.g. docs.company.com)" className={`bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white w-full sm:w-80 focus:outline-none focus:border-indigo-500 shadow-inner`} />
                        <button onClick={() => { if (newSovDomain.trim()) { setCustomSovDomains([...customSovDomains, newSovDomain.trim()]); setNewSovDomain(''); } }} className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors border border-indigo-200 dark:border-indigo-500/30 whitespace-nowrap">Track Domain</button>
                      </div>
                      {customSovDomains.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {customSovDomains.map((cd, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 text-slate-700 dark:text-gray-300 px-3 py-1.5 rounded-full text-xs flex items-center shadow-sm dark:shadow-none">
                              {cd} <button onClick={() => setCustomSovDomains(customSovDomains.filter(x => x !== cd))} className="ml-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400">&times;</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {sovViewMode === 'live' && liveSovData.length === 0 ? (
                        <div className="text-center py-16 animate-in fade-in bg-black/5 border border-white/5 rounded-xl">
                          <Icons.Cpu className="mx-auto text-emerald-500/50 mb-4" style={{ width: 48, height: 48 }} />
                          <h3 className={`text-lg font-medium text-slate-900 dark:text-white mb-2`}>Live Auto-Scanner Active</h3>
                          <p className="text-slate-500 dark:text-gray-400 text-sm max-w-md mx-auto mb-6">This engine dynamically generates semantic search variants for your indexed posts and calculates historical RAG discovery weighting. Awaiting first tick...</p>
                        </div>
                      ) : sovData.domains.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">Run queries in the Search Monitor or activate the Live Auto-Scanner to generate Share of Voice data.</div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
                          {/* Left: Visual Stacked Bar & Top Stats */}
                          <div className="lg:col-span-2 space-y-8">
                            <div className="p-6 bg-black/40 rounded-xl border border-white/5 shadow-sm dark:shadow-none">
                              <div className="flex justify-between items-end mb-4">
                                <h4 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                  {showUserContribution ? "YOUR PROFILE'S SOV" : "OVERALL REDDIT SOV"}
                                </h4>
                                <span className={`text-4xl font-bold text-slate-900 dark:text-white tracking-tight`}>
                                  {showUserContribution ? sovData.redditStats.userPercentage.toFixed(1) : sovData.redditStats.overallPercentage.toFixed(1)}%
                                </span>
                              </div>

                              {/* Vercel-style Multi-color Progress Bar */}
                              <div className="w-full h-8 rounded-full overflow-hidden flex shadow-inner bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/5">
                                {sovData.domains.map((d, i) => {
                                  let color = 'bg-gray-400 dark:bg-gray-600';
                                  if (d.type === 'reddit') color = 'bg-[#ff4500]';
                                  else if (d.type === 'user') color = 'bg-indigo-500';
                                  else if (d.type === 'docs') color = 'bg-blue-500';
                                  else if (d.type === 'forum') color = 'bg-yellow-500';
                                  else if (d.type === 'github') color = 'bg-slate-800 dark:bg-gray-400';

                                  return (
                                    <div key={d.domain} className={`${color} h-full border-r border-black/10 dark:border-black/20 last:border-0 hover:opacity-80 transition-opacity relative group`} style={{ width: `${d.percentage}%` }}>
                                      <div className={`absolute opacity-0 group-hover:opacity-100 -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900 dark:bg-black text-xs px-2.5 py-1 rounded-md text-white whitespace-nowrap z-10 pointer-events-none shadow-lg after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-900 dark:after:border-t-black`}>
                                        {d.domain} <span className="font-bold ml-1">{d.percentage.toFixed(1)}%</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="flex flex-wrap gap-4 mt-6 text-xs text-slate-600 dark:text-gray-400 font-medium">
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#ff4500] mr-2 shadow-sm"></div> Reddit (Overall)</div>
                                {showUserContribution && <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-indigo-500 mr-2 shadow-sm"></div> Reddit (Your Posts)</div>}
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-2 shadow-sm"></div> Official Docs</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-500 mr-2 shadow-sm"></div> Forums (HN, SO)</div>
                                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-600 mr-2 shadow-sm"></div> External Links</div>
                              </div>
                            </div>

                            {/* Chronological SOV Timeline */}
                            {sovData.timelineData?.length > 0 && (
                              <div className="p-6 bg-black/40 rounded-xl border border-white/5 shadow-sm dark:shadow-none animate-in slide-in-from-bottom-4">
                                <h4 className={`text-sm font-semibold text-slate-800 dark:text-white mb-2 flex items-center`}>
                                  <Icons.Activity className="mr-2 text-indigo-500" style={{ width: 16, height: 16 }} />
                                  Historical Discoverability Timeline
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-gray-500 mb-4">Reddit SOV mapped by original post publication date across {sovViewMode === 'live' ? 'live semantic clusters' : '10-query semantic clusters'}.</p>
                                <SovTimelineChart data={sovData.timelineData} />
                              </div>
                            )}

                            <div>
                              <h4 className={`text-sm font-semibold text-slate-800 dark:text-white mb-4`}>Domain Visibility Ranking</h4>
                              <div className="space-y-3">
                                {sovData.domains.map((d, i) => (
                                  <div key={d.domain} className="flex items-center p-4 bg-white/5 rounded-xl border border-transparent dark:border-white/5 shadow-sm dark:shadow-none hover:bg-white/10 transition-colors">
                                    <div className="w-6 text-center text-xs font-bold text-slate-400 dark:text-gray-500 mr-3">#{i + 1}</div>
                                    <div className="flex-1">
                                      <div className="flex justify-between mb-1.5">
                                        <span className={`text-sm font-medium text-slate-800 dark:text-white flex items-center`}>
                                          {d.type === 'reddit' && <Icons.Target className="text-[#ff4500] mr-1.5" style={{ width: 14, height: 14 }} />}
                                          {d.type === 'user' && <Icons.User className="text-indigo-500 mr-1.5" style={{ width: 14, height: 14 }} />}
                                          {d.domain}
                                        </span>
                                        <span className="text-sm font-bold text-slate-600 dark:text-gray-300">{d.percentage.toFixed(1)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 dark:bg-black/50 rounded-full h-1.5 shadow-inner">
                                        <div className={`h-1.5 rounded-full ${d.type === 'reddit' ? 'bg-[#ff4500]' : d.type === 'user' ? 'bg-indigo-500' : d.type === 'docs' ? 'bg-blue-500' : d.type === 'forum' ? 'bg-yellow-500' : 'bg-gray-400 dark:bg-gray-500'}`} style={{ width: `${d.percentage}%` }}></div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Right: Subreddit Dominance */}
                          <div className="bg-black/40 border border-white/5 rounded-xl p-6 h-fit shadow-sm dark:shadow-none">
                            <h4 className={`text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center`}>
                              <Icons.Layers className="mr-2 text-slate-400 dark:text-gray-400" style={{ width: 16, height: 16 }} />
                              Subreddit Distribution
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-gray-500 mb-6">Breakdown of internal Reddit citations observed across providers.</p>

                            {sovData.subreddits.length === 0 ? (
                              <div className="text-sm text-slate-400 dark:text-gray-600 text-center py-6">No specific subreddits surfaced yet.</div>
                            ) : (
                              <div className="space-y-5">
                                {sovData.subreddits.map((sub, i) => {
                                  const totalSubWeight = sovData.subreddits.reduce((acc, s) => acc + s.weight, 0);
                                  const subPercent = (sub.weight / totalSubWeight) * 100;
                                  return (
                                    <div key={sub.name} className="relative group">
                                      <div className="flex justify-between text-sm mb-1.5 relative z-10">
                                        <span className={`text-slate-700 dark:text-gray-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors`}>r/{sub.name}</span>
                                        <span className={`text-slate-900 dark:text-white font-bold`}>{subPercent.toFixed(0)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-100 dark:bg-white/5 rounded-sm h-7 absolute top-0 left-0 -z-0 overflow-hidden shadow-inner">
                                        <div className="h-full bg-[#ff4500]/10 dark:bg-[#ff4500]/20 border-r border-[#ff4500]/30" style={{ width: `${subPercent}%` }}></div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 dark:text-gray-400">{sovViewMode === 'queries' ? 'Total Queries Analyzed' : 'Total Items Scanned'}</span>
                                <span className={`font-bold text-slate-800 dark:text-white`}>{sovData.redditStats.totalQueries}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm mt-3">
                                <span className="text-slate-500 dark:text-gray-400">{sovViewMode === 'queries' ? 'Reddit Appearance Rate' : 'Posts Providing Visibility'}</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {sovData.redditStats.totalQueries > 0 ?
                                    ((sovData.redditStats.queriesAppearedIn / sovData.redditStats.totalQueries) * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                              {(isScanningProfile || isLiveScanning) && (
                                <div className="mt-5 flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                  <span className="flex items-center"><Icons.RefreshCw className="animate-spin mr-2" style={{ width: 14, height: 14 }} /> Scanning...</span>
                                  <span>{scanProgress.current > 0 ? `${scanProgress.current} / ${scanProgress.total}` : 'Live'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Global Ecosystem Distribution */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl mt-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                          <div>
                            <h3 className={`text-lg font-semibold text-white flex items-center`}>
                              <Icons.Globe className="mr-2 text-indigo-500" style={{ width: 18, height: 18 }} />
                              Global Ecosystem Share of Voice
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Brand presence comparison across top aggregate sources (Reddit, LinkedIn, Wiki, Directories) across all monitored queries.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          {sovData.ecosystemStats.map(eco => {
                            let ecoColor = 'bg-gray-600';
                            if (eco.name === 'Reddit') ecoColor = 'bg-[#ff4500]';
                            else if (eco.name === 'Linkedin') ecoColor = 'bg-[#0077b5]';
                            else if (eco.name === 'Wikipedia') ecoColor = 'bg-gray-400 dark:bg-gray-300';
                            else if (eco.name === 'Directories') ecoColor = 'bg-fuchsia-500';
                            else if (eco.name === 'Forums') ecoColor = 'bg-yellow-500';

                            return (
                              <div key={eco.name} className="bg-black/50 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-sm dark:shadow-none hover:bg-white/10 transition-colors">
                                <div className={`text-3xl font-bold text-slate-800 dark:text-white mb-2`}>{eco.percentage.toFixed(1)}%</div>
                                <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                  <div className={`w-2.5 h-2.5 rounded-full mr-2 shadow-sm ${ecoColor}`}></div>
                                  {eco.name}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Subreddit Suggester */}
                {activeTab === 'subreddit_suggester' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-xl">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-slate-200 dark:border-white/10 pb-6">
                        <div>
                          <h3 className={`text-xl font-semibold text-slate-900 dark:text-white flex items-center`}>
                            <Icons.PenTool className="mr-2 text-fuchsia-600 dark:text-fuchsia-500" style={{ width: 20, height: 20 }} />
                            Subreddit Content Suggester
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">AI-generated, community-friendly content strategies based on your Universal Query Library, Feature Spotlight, and Competitors.</p>
                        </div>
                        <button onClick={handleSuggestContent} disabled={isSuggesting} className={`bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-fuchsia-500/20 flex items-center`}>
                          {isSuggesting ? <Icons.RefreshCw className="animate-spin mr-2" style={{ width: 16, height: 16 }} /> : <Icons.Zap className="mr-2" style={{ width: 16, height: 16 }} />}
                          {isSuggesting ? 'Analyzing Ecosystem...' : 'Generate Strategies'}
                        </button>
                      </div>

                      {suggestedContentList.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5">
                          <Icons.MessageSquare className="mx-auto text-fuchsia-500/50 mb-4" style={{ width: 48, height: 48 }} />
                          <h3 className={`text-lg font-medium text-slate-800 dark:text-white mb-2`}>No Strategies Generated</h3>
                          <p className="text-slate-500 dark:text-gray-400 text-sm max-w-md mx-auto">Click the button above to let " + (brandConfig.industry || "AI Agent") + " cross-analyze your queries, features, and competitors to draft genuine Reddit content.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {suggestedContentList.map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/5 p-6 shadow-sm flex flex-col h-full">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 border ${item.type === 'post' ? 'bg-emerald-100 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-blue-100 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20'}`}>
                                    {item.type === 'post' ? <Icons.PenTool className="text-emerald-600 dark:text-emerald-400" style={{ width: 14, height: 14 }} /> : <Icons.MessageSquare className="text-blue-600 dark:text-blue-400" style={{ width: 14, height: 14 }} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.type === 'post' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'}`}>{item.type}</span>
                                      <h4 className={`font-bold text-slate-800 dark:text-white`}>{item.sub}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Targeting Topic: "{item.queryContext}"</p>
                                  </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center shadow-sm ${item.score > 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'}`}>
                                  <Icons.CheckCircle className="mr-1.5" style={{ width: 12, height: 12 }} /> {item.score}% Authentic
                                </div>
                              </div>

                              {item.type === 'comment' && item.targetPostTitle && (
                                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 mb-4 flex items-start">
                                  <Icons.Target className="text-slate-400 dark:text-gray-500 mr-2 mt-0.5 flex-shrink-0" style={{ width: 14, height: 14 }} />
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 tracking-wider block mb-0.5">Target Post Title</span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-gray-200">{item.targetPostTitle}</span>
                                  </div>
                                </div>
                              )}

                              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 mb-4 border border-slate-200 dark:border-white/5 flex-grow shadow-inner relative">
                                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 opacity-10"><Icons.MessageSquare style={{ width: 40, height: 40 }} className="text-slate-500" /></div>
                                <p className="text-sm text-slate-700 dark:text-gray-300 italic leading-relaxed relative z-10 whitespace-pre-wrap">"{item.draft}"</p>
                              </div>

                              <div className="space-y-2">
                                <div className="text-xs text-slate-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-500/20">
                                  <span className="font-semibold text-blue-800 dark:text-blue-300 flex items-center mb-1"><Icons.Lightbulb className="mr-1.5" style={{ width: 12, height: 12 }} /> Strategic Analysis</span>
                                  {item.reason}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-gray-400 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center mb-1"><Icons.Shield className="mr-1.5" style={{ width: 12, height: 12 }} /> Rule Adherence & Spam Check</span>
                                  {item.ruleAdherence}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Competitor Analyzer */}
                {activeTab === 'competitor_analyzer' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="glass-panel rounded-xl p-6 relative z-10">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-white/10 pb-6">
                        <div>
                          <h3 className={`text-xl font-semibold text-white flex items-center`}>
                            <Icons.Crosshair className="mr-2 text-rose-500" style={{ width: 20, height: 20 }} />
                            Competitor Mention Analyzer
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">Track external Reddit threads mentioning competitors and draft interception replies.</p>
                        </div>
                      </div>

                      <div className="bg-black/30 border border-white/5 rounded-xl p-5 mb-8">
                        <h4 className={`text-sm font-semibold text-slate-800 dark:text-white mb-4`}>Target Competitors</h4>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {competitorKeywords.map((kw, i) => (
                            <div key={i} className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-sm">
                              {kw} <button onClick={() => setCompetitorKeywords(competitorKeywords.filter(x => x !== kw))} className={`ml-3 hover:text-rose-900 dark:hover:text-white transition-colors`}>&times;</button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <input type="text" value={newCompetitor} onChange={(e) => setNewCompetitor(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newCompetitor.trim()) { setCompetitorKeywords([...competitorKeywords, newCompetitor.trim()]); setNewCompetitor(''); } }} placeholder="Add competitor brand or tool..." className={`w-full sm:w-80 bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner`} />
                          <button onClick={() => { if (newCompetitor.trim()) { setCompetitorKeywords([...competitorKeywords, newCompetitor.trim()]); setNewCompetitor(''); } }} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors border border-rose-200 dark:border-rose-500/30 whitespace-nowrap">Track Brand</button>
                          <button onClick={handleScanCompetitors} disabled={isScanningCompetitors || competitorKeywords.length === 0} className={`ml-auto bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-rose-500/20 flex items-center whitespace-nowrap`}>
                            {isScanningCompetitors ? <Icons.RefreshCw className="animate-spin mr-2" style={{ width: 16, height: 16 }} /> : <Icons.Search className="mr-2" style={{ width: 16, height: 16 }} />}
                            {isScanningCompetitors ? 'Scanning Reddit...' : 'Scan For Mentions'}
                          </button>
                        </div>
                      </div>

                      {competitorPosts.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 dark:text-gray-500">Add competitors and click scan to find active community discussions.</div>
                      ) : (
                        <div className="space-y-6">
                          {competitorPosts.map((post, idx) => (
                            <div key={idx} className="bg-black/40 rounded-xl border border-white/5 p-6 shadow-sm dark:shadow-none flex flex-col md:flex-row gap-6">
                              <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-[#ff4500] bg-[#ff4500]/10 px-2.5 py-1 rounded uppercase tracking-wider">{post.sub}</span>
                                  <span className="text-xs font-medium text-slate-500 dark:text-gray-400">Mentioned: <strong className="text-rose-600 dark:text-rose-400">{post.competitor}</strong></span>
                                </div>
                                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg p-4 shadow-sm">
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
                  </div>
                )}

                {/* 6. Feature Spotlight */}
                {activeTab === 'spotlight' && (
                  <div className="space-y-6">
                    <div className="glass-panel rounded-xl p-6 relative z-10">
                      <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
                        <div>
                          <h3 className={`text-xl font-semibold text-white flex items-center`}>
                            <Icons.Star className="mr-2 text-yellow-400" style={{ width: 20, height: 20 }} />
                            Feature & Topic Spotlight
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">Automatically extracted features, capabilities, and tech terms discussed across all monitored profiles.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-2 shadow-inner h-[42px] animate-in fade-in slide-in-from-right-4 duration-300">
                          <span className="text-xs text-gray-400">From</span>
                          <input type="date" value={spotlightCustomDates.from} onChange={(e) => setSpotlightCustomDates(prev => ({ ...prev, from: e.target.value }))} className={`bg-transparent text-sm text-white focus:outline-none`} style={{ colorScheme: theme }} />
                          <span className="text-gray-600">-</span>
                          <span className="text-xs text-gray-400">To</span>
                          <input type="date" value={spotlightCustomDates.to} onChange={(e) => setSpotlightCustomDates(prev => ({ ...prev, to: e.target.value }))} className={`bg-transparent text-sm text-white focus:outline-none`} style={{ colorScheme: theme }} />
                        </div>
                      </div>

                      {Object.keys(allProfilesPosts).length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No profile data indexed yet.</div>
                      ) : (
                        <div className="space-y-8">
                          {Object.entries(allProfilesPosts).map(([profileName, profilePosts]) => {
                            const timeFilteredPosts = applyTimeFilter(profilePosts, spotlightTimeRange, spotlightCustomDates);
                            const topics = extractTopicsFromPosts(timeFilteredPosts, [brandConfig.primaryBrand, ...brandConfig.keywords, ...brandConfig.competitors]);
                            return (
                              <div key={profileName} className="bg-black/40 border border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none">
                                <h4 className={`text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center`}>
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
                                        <span className="ml-3 text-xs font-bold bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-transparent shadow-inner">{t.count}</span>
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
                  </div>
                )}

                {/* 7. Platform Analytics */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                    <div className="glass-panel rounded-xl p-6 relative z-10">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-white/10 pb-6">
                        <div>
                          <h3 className={`text-xl font-semibold text-white flex items-center`}>
                            <Icons.Zap className="mr-2 text-yellow-400" style={{ width: 20, height: 20 }} />
                            Real-Time Attribution API
                          </h3>
                          <p className="text-sm text-gray-400 mt-1">Live probability of ingestion across public LLM ecosystems.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto md:justify-end">
                          <div className="flex flex-wrap gap-2">
                            {citationTimeRange === 'custom' && (
                              <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 shadow-inner h-[42px] animate-in fade-in slide-in-from-right-4 duration-300">
                                <span className="text-xs text-gray-400">From</span>
                                <input type="date" value={citationCustomDates.from} onChange={(e) => setCitationCustomDates(prev => ({ ...prev, from: e.target.value }))} className={`bg-transparent text-sm text-white focus:outline-none`} style={{ colorScheme: theme }} />
                                <span className="text-gray-600">-</span>
                                <span className="text-xs text-gray-400">To</span>
                                <input type="date" value={citationCustomDates.to} onChange={(e) => setCitationCustomDates(prev => ({ ...prev, to: e.target.value }))} className={`bg-transparent text-sm text-white focus:outline-none`} style={{ colorScheme: theme }} />
                              </div>
                            )}
                            <select value={citationTimeRange} onChange={(e) => setCitationTimeRange(e.target.value)} className={`bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner h-[42px]`}>
                              <option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="90">Last 90 Days</option><option value="custom">Custom Range...</option><option value="all">All Time</option>
                            </select>
                          </div>

                          <select value={citationContentType} onChange={(e) => setCitationContentType(e.target.value)} className={`bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 shadow-inner h-[42px]`}>
                            <option value="all">Compare All Content</option><option value="post">Posts Only</option><option value="comment">Comments Only</option>
                          </select>

                          {(citationContentType === 'post' || citationContentType === 'comment') && (
                            <select value={selectedCitationId} onChange={(e) => setSelectedCitationId(e.target.value)} className={`bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 max-w-full sm:max-w-[250px] truncate shadow-inner h-[42px]`}>
                              <option value="all">All {citationContentType === 'post' ? 'Posts' : 'Comments'} ({availableCitationItems.length})</option>
                              {availableCitationItems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                          )}
                        </div>
                      </div>

                      {!platformStats || platformStats.length === 0 ? (
                        <div className="text-center py-16 text-gray-500"><Icons.Layers className="mx-auto mb-3 opacity-20" style={{ width: 40, height: 40 }} />No content found for this criteria.</div>
                      ) : (
                        <div className="space-y-8 px-2">
                          {platformStats.map((plat) => (
                            <div key={plat.id} className="relative group">
                              <div className="flex justify-between items-end mb-2">
                                <div className="flex items-center">
                                  <div className={`w-3 h-3 rounded-full mr-3 ${plat.color} shadow-[0_0_10px_rgba(255,255,255,0.2)] shadow-${plat.color.replace('bg-', '')}`}></div>
                                  <span className={`text-base font-medium text-white`}>{plat.name}</span>
                                </div>
                                <span className={`text-lg font-bold text-white tracking-wide`}>{plat.score}%</span>
                              </div>
                              <div className="w-full bg-black/50 rounded-full h-4 overflow-hidden border border-white/5 shadow-inner">
                                <div className={`h-4 rounded-full ${plat.color} relative overflow-hidden transition-all duration-1000 ease-out`} style={{ width: `${plat.score}%` }}>
                                  <div className="absolute inset-0 bg-white/20 w-full h-full transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                                </div>
                              </div>
                              {selectedCitationId !== 'all' && plat.insight && (
                                <div className="mt-2 text-xs text-gray-400 bg-white/5 p-3 rounded-lg border border-white/5 leading-relaxed">
                                  {plat.insight}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 8. Query Tester */}
                {activeTab === 'query' && (
                  <div className="space-y-6">
                    <div className="glass-panel rounded-xl p-6 relative z-10">

                      {/* Mode Toggle */}
                      <div className="flex border-b border-slate-200 dark:border-white/10 mb-6 bg-slate-50 dark:bg-black/40 rounded-t-xl">
                        <button onClick={() => setQueryTesterMode('semantic')} className={`flex-1 py-4 text-sm font-bold transition-colors ${queryTesterMode === 'semantic' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'}`}>Semantic Visibility Tester</button>
                        <button onClick={() => setQueryTesterMode('rater')} className={`flex-1 py-4 text-sm font-bold transition-colors ${queryTesterMode === 'rater' ? 'border-b-2 border-fuchsia-500 text-fuchsia-600 dark:text-white' : 'text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'}`}>Subreddit Content Rater</button>
                      </div>

                      {queryTesterMode === 'semantic' ? (
                        <div className="animate-in fade-in">
                          <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">Test explicit semantic overlap between a raw prompt and your indexed profile knowledge base.</p>
                          <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <div className="relative flex-1">
                              <Icons.Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-500" style={{ width: 18, height: 18 }} />
                              <input type="text" value={queryInput} onChange={(e) => setQueryInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeQuery()} className={`w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-lg pl-12 pr-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-600 shadow-inner`} placeholder="e.g., 'How to optimize PostgreSQL indexes?'" />
                            </div>

                            <button onClick={handleAnalyzeQuery} disabled={results.isAnalyzing || !queryInput} className={`bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-4 rounded-lg font-bold transition-colors flex items-center justify-center min-w-[140px] shadow-lg shadow-indigo-500/25`}>
                              {results.isAnalyzing ? <Icons.RefreshCw className="animate-spin" style={{ width: 18, height: 18 }} /> : 'Run Tester'}
                            </button>
                          </div>

                          {results.hasRun && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-200 dark:border-white/10">
                              <div className="md:col-span-1 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/40 dark:to-black border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm dark:shadow-lg">
                                <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">Est. Discoverability</h4>
                                <div className="relative flex items-center justify-center">
                                  <svg className="w-32 h-32 transform -rotate-90">
                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200 dark:text-gray-800" />
                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="377" strokeDashoffset={377 - (377 * results.discoverabilityScore) / 100} className="text-indigo-500 transition-all duration-1000 ease-out" />
                                  </svg>
                                  <div className={`absolute text-3xl font-black text-slate-800 dark:text-white`}>{results.discoverabilityScore}%</div>
                                </div>
                              </div>
                              <div className="md:col-span-2 space-y-4">
                                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-5 mb-4 shadow-sm dark:shadow-none">
                                  <h4 className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-bold mb-3 flex items-center">
                                    <Icons.Target className="mr-1.5" style={{ width: 14, height: 14 }} /> Attribution Analysis
                                  </h4>
                                  <p className="text-sm text-slate-700 dark:text-gray-300 italic leading-relaxed">{results.analysisText}</p>
                                </div>

                                <h4 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mt-5 mb-3">Top Semantic Matches from Profile</h4>
                                {results.matches.length === 0 ? (
                                  <div className="p-4 bg-slate-50 dark:bg-black/30 rounded-lg border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-500 text-sm shadow-inner">No strong semantic correlation found for this query in your profile history.</div>
                                ) : (
                                  <div className="space-y-3">
                                    {results.matches.slice(0, 3).map((match, i) => (
                                      <div key={i} className="p-4 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                                        <div className="flex justify-between items-start mb-2">
                                          <span className={`text-sm font-semibold text-slate-800 dark:text-white line-clamp-1`}>{match.post.title}</span>
                                          <span className="text-xs text-emerald-600 dark:text-green-400 font-black bg-emerald-50 dark:bg-green-500/10 px-2 py-0.5 rounded ml-2 border border-emerald-100 dark:border-transparent whitespace-nowrap">{(match.score * 100).toFixed(1)}% match</span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-gray-500 flex items-center font-medium">
                                          <span className="uppercase text-[10px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded mr-2">{match.post.type}</span> r/{match.post.subreddit}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="animate-in fade-in">
                          <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">Paste your drafted Reddit post or comment here. The AI will evaluate its authenticity and flag any promotional spam triggers before you publish.</p>

                          <textarea
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            className={`w-full h-40 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-fuchsia-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-600 shadow-inner resize-none mb-4`}
                            placeholder="I completely agree with the OP. When we were evaluating tools..."
                          ></textarea>

                          <div className="flex justify-end mb-8">
                            <button onClick={handleRateContent} disabled={raterResults?.isAnalyzing || !draftContent.trim()} className={`bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold transition-colors flex items-center shadow-lg shadow-fuchsia-500/25`}>
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
                                  <h4 className={`text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center`}>
                                    <Icons.Lightbulb className="mr-2 text-amber-500 dark:text-yellow-400" style={{ width: 16, height: 16 }} /> Analysis & Critique
                                  </h4>
                                  <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
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

                {/* 9. MCP Orchestration Engine */}
                {activeTab === 'mcp_integration' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="glass-panel rounded-xl p-6 relative z-10">
                      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                        <div>
                          <h3 className={`text-xl font-semibold text-white flex items-center`}>
                            <Icons.Plug className="mr-2 text-indigo-500" style={{ width: 22, height: 22 }} />
                            AI Retrieval Intelligence & Orchestration
                          </h3>
                          <p className="text-sm text-gray-400 mt-2 max-w-3xl">
                            This environment natively implements the Model Context Protocol (MCP). All AEO queries and Search engine retrievals are routed securely through modular tools instead of direct APIs. Connect to a remote WebSocket server to orchestrate local backend RAG flows, or rely on the internal simulated sandboxed adapters.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Server Configuration */}
                        <div className="lg:col-span-1 space-y-4">
                          <div className="bg-black/40 border border-white/5 rounded-xl p-5 shadow-sm dark:shadow-none">
                            <h4 className={`text-sm font-medium text-slate-800 dark:text-white mb-4 flex items-center`}>
                              <Icons.Server className="mr-2 text-slate-400 dark:text-gray-400" style={{ width: 16, height: 16 }} />
                              MCP Connection Setup
                            </h4>

                            <div className="mb-4">
                              <label className="block text-xs font-medium text-slate-500 dark:text-gray-500 mb-1">WebSocket Server URL</label>
                              <input
                                type="text"
                                value={mcpUrl}
                                onChange={(e) => setMcpUrl(e.target.value)}
                                disabled={mcpStatus !== 'disconnected'}
                                className={`w-full bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 shadow-inner`}
                              />
                            </div>

                            <div className="mb-5 flex items-center">
                              <input
                                type="checkbox"
                                id="simMode"
                                checked={isSimulatedMcp}
                                onChange={(e) => setIsSimulatedMcp(e.target.checked)}
                                disabled={mcpStatus !== 'disconnected'}
                                className="mr-2 cursor-pointer accent-indigo-500"
                              />
                              <label htmlFor="simMode" className="text-xs text-slate-600 dark:text-gray-400 cursor-pointer font-medium">Use internal Sandboxed Adapters</label>
                            </div>

                            {mcpStatus === 'disconnected' ? (
                              <button onClick={connectMCP} className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex justify-center items-center shadow-md`}>
                                Initialize MCP Bridge
                              </button>
                            ) : (
                              <button onClick={disconnectMCP} className="w-full bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex justify-center items-center border border-red-200 dark:border-red-500/30">
                                Disconnect Session
                              </button>
                            )}
                          </div>

                          {/* Connection Status Indicator */}
                          <div className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl p-5 flex items-center justify-between shadow-sm dark:shadow-none">
                            <span className="text-sm font-medium text-slate-500 dark:text-gray-400">Protocol Status</span>
                            <span className="flex items-center text-sm font-bold uppercase tracking-wider">
                              <div className={`w-2.5 h-2.5 rounded-full mr-2 shadow-sm ${mcpStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : mcpStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></div>
                              <span className={mcpStatus === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : mcpStatus === 'connecting' ? 'text-amber-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}>
                                {mcpStatus}
                              </span>
                            </span>
                          </div>

                          {/* Reverse MCP Configuration */}
                          <div className="bg-indigo-50 dark:bg-black/40 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-5 relative overflow-hidden shadow-sm dark:shadow-none">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                            <h4 className={`text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center`}>
                              <Icons.Link className="mr-2 text-indigo-600 dark:text-indigo-400" style={{ width: 16, height: 16 }} />
                              Reverse MCP Integration
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-gray-400 mb-4 leading-relaxed font-medium">
                              Connect external AI clients (like Claude Desktop or Cursor) to this tracker.
                            </p>
                            <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-lg p-3 relative group shadow-inner">
                              <pre className="text-[10px] text-slate-700 dark:text-gray-300 font-mono overflow-x-auto">
                                {`"mcpServers": {
  "aeo-tracker-live": {
    "command": "node",
    "args": ["-y", "@aeo/tracker-mcp-server"],
    "env": {
      "TRACKER_API_KEY": "sk-your-key-here",
      "WORKSPACE_URL": "http://localhost:8080/sse"
    }
  }
}`}
                              </pre>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Tools & Terminal */}
                        <div className="lg:col-span-2 space-y-4">

                          {/* Retrieval Observability Visualizer */}
                          <div className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl p-5 overflow-hidden shadow-sm dark:shadow-none">
                            <h4 className={`text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center`}>
                              <Icons.Activity className="mr-2 text-indigo-600 dark:text-indigo-400" style={{ width: 16, height: 16 }} />
                              Retrieval Execution Trace
                            </h4>
                            <div className="flex items-center space-x-2 overflow-x-auto pb-2 custom-scrollbar">
                              {executionTraces.length === 0 ? (
                                <div className="text-xs font-medium text-slate-400 dark:text-gray-600 py-2">Awaiting query execution...</div>
                              ) : (
                                executionTraces.map((trace, idx) => (
                                  <React.Fragment key={trace.id}>
                                    <div className={`flex flex-col min-w-[120px] p-3 rounded-lg border shadow-sm ${trace.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400' : trace.status === 'error' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400' : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-yellow-500/10 dark:border-yellow-500/30 dark:text-yellow-400'} transition-all`}>
                                      <span className="text-[10px] uppercase font-black tracking-widest opacity-60 mb-1">Step {idx + 1}</span>
                                      <span className="text-xs font-mono font-bold truncate" title={trace.tool}>{trace.tool}</span>
                                      <span className="text-[10px] font-medium mt-1 opacity-75">{trace.time > 0 ? `${trace.time}ms` : 'Executing...'}</span>
                                    </div>
                                    {idx < executionTraces.length - 1 && <div className="w-8 h-px bg-slate-300 dark:bg-white/20"></div>}
                                  </React.Fragment>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Console */}
                          <div className="bg-slate-900 dark:bg-black/60 border border-slate-700 dark:border-white/5 rounded-xl overflow-hidden flex flex-col h-[280px] shadow-inner">
                            <div className="bg-slate-800 dark:bg-white/5 border-b border-slate-700 dark:border-white/5 px-4 py-3 flex items-center justify-between">
                              <span className="text-xs font-mono font-medium text-slate-300 dark:text-gray-400 flex items-center">
                                <Icons.Terminal className="mr-2" style={{ width: 14, height: 14 }} /> mcp_orchestrator.log
                              </span>
                              <button onClick={() => setMcpLogs([])} className={`text-xs font-medium text-slate-400 hover:text-white transition-colors`}>Clear</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-emerald-400 space-y-2">
                              {mcpLogs.length === 0 ? (
                                <span className="text-slate-500 dark:text-gray-600">Waiting for connection...</span>
                              ) : (
                                mcpLogs.map((log, i) => (
                                  <div key={i} className={log.includes('Error') || log.includes('Failed') ? 'text-red-400' : log.includes('->') ? 'text-blue-400' : log.includes('<-') ? 'text-indigo-400' : ''}>
                                    {log}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Interactive Tool Runner */}
                          {mcpStatus === 'connected' && mcpTools.length > 0 && (
                            <div className="bg-black/40 border border-white/5 rounded-xl p-5 animate-in slide-in-from-bottom-2">
                              <h4 className={`text-sm font-medium text-white mb-3 flex items-center`}>
                                <Icons.Layers className="mr-2 text-indigo-400" style={{ width: 16, height: 16 }} />
                                Discovered MCP Capabilities
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {mcpTools.map(tool => (
                                  <div key={tool.name} className="bg-white/5 border border-white/10 rounded-lg p-3 transition-colors group flex flex-col">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="font-mono text-sm font-semibold text-blue-300">{tool.name}</span>
                                      <button onClick={(e) => { e.stopPropagation(); runMCPTool(tool.name); }} className="text-gray-500 hover:text-green-400 transition-all p-1 bg-white/5 rounded" title="Execute Tool">
                                        <Icons.Play style={{ width: 14, height: 14 }} />
                                      </button>
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-1 mb-2">{tool.description}</p>
                                    <div className="text-[10px] text-gray-500 font-mono bg-black/50 px-2 py-1 rounded inline-block mb-3 overflow-hidden text-ellipsis whitespace-nowrap w-full">
                                      {tool.inputSchema ? JSON.stringify(tool.inputSchema) : "No arguments required"}
                                    </div>
                                    <input
                                      type="text"
                                      placeholder='JSON Arguments e.g. {"query": "test"}'
                                      value={toolArgs[tool.name] || ''}
                                      onChange={(e) => setToolArgs(prev => ({ ...prev, [tool.name]: e.target.value }))}
                                      className={`w-full bg-black/50 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono mt-auto`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 10. Indexed Posts */}
                {activeTab === 'posts' && (
                  <div className="glass-panel rounded-xl p-6 relative z-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                      <div>
                        <h3 className={`text-xl font-semibold text-white`}>Your Indexed Knowledge Base</h3>
                        <p className="text-sm text-gray-400">All scanned posts and comments with their estimated LLM platform contribution.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {postsTimeRange === 'custom' && (
                          <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 shadow-inner h-9 animate-in fade-in slide-in-from-right-4 duration-300">
                            <input type="date" value={postsCustomDates.from} onChange={(e) => setPostsCustomDates(prev => ({ ...prev, from: e.target.value }))} className={`bg-transparent text-xs text-white focus:outline-none`} style={{ colorScheme: 'dark' }} />
                            <span className="text-gray-600">-</span>
                            <input type="date" value={postsCustomDates.to} onChange={(e) => setPostsCustomDates(prev => ({ ...prev, to: e.target.value }))} className={`bg-transparent text-xs text-white focus:outline-none`} style={{ colorScheme: 'dark' }} />
                          </div>
                        )}
                        <select value={postsTimeRange} onChange={(e) => setPostsTimeRange(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 shadow-inner h-9">
                          <option value="all">All Time</option><option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="custom">Custom Range...</option>
                        </select>
                        <select value={postsContentType} onChange={(e) => setPostsContentType(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 shadow-inner h-9">
                          <option value="all">All Content</option><option value="post">Posts Only</option><option value="comment">Comments Only</option>
                        </select>
                        <button onClick={() => fetchRedditData(true)} className="text-indigo-400 hover:text-indigo-300 flex items-center text-sm bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors font-medium h-9">
                          <Icons.RefreshCw style={{ width: 14, height: 14 }} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {displayedPosts.length > 0 ? displayedPosts.map((post) => {
                        const llmVisibility = calculateAvgLLMVisibility(post);
                        const analysisText = `Scored ${llmVisibility}% driven by ${post.score} upvotes and its text length of ${(post.selftext || "").length} characters. ${post.type === 'comment' ? 'Comments carry slightly lower baseline weight than root posts.' : 'Root posts establish core context.'}`;
                        return (
                          <div key={post.id} className="p-4 bg-black/40 rounded-lg border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-white/5 transition-colors relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${llmVisibility > 60 ? 'bg-emerald-500' : llmVisibility > 30 ? 'bg-yellow-500' : 'bg-gray-600'}`}></div>
                            <div className="flex-1 min-w-0 pl-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${post.type === 'comment' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-blue-500/20 text-blue-300'}`}>{post.type}</span>
                                <h4 className={`text-white font-medium truncate`}>{post.title}</h4>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                                <span className="bg-white/10 px-2 py-0.5 rounded text-gray-300">r/{post.subreddit}</span>
                                <span className="flex items-center"><Icons.TrendingUp style={{ width: 12, height: 12 }} className="mr-1 text-emerald-400" /> {post.score}</span>
                                {post.type === 'post' && <span className="flex items-center"><Icons.MessageSquare style={{ width: 12, height: 12 }} className="mr-1 text-gray-400" /> {post.num_comments}</span>}
                                <span className="flex items-center"><Icons.Eye style={{ width: 12, height: 12 }} className="mr-1 text-blue-400" /> {post.views?.toLocaleString()}</span>
                              </div>
                              <div className="text-[11px] text-indigo-300/80 bg-indigo-500/10 px-3 py-1.5 rounded inline-block border border-indigo-500/20">
                                <span className="font-semibold">Attribution Analysis:</span> {analysisText}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="text-right">
                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">LLM Visibility</div>
                                <div className="flex items-center justify-end">
                                  <span className={`text-sm font-bold text-white mr-2`}>{llmVisibility}%</span>
                                  <div className="w-16 bg-black rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${llmVisibility}%` }}></div></div>
                                </div>
                              </div>
                              <a href={post.url} target="_blank" rel="noreferrer" className={`text-gray-400 hover:text-white p-2 bg-white/5 rounded-md transition-colors`}><Icons.ExternalLink style={{ width: 16, height: 16 }} /></a>
                            </div>
                          </div>
                        )
                      }) : (
                        <div className="text-center py-12"><Icons.Layers className="mx-auto mb-4 text-gray-600" style={{ width: 48, height: 48 }} /><p className="text-gray-400">No content indexed for this criteria.</p></div>
                      )}
                    </div>
                  </div>
                )}

                {/* 11. Settings */}
                {activeTab === 'settings' && (
                  <div className="glass-panel rounded-xl p-6 relative z-10">
                    <h3 className={`text-xl font-semibold text-white mb-6`}>Architecture & Settings</h3>
                    {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</p>}

                    <div className="max-w-2xl space-y-8">
                      <div className="p-5 border border-white/5 rounded-lg bg-black/20 backdrop-blur-sm shadow-inner transition-colors hover:bg-black/30">
                        <h4 className={`text-md font-medium text-white mb-4`}>Tracked Profiles</h4>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {profiles.map(p => (
                            <div key={p} onClick={() => setUsername(p)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm cursor-pointer border transition-colors ${username === p ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                              <Icons.User style={{ width: 14, height: 14 }} /> {p}
                              {profiles.length > 1 && <button onClick={(e) => { e.stopPropagation(); const newProfiles = profiles.filter(x => x !== p); setProfiles(newProfiles); if (username === p) setUsername(newProfiles[0]); }} className="ml-2 hover:text-red-400 text-gray-500 transition-colors">&times;</button>}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <input type="text" value={newProfileInput} onChange={(e) => setNewProfileInput(e.target.value)} onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const newP = newProfileInput.trim();
                              handleAddProfile();
                              if (newP) {
                                try {
                                  setError(null);
                                  const res = await fetch(`https://www.reddit.com/user/${newP}/overview.json`);
                                  if (!res.ok) throw new Error("Fetch failed");
                                  const data = await res.json();
                                  setManualJson(JSON.stringify(data, null, 2));
                                } catch (err) {
                                  setError("Auto-fetch failed due to CORS. Please paste JSON manually.");
                                  setIsManualJsonOpen(true);
                                }
                              }
                            }
                          }} placeholder="Add a Reddit username..." className={`flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors`} />
                          <button onClick={async () => {
                            const newP = newProfileInput.trim();
                            handleAddProfile();
                            if (newP) {
                              try {
                                setError(null);
                                const res = await fetch(`https://www.reddit.com/user/${newP}/overview.json`);
                                if (!res.ok) throw new Error("Fetch failed");
                                const data = await res.json();
                                setManualJson(JSON.stringify(data, null, 2));
                              } catch (err) {
                                setError("Auto-fetch failed due to CORS. Please paste JSON manually.");
                                setIsManualJsonOpen(true);
                              }
                            }
                          }} disabled={!newProfileInput.trim()} className="bg-indigo-500/20 text-indigo-400 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">Add & Fetch Data</button>
                        </div>
                      </div>

                      <div className="glass-panel border-white/5 rounded-lg bg-black/20 backdrop-blur-md mb-8 transition-all duration-300 p-5">
                        <div
                          className="flex justify-between items-center cursor-pointer group"
                          onClick={() => setIsManualJsonOpen(!isManualJsonOpen)}
                        >
                          <h4 className={`text-md font-medium text-white mb-0 flex items-center gap-2 group-hover:text-indigo-300 transition-colors`}>
                            <Icons.Database style={{ width: 18, height: 18 }} className="text-indigo-400" />
                            Manual Data Ingestion <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full ml-2">JSON Override</span>
                          </h4>
                          <Icons.ChevronDown className={`text-gray-400 transition-transform duration-300 ${isManualJsonOpen ? 'rotate-180' : ''}`} style={{ width: 18, height: 18 }} />
                        </div>

                        {isManualJsonOpen && (
                          <div className="animate-in fade-in slide-in-from-top-4 duration-300 mt-6 border-t border-white/10 pt-4">
                            <div className="bg-black/20 border border-white/5 rounded-lg p-4 mb-4 text-sm text-gray-400 shadow-inner">
                              <p className="mb-2">If auto-fetch fails, go to exactly this URL in a new tab:</p>
                              <a href={`https://www.reddit.com/user/${username}/overview.json`} target="_blank" rel="noreferrer" className="text-indigo-400 font-mono bg-black/50 px-2 py-1 rounded inline-block hover:underline break-all shadow-[0_0_10px_rgba(99,102,241,0.2)]">https://www.reddit.com/user/{username}/overview.json</a>
                              <p className="mt-3">Copy ALL the text on that page and paste it below.</p>
                            </div>

                            <textarea value={manualJson} onChange={(e) => setManualJson(e.target.value)} className={`w-full h-48 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all font-mono text-xs`} placeholder='Paste raw JSON starting with {"kind": "Listing", "data": ...}'></textarea>
                          </div>
                        )}
                      </div>

                      <button onClick={() => { fetchRedditData(true); setActiveTab('dashboard'); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.6)] hover:shadow-[0_0_25px_rgba(99,102,241,0.8)] w-full sm:w-auto transform hover:scale-105 active:scale-95">Save & Re-Index Data</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* --- DYNAMIC SIGNAL SCOPE MASCOT ANIMATION --- */}
        {isSignalScopeActive && (
          <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end space-y-3 pointer-events-none animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="bg-indigo-900/90 dark:bg-[#110826] border border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.4)] text-indigo-50 dark:text-purple-100 px-5 py-2.5 rounded-2xl rounded-br-sm text-sm font-medium flex items-center backdrop-blur-sm">
              <Icons.RefreshCw className="animate-spin mr-2 text-indigo-300 dark:text-fuchsia-400" style={{ width: 14, height: 14 }} />
              {signalMessage}
            </div>
            <div className="relative w-24 h-24 drop-shadow-[0_0_25px_rgba(99,102,241,0.7)] animate-bounce" style={{ animationDuration: '2.5s' }}>
              <img src="/vampro.png" alt="SignalScope Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
