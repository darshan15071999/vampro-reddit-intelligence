import React, { useState } from 'react';
import { Icons } from './components/common/Icons';
import { GlobalSearch } from './components/common/GlobalSearch';
import { DateRangePicker } from './components/common/DateRangePicker';
import { DashboardTab } from './components/tabs/DashboardTab';
import { SourcesTab } from './components/tabs/SourcesTab';
import { CitationIntelligenceTab } from './components/tabs/CitationIntelligenceTab';
import { ShareOfVoiceTab } from './components/tabs/ShareOfVoiceTab';
import { QueryLibraryTab } from './components/tabs/QueryLibraryTab';
import { IntegrationsTab } from './components/tabs/IntegrationsTab';
import { SettingsTab as SetupTab } from './components/tabs/SettingsTab';
import { RedditIntelligenceTab } from './components/tabs/RedditIntelligenceTab';
import { ProbabilityAnalyzerTab } from './components/tabs/ProbabilityAnalyzerTab';
import { CompetitorRankingTab } from './components/tabs/CompetitorRankingTab';
import { CommonSOVTab } from './components/tabs/CommonSOVTab';
import { ConnectedSOVTab } from './components/tabs/ConnectedSOVTab';
import { ReportsTab } from './components/tabs/SimpleTabs';

import { useDateRange } from './hooks/useDateRange';
import { useSourceAnalysis } from './hooks/useSourceAnalysis';
import { useMcpOrchestrator } from './hooks/useMcpOrchestrator';
import { brandConfig } from './constants/brandConfig';

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