import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_style = """<style>{`
          .bg-\\[\\#0a0a0a\\] { background-color: #ffffff !important; border-right-color: #e2e8f0 !important; }
          .bg-\\[\\#050505\\] { background-color: #f8fafc !important; }
          .bg-black\\/50 { background-color: #f1f5f9 !important; border-color: #e2e8f0 !important; color: #0f172a !important; }
          .bg-black\\/40 { background-color: #ffffff !important; border-color: #e2e8f0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important; }
          .bg-black\\/60 { background-color: #f8fafc !important; border-color: #e2e8f0 !important; }
          .bg-black\\/20 { background-color: #f8fafc !important; border-color: #e2e8f0 !important; }
          .bg-black\\/30 { background-color: #ffffff !important; border-color: #e2e8f0 !important; }
          .bg-white\\/5 { background-color: #ffffff !important; border-color: #e2e8f0 !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05) !important; }
          .text-white { color: #0f172a !important; }
          .text-gray-400 { color: #64748b !important; }
          .text-gray-500 { color: #94a3b8 !important; }
          .text-gray-300 { color: #334155 !important; }
          .border-white\\/10 { border-color: #e2e8f0 !important; }
          .border-white\\/5 { border-color: #f1f5f9 !important; }
          .hover\\:bg-white\\/5:hover { background-color: #f8fafc !important; }
          .hover\\:bg-white\\/10:hover { background-color: #f1f5f9 !important; }
          .bg-[#0f172a] { background-color: #ffffff !important; }
        `}</style>"""

new_style = """<style>{`
          .bg-\\[\\#0a0a0a\\] { background-color: #ffffff !important; border-right-color: #e2e8f0 !important; }
          .bg-\\[\\#050505\\] { background-color: #f8fafc !important; }
          .bg-black\\/50 { background-color: #f8fafc !important; border-color: #cbd5e1 !important; color: #0f172a !important; }
          .bg-black\\/40 { background-color: #ffffff !important; border-color: #cbd5e1 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important; }
          .bg-black\\/60 { background-color: #f8fafc !important; border-color: #cbd5e1 !important; }
          .bg-black\\/20 { background-color: #ffffff !important; border-color: #cbd5e1 !important; }
          .bg-black\\/30 { background-color: #ffffff !important; border-color: #cbd5e1 !important; }
          .bg-white\\/5 { background-color: #ffffff !important; border-color: #e2e8f0 !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05) !important; }
          .text-white { color: #0f172a !important; }
          .text-gray-400 { color: #475569 !important; }
          .text-gray-500 { color: #64748b !important; }
          .text-gray-300 { color: #334155 !important; }
          .text-indigo-400 { color: #4f46e5 !important; }
          .text-indigo-300 { color: #4338ca !important; }
          .border-white\\/10 { border-color: #cbd5e1 !important; }
          .border-white\\/5 { border-color: #e2e8f0 !important; }
          .hover\\:bg-white\\/5:hover { background-color: #f8fafc !important; }
          .hover\\:bg-white\\/10:hover { background-color: #f1f5f9 !important; }
          .bg-[#0f172a] { background-color: #ffffff !important; }
          
          /* Specific fixes for UI components using standard tailwind classes */
          .bg-indigo-500\\/20 { background-color: #eff6ff !important; border-color: #bfdbfe !important; }
          .text-indigo-300 { color: #4338ca !important; }
        `}</style>"""

content = content.replace(old_style, new_style)

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Light mode styles refined successfully!")
