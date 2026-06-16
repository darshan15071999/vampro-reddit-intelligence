import 'dotenv/config';

const WORKSPACE_ID = 'default';

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  workspaceId: WORKSPACE_ID,

  health: () => request('/health'),

  getSetup: () => request(`/setup/${WORKSPACE_ID}`),

  saveBrand: (brand) =>
    request(`/setup/${WORKSPACE_ID}/brand`, {
      method: 'POST',
      body: JSON.stringify({
        primary_brand: brand.primaryBrand,
        tracked_keywords: brand.keywords || brand.searchTerms || [],
        tracked_features: brand.trackedFeatures || [],
        industry: brand.industry,
        competitors: brand.competitors || [],
        competitor_keywords: brand.competitorKeywords || [],
      }),
    }),

  getQueries: () => request(`/queries/${WORKSPACE_ID}`),

  addQuery: (query, category = 'General') =>
    request(`/queries/${WORKSPACE_ID}`, {
      method: 'POST',
      body: JSON.stringify({ query, category }),
    }),

  deleteQuery: (queryId) =>
    request(`/queries/${WORKSPACE_ID}/${queryId}`, { method: 'DELETE' }),

  executeQuery: (payload) =>
    request(`/queries/${WORKSPACE_ID}/execute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getQueryHistory: () => request(`/queries/${WORKSPACE_ID}/history`),

  liveSovTick: (queryText, customDomains = []) =>
    request(`/queries/${WORKSPACE_ID}/live-tick`, {
      method: 'POST',
      body: JSON.stringify({ queryText, customDomains }),
    }),

  connectProvider: (providerName, apiKey) =>
    request('/providers/connect', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: WORKSPACE_ID,
        providerName,
        apiKey,
      }),
    }),

  getProviders: () => request(`/providers/${WORKSPACE_ID}`),

  fetchRedditUser: (username) => request(`/reddit/user/${encodeURIComponent(username)}`),

  ingestReddit: (username, rawJson) =>
    request('/reddit/ingest', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: WORKSPACE_ID,
        username,
        rawJson,
      }),
    }),

  getPosts: () => request(`/reddit/${WORKSPACE_ID}/posts`),

  analyzePost: (postContent) =>
    request('/reddit/analyze-post', {
      method: 'POST',
      body: JSON.stringify({ workspaceId: WORKSPACE_ID, postContent }),
    }),

  scanCompetitors: (competitors, keywords) =>
    request('/reddit/scan-competitors', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: WORKSPACE_ID,
        competitors,
        keywords,
      }),
    }),

  suggestContent: (savedQueries) =>
    request('/reddit/suggest-content', {
      method: 'POST',
      body: JSON.stringify({ workspaceId: WORKSPACE_ID, savedQueries }),
    }),

  getPlatformScores: (queryText, postIds) =>
    request('/reddit/platform-scores', {
      method: 'POST',
      body: JSON.stringify({ workspaceId: WORKSPACE_ID, queryText, postIds }),
    }),

  getDashboard: () => request(`/analytics/${WORKSPACE_ID}/dashboard`),
};

export default api;
