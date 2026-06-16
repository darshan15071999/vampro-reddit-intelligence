/**
 * Historical Intelligence Engine
 * Lightweight local tracking for trend analysis and historical snapshots.
 */

const STORAGE_KEY = 'vampro_historical_snapshots';

export const saveSnapshot = (type, data) => {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!existing[type]) existing[type] = [];
    
    // Create new snapshot
    const snapshot = {
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      data
    };

    // Avoid multiple snapshots on the exact same date (upsert)
    const dateIndex = existing[type].findIndex(s => s.date === snapshot.date);
    if (dateIndex >= 0) {
      existing[type][dateIndex] = snapshot;
    } else {
      existing[type].push(snapshot);
    }

    // Keep only last 90 snapshots
    if (existing[type].length > 90) {
      existing[type] = existing[type].slice(-90);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return true;
  } catch (e) {
    console.error("Failed to save historical snapshot:", e);
    return false;
  }
};

export const getSnapshots = (type, days = 30) => {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const snapshots = existing[type] || [];
    
    const cutoff = Date.now() - (days * 86400 * 1000);
    return snapshots.filter(s => s.timestamp >= cutoff).sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.error("Failed to retrieve historical snapshots:", e);
    return [];
  }
};
