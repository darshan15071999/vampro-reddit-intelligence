import {
  queryDocumentSimilarity,
  generateSemanticCluster,
  calculateAvgLLMVisibility,
  mentionsBrand,
} from '../../shared/semantic.js';
import { getDb } from '../database/init.js';
import { dbRun, dbGet, dbAll } from '../utils/dbHelpers.js';
import { loadWorkspacePosts, searchReddit } from './redditService.js';
import { queryBestAvailableLLM } from './llmService.js';
import { detectCitations } from './citationEngine.js';

const SIMILARITY_THRESHOLD = 0.35;
const PATHWAY_MATCH_THRESHOLD = 0.15;

async function fetchHackerNews(query) {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=6`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map((hit) => ({
      domain: 'news.ycombinator.com',
      type: 'forum',
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      weight: Math.round(
        queryDocumentSimilarity(query, query, `${hit.title} ${hit.story_text || ''}`) * 110,
      ),
    })).filter((h) => h.weight > 15);
  } catch {
    return [];
  }
}

function rankTier(userSurfaceCount, totalPathways) {
  const ratio = userSurfaceCount / Math.max(totalPathways, 1);
  if (ratio >= 0.7) return 'Tier 1 (High Visibility)';
  if (ratio >= 0.45) return 'Tier 2 (Moderate Visibility)';
  if (ratio >= 0.2) return 'Tier 3 (Low Visibility)';
  if (userSurfaceCount > 0) return 'Tier 4 (Marginal)';
  return 'Unranked';
}

function postMatchesUserResult(userPost, redditResult) {
  if (!userPost?.url || !redditResult?.url) return false;
  const normalize = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  return normalize(userPost.url) === normalize(redditResult.url)
    || userPost.id === redditResult.id
    || (userPost.reddit_id && redditResult.reddit_id && userPost.reddit_id === redditResult.reddit_id);
}

export async function executeQueryAnalysis({
  workspaceId,
  queryId,
  queryText,
  brandConfig = {},
  preferredProviders = [],
  contextSources = [],
}) {
  const posts = await loadWorkspacePosts(workspaceId);
  const brandName =
    brandConfig.primaryBrand ||
    brandConfig.primary_brand ||
    contextSources.find((s) => s.type === 'brand')?.value ||
    '';

  const variants = [queryText, ...generateSemanticCluster(queryText, brandConfig)].slice(0, 10);

  let userSurfaceCount = 0;
  let totalRedditSurfaceCount = 0;
  let otherRedditSurfaceCount = 0;
  let maxVisScore = 0;
  let bestOverallPost = null;
  const externalCitations = [];
  const pathwayDetails = [];

  for (const variant of variants) {
    let redditResults = [];
    let fetchError = null;
    try {
      redditResults = await searchReddit(variant, 8);
    } catch (err) {
      fetchError = err.message;
    }

    if (fetchError) {
      pathwayDetails.push({ variant, error: fetchError, redditResultCount: 0, userSurfaced: false });
      continue;
    }

    const redditSurfaced = redditResults.length > 0;
    if (redditSurfaced) totalRedditSurfaceCount += 1;

    const bestIndexedMatch = posts.length
      ? posts
          .map((p) => ({
            ...p,
            score: queryDocumentSimilarity(queryText, variant, `${p.title} ${p.selftext}`),
          }))
          .sort((a, b) => b.score - a.score)[0]
      : null;

    const urlMatch = redditResults.some((r) =>
      posts.some((p) => postMatchesUserResult(p, r)),
    );

    const semanticMatch =
      bestIndexedMatch && bestIndexedMatch.score >= SIMILARITY_THRESHOLD;

    if (urlMatch || semanticMatch) {
      userSurfaceCount += 1;
      const visScore = Math.min(
        99,
        Math.round((bestIndexedMatch?.score || 0.5) * 140),
      );
      if (visScore > maxVisScore) {
        maxVisScore = visScore;
        bestOverallPost = bestIndexedMatch;
      }
    } else if (redditSurfaced) {
      otherRedditSurfaceCount += 1;
    }

    pathwayDetails.push({
      variant,
      redditResultCount: redditResults.length,
      bestIndexedScore: bestIndexedMatch?.score || 0,
      userSurfaced: urlMatch || semanticMatch,
    });
  }

  const hnCitations = await fetchHackerNews(queryText);
  externalCitations.push(...hnCitations);

  const primaryRedditResults = await searchReddit(queryText, 5).catch(() => []);
  primaryRedditResults.forEach((r) => {
    externalCitations.push({
      domain: 'reddit.com',
      type: 'reddit',
      title: r.title,
      weight: Math.min(99, 20 + (r.score || 0)),
      url: r.url,
    });
  });

  const profileSurfaced = userSurfaceCount > 0;
  const profileVisScore = profileSurfaced
    ? Math.round(maxVisScore * 0.7 + (userSurfaceCount / variants.length) * 30)
    : 0;

  if (profileSurfaced && bestOverallPost) {
    externalCitations.push({
      domain: 'reddit.com',
      type: 'reddit',
      title: bestOverallPost.title,
      weight: Math.max(profileVisScore, 40),
      url: bestOverallPost.url,
    });
  }

  let mentionsBrandInPost = false;
  if (bestOverallPost) {
    mentionsBrandInPost = mentionsBrand(
      `${bestOverallPost.title} ${bestOverallPost.selftext}`,
      brandName,
    );
  }

  let finalLlmResponse = '';
  let usedProviderName = null;
  let llmMentionsBrand = false;
  let docSnippet = null;

  const contextForLlm = bestOverallPost
    ? `"${bestOverallPost.title}" — ${(bestOverallPost.selftext || '').slice(0, 400)}`
    : '';

  const llmResult = await queryBestAvailableLLM(
    workspaceId,
    preferredProviders,
    queryText,
    contextForLlm,
  );

  if (llmResult?.text) {
    finalLlmResponse = llmResult.text;
    usedProviderName = llmResult.providerName;
    llmMentionsBrand = mentionsBrand(finalLlmResponse, brandName);
  } else if (profileSurfaced && bestOverallPost) {
    const text = bestOverallPost.selftext || '';
    const sentences = text.split(/[.?!]/).map((s) => s.trim()).filter((s) => s.length > 15);
    const relevant =
      sentences.find((s) => mentionsBrand(s, brandName)) ||
      sentences[0] ||
      bestOverallPost.title;
    finalLlmResponse = `Based on indexed community content: "${relevant}". This reflects your tracked Reddit profile relevance for "${queryText}". Connect an LLM provider for live model verification.`;
    usedProviderName = 'Indexed Content Analysis';
    llmMentionsBrand = mentionsBrand(relevant, brandName);
  } else if (totalRedditSurfaceCount > 0) {
    finalLlmResponse = `Reddit search returned ${totalRedditSurfaceCount} relevant discussion pathways for "${queryText}", but none matched your indexed profiles above the ${SIMILARITY_THRESHOLD * 100}% similarity threshold.`;
    usedProviderName = 'Reddit Search Analysis';
  } else {
    finalLlmResponse = `No strong Reddit discussion footprint found for "${queryText}". Documentation and official sources likely dominate this query intent.`;
    usedProviderName = 'Evidence-Based Analysis';
  }

  const matchIndex = Math.max(0, finalLlmResponse.toLowerCase().indexOf(brandName.toLowerCase()));
  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(finalLlmResponse.length, matchIndex + 160);
  docSnippet =
    (start > 0 ? '...' : '') +
    finalLlmResponse.substring(start, end).trim().replace(/\n/g, ' ') +
    (end < finalLlmResponse.length ? '...' : '');

  const combinedRankEquivalent = rankTier(userSurfaceCount, variants.length);
  const optimizationTips = [];

  if (profileSurfaced) {
    optimizationTips.push(
      `Your indexed content matched ${userSurfaceCount} of ${variants.length} query pathways (deterministic semantic + Reddit URL matching).`,
    );
    if (mentionsBrandInPost && llmMentionsBrand) {
      optimizationTips.push('Strong: Brand appears in both indexed content and model response.');
    } else if (mentionsBrandInPost && !llmMentionsBrand) {
      optimizationTips.push(
        'Mismatch: Your post mentions the brand but the model response did not — improve topical authority for this query cluster.',
      );
    }
  } else if (totalRedditSurfaceCount > 0) {
    optimizationTips.push(
      `Missed Opportunity: Reddit discussions surfaced in ${totalRedditSurfaceCount} pathways, but your profile did not rank within them.`,
    );
  } else {
    optimizationTips.push(
      `Low Discoverability: No Reddit overlap for "${queryText}". Consider publishing targeted content in relevant subreddits.`,
    );
  }

  const timestamp = Date.now() / 1000;
  const result = {
    queryId,
    query: queryText,
    timestamp,
    providersUsed: preferredProviders,
    usedProviderName,
    redditSurfaced: totalRedditSurfaceCount > 0,
    profileSurfaced,
    profileVisibilityScore: profileVisScore,
    userSurfaceCount,
    totalRedditSurfaceCount,
    otherRedditSurfaceCount,
    combinedRankEquivalent,
    totalRunQueries: variants.length,
    llmMentionsDoc360: llmMentionsBrand,
    doc360Snippet: docSnippet,
    browserSearchSurfaced: profileSurfaced || hnCitations.length > 0,
    optimizationTips,
    surfacedPostUrl: bestOverallPost?.url || null,
    surfacedPostTitle: bestOverallPost?.title || null,
    sources: externalCitations,
    llmResponse: finalLlmResponse,
    pathwayDetails,
    methodology: 'Deterministic: Reddit Search API + semantic matching + optional LLM verification',
  };

  await persistAnalysisRun(workspaceId, queryId, queryText, result);
  return result;
}

async function persistAnalysisRun(workspaceId, queryId, queryText, result) {
  const db = await getDb();
  const runId = `run_${Date.now()}`;
  const snapshotId = `snap_${Date.now()}`;

  await dbRun(
    db,
    `INSERT INTO analysis_runs (id, workspace_id, analysis_type, status, completed_at, metadata)
     VALUES (?, ?, 'query_execution', 'completed', datetime('now'), ?)`,
    [runId, workspaceId, JSON.stringify({ queryId, queryText })],
  );

  await dbRun(
    db,
    `INSERT INTO snapshots (id, workspace_id, snapshot_type, snapshot_date, payload)
     VALUES (?, ?, 'query_result', date('now'), ?)`,
    [snapshotId, workspaceId, JSON.stringify(result)],
  );

  if (queryId) {
    await dbRun(
      db,
      `UPDATE queries SET visibility_score = ? WHERE id = ? AND workspace_id = ?`,
      [result.profileVisibilityScore, queryId, workspaceId],
    );
  }

  const posts = await loadWorkspacePosts(workspaceId);
  const bestPost = posts.find((p) => p.url === result.surfacedPostUrl);
  if (bestPost && queryId) {
    const sourceRow = await dbGet(db, `SELECT id FROM sources WHERE source_url = ?`, [bestPost.url]);
    if (sourceRow) {
      const citation = detectCitations(queryText, { content: `${bestPost.title} ${bestPost.selftext}` });
      const citationId = `cit_${Date.now()}`;
      await dbRun(
        db,
        `INSERT INTO citations (id, query_id, source_id, citation_score, confidence)
         VALUES (?, ?, ?, ?, ?)`,
        [citationId, queryId, sourceRow.id, citation.citationScore, citation.confidence],
      );
    }
  }
}

export async function computeLiveSovTick(workspaceId, queryText, brandConfig, customDomains = []) {
  const posts = await loadWorkspacePosts(workspaceId);
  const variants = [queryText, ...generateSemanticCluster(queryText, brandConfig)].slice(0, 3);

  let redditOverallWeight = 0;
  let userWeight = 0;
  let forumWeight = 0;
  let matchedSubreddit = 'general';

  for (const variant of variants) {
    try {
      const redditResults = await searchReddit(variant, 6);
      redditOverallWeight += redditResults.reduce((acc, r) => acc + Math.max(10, (r.score || 0) + 5), 0);

      posts.forEach((post) => {
        const sim = queryDocumentSimilarity(variant, variant, `${post.title} ${post.selftext}`);
        if (sim > PATHWAY_MATCH_THRESHOLD) {
          userWeight += sim * 150;
          matchedSubreddit = post.subreddit;
        }
      });
    } catch {
      /* rate limit or network */
    }
  }

  const hn = await fetchHackerNews(queryText);
  forumWeight = hn.reduce((acc, h) => acc + h.weight, 0);

  userWeight = Math.min(userWeight, redditOverallWeight * 0.85 || userWeight);

  const customDomainWeights = [];
  for (const domain of customDomains) {
    customDomainWeights.push({
      domain,
      weight: Math.round(50 + userWeight * 0.1),
    });
  }

  const officialWeight = Math.max(
    50,
    Math.round((redditOverallWeight + forumWeight) * 0.4),
  );

  return {
    timestamp: Date.now() / 1000,
    query: queryText,
    officialWeight,
    redditOverallWeight: Math.round(redditOverallWeight),
    userWeight: Math.round(userWeight),
    forumWeight: Math.round(forumWeight),
    customDomainWeights,
    subreddit: matchedSubreddit,
    methodology: 'Live: Reddit Search API + HN Algolia + indexed profile similarity',
  };
}

export async function getQueryHistory(workspaceId, limit = 100) {
  const db = await getDb();
  const rows = await dbAll(
    db,
    `SELECT payload, created_at FROM snapshots
     WHERE workspace_id = ? AND snapshot_type = 'query_result'
     ORDER BY created_at DESC LIMIT ?`,
    [workspaceId, limit],
  );

  return rows.map((row) => {
    try {
      return JSON.parse(row.payload);
    } catch {
      return null;
    }
  }).filter(Boolean);
}