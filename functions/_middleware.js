import { isValidSession } from './utils/auth.js';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const protectedPaths = ['/admin.html', '/cwl-admin.html'];

  if (!protectedPaths.includes(url.pathname)) return context.next();

  const valid = await isValidSession(context.request, context.env.ADMIN_PASSWORD);
  if (valid) return context.next();

  const login = new URL('/admin-login.html', url.origin);
  login.searchParams.set('next', url.pathname);
  return Response.redirect(login.toString(), 302);
}
