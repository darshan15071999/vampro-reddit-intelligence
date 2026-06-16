export function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

export function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

export function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export async function getSetting(db, workspaceId, key) {
  const row = await dbGet(
    db,
    `SELECT value FROM settings WHERE workspace_id = ? AND key = ?`,
    [workspaceId, key],
  );
  return row?.value || null;
}

export async function getProviderKey(db, workspaceId, providerName) {
  return getSetting(db, workspaceId, `api_key_${providerName}`);
}
