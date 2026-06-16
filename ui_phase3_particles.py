import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's match the whole tag:
tag_match = re.search(r'return\s*\(\s*<div\s+className=\"flex\s+[^\"]*\"[^>]*>', content)
if tag_match:
    insertion = """
            {/* Global Space Dashboard UI Effects */}
            <div className="mesh-bg"></div>
            <div className="light-rays"></div>
            <div className="particle-orb orb-1"></div>
            <div className="particle-orb orb-2"></div>
            <div className="particle-orb orb-3"></div>
            <div className="scanner-line"></div>
"""
    new_content = content.replace(tag_match.group(0), tag_match.group(0) + insertion)
    with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Particles Injected!')
else:
    print('Not found')
