import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to wrap the inside of the main layout, but NOT the <header>.
# Specifically, we want to wrap the activeTab rendering blocks.
# Let's find: `                    {activeTab === 'dashboard' && (`

dashboard_index = content.find("{activeTab === 'dashboard' && (")

if dashboard_index != -1:
    before = content[:dashboard_index]
    after = content[dashboard_index:]
    
    empty_state_guard_start = """
                    {(!manualJson || manualJson.trim() === '' || profiles.length === 0) && activeTab !== 'settings' ? (
                        <div className="flex flex-col items-center justify-center h-[75vh] animate-in fade-in zoom-in duration-700">
                            <div className="glass-panel p-16 rounded-3xl max-w-2xl text-center relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                                
                                {/* Futuristic radar circles */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-indigo-500/20 rounded-full animate-[spin_10s_linear_infinite] pointer-events-none"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-fuchsia-500/20 rounded-full animate-[spin_7s_linear_infinite_reverse] pointer-events-none border-dashed"></div>

                                <Icons.AlertCircle className="w-24 h-24 text-fuchsia-500 mx-auto mb-8 drop-shadow-[0_0_25px_rgba(217,70,239,0.8)] animate-pulse relative z-10" />
                                
                                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 mb-6 drop-shadow-[0_0_15px_rgba(99,102,241,0.6)] tracking-tight relative z-10 uppercase">Awaiting Telemetry</h2>
                                
                                <p className="text-indigo-200/80 mb-10 font-mono text-sm leading-relaxed max-w-md mx-auto relative z-10">
                                    <span className="block text-cyan-400 mb-2">>> STATUS: SYSTEM OFFLINE</span>
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
"""
    
    # We must close this `</>)` at the end of the tabs.
    # The end of the tabs is right before `{/* --- DYNAMIC EDDY AI MASCOT ANIMATION --- */}`
    # Or just `isSignalScopeActive`
    
    end_index = after.find("{isSignalScopeActive && (")
    if end_index != -1:
        after_tabs = after[:end_index]
        remaining = after[end_index:]
        
        # Add the closing tags
        after_tabs += "                        </>\n                    )}\n"
        
        new_content = before + empty_state_guard_start + after_tabs + remaining
        
        with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Empty state injected successfully.")
    else:
        print("Could not find end of tabs.")
else:
    print("Could not find dashboard tab start.")
