/**
 * Job Engine
 * Platform Scaffolding
 * Foundation for Scheduled Background Scans (Reddit, SoV, Citations).
 */

export const triggerAnalysisJob = async (db, workspaceId, analysisType) => {
  return new Promise((resolve, reject) => {
    const jobId = `job_${Date.now()}`;
    db.run(
      `INSERT INTO analysis_runs (id, workspace_id, analysis_type, status) VALUES (?, ?, ?, ?)`,
      [jobId, workspaceId, analysisType, 'running'],
      function(err) {
        if (err) reject(err);
        else resolve(jobId);
      }
    );
  });
};

export const completeAnalysisJob = async (db, jobId, metadata) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE analysis_runs SET status = 'completed', completed_at = CURRENT_TIMESTAMP, metadata = ? WHERE id = ?`,
      [JSON.stringify(metadata), jobId],
      function(err) {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
};
