import codecs
import re

app_path = r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx'

with codecs.open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add generateEmbedding import
if "generateEmbedding" not in content:
    content = content.replace("import { cosineSimilarity } from './utils/aiClient';", 
                              "import { cosineSimilarity, generateEmbedding } from './utils/aiClient';")

# Find handleAnalyzeQuery block
start_str = "const handleAnalyzeQuery = async () => {"
start_idx = content.find(start_str)

if start_idx != -1:
    end_str = "const handleSimulatedMcpQuery = async"
    end_idx = content.find(end_str, start_idx)
    
    if end_idx != -1:
        # We replace the timeout block with the true AI logic
        # We need to find `setTimeout(async () => {` inside the block and replace it
        
        old_block = content[start_idx:end_idx]
        
        new_block = """const handleAnalyzeQuery = async () => {
    if (!queryInput) return;
    setResults({ matches: [], discoverabilityScore: 0, isAnalyzing: true, analysisText: null, hasRun: false });

    try {
      const queryEmbedding = await generateEmbedding(queryInput);
      if (!queryEmbedding) throw new Error("Failed to generate embedding for query.");

      let filteredPosts = applyTimeFilter(posts, queryTimeRange, queryCustomDates);
      const analyzedMatches = filteredPosts.map(post => {
        if (!post.embedding) return { post, score: 0 };
        const score = cosineSimilarity(queryEmbedding, post.embedding);
        return { post, score };
      }).filter(m => m.score > 0.40).sort((a, b) => b.score - a.score);

      const maxScore = analyzedMatches.length > 0 ? analyzedMatches[0].score : 0;
      const discoverability = Math.min(99, Math.round(maxScore * 100));

      let analysisText = "";
      if (analyzedMatches.length > 0) {
        const bestPost = analyzedMatches[0].post;
        if (discoverability >= 75) {
          analysisText = `Excellent semantic overlap (${discoverability}%). Your post "${bestPost.title}" contains high-density semantic matches and strong contextual relevance. It is highly likely to be prioritized by RAG ingestion engines for this exact query.`;
        } else if (discoverability >= 40) {
          analysisText = `Moderate semantic correlation (${discoverability}%). Your post "${bestPost.title}" shares structural relevance, but lacks the deep semantic density needed to guarantee top-tier RAG extraction.`;
        } else {
          analysisText = `Weak semantic footprint (${discoverability}%). The engine detected low vector similarity. Your content is unlikely to be extracted for this query.`;
        }
      } else {
        analysisText = "No semantic matches found. Your indexed content has a 0% probability of being cited for this query.";
      }

      setResults({ matches: analyzedMatches, discoverabilityScore: discoverability, isAnalyzing: false, analysisText, hasRun: true });
    } catch (err) {
      setResults({ matches: [], discoverabilityScore: 0, isAnalyzing: false, analysisText: "Error generating vector embeddings. Please check your API keys.", hasRun: true });
    }
  };

  """
        
        content = content[:start_idx] + new_block + content[end_idx:]

with codecs.open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("handleAnalyzeQuery successfully updated to use real AI!")
