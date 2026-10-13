export async function onRequestGet({ env }) {
  if (!env.DB) {
    return Response.json({ success: false, error: 'D1 binding DB is missing' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    await env.DB.prepare('SELECT 1 AS ok').first();
    return Response.json({ success: true, database: 'connected' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('D1 health check failed', error);
    return Response.json({ success: false, error: 'Database connection failed' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
