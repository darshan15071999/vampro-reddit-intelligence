import React, { useMemo, useState } from 'react';
import { MetricCard } from '../common/MetricCard';
import { Icons } from '../common/Icons';
import { EmptyState } from '../common/LoadingStates';
import { normalizeRedditPostToSource } from '../../utils/sourceFramework';
import { storage } from '../../utils/storage';

export const SourcesTab = ({ posts, applyTimeFilter, workspaceId = 'default', refetch }) => {
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
