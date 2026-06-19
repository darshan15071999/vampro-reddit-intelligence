import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './storage';

export const useAppStore = create(
  persist(
    (set) => ({
  theme: 'dark',
  setTheme: (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  
  brandConfig: {
    primaryBrand: 'Your Brand',
    industry: 'Tech',
    competitors: ['Competitor A', 'Competitor B'],
    keywords: ['keyword1', 'keyword2'],
    searchTerms: ['search term 1', 'search term 2']
  },
  setBrandConfig: (config) => set((state) => ({ brandConfig: { ...state.brandConfig, ...config } })),
  brandConfigEmbedding: null,
  setBrandConfigEmbedding: (embedding) => set({ brandConfigEmbedding: embedding }),
  
  isBrandConfigSaved: false,
  setIsBrandConfigSaved: (isSaved) => set({ isBrandConfigSaved: isSaved }),

  providers: [
    { id: 'chatgpt', name: 'ChatGPT (OpenAI)', enabled: true, status: 'requires_key', apiKey: '', isCustom: true },
    { id: 'perplexity', name: 'Perplexity AI', enabled: true, status: 'requires_key', apiKey: '', isCustom: true },
    { id: 'claude', name: 'Claude (Anthropic)', enabled: false, status: 'requires_key', apiKey: '', isCustom: true },
    { id: 'gemini', name: 'Gemini 2.5 (Built-in)', enabled: true, status: 'connected', apiKey: 'internal', isCustom: false }
  ],
  setProviders: (providers) => set({ providers }),

  isRedditIntelligenceExpanded: true,
  setIsRedditIntelligenceExpanded: (expanded) => set({ isRedditIntelligenceExpanded: expanded })
}), {
  name: 'vampro-app-storage',
  storage: idbStorage,
}));
