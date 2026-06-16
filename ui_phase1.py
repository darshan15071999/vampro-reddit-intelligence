import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Expand sidebar breadth to w-80
content = content.replace('w-64', 'w-80')

# 2. Make theme default to 'dark' completely
# Actually, let's leave the theme state intact but force dark classes. We can simply replace `theme === "dark" ? "text-white" : "text-slate-900"` with `"text-white"` since they want a "futuristic space dashboard" which only works in dark mode.
# Let's replace ternary conditionals across the file.
content = re.sub(r'\$\{theme === [\'"]dark[\'"] \? [\'"]([^\'"]+)[\'"] : [\'"]([^\'"]+)[\'"]\}', r'\1', content)
content = re.sub(r'\$\{theme === [\'"]light[\'"] \? [\'"]([^\'"]+)[\'"] : [\'"]([^\'"]+)[\'"]\}', r'\2', content)

# 3. Add Empty State Logic Layer
# Find where the active tab content is rendered.
# Usually it's something like:
# <div className="flex-1 p-8 overflow-y-auto relative z-10">
#     {/* Header component */}
#     <header>...</header>
#     {activeTab === 'dashboard' && ( ... )}

main_div_pattern = r'(<div className="flex-1 p-8 overflow-y-auto relative z-10">.*?)(?=\{activeTab === \'dashboard\')'
match = re.search(main_div_pattern, content, re.DOTALL)

if match:
    # We will inject the data check right after the header!
    empty_state_guard = """
    {(!manualJson || manualJson.trim() === '' || profiles.length === 0) && activeTab !== 'brand_setup' ? (
        <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in zoom-in duration-500">
            <div className="glass-panel p-12 rounded-2xl max-w-lg text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                <Icons.AlertCircle className="w-20 h-20 text-fuchsia-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)] animate-pulse" />
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400 mb-4 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">No Intelligence Data</h2>
                <p className="text-indigo-200/80 mb-8 font-mono text-sm">Awaiting telemetry. Please configure your profile and provide manual JSON data to initialize the visualization dashboard.</p>
                <button onClick={() => setActiveTab('brand_setup')} className="bg-indigo-600 hover:bg-fuchsia-600 text-white px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.6)] hover:shadow-[0_0_35px_rgba(217,70,239,0.8)] transform hover:scale-105 active:scale-95 tracking-wider uppercase text-sm">
                    Initialize Configuration
                </button>
            </div>
        </div>
    ) : (
        <>
"""
    
    # We need to wrap everything after this in `</>` 
    # But wait, wrapping the rest of the return block is hard via regex. 
    # Better to just wrap the `{activeTab === 'X' && ...}` blocks.
    pass # I'll do this carefully.

# Let's replace the ternary expressions and update the CSS animations first.
with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied theme fixes and w-80")
