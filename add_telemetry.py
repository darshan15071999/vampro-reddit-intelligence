import codecs

app_path = r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx'

with codecs.open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add telemetry import
if "import { trackEvent } from './utils/telemetry';" not in content:
    content = content.replace("import { cosineSimilarity, generateEmbedding } from './utils/aiClient';", 
                              "import { cosineSimilarity, generateEmbedding } from './utils/aiClient';\nimport { trackEvent } from './utils/telemetry';")

# Add telemetry to handleAnalyzeQuery
target = "const discoverability = Math.min(99, Math.round(maxScore * 100));"
replacement = """const discoverability = Math.min(99, Math.round(maxScore * 100));
      
      trackEvent('query_tested', { 
        query: queryInput, 
        score: discoverability,
        matches_found: analyzedMatches.length 
      });"""

content = content.replace(target, replacement)

with codecs.open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Telemetry successfully added to Query Tester!")
