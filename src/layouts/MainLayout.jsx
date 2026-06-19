import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Icons } from '../components/common/Icons';
import { useAppStore } from '../store/useAppStore';
import { useRedditStore } from '../store/useRedditStore';

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

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, isRedditIntelligenceExpanded, setIsRedditIntelligenceExpanded } = useAppStore();
  const { username } = useRedditStore();

  const activeTab = navItems.find(item => item.path === location.pathname)?.id || 'brand_setup';

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
                <button onClick={() => navigate('/')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-xs ${location.pathname === '/' ? 'bg-indigo-500/10 text-indigo-500 font-medium' : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                  Brand Setup & Configuration
                </button>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => navigate(item.path)}
                      className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-xs ${location.pathname === item.path ? 'bg-indigo-500/10 text-indigo-500 font-medium' : theme === 'dark' ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}>
                      <Icon style={{ width: 14, height: 14 }} className="mr-2" /> {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
                {navItems.find(i => i.path === location.pathname)?.label || 'Brand Setup & Configuration'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`p-2 rounded-full border transition-colors border-white/10 hover:bg-white/10 text-yellow-400`}
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Icons.Sun style={{ width: 18, height: 18 }} /> : <Icons.Moon style={{ width: 18, height: 18 }} />}
              </button>
              <div className={`flex items-center space-x-3 rounded-full px-5 py-2.5 border shadow-sm cursor-pointer transition-colors bg-gradient-to-r from-white/10 to-white/5 border-white/10 hover:bg-white/10`} onClick={() => navigate('/settings')}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-indigo-500/20`}>
                  <Icons.User style={{ width: 14, height: 14 }} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className={`text-sm font-semibold tracking-wide text-white`}>{username || 'Demo_Profile'}</span>
              </div>
            </div>
          </header>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
