import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the Header to have SignalScope and v1.0 BETA on the same line
old_header = """<a href="https://vampro.in/signalscope" target="_blank" rel="noreferrer" className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent flex items-center drop-shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:opacity-80 transition-opacity">
                        <img src="/favicon.png" alt="SignalScope Logo" className="mr-2" style={{ width: 24, height: 24 }} />
                        SignalScope
                        <span className="ml-2 text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 font-mono tracking-wider">v1.0 BETA</span>
                    </a>"""

new_header = """<a href="https://vampro.in/signalscope" target="_blank" rel="noreferrer" className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent flex flex-row items-center whitespace-nowrap drop-shadow-[0_0_15px_rgba(99,102,241,0.8)] hover:opacity-80 transition-opacity">
                        <img src="/favicon.png" alt="SignalScope Logo" className="mr-2 w-6 h-6 object-contain" />
                        <span className="mr-2">SignalScope</span>
                        <span className="inline-flex items-center justify-center text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono tracking-wider shadow-[0_0_10px_rgba(99,102,241,0.4)]">v1.0 BETA</span>
                    </a>"""
content = content.replace(old_header, new_header)

# 2. Extract Data Ingestion logic and rewrite it
# I need to match the entire "Tracked Profiles" div and "Data Ingestion Settings" div
# Let's replace the whole `activeTab === 'brand_setup'` settings section for Tracked Profiles since the DOM is slightly messy.

# Finding the Tracked Profiles block
profiles_start = content.find('<div className="p-5 border border-white/10 rounded-lg bg-black/30">')
# Actually, wait. I will use regex to capture the Tracked Profiles block and Data Ingestion Settings block
# But regex with HTML is fragile. I will do it with precise replacements.

old_tracked_profiles_html = """<div className="flex gap-3">
                                            <input type="text" value={newProfileInput} onChange={(e) => setNewProfileInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddProfile()} placeholder="Add a Reddit username..." className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                                            <button onClick={handleAddProfile} disabled={!newProfileInput.trim()} className="bg-indigo-500/20 text-indigo-400 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50">Add Profile</button>
                                        </div>"""

new_tracked_profiles_html = """<div className="flex gap-3">
                                            <input type="text" value={newProfileInput} onChange={(e) => setNewProfileInput(e.target.value)} onKeyDown={async (e) => { 
                                                if(e.key === 'Enter') {
                                                    const newP = newProfileInput.trim();
                                                    handleAddProfile();
                                                    if(newP) {
                                                        try {
                                                            setError(null);
                                                            const res = await fetch(`https://www.reddit.com/user/${newP}/overview.json`);
                                                            if (!res.ok) throw new Error("Fetch failed");
                                                            const data = await res.json();
                                                            setManualJson(JSON.stringify(data, null, 2));
                                                        } catch (err) {
                                                            setError("Auto-fetch failed due to CORS. Please paste JSON manually.");
                                                            setIsManualJsonOpen(true);
                                                        }
                                                    }
                                                }
                                            }} placeholder="Add a Reddit username..." className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} focus:outline-none focus:border-indigo-500 transition-colors" />
                                            <button onClick={async () => {
                                                const newP = newProfileInput.trim();
                                                handleAddProfile();
                                                if(newP) {
                                                    try {
                                                        setError(null);
                                                        const res = await fetch(`https://www.reddit.com/user/${newP}/overview.json`);
                                                        if (!res.ok) throw new Error("Fetch failed");
                                                        const data = await res.json();
                                                        setManualJson(JSON.stringify(data, null, 2));
                                                    } catch (err) {
                                                        setError("Auto-fetch failed due to CORS. Please paste JSON manually.");
                                                        setIsManualJsonOpen(true);
                                                    }
                                                }
                                            }} disabled={!newProfileInput.trim()} className="bg-indigo-500/20 text-indigo-400 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">Add & Fetch Data</button>
                                        </div>"""
content = content.replace(old_tracked_profiles_html, new_tracked_profiles_html)

# 3. Rewrite Data Ingestion Settings block
data_ingestion_start = content.find('<div className="p-5 border border-white/10 rounded-lg bg-black/30">\n                                        <h4 className="text-md font-medium text-white mb-4">Data Ingestion Settings</h4>')
# We replace from data_ingestion_start to the closing div of this block
if data_ingestion_start != -1:
    end_of_block = content.find('<button onClick={() => { fetchRedditData(true);', data_ingestion_start)
    if end_of_block != -1:
        old_data_ingestion_block = content[data_ingestion_start:end_of_block]
        
        new_data_ingestion_block = """<div className="p-5 border border-white/10 rounded-lg bg-black/30 backdrop-blur-md mb-8 transition-all duration-300">
                                        <div 
                                            className="flex justify-between items-center cursor-pointer group"
                                            onClick={() => setIsManualJsonOpen(!isManualJsonOpen)}
                                        >
                                            <h4 className="text-md font-medium text-white mb-0 flex items-center gap-2 group-hover:text-indigo-300 transition-colors">
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
        content = content.replace(old_data_ingestion_block, new_data_ingestion_block)

# 4. Add keydown triggers for Brand Setup inputs
# We need to add onKeyDown hooks to standard inputs so ENTER presses the "Save & Re-Index Data" or "Save Config"
content = content.replace('placeholder="e.g. Vampro"', 'placeholder="e.g. Vampro" onKeyDown={(e) => e.key === \'Enter\' && document.getElementById(\'save-config-btn\')?.click()}')
content = content.replace('placeholder="e.g. SaaS Analytics"', 'placeholder="e.g. SaaS Analytics" onKeyDown={(e) => e.key === \'Enter\' && document.getElementById(\'save-config-btn\')?.click()}')
content = content.replace('placeholder="Comma separated competitors"', 'placeholder="Comma separated competitors" onKeyDown={(e) => e.key === \'Enter\' && document.getElementById(\'save-config-btn\')?.click()}')
content = content.replace('placeholder="Enter target keywords"', 'placeholder="Enter target keywords" onKeyDown={(e) => e.key === \'Enter\' && document.getElementById(\'save-config-btn\')?.click()}')
content = content.replace('placeholder="Enter search terms"', 'placeholder="Enter search terms" onKeyDown={(e) => e.key === \'Enter\' && document.getElementById(\'save-config-btn\')?.click()}')

# Add ID to the save button
content = content.replace('className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto">Save & Re-Index Data</button>', 'id="save-config-btn" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.6)] hover:shadow-[0_0_25px_rgba(99,102,241,0.8)] w-full sm:w-auto transform hover:scale-105 active:scale-95">Save & Re-Index Data</button>')

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Data Ingestion flow updated successfully')
