import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './storage';
import { generateEmbedding } from '../utils/aiClient';

export const fallbackDemoData = [
  { id: '1', type: 'post', title: 'How to fix hydration mismatch in Next.js 14?', selftext: 'To solve hydration issues, ensure standard setup and read documentation carefully.', score: 450, num_comments: 82, views: 12450, subreddit: 'reactjs', url: 'https://reddit.com/r/reactjs/1', created_utc: Date.now() / 1000 - (80 * 86400) },
  { id: '2', type: 'post', title: 'Why is Tailwind not loading in my app directory?', selftext: 'Make sure your tailwind.config.js content array includes the app/ folder.', score: 320, num_comments: 45, views: 8900, subreddit: 'nextjs', url: 'https://reddit.com/r/nextjs/2', created_utc: Date.now() / 1000 - (50 * 86400) },
  { id: 'c1', type: 'comment', title: 'Comment on: Understanding React Server Components', selftext: 'Server components run exclusively on the server, reducing the JS bundle size.', score: 120, num_comments: 0, views: 1500, subreddit: 'reactjs', url: 'https://reddit.com/r/reactjs/c1', created_utc: Date.now() / 1000 - (45 * 86400) }
];

export const useRedditStore = create(
  persist(
    (set, get) => ({
  profiles: [],
  setProfiles: (profiles) => set({ profiles }),
  
  username: '',
  setUsername: (username) => set({ username }),
  
  dataSource: 'manual',
  setDataSource: (source) => set({ dataSource: source }),
  
  manualJson: '',
  setManualJson: (json) => set({ manualJson: json }),
  
  posts: [],
  setPosts: (posts) => set({ posts }),
  
  allProfilesPosts: {},
  setAllProfilesPosts: (postsMap) => set({ allProfilesPosts: postsMap }),
  
  loading: false,
  setLoading: (loading) => set({ loading }),
  
  error: null,
  setError: (error) => set({ error }),
  
  fetchRedditData: async (isUserTriggered = false) => {
    const state = get();
    set({ loading: true, error: null });
    
    if (state.dataSource === 'manual') {
      try {
        if (!state.manualJson.trim()) { 
          if (isUserTriggered) throw new Error("No JSON provided."); 
          else { set({ loading: false }); return; } 
        }
        const data = JSON.parse(state.manualJson);

        let children = [];
        if (data && data?.data?.children) {
          children = data.data.children;
        } else if (Array.isArray(data)) {
          if (data[0] && data[0]?.data?.children) {
            children = data.flatMap(d => d.data?.children || []);
          } else {
            children = data;
          }
        } else if (data && (data.kind === 't1' || data.kind === 't3')) {
          children = [data];
        }

        if (children.length === 0) throw new Error("0 posts/comments or unrecognized format!");

        const firstAuthor = children[0]?.data?.author || 'Manual_Profile';

        set(state => {
          const profiles = state.profiles.includes(firstAuthor) ? state.profiles : [...state.profiles, firstAuthor];
          const username = (!state.username || state.username.trim() === '') ? firstAuthor : state.username;
          return { profiles, username };
        });

        const newPosts = children.map(child => {
          const itemData = child.data || child;
          const kind = child.kind || (itemData.name && itemData.name.startsWith('t1_') ? 't1' : 't3');
          const isComment = kind === 't1';
          return {
            id: itemData.id || Math.random().toString(),
            type: isComment ? 'comment' : 'post',
            title: isComment ? `Comment: ${itemData.link_title || 'Thread'}` : (itemData.title || 'Untitled'),
            selftext: isComment ? itemData.body : (itemData.selftext || "No text available."),
            score: itemData.score || 0,
            num_comments: itemData.num_comments || 0,
            views: itemData.view_count || Math.floor(Math.random() * 500) + ((itemData.score || 0) * 12),
            subreddit: itemData.subreddit || "unknown",
            url: itemData.permalink ? `https://reddit.com${itemData.permalink}` : '#',
            created_utc: itemData.created_utc || (Date.now() / 1000)
          }
        });
        
        set(state => ({
            posts: newPosts,
            allProfilesPosts: { ...state.allProfilesPosts, [state.username]: newPosts }
        }));
        
        // Trigger background embedding generation
        get().generateMissingEmbeddings();
        
      } catch (err) {
        set(state => ({
            error: err.message,
            profiles: state.profiles.length === 0 ? ['Demo_Profile'] : state.profiles,
            username: !state.username ? 'Demo_Profile' : state.username,
            posts: fallbackDemoData
        }));
      } finally { 
        set({ loading: false }); 
      }
    }
  },

  isGeneratingEmbeddings: false,
  generateMissingEmbeddings: async () => {
    const state = get();
    if (state.isGeneratingEmbeddings) return;
    
    set({ isGeneratingEmbeddings: true });
    try {
      let currentPosts = [...state.posts];
      let madeChanges = false;
      
      for (let i = 0; i < currentPosts.length; i++) {
        if (!currentPosts[i].embedding && (currentPosts[i].title || currentPosts[i].selftext)) {
          const textToEmbed = `${currentPosts[i].title || ''} ${currentPosts[i].selftext || ''}`.trim();
          if (textToEmbed) {
            const embedding = await generateEmbedding(textToEmbed);
            if (embedding) {
              currentPosts[i] = { ...currentPosts[i], embedding };
              madeChanges = true;
            }
          }
        }
      }
      
      if (madeChanges) {
        set(s => ({
            posts: currentPosts,
            allProfilesPosts: { ...s.allProfilesPosts, [s.username]: currentPosts }
        }));
      }
    } finally {
      set({ isGeneratingEmbeddings: false });
    }
  }
}), {
  name: 'vampro-reddit-storage',
  storage: idbStorage,
  partialize: (state) => ({ 
    profiles: state.profiles,
    username: state.username,
    dataSource: state.dataSource,
    manualJson: state.manualJson,
    posts: state.posts,
    allProfilesPosts: state.allProfilesPosts
  }),
}));
