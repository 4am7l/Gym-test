import { isAdmin } from '../lib/auth.js';
export async function onRequest({request,env,next}) {
  const url=new URL(request.url);
  const path=url.pathname;
  if(path==='/api/workouts/bodybuilding'||path==='/api/member/lookup'||path==='/api/health'||path==='/api/admin/login'||path==='/api/admin/session'||path==='/api/admin/logout') return next();
  if(path==='/api/plans'&&request.method==='GET') return next();
  if(!await isAdmin(request,env)) return Response.json({error:'يلزم تسجيل الدخول كمدير'},{status:401,headers:{'Cache-Control':'no-store'}});
  return next();
}
