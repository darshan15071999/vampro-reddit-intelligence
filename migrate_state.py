import codecs
import re

app_path = r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx'

with codecs.open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'useAppStore' not in content:
    content = content.replace("import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';", 
                              "import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';\nimport { useAppStore } from './store/useAppStore';\nimport { useRedditStore } from './store/useRedditStore';")

# Replace theme
content = re.sub(r"const \[theme, setTheme\] = useState\('dark'\);", 
                 "const { theme, setTheme } = useAppStore();", content)

# Replace brandConfig
brand_config_regex = r"const \[brandConfig, setBrandConfig\] = useState\(\{(.*?)\}\);"
content = re.sub(brand_config_regex, "const { brandConfig, setBrandConfig } = useAppStore();", content, flags=re.DOTALL)

# Replace isBrandConfigSaved
content = re.sub(r"const \[isBrandConfigSaved, setIsBrandConfigSaved\] = useState\(false\);",
                 "const { isBrandConfigSaved, setIsBrandConfigSaved } = useAppStore();", content)

# Replace isRedditIntelligenceExpanded
content = re.sub(r"const \[isRedditIntelligenceExpanded, setIsRedditIntelligenceExpanded\] = useState\(true\);",
                 "const { isRedditIntelligenceExpanded, setIsRedditIntelligenceExpanded } = useAppStore();", content)

# Replace Reddit Store variables
content = re.sub(r"const \[profiles, setProfiles\] = useState\(\[\]\);", "const { profiles, setProfiles } = useRedditStore();", content)
content = re.sub(r"const \[username, setUsername\] = useState\(''\);", "const { username, setUsername } = useRedditStore();", content)
content = re.sub(r"const \[dataSource, setDataSource\] = useState\('manual'\);", "const { dataSource, setDataSource } = useRedditStore();", content)
content = re.sub(r"const \[manualJson, setManualJson\] = useState\(''\);", "const { manualJson, setManualJson } = useRedditStore();", content)
content = re.sub(r"const \[posts, setPosts\] = useState\(\[\]\);", "const { posts, setPosts } = useRedditStore();", content)
content = re.sub(r"const \[loading, setLoading\] = useState\(false\);", "const { loading, setLoading } = useRedditStore();", content)
content = re.sub(r"const \[error, setError\] = useState\(null\);", "const { error, setError } = useRedditStore();", content)
content = re.sub(r"const \[allProfilesPosts, setAllProfilesPosts\] = useState\(\{\}\);", "const { allProfilesPosts, setAllProfilesPosts } = useRedditStore();", content)

# We need to remove the fetchRedditData function from App.jsx as it's now in the store, 
# BUT wait, the store's fetchRedditData uses `get()`. If we just import it, we can use it.
# Let's just comment out or replace the local fetchRedditData.
fetch_reddit_regex = r"const fetchRedditData = useCallback\(async \(isUserTriggered = false\) => \{.*?\}, \[username, dataSource, manualJson\]\);"
content = re.sub(fetch_reddit_regex, "const { fetchRedditData } = useRedditStore();", content, flags=re.DOTALL)

with codecs.open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("State migration script complete.")
