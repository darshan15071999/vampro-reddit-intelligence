import re
import os
import codecs

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\original_app.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update extractTopicsFromPosts to accept brandKeywords
content = content.replace('function extractTopicsFromPosts(posts) {', 'function extractTopicsFromPosts(posts, brandKeywords = []) {')
content = content.replace(
    "const knownKeywords = ['mcp', 'rag', 'llm', 'eddy ai', 'chatbot', 'workflow', 'api', 'sso', 'knowledge base', 'markdown', 'mermaid', 'analytics', 'search', 'versioning', 'document360', 'doc360', 'integration', 'migration'];",
    "const knownKeywords = ['mcp', 'rag', 'llm', 'chatbot', 'workflow', 'api', 'sso', 'knowledge base', 'markdown', 'mermaid', 'analytics', 'search', 'versioning', 'integration', 'migration', ...brandKeywords.map(k => k.toLowerCase())];"
)
# Update calls to extractTopicsFromPosts
content = re.sub(r'extractTopicsFromPosts\((.*?)\)', r'extractTopicsFromPosts(\1, [brandConfig.primaryBrand, ...brandConfig.keywords, ...brandConfig.competitors])', content)
content = content.replace(
    'function extractTopicsFromPosts(posts, brandKeywords = [], [brandConfig.primaryBrand, ...brandConfig.keywords, ...brandConfig.competitors]) {',
    'function extractTopicsFromPosts(posts, brandKeywords = []) {'
)

# 2. Add brandConfig to App component
state_code = """
    const [brandConfig, setBrandConfig] = useState({
        primaryBrand: 'Your Brand',
        industry: 'Tech',
        competitors: ['Competitor A', 'Competitor B'],
        keywords: ['keyword1', 'keyword2'],
        searchTerms: ['search term 1', 'search term 2']
    });
    const [isRedditIntelligenceExpanded, setIsRedditIntelligenceExpanded] = useState(true);
"""
content = content.replace("const [theme, setTheme] = useState('dark');", "const [theme, setTheme] = useState('dark');" + state_code)
content = content.replace('const [activeTab, setActiveTab] = useState(\'settings\');', 'const [activeTab, setActiveTab] = useState(\'brand_setup\');')

# 3. Replace hardcoded strings CAREFULLY

# Replace inside JSX text (e.g. >Document360<)
content = content.replace('>Document360<', '>{brandConfig.primaryBrand || "Your Brand"}<')
content = content.replace('>Zendesk<', '>{brandConfig.competitors[0] || "Competitor A"}<')
content = content.replace('>GitBook<', '>{brandConfig.competitors[1] || "Competitor B"}<')
content = content.replace('>Eddy AI<', '>{brandConfig.industry || "AI Agent"}<')

# Replace exact strings "Document360" or 'Document360' -> (brandConfig.primaryBrand || "Your Brand")
content = content.replace('"Document360"', '(brandConfig.primaryBrand || "Your Brand")')
content = content.replace("'Document360'", '(brandConfig.primaryBrand || "Your Brand")')
content = content.replace('"Zendesk"', '(brandConfig.competitors[0] || "Competitor A")')
content = content.replace("'Zendesk'", '(brandConfig.competitors[0] || "Competitor A")')
content = content.replace('"GitBook"', '(brandConfig.competitors[1] || "Competitor B")')
content = content.replace("'GitBook'", '(brandConfig.competitors[1] || "Competitor B")')
content = content.replace('"Eddy AI"', '(brandConfig.industry || "AI Agent")')
content = content.replace("'Eddy AI'", '(brandConfig.industry || "AI Agent")')

# Replace embedded substrings like `recommending Document360.`
content = content.replace('Document360', '" + (brandConfig.primaryBrand || "Your Brand") + "')
content = content.replace('Zendesk', '" + (brandConfig.competitors[0] || "Competitor A") + "')
content = content.replace('GitBook', '" + (brandConfig.competitors[1] || "Competitor B") + "')
content = content.replace('Eddy AI', '" + (brandConfig.industry || "AI Agent") + "')
content = content.replace('eddy ai', '" + (brandConfig.industry ? brandConfig.industry.toLowerCase() : "ai agent") + "')

# Fix cases where we accidentally did `" + ... + "` inside backticks
content = re.sub(r'`(.*?)(" \+ \(.*?\) \+ ")(.*?)`', lambda m: '`' + m.group(1) + '${' + m.group(2)[5:-5] + '}' + m.group(3) + '`', content)

# 4. Modify Sidebar
old_sidebar = """<aside className={`w-64 border-r flex flex-col flex-shrink-0 relative ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/5 to-transparent pointer-events-none"></div>
                <div className={`p-6 border-b relative z-10 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent flex items-center drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                        <img
                            src="https://images.g2crowd.com/uploads/product/image/small_square/small_square_521d08f2e35863117ed1e31e54bcf944/document360.png"
                            alt="Database"
                            className="mr-2"
                            style={{ width: 24, height: 24 }}
                        />
                        AEO Tracker
                    </h1>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto relative z-10 custom-scrollbar">
                    <div className={`text-xs font-semibold uppercase tracking-wider mb-3 px-2 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Core Analytics</div>
                    {navItems.slice(0, 5).map((item) => {
                        const Icon = item.icon;
                        return (
                            <button key={item.id} onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeTab === item.id ? 'bg-indigo-500/10 text-indigo-500 font-medium shadow-[inset_2px_0_0_0_#6366f1]' : theme === 'dark' ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}>
                                <Icon style={{ width: 16, height: 16 }} className="mr-3" /> {item.label}
                            </button>
                        );
                    })}

                    <div className={`text-xs font-semibold uppercase tracking-wider mt-6 mb-3 px-2 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Tools & Data</div>
                    {navItems.slice(5).map((item) => {
                        const Icon = item.icon;
                        return (
                            <button key={item.id} onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${activeTab === item.id ? 'bg-indigo-500/10 text-indigo-500 font-medium shadow-[inset_2px_0_0_0_#6366f1]' : theme === 'dark' ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}>
                                <Icon style={{ width: 16, height: 16 }} className="mr-3" /> {item.label}
                            </button>
                        );
                    })}
                </nav>
            </aside>"""

new_sidebar = """<aside className={`w-64 border-r flex flex-col flex-shrink-0 relative ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/5 to-transparent pointer-events-none"></div>
                <div className={`p-6 border-b relative z-10 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent flex items-center drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                        <Icons.Target className="mr-2" style={{ width: 24, height: 24 }} />
                        AEO Tracker
                    </h1>
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
                            {isRedditIntelligenceExpanded ? <Icons.ChevronUp style={{ width: 14, height: 14 }}/> : <Icons.ChevronDown style={{ width: 14, height: 14 }}/>}
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
                    <div className={`text-xs font-semibold uppercase tracking-wider mt-8 mb-3 px-3 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Coming Soon</div>
                    
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

                </nav>
            </aside>"""
content = content.replace(old_sidebar, new_sidebar)

# 5. Inject BrandSetup Tab content
brand_setup_ui = """
                    {activeTab === 'brand_setup' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-[#0f172a]/60 border-white/5' : 'bg-white border-slate-200'} shadow-sm`}>
                                <h2 className={`text-lg font-bold mb-6 flex items-center ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    <Icons.Settings className="mr-2 text-indigo-500" style={{ width: 20, height: 20 }} /> Brand Setup & Configuration
                                </h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Primary Brand Name</label>
                                        <input type="text" value={brandConfig.primaryBrand} onChange={(e) => setBrandConfig({...brandConfig, primaryBrand: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. Acme Corp" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Industry / Category</label>
                                        <input type="text" value={brandConfig.industry} onChange={(e) => setBrandConfig({...brandConfig, industry: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. AI Agents, Dev Tools" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Competitors (Comma Separated)</label>
                                        <input type="text" value={brandConfig.competitors.join(', ')} onChange={(e) => setBrandConfig({...brandConfig, competitors: e.target.value.split(',').map(s=>s.trim())})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500" placeholder="e.g. Competitor A, Competitor B" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Target Keywords (Comma Separated)</label>
                                        <input type="text" value={brandConfig.keywords.join(', ')} onChange={(e) => setBrandConfig({...brandConfig, keywords: e.target.value.split(',').map(s=>s.trim())})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. workflow, automation, rpa" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">Common Search Terms (Comma Separated)</label>
                                        <input type="text" value={brandConfig.searchTerms.join(', ')} onChange={(e) => setBrandConfig({...brandConfig, searchTerms: e.target.value.split(',').map(s=>s.trim())})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500" placeholder="e.g. best automation tools, how to build workflows" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
"""
content = content.replace("{activeTab === 'dashboard' && (", brand_setup_ui + "\n                    {activeTab === 'dashboard' && (")

# Write to App.jsx
with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactor completed successfully!")
