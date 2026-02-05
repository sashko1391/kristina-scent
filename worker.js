// ========================================
// KRISTINA | SCENT - Cloudflare Worker
// Проксі для Claude API + Telegram API
// ========================================

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS (preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Тільки POST запити
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    try {
      const body = await request.json();
      const { action } = body;

      // Роутінг за типом запиту
      if (action === 'chat') {
        return await handleChatRequest(body, env, corsHeaders);
      } else if (action === 'telegram') {
        return await handleTelegramRequest(body, env, corsHeaders);
      } else {
        return new Response(JSON.stringify({ 
          error: 'Unknown action' 
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

// ========================================
// CLAUDE API HANDLER
// ========================================
async function handleChatRequest(body, env, corsHeaders) {
  const { system, messages } = body;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: system,
      messages: messages
    })
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

// ========================================
// TELEGRAM API HANDLER
// ========================================
async function handleTelegramRequest(body, env, corsHeaders) {
  const { message } = body;

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    })
  });

  const data = await response.json();

  return new Response(JSON.stringify({ ok: data.ok }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
