import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const dbPath = path.resolve(dbDir, 'vampro.sqlite');

export const getDb = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
};

export const initializeDatabase = async () => {
  const db = await getDb();
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      workspace_name TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      primary_brand TEXT,
      tracked_keywords TEXT,
      tracked_features TEXT,
      tracked_products TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
    )`,
    `CREATE TABLE IF NOT EXISTS source_types (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE
    )`,
    `CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      source_type_id TEXT,
      source_name TEXT,
      source_url TEXT,
      authority_score INTEGER DEFAULT 50,
      trust_weight INTEGER DEFAULT 50,
      visibility_weight INTEGER DEFAULT 50,
      coverage_score INTEGER DEFAULT 0,
      health_score INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
      FOREIGN KEY(source_type_id) REFERENCES source_types(id)
    )`,
    `CREATE TABLE IF NOT EXISTS source_content (
      id TEXT PRIMARY KEY,
      source_id TEXT,
      content TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(source_id) REFERENCES sources(id)
    )`,
    `CREATE TABLE IF NOT EXISTS queries (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      query TEXT,
      intent TEXT,
      category TEXT,
      generation_method TEXT,
      parent_query_id TEXT,
      visibility_score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
    )`,
    `CREATE TABLE IF NOT EXISTS citations (
      id TEXT PRIMARY KEY,
      query_id TEXT,
      source_id TEXT,
      citation_score INTEGER DEFAULT 0,
      confidence TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(query_id) REFERENCES queries(id),
      FOREIGN KEY(source_id) REFERENCES sources(id)
    )`,
    `CREATE TABLE IF NOT EXISTS citation_evidence (
      id TEXT PRIMARY KEY,
      citation_id TEXT,
      source_id TEXT,
      matched_text TEXT,
      reason TEXT,
      evidence_type TEXT,
      confidence TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(citation_id) REFERENCES citations(id),
      FOREIGN KEY(source_id) REFERENCES sources(id)
    )`,
    `CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      snapshot_type TEXT,
      snapshot_date TEXT,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
    )`,
    `CREATE TABLE IF NOT EXISTS provider_connections (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      provider_name TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      key TEXT,
      value TEXT,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
    )`,
    `CREATE TABLE IF NOT EXISTS analysis_runs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      analysis_type TEXT,
      status TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      metadata TEXT,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
    )`
  ];

  for (const table of tables) {
    await new Promise((resolve, reject) => {
      db.run(table, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Seed source types
  const seedTypes = ['reddit', 'website', 'blog', 'documentation', 'linkedin', 'youtube', 'facebook', 'x', 'quora', 'custom'];
  for (const type of seedTypes) {
    await new Promise((resolve, reject) => {
      db.run(`INSERT OR IGNORE INTO source_types (id, name) VALUES (?, ?)`, [type, type], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Seed default workspace and brand if not exists
  db.get(`SELECT id FROM workspaces WHERE id = 'default'`, async (err, row) => {
    if (!row) {
      db.run(`INSERT INTO workspaces (id, workspace_name, description) VALUES ('default', 'Live Workspace', 'Primary tracking workspace')`);
      db.run(`INSERT INTO workspaces (id, workspace_name, description) VALUES ('demo', 'Demo Workspace', 'Demonstration workspace with mock data')`);
      
      db.run(`INSERT INTO brands (id, workspace_id, primary_brand, tracked_keywords, tracked_features) 
              VALUES ('brand_1', 'default', 'Vampro', '["vampro", "citation engine"]', '["API", "Dashboard"]')`);
      
      db.run(`INSERT INTO brands (id, workspace_id, primary_brand, tracked_keywords, tracked_features) 
              VALUES ('brand_2', 'demo', 'DemoBrand', '["demo", "analytics"]', '["Reporting"]')`);
    }
  });

  db.close();
};
