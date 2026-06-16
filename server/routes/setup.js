import express from 'express';
import { getDb } from '../database/init.js';

const router = express.Router();

// GET all setup data for a workspace
router.get('/:workspaceId', async (req, res) => {
  try {
    const db = await getDb();
    
    db.get(`SELECT * FROM brands WHERE workspace_id = ?`, [req.params.workspaceId], (err, brand) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.all(`SELECT * FROM queries WHERE workspace_id = ?`, [req.params.workspaceId], (err, queries) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
          brand: brand || { primary_brand: '', tracked_keywords: '[]', tracked_features: '[]', tracked_products: '[]' },
          queries: queries || []
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// POST update brand setup
router.post('/:workspaceId/brand', async (req, res) => {
  const { primary_brand, tracked_keywords, tracked_features, tracked_products, industry, competitors, competitor_keywords } = req.body;
  
  try {
    const db = await getDb();
    
    // UPSERT brand configuration
    db.get(`SELECT id FROM brands WHERE workspace_id = ?`, [req.params.workspaceId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        db.run(
          `UPDATE brands SET primary_brand = ?, tracked_keywords = ?, tracked_features = ?, tracked_products = ? WHERE workspace_id = ?`,
          [primary_brand, JSON.stringify(tracked_keywords), JSON.stringify(tracked_features), JSON.stringify({ industry, competitors, competitor_keywords }), req.params.workspaceId],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
          }
        );
      } else {
        const newId = `brand_${Date.now()}`;
        db.run(
          `INSERT INTO brands (id, workspace_id, primary_brand, tracked_keywords, tracked_features, tracked_products) VALUES (?, ?, ?, ?, ?, ?)`,
          [newId, req.params.workspaceId, primary_brand, JSON.stringify(tracked_keywords), JSON.stringify(tracked_features), JSON.stringify({ industry, competitors, competitor_keywords })],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
          }
        );
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add a query (Search term / LLM Prompt)
router.post('/:workspaceId/queries', async (req, res) => {
  const { query, intent, category, generation_method } = req.body;
  try {
    const db = await getDb();
    const newId = `query_${Date.now()}`;
    
    db.run(
      `INSERT INTO queries (id, workspace_id, query, intent, category, generation_method) VALUES (?, ?, ?, ?, ?, ?)`,
      [newId, req.params.workspaceId, query, intent, category, generation_method],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: newId });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
