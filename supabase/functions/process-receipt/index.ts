import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
// Configurables sin redeploy de código. 1.5 fue retirada y 2.5 no está disponible para keys nuevas (404).
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODEL = Deno.env.get('GEMINI_FALLBACK_MODEL') || 'gemini-3.5-flash';

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

    const call = (model: string) =>
      fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${geminiApiKey}`,
        },
        body: JSON.stringify(buildPayload(model)),
      });
    // La saturación (503) y la cuota (429) suelen pasar en segundos: un reintento por modelo.
    const callWithRetry = async (model: string) => {
      const first = await call(model);
      if (first.status !== 503 && first.status !== 429) return first;
      await first.body?.cancel();
      await new Promise((r) => setTimeout(r, 2000));
      return call(model);
    };
    const attempts: string[] = [];

    let upstreamResponse = await callWithRetry(currentModel);

    // Respaldo ante cualquier error de Gemini (cuota, saturación o un modelo retirado, que da 404).
    if (!upstreamResponse.ok && fallbackModel !== currentModel) {
      attempts.push(`${currentModel}: HTTP ${upstreamResponse.status}`);
      await upstreamResponse.body?.cancel();
      console.warn(`[Gemini API] ${attempts[0]}, haciendo fallback a ${fallbackModel}`);
      currentModel = fallbackModel;
      upstreamResponse = await callWithRetry(currentModel);
    }

    if (!upstreamResponse.ok) {
      const errBody = await upstreamResponse.text();
      console.error('Gemini error:', upstreamResponse.status, errBody);
      // Un 404 casi siempre es un modelo que la key no ve: listar los disponibles evita adivinar
      // nombres (la respuesta de Gemini no incluye la key).
      let availableModels: string[] | undefined;
      if (upstreamResponse.status === 404) {
        const list = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`
        );
        const models = list.ok ? (await list.json()).models ?? [] : [];
        availableModels = models
          .filter((m: { supportedGenerationMethods?: string[] }) =>
            m.supportedGenerationMethods?.includes('generateContent')
          )
          .map((m: { name: string }) => m.name.replace('models/', ''));
      }
      return new Response(
        JSON.stringify({
          error: {
            message: `Error procesando la imagen en Gemini (${currentModel}, HTTP ${upstreamResponse.status}).`,
            upstream: errBody.slice(0, 300),
            attempts,
            availableModels,
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
