import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useRedditStore } from '../store/useRedditStore';
import { Icons } from '../components/common/Icons';

export const Dashboard = () => {
  // TODO: Add required state variables here
  return (

                  <div className="space-y-8">
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center text-red-600 dark:text-red-400 text-sm shadow-sm">
                        <Icons.Shield className="mr-3 flex-shrink-0" style={{ width: 20, height: 20 }} />
                        <div><span className="font-medium">Notice:</span> {error}</div>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-3 items-center">
                      {dashboardTimeRange === 'custom' && (
                        <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 shadow-inner h-10 animate-in fade-in slide-in-from-right-4 duration-300">
                          <span className="text-xs text-gray-400">From</span>
                          <input type="date" value={dashboardCustomDates.from} onChange={(e) => setDashboardCustomDates(prev => ({ ...prev, from: e.target.value }))} className={`bg-transparent text-sm text-white focus:outline-none`} style={{ colorScheme: theme }} />
                          <span className="text-gray-600">-</span>
                          <span className="text-xs text-gray-400">To</span>
                          <input type="date" value={dashboardCustomDates.to} onChange={(e) => setDashboardCustomDates(prev => ({ ...prev, to: e.target.value }))} className={`bg-transparent text-sm text-white focus:outline-none`} style={{ colorScheme: theme }} />
                        </div>
                      )}
                      <select value={dashboardTimeRange} onChange={(e) => setDashboardTimeRange(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 shadow-inner h-10">
                        <option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="90">Last 90 Days</option><option value="custom">Custom Range...</option><option value="all">All Time</option>
                      </select>
                    </div>

                    {/* --- High-Level Dynamic Metrics --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/40 dark:to-black border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-6 shadow-sm dark:shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.PieChart style={{ width: 80, height: 80 }} className="text-indigo-500 dark:text-indigo-400" /></div>
                        <div className="relative z-10">
                          <h4 className="text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wider font-bold mb-2 flex items-center"><Icons.Activity className="mr-2" style={{ width: 16, height: 16 }} /> Live Ecosystem Share of Voice</h4>
                          <div className="flex items-baseline gap-3">
                            <p className={`text-5xl font-black text-slate-800 dark:text-white`}>{sovData.redditStats.overallPercentage.toFixed(1)}%</p>
                            <span className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-1">Reddit SOV</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-gray-500 mt-3">Calculated dynamically against {sovData.domains.length} tracked competitor domains and forums.</p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-fuchsia-50 to-white dark:from-fuchsia-900/40 dark:to-black border border-fuchsia-200 dark:border-fuchsia-500/20 rounded-xl p-6 shadow-sm dark:shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.Star style={{ width: 80, height: 80 }} className="text-fuchsia-500 dark:text-fuchsia-400" /></div>
                        <div className="relative z-10">
                          <h4 className="text-fuchsia-600 dark:text-fuchsia-400 text-xs uppercase tracking-wider font-bold mb-2 flex items-center"><Icons.Target className="mr-2" style={{ width: 16, height: 16 }} /> Top Ranked Keyword</h4>
                          <div className="flex flex-col justify-center h-[48px]">
                            {topRankingKeyword.text === "No successful queries yet" ? (
                              <p className="text-xl font-medium text-slate-400 dark:text-gray-500 italic">No ranked queries discovered yet.</p>
                            ) : (
                              <>
                                <p className={`text-2xl font-bold text-slate-800 dark:text-white truncate`} title={topRankingKeyword.text}>"{topRankingKeyword.text}"</p>
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">Ranking: {topRankingKeyword.rank}</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-gray-500 mt-3">The query where " + (brandConfig.primaryBrand || "Your Brand") + " explicitly wins AI citation context.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.Layers style={{ width: 40, height: 40 }} className="text-indigo-500" /></div>
                        <h4 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Posts Published</h4>
                        <p className={`text-3xl font-bold text-white`}>{dashboardData.postsPublished}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.MessageSquare style={{ width: 40, height: 40 }} className="text-fuchsia-500" /></div>
                        <h4 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Comments</h4>
                        <p className={`text-3xl font-bold text-white`}>{dashboardData.commentsPublished}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.Eye style={{ width: 40, height: 40 }} className="text-blue-500" /></div>
                        <h4 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Est. Views</h4>
                        <p className={`text-3xl font-bold text-white`}>{dashboardData.totalViews.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.TrendingUp style={{ width: 40, height: 40 }} className="text-emerald-500" /></div>
                        <h4 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Total Upvotes</h4>
                        <p className={`text-3xl font-bold text-white`}>{dashboardData.totalUpvotes.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className={`font-semibold text-white flex items-center`}>
                          <Icons.Activity className="mr-2 text-indigo-500" style={{ width: 18, height: 18 }} />
                          Recent LLM Discoverability Trend
                        </h3>
                        <select value={dashboardContentType} onChange={(e) => setDashboardContentType(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 shadow-inner">
                          <option value="all">Posts & Comments</option><option value="post">Posts Only</option><option value="comment">Comments Only</option>
                        </select>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Attribution percentage score across the latest content.</p>
                      <div className="w-full">
                        {dashboardData.filteredCount === 0 ? <div className="h-[180px] flex items-center justify-center text-gray-600 text-sm">No data available.</div> : <LLMVisibilityTrendChart data={dashboardData.recentTrend} />}
                      </div>
                    </div>
                  </div>
                
  );
};
