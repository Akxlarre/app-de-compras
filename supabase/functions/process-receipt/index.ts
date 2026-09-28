import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
// Cadena de modelos, en orden. En el plan gratuito de Gemini la cuota es POR MODELO y los modelos
// se saturan (503) en horas punta: si uno falla se pasa al siguiente, sin reintentar el mismo (un
// reintento gasta cuota). Configurable con GEMINI_MODELS="a,b,c". 1.5 fue retirada y 2.5 no está
// disponible para keys nuevas (404).
const GEMINI_MODELS = (
  Deno.env.get('GEMINI_MODELS') ||
  'gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-flash-latest'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

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
    const attempts: string[] = [];
    let currentModel = GEMINI_MODELS[0];
    let upstreamResponse = await call(currentModel);

    // 429 (cuota), 503 (saturado) o 404 (modelo no disponible): siguiente modelo de la cadena.
    for (const next of GEMINI_MODELS.slice(1)) {
      if (![429, 503, 404].includes(upstreamResponse.status)) break;
      attempts.push(`${currentModel}: HTTP ${upstreamResponse.status}`);
      await upstreamResponse.body?.cancel();
      currentModel = next;
      upstreamResponse = await call(currentModel);
    }
    if (attempts.length) console.warn(`[Gemini API] ${attempts.join(' · ')} → ${currentModel}`);

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

    // Se agrega qué modelo leyó la boleta (la calidad cambia entre modelos; lo usa el eval).
    let body = contentStr;
    try {
      body = JSON.stringify({ ...JSON.parse(contentStr), _model: currentModel });
    } catch {
      // JSON inválido del modelo: se devuelve tal cual y la app lo trata como error.
    }
    return new Response(body, {
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
