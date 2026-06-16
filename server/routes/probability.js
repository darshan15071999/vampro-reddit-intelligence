import express from 'express';
import { getDb } from '../database/init.js';

const router = express.Router();

// Probability Analyzer
router.post('/calculate', async (req, res) => {
  const { workspaceId, query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required.' });
  }

  try {
    const db = await getDb();
    
    // Simulate calculating probability based on brand mentions and source coverage
    db.all(`SELECT coverage_score FROM sources WHERE workspace_id = ?`, [workspaceId], (err, sources) => {
      if (err) return res.status(500).json({ error: err.message });
      
      let baseProbability = 20; // Default base
      if (sources && sources.length > 0) {
        const avgCoverage = sources.reduce((acc, s) => acc + (s.coverage_score || 0), 0) / sources.length;
        baseProbability = Math.min(99, Math.round(avgCoverage * 1.5));
      }
      
      res.json({
        query,
        probability: baseProbability,
        confidence: baseProbability > 50 ? 'High' : 'Medium',
        insight: `There is a ${baseProbability}% chance the brand will appear for this query based on current source coverage.`
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate probability.' });
  }
});

export default router;
