const enc = new TextEncoder();
function hex(buf) { return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
export async function onRequestPost({request,env}) {
  if (!env.ADMIN_PASSWORD) return Response.json({error:'يلزم إعداد أسرار الكابتن في Cloudflare'}, {status:503});
  let body; try { body=await request.json(); } catch { return Response.json({error:'طلب غير صالح'},{status:400}); }
  const input=String(body?.passcode??'');
  const expected=String(env.ADMIN_PASSWORD);
  const a=await crypto.subtle.digest('SHA-256',enc.encode(input));
  const b=await crypto.subtle.digest('SHA-256',enc.encode(expected));
  const aa=new Uint8Array(a),bb=new Uint8Array(b);
  let diff=0; for(let i=0;i<aa.length;i++) diff|=aa[i]^bb[i];
  if(diff!==0 || !input) return Response.json({error:'الرمز السري غير صحيح'},{status:401});
  const expires=Date.now()+7*24*60*60*1000;
  const payload=btoa(JSON.stringify({role:'admin',exp:expires})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const key=await crypto.subtle.importKey('raw',enc.encode(env.ADMIN_PASSWORD),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(payload));
  const signature=btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return Response.json({success:true},{headers:{'Set-Cookie':`gym_admin_session=${payload}.${signature}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`,'Cache-Control':'no-store'}});
}
