import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';

export const RedditIntelligenceTab = ({ workspaceId = 'default' }) => {
  const [postDraft, setPostDraft] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [loadingContributions, setLoadingContributions] = useState(true);

  useEffect(() => {
    fetchContributions();
  }, [workspaceId]);

  const fetchContributions = async () => {
    try {
      const res = await fetch(`/api/reddit/${workspaceId}/contributions`);
      if (res.ok) {
        const data = await res.json();
        setContributions(data.contributions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContributions(false);
    }
  };

  const handleAnalyze = async () => {
    if (!postDraft) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/reddit/analyze-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, postContent: postDraft })
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      }
    } catch (err) {
      alert('Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Icons.Cpu className="w-6 h-6 text-[#FF4500]" />
            Reddit Exclusive Intelligence
          </h2>
          <p className="text-sm text-gray-400 mt-1">Deep analysis of Reddit impact and interactive post optimization (Free Tier).</p>
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
