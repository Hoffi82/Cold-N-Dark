const COOKIE_NAME = 'coldndark_admin';
const SESSION_SECONDS = 8 * 60 * 60;

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function keyFromSecret(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSession(secret) {
  const payload = JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS });
  const payloadPart = bytesToBase64Url(new TextEncoder().encode(payload));
  const key = await keyFromSecret(secret);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadPart)));
  return `${payloadPart}.${bytesToBase64Url(signature)}`;
}

export async function isValidSession(request, secret) {
  if (!secret) return false;
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const parts = match[1].split('.');
  if (parts.length !== 2) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;
    const key = await keyFromSecret(secret);
    return await crypto.subtle.verify('HMAC', key, base64UrlToBytes(parts[1]), new TextEncoder().encode(parts[0]));
  } catch {
    return false;
  }
}

export function sessionCookie(value) {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
