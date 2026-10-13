export async function onRequestPost() {
  return Response.json({success:true},{headers:{'Set-Cookie':'gym_admin_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0','Cache-Control':'no-store'}});
}
