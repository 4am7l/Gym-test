// Cloudflare Pages Function: read-only plan listing.
// Write operations will be enabled after server-side admin authentication is configured.
export async function onRequestGet({ env }) {
  if (!env.DB) return Response.json({ error: 'Database binding unavailable' }, { status: 503 });
  try {
    const { results } = await env.DB.prepare('SELECT id, name, description, price, duration_days, active FROM membership_plans ORDER BY id ASC').all();
    return Response.json(results ?? [], { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Unable to list membership plans', error);
    return Response.json({ error: 'Database query failed' }, { status: 500 });
  }
}

export async function onRequestPost({request,env}) {
 if(!env.DB)return Response.json({error:'D1 unavailable'},{status:503});
 let data;try{data=await request.json()}catch{return Response.json({error:'Invalid JSON'},{status:400})}
 const name=String(data.name||'').trim(),price=Number(data.price),days=Number(data.duration_days);
 if(!name||!Number.isFinite(price)||price<0||!Number.isSafeInteger(days)||days<1)return Response.json({error:'اسم الخطة والسعر والمدة مطلوبة'},{status:400});
 try {
  const r=await env.DB.prepare('INSERT INTO membership_plans(name,description,price,duration_days,active) VALUES(?,?,?,?,?)').bind(name,String(data.description||''),price,days,data.active?1:0).run();
  const saved=await env.DB.prepare('SELECT * FROM membership_plans WHERE id=?').bind(r.meta.last_row_id).first();
  return Response.json(saved);
 }catch(e){console.error('Plan insert failed',e);return Response.json({error:'Failed to save plan'},{status:500})}
}
