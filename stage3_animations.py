import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject mesh animation CSS
mesh_css = """
          @keyframes mesh {
            0% { background-position: 0% 0%; }
            50% { background-position: 100% 100%; }
            100% { background-position: 0% 0%; }
          }
          .mesh-bg {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 0;
            background: radial-gradient(circle at 15% 50%, rgba(79, 70, 229, 0.12), transparent 30%),
                        radial-gradient(circle at 85% 30%, rgba(217, 70, 239, 0.12), transparent 30%);
            background-size: 200% 200%;
            animation: mesh 20s ease infinite;
            pointer-events: none;
          }
          .glass-panel {
            background: rgba(10, 10, 15, 0.4) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .glass-panel:hover {
            box-shadow: 0 12px 40px 0 rgba(99, 102, 241, 0.15) !important;
          }
        `}</style>"""

content = content.replace('`}</style>', mesh_css)

# 2. Add mesh background element to the main app container
main_div = "const App = () => {"
content = content.replace("const App = () => {", "const App = () => {") # noop, just finding it

app_return = "return (\n        <div className={`min-h-screen"
if app_return in content:
    content = content.replace(
        "return (\n        <div className={`min-h-screen",
        "return (\n        <div className={`min-h-screen relative z-0"
    )
    
    # insert mesh-bg
    content = content.replace(
        "{theme === 'light' && (",
        "<div className=\"mesh-bg\"></div>\n            {theme === 'light' && ("
    )

# 3. Add glassmorphism to panels
# We search for standard rounded-xl panels and inject glass-panel
content = content.replace('className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl"', 'className="glass-panel rounded-xl p-6 relative z-10"')
content = content.replace('className="bg-[#0a0a0a] border-r border-white/5 flex flex-col w-64 flex-shrink-0 relative"', 'className="glass-panel border-r border-white/5 flex flex-col w-64 flex-shrink-0 relative z-20"')

# Ensure sidebar active elements glow
content = content.replace('className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-300 border-l-2', 'className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-300 border-l-2 relative overflow-hidden group')

# Replace bg-black/30 inside panels with sub-glassmorphism
content = content.replace('className="p-5 border border-white/10 rounded-lg bg-black/30"', 'className="p-5 border border-white/5 rounded-lg bg-black/20 backdrop-blur-sm shadow-inner transition-colors hover:bg-black/30"')

# Make the Dashboard stats cards glow on hover
content = content.replace('className="bg-white/5 border border-white/10 p-5 rounded-xl flex flex-col relative overflow-hidden group"', 'className="glass-panel p-5 rounded-xl flex flex-col relative overflow-hidden group hover:scale-[1.02] transform transition-all duration-300 cursor-default"')

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Applied modern glassmorphism and animations successfully')
