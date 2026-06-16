import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace Eddy references
content = content.replace('isEddyActive', 'isSignalScopeActive')
content = content.replace('eddyMessage', 'signalMessage')
content = content.replace('Eddy is', 'SignalScope is')

# 2. Replace the base64 Eddy image with vampro.png and remove hardcoded background from mascot container
content = re.sub(
    r'<img src="data:image/png;base64,[^"]+" alt=\{brandConfig\.industry \|\| "AI Agent"\} className="[^"]+" onError=\{[^\}]+\} />',
    r'<img src="/vampro.png" alt="SignalScope Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]" />',
    content
)

# 3. Replace Document360 in the mock sources
content = content.replace("type: 'url', value: 'docs.document360.com'", "type: 'url', value: 'example.com'")

# Replace document360 in lower.includes ranking
content = re.sub(r'lower\.includes\("document360"\)', 'lower.includes((brandConfig.brandName || "").toLowerCase())', content)

# Replace document360 in targetBrand parsing
content = re.sub(r"targetBrand\.includes\('document360'\) \? 'doc360' : targetBrand\.split\('\.'\)\[0\]", "targetBrand.split('.')[0]", content)

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replaced Document360 and Eddy mentions successfully')
