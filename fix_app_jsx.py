import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The file got completely mangled from line 1049 onwards.
# Let's find `let isSignalScopeActive = false;`
# And then replace everything until `.text-white { color: #0f172a !important; }`
start_marker = "let isSignalScopeActive = false;"
end_marker = ".text-white { color: #0f172a !important; }"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    before = content[:start_idx]
    after = content[end_idx:]
    
    restored_block = """let isSignalScopeActive = false;
    let signalMessage = "";

    if (loading) { isSignalScopeActive = true; signalMessage = "SignalScope is processing data..."; }
    else if (results.isAnalyzing) { isSignalScopeActive = true; signalMessage = "SignalScope is evaluating semantics..."; }
    else if (isExecutingQuery !== null) { isSignalScopeActive = true; signalMessage = "SignalScope is analyzing execution pathways..."; }
    else if (isScanningProfile) { isSignalScopeActive = true; signalMessage = "SignalScope is running a deep profile scan..."; }
    else if (mcpStatus === 'connecting') { isSignalScopeActive = true; signalMessage = "SignalScope is initializing the MCP bridge..."; }
    else if (isSuggesting) { isSignalScopeActive = true; signalMessage = "SignalScope is brainstorming subreddit strategies..."; }
    else if (isScanningCompetitors) { isSignalScopeActive = true; signalMessage = "SignalScope is hunting for competitor mentions..."; }
    else if (raterResults?.isAnalyzing) { isSignalScopeActive = true; signalMessage = "SignalScope is checking for spamminess..."; }

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 flex bg-[#050505] text-[#ededed] selection:bg-indigo-500/30`}>
            
            {/* Global Space Dashboard UI Effects */}
            <div className="mesh-bg"></div>
            <div className="light-rays"></div>
            <div className="particle-orb orb-1"></div>
            <div className="particle-orb orb-2"></div>
            <div className="particle-orb orb-3"></div>
            <div className="scanner-line"></div>

            {/* Light Mode Specific Overrides to preserve Tailwind structure */}
            {theme === 'light' && (
                <style>{`
          .bg-\\[\\#0a0a0a\\] { background-color: #ffffff !important; border-right-color: #e2e8f0 !important; }
          .bg-\\[\\#050505\\] { background-color: #f8fafc !important; }
          .bg-black\\\\/50 { background-color: #f1f5f9 !important; border-color: #e2e8f0 !important; color: #0f172a !important; }
          .bg-black\\\\/40 { background-color: #ffffff !important; border-color: #e2e8f0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important; }
          .bg-black\\\\/60 { background-color: #f8fafc !important; border-color: #e2e8f0 !important; }
          .bg-black\\\\/20 { background-color: #f8fafc !important; border-color: #e2e8f0 !important; }
          .bg-black\\\\/30 { background-color: #ffffff !important; border-color: #e2e8f0 !important; }
          .bg-white\\\\/5 { background-color: #ffffff !important; border-color: #e2e8f0 !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05) !important; }
          """
    
    # We used \\\\/ because it will become \\/ when python writes it.
    # Actually wait, raw string r'' would be better, but we used """ which interprets \/ as \/ but \\/ as \/.
    # So \\\\/ becomes \\/ in the string, which is correct for `bg-black\/50`.

    new_content = before + restored_block + after
    with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Mangled code restored and particles injected.")
else:
    print("Could not find markers.")
