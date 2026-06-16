import { getDb } from '../database/init.js';
import { dbRun, dbAll } from '../utils/dbHelpers.js';
import { analyzeSource } from './sourceEngine.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) vampro-aeo-tracker/1.0';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getRedditAccessToken() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) return null;
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000 - 60000;
  return cachedToken;
}

async function redditFetch(url) {
  const token = await getRedditAccessToken();
  const oauthUrl = token ? url.replace('www.reddit.com', 'oauth.reddit.com') : url;

  const endpoints = token
    ? [oauthUrl]
    : [url, url.replace('www.reddit.com', 'old.reddit.com')];

  let lastError;
  for (const endpoint of endpoints) {
    try {
      const headers = {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        lastError = new Error(`Reddit API returned ${res.status} for ${endpoint}`);
        continue;
      }
      return res.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Reddit fetch failed');
}

export function parseRedditChild(child) {
  const data = child.data || child;
  const isComment =
    child.kind === 't1' || (data.name && data.name.startsWith('t1_'));
  return {
    id: data.id,
    reddit_id: data.name,
    type: isComment ? 'comment' : 'post',
    title: isComment
      ? `Comment: ${data.link_title || 'Thread'}`
      : data.title || '',
    selftext: isComment ? data.body || '' : data.selftext || '',
    score: data.score || 0,
    num_comments: data.num_comments || 0,
    views: data.view_count || null,
    subreddit: data.subreddit || 'unknown',
    url: data.permalink ? `https://reddit.com${data.permalink}` : data.url || '',
    created_utc: data.created_utc,
    author: data.author,
  };
}

export function parseRedditListing(json) {
  const children = json?.data?.children || [];
  return children.map(parseRedditChild).filter((p) => p.id);
}

export async function fetchUserOverview(username) {
  const clean = username.replace(/^u\//, '').trim();
  const data = await redditFetch(
    `https://www.reddit.com/user/${encodeURIComponent(clean)}/overview.json?limit=100`,
  );
  return parseRedditListing(data);
}

export async function searchReddit(query, limit = 10) {
  const data = await redditFetch(
    `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance`,
  );
  return parseRedditListing(data);
}

export async function loadWorkspacePosts(workspaceId) {
  const db = await getDb();
  const rows = await dbAll(
    db,
    `SELECT sc.content, sc.metadata, s.id as source_id, s.source_url, s.source_name
     FROM source_content sc
     JOIN sources s ON sc.source_id = s.id
     WHERE s.workspace_id = ? AND s.source_type_id = 'reddit'
     ORDER BY sc.created_at DESC`,
    [workspaceId],
  );

  const posts = [];
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.content);
      if (parsed.id) {
        posts.push(parsed);
      } else if (parsed.data?.children) {
        posts.push(...parseRedditListing(parsed));
      }
    } catch {
      /* skip malformed rows */
    }
  }

  const seen = new Set();
  return posts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export async function ingestPosts(workspaceId, username, posts) {
  const db = await getDb();
  const profileKey = `reddit_profile_${username}`;
  await dbRun(
    db,
    `INSERT OR REPLACE INTO settings (id, workspace_id, key, value) VALUES (?, ?, ?, ?)`,
    [`setting_${profileKey}`, workspaceId, profileKey, username],
  );

  const saved = [];
  for (const post of posts) {
    const sourceId = `src_reddit_${post.id}`;
    const content = JSON.stringify(post);
    const stats = analyzeSource({ source_type: 'reddit', content });

    await dbRun(
      db,
      `INSERT OR REPLACE INTO sources
       (id, workspace_id, source_type_id, source_name, source_url, authority_score, trust_weight, visibility_weight, coverage_score, health_score)
       VALUES (?, ?, 'reddit', ?, ?, ?, ?, ?, ?, ?)`,
      [
        sourceId,
        workspaceId,
        `${username}/${post.type}/${post.id}`,
        post.url,
        stats.authorityScore,
        stats.trustWeight,
        stats.visibilityWeight,
        stats.coverageScore,
        stats.healthScore,
      ],
    );

    await dbRun(
      db,
      `INSERT OR REPLACE INTO source_content (id, source_id, content, metadata)
       VALUES (?, ?, ?, ?)`,
      [
        `cnt_${post.id}`,
        sourceId,
        content,
        JSON.stringify({ username, ingestedAt: new Date().toISOString() }),
      ],
    );

    saved.push(post);
  }

  return saved;
}

export async function searchCompetitorMentions(competitors, keywords, indexedPosts, limit = 25) {
  const terms = [...new Set([...competitors, ...keywords].filter(Boolean))];
  const results = [];

  for (const term of terms.slice(0, 5)) {
    try {
      const redditHits = await searchReddit(term, 15);
      redditHits.forEach((hit) => {
        const text = `${hit.title} ${hit.selftext}`.toLowerCase();
        if (text.includes(term.toLowerCase())) {
          results.push({
            ...hit,
            matchedTerm: term,
            source: 'reddit_search',
          });
        }
      });
    } catch (err) {
      console.warn(`Competitor search failed for "${term}":`, err.message);
    }
  }

  indexedPosts.forEach((post) => {
    const text = `${post.title} ${post.selftext}`.toLowerCase();
    terms.forEach((term) => {
      if (text.includes(term.toLowerCase())) {
        results.push({
          ...post,
          matchedTerm: term,
          source: 'indexed_profile',
        });
      }
    });
  });

  const deduped = [];
  const seen = new Set();
  for (const item of results) {
    const key = `${item.id}-${item.matchedTerm}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return deduped.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);
}
