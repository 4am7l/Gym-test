const reply=(x,s=200)=>Response.json(x,{status:s,headers:{'Cache-Control':'no-store'}});
const today=()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Amman',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=k=>p.find(x=>x.type===k).value;return `${v('year')}-${v('month')}-${v('day')}`};
const status=end=>{if(!end)return 'No Subscription';const n=Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(today()+'T00:00:00Z'))/86400000);return n<0?'Expired':n<=5?'Expiring Soon':'Active'};
const subStatus=s=>s?.start_date>today()?'Future':status(s?.end_date);
const visible=ss=>ss.filter(s=>s.start_date<=today()).find(s=>s.end_date>=today())||ss.find(s=>s.start_date>today())||ss.find(s=>s.start_date<=today())||null;
export async function onRequest({request,env}) {
 const db=env.DB;if(!db)return reply({error:'D1 unavailable'},503);
 const parts=new URL(request.url).pathname.split('/').filter(Boolean).slice(1);
 const method=request.method;let body={};
 if(method!=='GET'){try{body=await request.json()}catch{return reply({error:'Invalid JSON'},400)}}
 const rows=async(q,...a)=>(await db.prepare(q).bind(...a).all()).results||[];
 const one=async(q,...a)=>db.prepare(q).bind(...a).first();
 const exec=async(q,...a)=>db.prepare(q).bind(...a).run();
 const audit=async(action,member_id,details={})=>{try{await exec('INSERT INTO gym_activity_log(action,member_id,details) VALUES(?,?,?)',action,member_id,JSON.stringify(details))}catch(e){console.error('Activity log insert failed',e)}};
 try {
 if(parts[0]==='members'&&parts.length===1&&method==='GET'){
  const ms=await rows('SELECT * FROM members ORDER BY id DESC');
  const ss=await rows('SELECT s.*,p.name AS plan_name FROM subscriptions s LEFT JOIN membership_plans p ON p.id=s.plan_id ORDER BY s.id DESC');
  const measurements=await rows('SELECT * FROM fitness_measurements');
  const latest=new Map(),mm=new Map(measurements.map(x=>[x.member_id,x]));
  for(const s of ss){if(!latest.has(s.member_id))latest.set(s.member_id,[]);latest.get(s.member_id).push(s)}
  return reply(ms.map(m=>{const s=visible(latest.get(m.id)||[]);return {...m,measurements:m.category==='لياقة بدنية'?(mm.get(m.id)||null):null,subscription_id:s?.id||null,start_date:s?.start_date||null,end_date:s?.end_date||null,subscription_price:s?.price??null,plan_name:s?.plan_name||null,plan_id:s?.plan_id||null,status:s?subStatus(s):'No Subscription'}}));
 }
 if(parts[0]==='members'&&parts.length===1&&method==='POST'){
  const name=String(body.full_name||'').trim(),phone=String(body.phone||'').trim();
  if(!name||!phone)return reply({error:'الاسم والهاتف مطلوبان'},400);
  let plan=null,end=null;
  if(body.plan_id&&body.start_date){plan=await one('SELECT * FROM membership_plans WHERE id=?',Number(body.plan_id));if(!plan)return reply({error:'الخطة غير موجودة'},404);const d=new Date(String(body.start_date)+'T00:00:00Z');if(!Number.isFinite(d.getTime()))return reply({error:'تاريخ غير صالح'},400);d.setUTCDate(d.getUTCDate()+Number(plan.duration_days));end=d.toISOString().slice(0,10)}
  const r=await exec('INSERT INTO members(full_name,phone,category,notes) VALUES(?,?,?,?)',name,phone,String(body.category||'كمال أجسام'),String(body.notes||''));
  const id=r.meta.last_row_id;
  if(plan){const sub=await exec('INSERT INTO subscriptions(member_id,plan_id,price,start_date,end_date) VALUES(?,?,?,?,?)',id,plan.id,plan.price,body.start_date,end);await exec('INSERT INTO gym_subscription_events(member_id,subscription_id,plan_id,price,start_date,end_date) VALUES(?,?,?,?,?,?)',id,sub.meta.last_row_id,plan.id,plan.price,body.start_date,end)}
  await audit('member_created',id,{name});
  return reply(await one('SELECT * FROM members WHERE id=?',id));
 }
 if(parts[0]==='dashboard'&&parts[1]==='stats'&&method==='GET'){
  const ms=await one('SELECT COUNT(*) AS n FROM members');
  const ss=await rows('SELECT s.*,m.full_name AS member_name,m.phone,m.category,p.name AS plan_name FROM subscriptions s LEFT JOIN members m ON m.id=s.member_id LEFT JOIN membership_plans p ON p.id=s.plan_id ORDER BY s.id DESC');
  const latest=new Map();for(const s of ss){if(!latest.has(s.member_id))latest.set(s.member_id,[]);latest.get(s.member_id).push(s)}
  const subs=[...latest.values()].map(list=>visible(list)).filter(Boolean).map(s=>({...s,status:subStatus(s)}));
  return reply({totalMembers:ms.n,totalActive:subs.filter(s=>s.status==='Active').length,totalExpiring:subs.filter(s=>s.status==='Expiring Soon').length,totalExpired:subs.filter(s=>s.status==='Expired').length,totalSubscriptions:subs.length,recentSubscriptions:subs.slice(0,5)});
 }

 const id=Number(parts[1]);
 if(parts[0]==='members'&&parts[1]==='bulk-delete'&&method==='POST'){
  const ids=body.ids;
  if(!Array.isArray(ids)||!ids.length||ids.length>500||ids.some(x=>!Number.isSafeInteger(Number(x))||Number(x)<1))return reply({error:'قائمة غير صالحة'},400);
  const unique=[...new Set(ids.map(Number))];
  const found=await rows('SELECT id FROM members WHERE id IN ('+unique.map(()=>'?').join(',')+')',...unique);
  await db.batch(unique.map(x=>db.prepare('DELETE FROM members WHERE id=?').bind(x)));
  await audit('members_bulk_deleted',null,{member_ids:found.map(x=>x.id)});
  return reply({deletedIds:found.map(x=>x.id)});
 }
 if(parts[0]==='members'&&Number.isSafeInteger(id)&&id>0&&parts.length===2){
  if(method==='GET'){
   const member=await one('SELECT * FROM members WHERE id=?',id);
   if(!member)return reply({error:'Member not found'},404);
   const history=(await rows('SELECT s.*,p.name AS plan_name FROM subscriptions s LEFT JOIN membership_plans p ON p.id=s.plan_id WHERE s.member_id=? ORDER BY s.id DESC',id)).map(s=>({...s,status:subStatus(s)}));
   return reply({...member,currentSubscription:visible(history),history});
  }
  if(method==='PUT'){
   const name=String(body.full_name||'').trim(),phone=String(body.phone||'').trim();
   if(!name||!phone)return reply({error:'الاسم والهاتف مطلوبان'},400);
   const r=await exec('UPDATE members SET full_name=?,phone=?,category=?,notes=? WHERE id=?',name,phone,String(body.category||'كمال أجسام'),String(body.notes||''),id);
   if(r.meta.changes>0)await audit('member_updated',id,{full_name:name});
   return reply({updated:r.meta.changes>0});
  }
  if(method==='DELETE'){
   const r=await exec('DELETE FROM members WHERE id=?',id);
   if(r.meta.changes>0)await audit('member_deleted',null,{member_id:id});
   return reply({deleted:r.meta.changes>0});
  }
 }
 if(parts[0]==='members'&&Number.isSafeInteger(id)&&id>0&&parts[2]==='measurements'&&method==='PUT'){
  const member=await one('SELECT category FROM members WHERE id=?',id);
  if(!member)return reply({error:'العضو غير موجود'},404);
  if(member.category!=='لياقة بدنية')return reply({error:'القياسات للياقة البدنية فقط'},403);
  const keys=['chest','waist','arms','hips','calves','thigh','weight'],values=[];
  for(const k of keys){const raw=body[k];if(raw==null||raw===''){values.push(null);continue}const n=Number(raw);if(!Number.isFinite(n)||n<0||n>1000)return reply({error:'قياس غير صالح'},400);values.push(n)}
  await exec('INSERT INTO fitness_measurements(member_id,'+keys.join(',')+',updated_at) VALUES('+Array(9).fill('?').join(',')+') ON CONFLICT(member_id) DO UPDATE SET '+keys.map(k=>k+'=excluded.'+k).join(',')+',updated_at=excluded.updated_at',id,...values,new Date().toISOString());
  return reply(await one('SELECT * FROM fitness_measurements WHERE member_id=?',id));
 }
 if(parts[0]==='subscriptions'&&parts.length===1&&method==='POST'){
  const member=Number(body.member_id),planId=Number(body.plan_id);
  if(!Number.isSafeInteger(member)||member<1||!Number.isSafeInteger(planId)||planId<1)return reply({error:'بيانات الاشتراك غير صالحة'},400);
  const plan=await one('SELECT * FROM membership_plans WHERE id=?',planId);
  if(!plan)return reply({error:'Plan not found'},404);
  const start=String(body.start_date||''),d=new Date(start+'T00:00:00Z');
  if(!Number.isFinite(d.getTime()))return reply({error:'تاريخ غير صالح'},400);
  d.setUTCDate(d.getUTCDate()+Number(plan.duration_days));const end=d.toISOString().slice(0,10);
  const inserted=await exec('INSERT INTO subscriptions(member_id,plan_id,price,start_date,end_date) VALUES(?,?,?,?,?)',member,plan.id,plan.price,start,end);
  const subId=inserted.meta.last_row_id;
  await exec('INSERT INTO gym_subscription_events(member_id,subscription_id,plan_id,price,start_date,end_date) VALUES(?,?,?,?,?,?)',member,subId,plan.id,plan.price,start,end);
  await audit('subscription_renewed',member,{subscription_id:subId,price:plan.price});
  return reply({...await one('SELECT * FROM subscriptions WHERE id=?',subId),history_saved:true});
 }
 if(parts[0]==='ops'&&parts[1]==='activity'&&method==='GET')return reply(await rows('SELECT * FROM gym_activity_log ORDER BY created_at DESC,id DESC LIMIT 100'));
 if(parts[0]==='ops'&&parts[1]==='member'&&Number.isSafeInteger(Number(parts[2]))&&Number(parts[2])>0){
  const member=Number(parts[2]);
  if(parts.length===3&&method==='GET'){
   const payments=await rows('SELECT * FROM gym_payments WHERE member_id=? ORDER BY created_at DESC,id DESC',member);
   const attendance=await rows('SELECT * FROM gym_attendance WHERE member_id=? ORDER BY checked_in_at DESC,id DESC LIMIT 100',member);
   const events=await rows('SELECT e.*,p.name AS plan_name FROM gym_subscription_events e LEFT JOIN membership_plans p ON p.id=e.plan_id WHERE e.member_id=? ORDER BY e.id DESC',member);
   const current=await one('SELECT price FROM subscriptions WHERE member_id=? ORDER BY id DESC LIMIT 1',member);
   const paid=payments.reduce((n,p)=>n+Number(p.amount||0),0);
   const due=events.length?events.reduce((n,e)=>n+Number(e.price||0),0):Number(current?.price||0);
   return reply({payments,attendance,events,financial:{due,paid,balance:due-paid,estimated:events.length===0}});
  }
  if(parts[3]==='payments'&&method==='POST'){
   const amount=Number(body.amount);if(!Number.isFinite(amount)||amount<=0||amount>1000000)return reply({error:'المبلغ غير صالح'},400);
   const r=await exec('INSERT INTO gym_payments(member_id,amount,note) VALUES(?,?,?)',member,amount,String(body.note||'').slice(0,500));
   await audit('payment_created',member,{payment_id:r.meta.last_row_id,amount});
   return reply(await one('SELECT * FROM gym_payments WHERE id=?',r.meta.last_row_id));
  }
  if(parts[3]==='attendance'&&method==='POST'){
   const last=await one('SELECT checked_in_at FROM gym_attendance WHERE member_id=? ORDER BY checked_in_at DESC,id DESC LIMIT 1',member);
   if(last&&new Date(last.checked_in_at.replace(' ','T')+'Z').toLocaleDateString('en-CA',{timeZone:'Asia/Amman'})===today())return reply({error:'تم تسجيل حضور المشترك اليوم'},409);
   const r=await exec('INSERT INTO gym_attendance(member_id) VALUES(?)',member);
   await audit('attendance_created',member,{attendance_id:r.meta.last_row_id});
   return reply(await one('SELECT * FROM gym_attendance WHERE id=?',r.meta.last_row_id));
  }
 }
 return reply({error:'Not found'},404);
 }catch(e){console.error('D1 error',e);return reply({error:'Database operation failed'},500)}
}
