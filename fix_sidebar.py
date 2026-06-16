import re
import codecs

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

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

# Replace everything from <aside className={...}> to </aside>
pattern = re.compile(r'<aside className=\{`w-64 border-r flex flex-col flex-shrink-0 relative.*?<\/aside>', re.DOTALL)
content, count = pattern.subn(new_sidebar, content)

print('Sidebar replaced:', count > 0)

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
