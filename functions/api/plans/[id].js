export async function onRequest({request,env,params}) {
 const id=Number(params.id);
 if(!Number.isSafeInteger(id)||id<1)return Response.json({error:'Invalid ID'},{status:400});
 try{
  if(request.method==='DELETE'){await env.DB.prepare('DELETE FROM membership_plans WHERE id=?').bind(id).run();return Response.json({deleted:true})}
  if(request.method==='PUT'){
   const b=await request.json(),name=String(b.name||'').trim(),price=Number(b.price),days=Number(b.duration_days);
   if(!name||!Number.isFinite(price)||price<0||!Number.isSafeInteger(days)||days<1)return Response.json({error:'بيانات الخطة غير صالحة'},{status:400});
   await env.DB.prepare('UPDATE membership_plans SET name=?,description=?,price=?,duration_days=?,active=? WHERE id=?').bind(name,String(b.description||''),price,days,b.active?1:0,id).run();
   return Response.json({updated:true});
  }
  return Response.json({error:'Method not allowed'},{status:405});
 }catch(e){console.error(e);return Response.json({error:'تعذر حفظ الخطة'},{status:500})}
}
