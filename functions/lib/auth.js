const enc=new TextEncoder();
export async function isAdmin(request,env) {
  if(!env.ADMIN_PASSWORD) return false;
  const cookie=request.headers.get('Cookie')||'';
  const token=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('gym_admin_session='))?.slice('gym_admin_session='.length);
  if(!token) return false;
  const [payload,signature]=token.split('.');
  if(!payload||!signature) return false;
  try {
    const key=await crypto.subtle.importKey('raw',enc.encode(env.ADMIN_PASSWORD),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    const normalized=signature.replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'='));
    const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
    if(!await crypto.subtle.verify('HMAC',key,bytes,enc.encode(payload))) return false;
    const rawPayload=atob(payload.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(payload.length/4)*4,'='));
    const parsed=JSON.parse(rawPayload);
    return parsed.role==='admin'&&Number.isFinite(parsed.exp)&&parsed.exp>Date.now();
  } catch { return false; }
}
