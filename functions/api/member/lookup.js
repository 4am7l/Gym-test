export async function onRequestPost({request,env}) {
 let b;try{b=await request.json()}catch{return Response.json({error:'Invalid JSON'},{status:400})}
 const phone=String(b.phone||'').trim();
 if(phone.length<1||phone.length>20||!Array.from(phone).some(ch=>ch>='0'&&ch<='9')||Array.from(phone).some(ch=>!('0123456789+ -'.includes(ch))))return Response.json({error:'رقم هاتف غير صالح'},{status:400});
 try{
  const m=await env.DB.prepare('SELECT id,full_name,phone,category,notes FROM members WHERE phone=? LIMIT 1').bind(phone).first();
  if(!m)return Response.json({error:'غير موجود'},{status:404});
  const dateParts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Amman',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const val=k=>dateParts.find(p=>p.type===k).value;
  const today=`${val('year')}-${val('month')}-${val('day')}`;
  const subs=(await env.DB.prepare('SELECT s.start_date,s.end_date,p.name AS plan_name FROM subscriptions s LEFT JOIN membership_plans p ON p.id=s.plan_id WHERE s.member_id=? AND s.start_date<=? ORDER BY s.start_date DESC,s.id DESC').bind(m.id,today).all()).results||[];
  const sub=subs.find(s=>s.end_date>=today)||subs[0]||null;
  const days=sub?Math.round((Date.parse(sub.end_date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000):0;
  const measurements=m.category==='لياقة بدنية'?await env.DB.prepare('SELECT chest,waist,arms,hips,calves,thigh,weight,updated_at FROM fitness_measurements WHERE member_id=?').bind(m.id).first():null;
  return Response.json({...m,start_date:sub?.start_date||null,end_date:sub?.end_date||null,plan_name:sub?.plan_name||null,status:!sub?'No Subscription':days<0?'Expired':days<=5?'Expiring Soon':'Active',measurements},{headers:{'Cache-Control':'no-store'}});

 }catch(e){console.error(e);return Response.json({error:'Lookup failed'},{status:500})}
}
