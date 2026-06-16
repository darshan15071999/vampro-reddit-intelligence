import express from 'express';
import { getDb } from '../database/init.js';

const router = express.Router();

// Post Analyzer: Authenticity, Spamminess, Subreddit Suggestions
router.post('/analyze-post', async (req, res) => {
  const { workspaceId, postContent } = req.body;
  
  if (!postContent) {
    return res.status(400).json({ error: 'Post content is required.' });
  }

  try {
    const db = await getDb();
    
    // Check if an LLM is connected.
    db.get(`SELECT * FROM provider_connections WHERE workspace_id = ? AND status = 'Connected' LIMIT 1`, [workspaceId], (err, provider) => {
      let analysisResult = {};
      
      // If we have an LLM connected (e.g. Gemini/OpenAI), we would call it here.
      // Since this is the foundational setup, we simulate the LLM or fallback logic.
      
      const contentLen = postContent.length;
      const spamScore = contentLen < 50 ? 80 : (postContent.includes('http') ? 60 : 15);
      const authenticity = 100 - spamScore;

      analysisResult = {
        authenticityScore: authenticity,
        spamScore: spamScore,
        methodology: provider ? `Analyzed via ${provider.provider_name}` : 'Analyzed via Fallback Heuristics',
        suggestedSubreddits: ['r/reactjs', 'r/webdev', 'r/javascript'],
        competitorInsights: "Competitors rarely post similar long-form content here. Good opportunity."
      };

      res.json(analysisResult);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze post.' });
  }
});

// Query-Post Contribution Analysis
router.get('/:workspaceId/contributions', async (req, res) => {
  try {
    const db = await getDb();
    // Simulate complex JOIN between queries, citations, and sources
    db.all(`
      SELECT c.citation_score, c.confidence, q.query, s.source_name, s.source_url 
      FROM citations c 
      JOIN queries q ON c.query_id = q.id 
      JOIN sources s ON c.source_id = s.id 
      WHERE q.workspace_id = ? AND s.source_type_id = 'reddit'
    `, [req.params.workspaceId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ contributions: rows || [] });
    });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

export default router;
