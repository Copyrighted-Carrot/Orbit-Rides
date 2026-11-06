/** Prevent any application request from reaching the historical archive. */
export const guardedSupabaseFetch: typeof fetch = (input, init) => {
  const target = new URL(input instanceof Request ? input.url : String(input));
  if (target.hostname === 'mcjjplnltatdmcuffhhf.supabase.co') {
    return Promise.resolve(new Response(JSON.stringify({
      code: 'ARCHIVE_READ_ONLY',
      message: 'This installation is configured for the historical archive. Account and rental services are unavailable.',
    }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }));
  }
  return fetch(input, init);
};
