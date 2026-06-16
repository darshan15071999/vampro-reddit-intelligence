import express from 'express';
import { getDb } from '../database/init.js';
import { generateExecutiveInsights } from '../services/executiveInsightEngine.js';
import { generateRecommendations } from '../services/recommendationEngine.js';

const router = express.Router();

// GET High Level Analytics (Dashboard)
router.get('/:workspaceId/dashboard', async (req, res) => {
  try {
    const db = await getDb();
    
    // In a fully built phase, this runs actual mathematical queries against `citations` and `queries`.
    // For this backend foundation, we aggregate sources to prove the pipeline works.
    db.all(`SELECT * FROM sources WHERE workspace_id = ?`, [req.params.workspaceId], async (err, sources) => {
      if (err) return res.status(500).json({ error: err.message });

      const metrics = {
        visibility: sources.length * 15,
        sourceCount: sources.length
      };

      // Let LLM interpret it
      const insights = await generateExecutiveInsights(metrics);
      const recommendations = await generateRecommendations(metrics);

      res.json({
        metrics,
        insights,
        recommendations,
        topSources: sources.slice(0, 5)
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

export default router;
