import codecs

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('<div className="p-5 border border-white/5 rounded-lg bg-black/20 backdrop-blur-sm shadow-inner transition-colors hover:bg-black/30">\n                                        <h4 className={`text-md font-medium ${theme === "dark" ? "text-white" : "text-slate-900"} mb-4`}>Data Ingestion Settings</h4>')

if start == -1:
    print('Start not found')
else:
    end = content.find('<button id="save-config-btn"', start)
    if end != -1:
        old_block = content[start:end]
        
        new_block = """<div className="glass-panel border-white/5 rounded-lg bg-black/20 backdrop-blur-md mb-8 transition-all duration-300 p-5">
                                        <div 
                                            className="flex justify-between items-center cursor-pointer group"
                                            onClick={() => setIsManualJsonOpen(!isManualJsonOpen)}
                                        >
                                            <h4 className={`text-md font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-0 flex items-center gap-2 group-hover:text-indigo-300 transition-colors`}>
                                                <Icons.Database style={{ width: 18, height: 18 }} className="text-indigo-400" /> 
                                                Manual Data Ingestion <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full ml-2">JSON Override</span>
                                            </h4>
                                            <Icons.ChevronDown className={`text-gray-400 transition-transform duration-300 ${isManualJsonOpen ? 'rotate-180' : ''}`} style={{ width: 18, height: 18 }} />
                                        </div>
                                        
                                        {isManualJsonOpen && (
                                            <div className="animate-in fade-in slide-in-from-top-4 duration-300 mt-6 border-t border-white/10 pt-4">
                                                <div className="bg-black/20 border border-white/5 rounded-lg p-4 mb-4 text-sm text-gray-400 shadow-inner">
                                                    <p className="mb-2">If auto-fetch fails, go to exactly this URL in a new tab:</p>
                                                    <a href={`https://www.reddit.com/user/${username}/overview.json`} target="_blank" rel="noreferrer" className="text-indigo-400 font-mono bg-black/50 px-2 py-1 rounded inline-block hover:underline break-all shadow-[0_0_10px_rgba(99,102,241,0.2)]">https://www.reddit.com/user/{username}/overview.json</a>
                                                    <p className="mt-3">Copy ALL the text on that page and paste it below.</p>
                                                </div>

                                                <textarea value={manualJson} onChange={(e) => setManualJson(e.target.value)} className={`w-full h-48 bg-black/50 border border-white/10 rounded-lg px-4 py-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'} focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all font-mono text-xs`} placeholder='Paste raw JSON starting with {"kind": "Listing", "data": ...}'></textarea>
                                            </div>
                                        )}
                                    </div>
                                    """
        content = content.replace(old_block, new_block)
        with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as fw:
            fw.write(content)
        print('Replaced block successfully')
    else:
        print('End not found')
