export const environment = {
  production: false,
  // Solo configuración pública: todo esto termina en el bundle. Las API keys privadas
  // (ej. GEMINI_API_KEY) son secretos de Supabase para las Edge Functions.
  supabase: {
    url: 'http://localhost:54351',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  },
};
