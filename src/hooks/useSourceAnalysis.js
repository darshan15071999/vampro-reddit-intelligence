import { useState, useCallback, useEffect } from 'react';

export const useSourceAnalysis = (workspaceId = 'default') => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const fetchWorkspaceData = useCallback(async () => {
    setLoading(true); 
    setError(null);
    try {
      // Fetch core sources
      const sourceRes = await fetch(`/api/pipeline/${workspaceId}`);
      if (!sourceRes.ok) throw new Error('Failed to fetch sources');
      const sourceData = await sourceRes.json();
      
      // Map backend 'sources' to frontend 'posts' expected format for now
      const mappedPosts = (sourceData.sources || []).map(s => ({
        id: s.id,
        type: s.source_type_id === 'reddit' ? 'post' : 'article',
        title: s.source_name,
        selftext: 'Content stored securely on backend.',
        score: s.authority_score * 10,
        num_comments: Math.round(s.coverage_score / 2),
        views: s.visibility_weight * 100,
        subreddit: s.source_type_id === 'reddit' ? 'reactjs' : s.source_type_id,
        url: s.source_url,
        created_at: s.created_at
      }));

      setPosts(mappedPosts);

      // Fetch analytics / executive insights
      const analyticsRes = await fetch(`/api/analytics/${workspaceId}/dashboard`);
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
      
    } catch (err) { 
      setError(err.message); 
      setPosts([]); 
      setAnalytics(null);
    } finally { 
      setLoading(false); 
    }
  }, [workspaceId]);

  useEffect(() => { 
    fetchWorkspaceData(); 
  }, [fetchWorkspaceData]);

  return { posts, loading, error, analytics, refetch: fetchWorkspaceData };
};
