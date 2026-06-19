export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  try {
    const body = await context.request.json();
    
    // In Cloudflare Pages, env variables are available on context.env
    // Users will need to add GEMINI_API_KEY to their Pages project settings
    const apiKey = context.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server missing GEMINI_API_KEY secret." }), { 
        status: 500, 
        headers: { 'Access-Control-Allow-Origin': '*' } 
      });
    }
    
    const { model, action, payload } = body;
    if (!model || !action || !payload) {
      return new Response(JSON.stringify({ error: "Missing required fields: model, action, payload" }), { 
        status: 400, 
        headers: { 'Access-Control-Allow-Origin': '*' } 
      });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}`;
    
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (!res.ok) {
        return new Response(JSON.stringify({ error: data.error?.message || "Google API Error" }), { 
            status: res.status, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
