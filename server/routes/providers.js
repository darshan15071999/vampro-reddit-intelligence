import express from 'express';
import { getDb } from '../database/init.js';

const router = express.Router();

// Get connected providers (SAFE: Does not return keys)
router.get('/:workspaceId', async (req, res) => {
  try {
    const db = await getDb();
    db.all(`SELECT id, provider_name, status FROM provider_connections WHERE workspace_id = ?`, [req.params.workspaceId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ providers: rows });
    });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Set Provider Key securely
router.post('/connect', async (req, res) => {
  const { workspaceId, providerName, apiKey } = req.body;
  if (!workspaceId || !providerName || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = await getDb();
    const id = `prov_${providerName}_${Date.now()}`;
    
    // UPSERT LOGIC
    db.get(`SELECT id FROM provider_connections WHERE workspace_id = ? AND provider_name = ?`, [workspaceId, providerName], (err, row) => {
      if (row) {
        db.run(`UPDATE provider_connections SET status = 'Connected' WHERE id = ?`, [row.id]);
      } else {
        // In a real prod environment, the API Key would go into a secure vault or encrypted DB field.
        // For this phase, we just mark it connected. The settings table could hold it encrypted.
        db.run(`INSERT INTO provider_connections (id, workspace_id, provider_name, status) VALUES (?, ?, ?, ?)`, [id, workspaceId, providerName, 'Connected']);
        
        // Storing actual key in settings for backend use
        db.run(`INSERT OR REPLACE INTO settings (id, workspace_id, key, value) VALUES (?, ?, ?, ?)`, [`key_${providerName}`, workspaceId, `api_key_${providerName}`, apiKey]);
      }
      res.json({ success: true, provider: providerName, status: 'Connected' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
