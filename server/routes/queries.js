import express from 'express';
import { getDb } from '../database/init.js';
import { dbGet, dbAll, dbRun } from '../utils/dbHelpers.js';
import {
  executeQueryAnalysis,
  getQueryHistory,
  computeLiveSovTick,
} from '../services/visibilityEngine.js';
import { calculateSOV } from '../services/sovEngine.js';

const router = express.Router();

function parseBrand(row) {
  if (!row) {
    return {
      primaryBrand: '',
      industry: '',
      keywords: [],
      competitors: [],
      searchTerms: [],
    };
  }

  let extra = {};
  try {
    extra = JSON.parse(row.tracked_products || '{}');
  } catch {
    extra = {};
  }

  let keywords = [];
  try {
    keywords = JSON.parse(row.tracked_keywords || '[]');
  } catch {
    keywords = [];
  }

  return {
    primaryBrand: row.primary_brand || '',
    primary_brand: row.primary_brand || '',
    industry: extra.industry || '',
    keywords,
    tracked_keywords: keywords,
    competitors: extra.competitors || [],
    searchTerms: extra.searchTerms || keywords,
  };
}

router.post('/:workspaceId/execute', async (req, res) => {
  const { queryId, queryText, preferredProviders, contextSources } = req.body;
  if (!queryText) {
    return res.status(400).json({ error: 'queryText is required' });
  }

  try {
    const db = await getDb();
    const brandRow = await dbGet(
      db,
      `SELECT * FROM brands WHERE workspace_id = ? LIMIT 1`,
      [req.params.workspaceId],
    );
    const brandConfig = parseBrand(brandRow);

    const result = await executeQueryAnalysis({
      workspaceId: req.params.workspaceId,
      queryId,
      queryText,
      brandConfig,
      preferredProviders: preferredProviders || [],
      contextSources: contextSources || [],
    });

    res.json(result);
  } catch (error) {
    console.error('Query execution failed:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:workspaceId/history', async (req, res) => {
  try {
    const history = await getQueryHistory(req.params.workspaceId, 200);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:workspaceId/live-tick', async (req, res) => {
  const { queryText, customDomains } = req.body;
  if (!queryText) {
    return res.status(400).json({ error: 'queryText is required' });
  }

  try {
    const db = await getDb();
    const brandRow = await dbGet(
      db,
      `SELECT * FROM brands WHERE workspace_id = ? LIMIT 1`,
      [req.params.workspaceId],
    );
    const brandConfig = parseBrand(brandRow);
    const tick = await computeLiveSovTick(
      req.params.workspaceId,
      queryText,
      brandConfig,
      customDomains || [],
    );
    res.json(tick);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:workspaceId/sov', async (req, res) => {
  try {
    const db = await getDb();
    const brandRow = await dbGet(
      db,
      `SELECT * FROM brands WHERE workspace_id = ? LIMIT 1`,
      [req.params.workspaceId],
    );
    const brandConfig = parseBrand(brandRow);
    const history = await getQueryHistory(req.params.workspaceId, 500);

    const citations = await dbAll(
      db,
      `SELECT c.* FROM citations c
       JOIN queries q ON c.query_id = q.id
       WHERE q.workspace_id = ?`,
      [req.params.workspaceId],
    );

    const sov = calculateSOV(
      brandConfig.primaryBrand,
      brandConfig.competitors,
      citations,
    );

    res.json({ sov, historyCount: history.length, runs: history.slice(0, 20) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:workspaceId', async (req, res) => {
  const { query, intent, category, generation_method } = req.body;
  if (!query?.trim()) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    const db = await getDb();
    const newId = `query_${Date.now()}`;
    await dbRun(
      db,
      `INSERT INTO queries (id, workspace_id, query, intent, category, generation_method)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId, req.params.workspaceId, query.trim(), intent, category, generation_method],
    );
    res.json({ success: true, id: newId, text: query.trim(), category: category || 'General' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:workspaceId', async (req, res) => {
  try {
    const db = await getDb();
    const queries = await dbAll(
      db,
      `SELECT id, query as text, category, visibility_score, created_at FROM queries
       WHERE workspace_id = ? ORDER BY created_at DESC`,
      [req.params.workspaceId],
    );
    res.json({ queries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:workspaceId/:queryId', async (req, res) => {
  try {
    const db = await getDb();
    await dbRun(
      db,
      `DELETE FROM queries WHERE id = ? AND workspace_id = ?`,
      [req.params.queryId, req.params.workspaceId],
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
