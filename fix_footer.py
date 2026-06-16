import codecs

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('Save & Re-Index Data</button>')
if idx != -1:
    before = content[:idx]
    
    restored_end = """Save & Re-Index Data</button>
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
"""
    new_content = before + restored_end
    with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed.")
else:
    print("Not found.")
