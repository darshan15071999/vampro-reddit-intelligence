import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find the main app wrapper
# Usually it's: return (\n        <div className="flex h-screen ...">
wrapper_match = re.search(r'(return\s*\(\s*<div className="[^"]+h-screen[^"]*">)', content)

if wrapper_match:
    insertion = """
            <div className="mesh-bg"></div>
            <div className="light-rays"></div>
            <div className="particle-orb orb-1"></div>
            <div className="particle-orb orb-2"></div>
            <div className="particle-orb orb-3"></div>
            <div className="scanner-line"></div>
"""
    new_content = content.replace(wrapper_match.group(1), wrapper_match.group(1) + insertion)
    
    with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Particles and meshes injected!")
else:
    print("Failed to find main wrapper.")
