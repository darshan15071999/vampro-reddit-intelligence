import codecs
import re

app_path = r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx'

with codecs.open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports for AI client
if "import { cosineSimilarity } from './utils/aiClient';" not in content:
    content = content.replace("import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';", 
                              "import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';\nimport { cosineSimilarity } from './utils/aiClient';")

# Find the function and replace it
func_regex = r"function calculateAvgLLMVisibility\(post\) \{.*?return Math\.min.*?;\s*\}"

new_func = """function calculateAvgLLMVisibility(post) {
  if (!post.embedding) return 0;
  const appStore = useAppStore.getState();
  if (!appStore.brandConfigEmbedding) return 0;
  const sim = cosineSimilarity(post.embedding, appStore.brandConfigEmbedding);
  return Math.max(0, Math.round(sim * 100));
}"""

content = re.sub(func_regex, new_func, content, flags=re.DOTALL)

with codecs.open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("calculateAvgLLMVisibility successfully replaced!")
