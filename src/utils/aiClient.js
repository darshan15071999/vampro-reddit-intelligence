import { useAppStore } from '../store/useAppStore';

const getGeminiKey = () => {
  // Get the latest providers state
  const state = useAppStore.getState();
  const geminiProvider = state.providers.find(p => p.id === 'gemini');
  if (geminiProvider && geminiProvider.apiKey && geminiProvider.apiKey !== 'internal') {
    return geminiProvider.apiKey;
  }
  return null;
};

export const callGeminiAPI = async (model, action, payload) => {
  const apiKey = getGeminiKey();
  
  if (apiKey) {
    // If the user provided their own key, call Google directly from the browser
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Google API Error");
    return data;
  } else {
    // Fallback: proxy via Cloudflare Functions (which holds the built-in key)
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, action, payload })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Proxy API Error");
    return data;
  }
};

/**
 * Generate an embedding vector for a given text.
 * Uses text-embedding-004
 */
export const generateEmbedding = async (text) => {
  if (!text) return null;
  
  try {
    const data = await callGeminiAPI('text-embedding-004', 'embedContent', {
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] }
    });
    return data.embedding.values;
  } catch (err) {
    console.error("Embedding generation failed:", err);
    return null; // Return null on failure so the app doesn't crash completely
  }
};

/**
 * Cosine similarity between two vectors (arrays of numbers)
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
