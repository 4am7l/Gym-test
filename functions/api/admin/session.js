import { isAdmin } from '../../lib/auth.js';
export async function onRequestGet({request,env}) {
  return Response.json({admin:await isAdmin(request,env)},{headers:{'Cache-Control':'no-store'}});
}
