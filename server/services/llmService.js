import { getDb } from '../database/init.js';
import { getProviderKey } from '../utils/dbHelpers.js';

const PROVIDER_CONFIG = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    name: 'ChatGPT (OpenAI)',
  },
  chatgpt: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    name: 'ChatGPT (OpenAI)',
  },
  perplexity: {
    url: 'https://api.perplexity.ai/chat/completions',
    model: 'sonar',
    name: 'Perplexity AI',
  },
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-haiku-20241022',
    name: 'Claude (Anthropic)',
  },
};

async function callOpenAICompatible({ apiKey, url, model, query, context, systemPrompt }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: context
            ? `Answer this query in 2-4 sentences: ${query}\n\nRelevant community context:\n${context}`
            : `Answer this query in 2-4 sentences: ${query}`,
        },
      ],
      max_tokens: 250,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callClaude({ apiKey, model, query, context, systemPrompt }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 250,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: context
            ? `Answer this query in 2-4 sentences: ${query}\n\nRelevant community context:\n${context}`
            : `Answer this query in 2-4 sentences: ${query}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() || '';
}

export async function queryLLM(workspaceId, providerId, query, context = '') {
  const db = await getDb();
  const config = PROVIDER_CONFIG[providerId];
  if (!config) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }

  const apiKey = await getProviderKey(db, workspaceId, providerId)
    || (providerId === 'openai' ? await getProviderKey(db, workspaceId, 'chatgpt') : null);
  if (!apiKey) {
    throw new Error(`No API key configured for ${providerId}`);
  }

  const systemPrompt =
    'You are a concise search assistant. Answer factually based on general knowledge. If community context is provided, you may reference it when relevant.';

  if (providerId === 'claude') {
    const text = await callClaude({
      apiKey,
      model: config.model,
      query,
      context,
      systemPrompt,
    });
    return { text, providerName: config.name, providerId };
  }

  const text = await callOpenAICompatible({
    apiKey,
    url: config.url,
    model: config.model,
    query,
    context,
    systemPrompt,
  });
  return { text, providerName: config.name, providerId };
}

export async function queryBestAvailableLLM(workspaceId, preferredProviders, query, context) {
  const order = preferredProviders?.length
    ? preferredProviders
    : ['openai', 'chatgpt', 'perplexity', 'claude'];

  for (const providerId of order) {
    try {
      return await queryLLM(workspaceId, providerId, query, context);
    } catch (err) {
      console.warn(`Provider ${providerId} unavailable:`, err.message);
    }
  }
  return null;
}
