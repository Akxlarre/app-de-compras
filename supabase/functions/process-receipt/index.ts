import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
// Configurables sin redeploy de código: la familia 1.5 fue retirada y el endpoint respondía 502.
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = Deno.env.get('GEMINI_FALLBACK_MODEL') || 'gemini-2.5-flash-lite';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function authenticateUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    console.error('[Auth Error]:', error?.message);
    return null;
  }
  return user;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // 1. Validar sesión
  const user = await authenticateUser(req.headers.get('Authorization'));
  if (!user) {
    return new Response(JSON.stringify({ error: { message: 'No autorizado: falta sesión.' } }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY no configurada');
    return new Response(
      JSON.stringify({ error: { message: 'Configuración interna faltante (API Key).' } }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: { message: 'Falta la imagen de la boleta.' } }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let currentModel = GEMINI_MODEL;
    const fallbackModel = GEMINI_FALLBACK_MODEL;

    const buildPayload = (model: string) => ({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Eres un sistema de OCR para boletas de supermercado. Tu única tarea es extraer los nombres de los productos y sus precios unitarios. IGNORA fechas y totales globales. Devuelve un JSON estricto con la estructura: { "items": [ { "name": "Leche", "price": 1200 } ] }',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extrae los productos y precios de esta boleta.' },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    let upstreamResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${geminiApiKey}`,
      },
      body: JSON.stringify(buildPayload(currentModel)),
    });

    // Respaldo ante cualquier error de Gemini (cuota, saturación o un modelo retirado, que da 404).
    if (!upstreamResponse.ok && fallbackModel !== currentModel) {
      console.warn(
        `[Gemini API] Error ${upstreamResponse.status} con ${currentModel}, haciendo fallback a ${fallbackModel}`
      );
      currentModel = fallbackModel;

      upstreamResponse = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${geminiApiKey}`,
        },
        body: JSON.stringify(buildPayload(currentModel)),
      });
    }

    if (!upstreamResponse.ok) {
      const errBody = await upstreamResponse.text();
      console.error('Gemini error:', upstreamResponse.status, errBody);
      return new Response(
        JSON.stringify({
          error: {
            message: `Error procesando la imagen en Gemini (${currentModel}, HTTP ${upstreamResponse.status}).`,
          },
        }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const result = await upstreamResponse.json();
    const contentStr = result.choices?.[0]?.message?.content;

    // Devolvemos el JSON parseado (esperamos que Gemini haya cumplido con el response_format)
    return new Response(contentStr, {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error procesando request:', err);
    return new Response(JSON.stringify({ error: { message: 'Error interno: ' + String(err) } }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
