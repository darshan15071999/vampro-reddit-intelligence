const KEYS = {
  BRAND: 'vampro_brand_config',
  QUERIES: 'vampro_queries',
  PROVIDERS: 'vampro_providers',
  SOURCES: 'vampro_sources',
  POSTS: 'vampro_posts'
};

export const storage = {
  // Brand Configuration
  getBrandConfig: () => {
    try {
      const data = localStorage.getItem(KEYS.BRAND);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading brand config from storage:', e);
    }
    return {
      primary_brand: '',
      industry: '',
      tracked_keywords: [],
      tracked_features: [],
      competitors: [],
      competitor_keywords: []
    };
  },
  
  saveBrandConfig: (config) => {
    try {
      localStorage.setItem(KEYS.BRAND, JSON.stringify(config));
      return true;
    } catch (e) {
      console.error('Error saving brand config:', e);
      return false;
    }
  },

  // Queries
  getQueries: () => {
    try {
      const data = localStorage.getItem(KEYS.QUERIES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading queries:', e);
    }
    return [];
  },

  saveQuery: (query) => {
    try {
      const queries = storage.getQueries();
      const newQuery = { ...query, id: `query_${Date.now()}` };
      queries.push(newQuery);
      localStorage.setItem(KEYS.QUERIES, JSON.stringify(queries));
      return true;
    } catch (e) {
      console.error('Error saving query:', e);
      return false;
    }
  },

  // Providers / Integrations
  getProviders: () => {
    try {
      const data = localStorage.getItem(KEYS.PROVIDERS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading providers:', e);
    }
    return {};
  },

  saveProvider: (providerId, apiKey) => {
    try {
      const providers = storage.getProviders();
      providers[providerId] = { apiKey, connectedAt: new Date().toISOString() };
      localStorage.setItem(KEYS.PROVIDERS, JSON.stringify(providers));
      return true;
    } catch (e) {
      console.error('Error saving provider:', e);
      return false;
    }
  },

  // Ingested Data / Posts
  getPosts: () => {
    try {
      const data = localStorage.getItem(KEYS.POSTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading posts:', e);
    }
    return [];
  },
  
  savePosts: (posts) => {
    try {
      localStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
      return true;
    } catch (e) {
      console.error('Error saving posts:', e);
      return false;
    }
  }
};
