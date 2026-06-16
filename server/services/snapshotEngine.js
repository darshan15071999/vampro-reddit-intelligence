/**
 * Snapshot Engine
 * Platform-Owned Intelligence
 * Responsible for Daily/Weekly/Monthly persistence and trend extraction.
 */

export const createSnapshot = async (db, workspaceId, snapshotType, payload) => {
  return new Promise((resolve, reject) => {
    const id = `snap_${Date.now()}`;
    const date = new Date().toISOString().split('T')[0];
    
    db.run(
      `INSERT INTO snapshots (id, workspace_id, snapshot_type, snapshot_date, payload) VALUES (?, ?, ?, ?, ?)`,
      [id, workspaceId, snapshotType, date, JSON.stringify(payload)],
      function(err) {
        if (err) reject(err);
        else resolve({ id, snapshot_date: date });
      }
    );
  });
};
