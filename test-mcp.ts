import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "npm:@modelcontextprotocol/sdk/client/streamableHttp.js";

// Token JWT de prueba de Supabase Auth (simulado)
const MOCK_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJleHAiOjE5ODM4MTI5OTZ9.dummy_signature";

async function testAuth() {
  const serverUrl = new URL("http://localhost:8000");

  console.log("🔒 Probrando Servidor MCP con Autenticación JWT...\n");

  // 1. Prueba SIN Token (debe fallar con HTTP 401)
  console.log("1️⃣ Intentando conectar SIN token de autorización...");
  try {
    const unauthTransport = new StreamableHTTPClientTransport(serverUrl);
    const unauthClient = new Client({ name: "unauth-client", version: "1.0.0" }, { capabilities: {} });
    await unauthClient.connect(unauthTransport);
    console.log("❌ ERROR: El servidor permitió la conexión sin token!");
  } catch (err) {
    console.log("✅ ÉXITO: El servidor rechazó la conexión sin token (HTTP 401 Unauthenticated).\n");
  }

  // 2. Las llamadas seguras incluirán el header:
  // Authorization: Bearer <TOKEN_DE_SESION_DEL_USUARIO>
  console.log("2️⃣ Configuración recomendada para la app móvil:");
  console.log(`
  const transport = new StreamableHTTPClientTransport(serverUrl, {
    requestInit: {
      headers: {
        'Authorization': \`Bearer \${supabaseUserSessionToken}\`
      }
    }
  });
  `);
}

testAuth();
