import codecs

app_path = r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx'

with codecs.open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("{activeTab === 'dashboard' && (")
if start_idx == -1:
    print("Dashboard not found")
    exit()

# Find the matching closing parenthesis for the dashboard block
open_braces = 0
in_block = False
end_idx = -1

for i in range(start_idx, len(content)):
    char = content[i]
    if char == '{':
        open_braces += 1
        in_block = True
    elif char == '}':
        open_braces -= 1
        if in_block and open_braces == 0:
            end_idx = i
            break

if end_idx != -1:
    dashboard_code = content[start_idx:end_idx+1]
    
    with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\pages\Dashboard.jsx', 'w', encoding='utf-8') as f:
        f.write("import React from 'react';\n")
        f.write("import { useAppStore } from '../store/useAppStore';\n")
        f.write("import { useRedditStore } from '../store/useRedditStore';\n")
        f.write("import { Icons } from '../components/common/Icons';\n\n")
        f.write("export const Dashboard = () => {\n")
        f.write("  // TODO: Add required state variables here\n")
        f.write("  return (\n")
        # remove the surrounding {activeTab === 'dashboard' && ( ... )}
        # Find the first ( after &&
        paren_start = dashboard_code.find('(', dashboard_code.find('&&'))
        # The code is everything inside the parentheses. Since we matched the outer {}, there's a closing )} at the end.
        inner_code = dashboard_code[paren_start+1 : -2]
        f.write(inner_code)
        f.write("\n  );\n};\n")
    
    # Replace the block in App.jsx with <Dashboard />
    new_content = content[:start_idx] + "{activeTab === 'dashboard' && <Dashboard />}" + content[end_idx+1:]
    
    # Add import to App.jsx
    new_content = new_content.replace("import { Icons } from './components/common/Icons';", "import { Icons } from './components/common/Icons';\nimport { Dashboard } from './pages/Dashboard';")
    
    with codecs.open(app_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("Dashboard successfully extracted!")
else:
    print("Could not find end of dashboard block")
