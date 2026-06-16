import express from 'express';
import { getDb } from '../database/init.js';
import { analyzeSource } from '../services/sourceEngine.js';

const router = express.Router();

// GET all sources for a workspace
router.get('/:workspaceId', async (req, res) => {
  try {
    const db = await getDb();
    db.all(`SELECT * FROM sources WHERE workspace_id = ? ORDER BY created_at DESC`, [req.params.workspaceId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ sources: rows });
    });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// INGEST: Reddit or URL or JSON
router.post('/ingest', async (req, res) => {
  const { workspaceId, sourceType, sourceUrl, rawContent, sourceName } = req.body;
  
  if (!workspaceId || !sourceType) {
    return res.status(400).json({ error: 'workspaceId and sourceType are required' });
  }

  try {
    const db = await getDb();
    let contentToStore = rawContent || '';

    // If it's a URL or Reddit and no rawContent, we'd fetch it here.
    // Scaffolding the fetch logic:
    if (sourceType === 'reddit' && sourceUrl && !rawContent) {
      // Simulate fetch from public JSON
      try {
        const response = await fetch(`${sourceUrl}.json`);
        const data = await response.json();
        contentToStore = JSON.stringify(data);
      } catch (e) {
        return res.status(400).json({ error: 'Failed to fetch Reddit JSON' });
      }
    } else if (sourceType === 'website' && sourceUrl && !rawContent) {
      // Basic fallback
      contentToStore = "Scraped content placeholder from " + sourceUrl;
    }

    // 1. Analyze Source (Platform-Owned Math)
    const sourceStats = analyzeSource({ source_type: sourceType, content: contentToStore });

    // 2. Insert Source
    const sourceId = `src_${Date.now()}`;
    const typeId = sourceType.toLowerCase(); // Ensure source_type exists

    db.serialize(() => {
      db.run(
        `INSERT INTO sources (id, workspace_id, source_type_id, source_name, source_url, authority_score, trust_weight, visibility_weight, coverage_score, health_score) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sourceId, workspaceId, typeId, sourceName || sourceUrl, sourceUrl, sourceStats.authorityScore, sourceStats.trustWeight, sourceStats.visibilityWeight, sourceStats.coverageScore, sourceStats.healthScore]
      );

      // 3. Insert Source Content
      db.run(
        `INSERT INTO source_content (id, source_id, content, metadata) VALUES (?, ?, ?, ?)`,
        [`cnt_${Date.now()}`, sourceId, contentToStore, JSON.stringify({ ingestedAt: new Date().toISOString() })]
      );
    });

    res.json({ success: true, sourceId, stats: sourceStats });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
