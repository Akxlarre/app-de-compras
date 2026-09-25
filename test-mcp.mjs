import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

async function test() {
  console.log("Iniciando prueba del MCP Server...");
  // Nota: La URL depende de cómo Edge Functions pase el pathname.
  // Intentaremos la ruta local base de Supabase.
  const sseUrl = "http://127.0.0.1:54351/functions/v1/mcp-server/mcp-server/sse";
  
  console.log("Conectando a:", sseUrl);
  try {
    const transport = new SSEClientTransport(new URL(sseUrl));
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );
    
    await client.connect(transport);
    console.log("✅ Conectado exitosamente.");
    
    const tools = await client.listTools();
    console.log("✅ Herramientas recibidas:", JSON.stringify(tools.tools.map(t => t.name), null, 2));
    
    console.log("Prueba superada.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error en la prueba:", error.message);
    process.exit(1);
  }
}

test();
