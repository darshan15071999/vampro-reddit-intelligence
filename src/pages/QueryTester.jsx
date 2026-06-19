import React, { useState } from 'react';
import { Icons } from '../components/common/Icons';
import { useAppStore } from '../store/useAppStore';
import { useRedditStore } from '../store/useRedditStore';
import { cosineSimilarity, generateEmbedding } from '../utils/aiClient';
import { trackEvent } from '../utils/telemetry';

export const QueryTester = ({ handleAnalyzeQuery, handleSimulatedMcpQuery, applyTimeFilter }) => {
  const { brandConfig } = useAppStore();
  const { posts } = useRedditStore();

  const [queryTimeRange, setQueryTimeRange] = useState('all');
  const [queryCustomDates, setQueryCustomDates] = useState({ from: '', to: '' });
  const [queryTesterMode, setQueryTesterMode] = useState('semantic');
  const [queryInput, setQueryInput] = useState('');
  const [results, setResults] = useState({ matches: [], discoverabilityScore: 0, isAnalyzing: false, analysisText: null, hasRun: false });
  const [draftContent, setDraftContent] = useState('');
  const [raterResults, setRaterResults] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedContentList, setSuggestedContentList] = useState([]);

  // WE NEED TO MOVE handleAnalyzeQuery HERE TO PREVENT PROP DRILLING

  return (
    <>
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
    </>
  );
};
