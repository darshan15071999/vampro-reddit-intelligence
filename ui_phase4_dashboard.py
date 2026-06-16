import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace basic stat cards with speedometer / ring UI
# Usually the stats are rendered in a grid:
# <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
#     <div className="bg-black/40 border border-white/5 rounded-xl p-6 relative overflow-hidden group">
#       ...
#       <h3 className="text-3xl font-bold text-white mb-1">...</h3>

# Let's target the exact structure:
# `<div className="bg-black/40 border border-white/5 rounded-xl p-6 relative overflow-hidden group">`
old_card = r'<div className="bg-black/40 border border-white/5 rounded-xl p-6 relative overflow-hidden group">'
new_card = r'<div className="glass-panel rounded-xl p-6 relative overflow-hidden group border-t-4 border-t-indigo-500/50">'

content = content.replace(old_card, new_card)

# Add SVG defs for the gradients if not already present
svg_defs = """
<svg width="0" height="0" className="absolute">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#818cf8" />
      <stop offset="100%" stopColor="#d946ef" />
    </linearGradient>
  </defs>
</svg>
"""
if "id=\"gradient\"" not in content:
    # insert right after `<div className="mesh-bg"></div>`
    content = content.replace('<div className="mesh-bg"></div>', '<div className="mesh-bg"></div>' + svg_defs)

# Update `text-3xl font-bold` to be more futuristic
content = content.replace('text-3xl font-bold text-white mb-1', 'text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 mb-1 tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]')

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated basic metric cards to sci-fi dashboard theme.")
