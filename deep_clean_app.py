import codecs
import re

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Clean up knownKeywords
old_knownKeywords = "const knownKeywords = ['mcp', 'rag', 'llm', 'chatbot', 'workflow', 'api', 'sso', 'knowledge base', 'markdown', 'mermaid', 'analytics', 'search', 'versioning', 'integration', 'migration', ...brandKeywords.map(k => k.toLowerCase())];"
new_knownKeywords = "const knownKeywords = [...brandKeywords.map(k => k.toLowerCase())];"
content = content.replace(old_knownKeywords, new_knownKeywords)

# 2. Re-write the mock Reddit drafts to be completely dynamic and industry-agnostic
old_mock_drafts_start = content.find("suggestedDrafts: [")
old_mock_drafts_end = content.find("],", old_mock_drafts_start)

if old_mock_drafts_start != -1 and old_mock_drafts_end != -1:
    old_drafts_block = content[old_mock_drafts_start:old_mock_drafts_end+2]
    
    new_drafts_block = """suggestedDrafts: [
                {
                    id: 1,
                    sub: `r/${brandConfig.industry.replace(/\s+/g, '')}`,
                    queryContext: brandConfig.keywords[0] || brandConfig.industry,
                    draft: `We evaluated a bunch of tools last quarter. We ended up with ${brandConfig.brandName} for the core features. Might be overkill if you're early stage, but saves headaches later.`,
                    postText: `What is everyone using for ${brandConfig.industry} these days? Everything feels clunky.`,
                    ruleAdherence: "Conversational and non-promotional. Safe to post under standard community guidelines."
                },
                {
                    id: 2,
                    sub: "r/technology",
                    queryContext: brandConfig.keywords[1] || "workflow optimization",
                    draft: `I ran into the exact same issue trying to get teams to adopt ${topCompetitor}. We migrated to ${brandConfig.brandName} specifically because it bridges the gap so technical and non-technical teams can collaborate without friction.`,
                    postText: `Has anyone successfully decoupled their systems without losing tracking?`,
                    ruleAdherence: "Focuses on workflow resolution. Subtle brand mention."
                },
                {
                    id: 3,
                    sub: "r/startups",
                    queryContext: "Scaling infrastructure",
                    draft: `A breakdown of how we implemented ${topFeature} (Lessons Learned)\\n\\nWe recently revamped our stack to support modern workflows. A few things we learned:\\n1. Architecture matters more than you think...\\n2. We used ${brandConfig.brandName} for its native scaling...\\n3. Keep your data clean.\\n\\nHappy to answer any questions about the migration process!`,
                    postText: "null",
                    ruleAdherence: "High-value standalone post. Positions the brand as a natural thought-leader."
                }
            ],"""
    content = content.replace(old_drafts_block, new_drafts_block)

# 3. Clean up the "Document360 explicitly wins" string
content = content.replace("The query where Document360 explicitly wins AI citation context.", "The query where your brand explicitly wins AI citation context.")

with codecs.open(r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Deep cleanup complete.")
