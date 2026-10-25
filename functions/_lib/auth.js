/* LHB-24: quién es el usuario. Clerk firma un token de sesión (JWT RS256); aquí se verifica con WebCrypto
   contra las llaves públicas (JWKS) de la instancia de Clerk, sin dependencias de npm. */

// Orígenes desde donde el navegador puede pedir un token (claim azp): el sitio y las vistas previas de Pages.
export const ORIGINS = ['https://lahojaboricua.com'];
const PREVIEW = /^https:\/\/[a-z0-9-]+\.la-hoja-boricua\.pages\.dev$/;
export const originOk = o => typeof o === 'string' && (ORIGINS.includes(o) || PREVIEW.test(o));

const LEEWAY = 5;            // segundos de tolerancia de reloj en exp y nbf
const JWKS_TTL = 3600e3;     // las llaves se guardan una hora
const jwksCache = new Map(); // iss -> { at, keys: Map(kid -> CryptoKey) }

// emisores permitidos: CLERK_ISSUERS en el ambiente, separados por coma (Production y Development)
export const issuersOf = env => String((env && env.CLERK_ISSUERS) || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);

const b64u = s => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(t + '='.repeat((4 - t.length % 4) % 4)), c => c.charCodeAt(0));
};
const part = s => JSON.parse(new TextDecoder().decode(b64u(s)));

export function readCookie(header, name) {
  for (const p of (header || '').split(';')) {
    const i = p.indexOf('=');
    if (i > 0 && p.slice(0, i).trim() === name) return p.slice(i + 1).trim();
  }
  return null;
}

// el token viene en la cookie __session de Clerk o en Authorization: Bearer
export function tokenOf(request) {
  const h = request.headers.get('Authorization') || '';
  if (/^Bearer\s+\S+$/i.test(h)) return h.replace(/^Bearer\s+/i, '');
  return readCookie(request.headers.get('Cookie'), '__session');
}

async function keyFor(iss, kid, fetchJwks, now) {
  let c = jwksCache.get(iss);
  const fresh = c && now - c.at <= JWKS_TTL;
  // un kid desconocido vuelve a pedir las llaves (Clerk las rota), pero a lo sumo una vez por minuto
  if (fresh && !c.keys.has(kid) && now - c.at < 60e3) return null;
  if (!fresh || !c.keys.has(kid)) {
    const set = await fetchJwks(iss + '/.well-known/jwks.json');
    const keys = new Map();
    for (const k of (set && set.keys) || []) {
      if (k.kty !== 'RSA' || !k.kid || (k.use && k.use !== 'sig')) continue;
      keys.set(k.kid, await crypto.subtle.importKey('jwk', { kty: 'RSA', n: k.n, e: k.e }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
    }
    c = { at: now, keys };
    jwksCache.set(iss, c);
  }
  return c.keys.get(kid) || null;
}
export const clearJwksCache = () => jwksCache.clear();

const defaultFetch = async url => {
  const r = await fetch(url, { cf: { cacheTtl: 3600 } });
  if (!r.ok) throw new Error('jwks ' + r.status);
  return r.json();
};

// Devuelve { ok: true, sub, sid, iss } o { ok: false, why }. El emisor se revisa ANTES de pedir llaves,
// así nunca se busca un JWKS en un dominio que no esté en la lista.
export async function verifyToken(token, { issuers, now = Date.now(), fetchJwks = defaultFetch } = {}) {
  const bits = String(token || '').split('.');
  if (bits.length !== 3) return { ok: false, why: 'format' };
  let head, body;
  try { head = part(bits[0]); body = part(bits[1]); } catch (e) { return { ok: false, why: 'format' }; }
  const isObj = o => o !== null && typeof o === 'object' && !Array.isArray(o);
  if (!isObj(head) || !isObj(body)) return { ok: false, why: 'format' };
  if (head.alg !== 'RS256' || typeof head.kid !== 'string') return { ok: false, why: 'alg' };
  const iss = typeof body.iss === 'string' ? body.iss.replace(/\/+$/, '') : '';
  if (!iss || !(issuers || []).includes(iss)) return { ok: false, why: 'iss' };
  let key;
  try { key = await keyFor(iss, head.kid, fetchJwks, now); } catch (e) { return { ok: false, why: 'jwks' }; }
  if (!key) return { ok: false, why: 'kid' };
  let good = false;
  try { good = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(bits[2]), new TextEncoder().encode(bits[0] + '.' + bits[1])); } catch (e) { good = false; }
  if (!good) return { ok: false, why: 'sig' };
  const t = Math.floor(now / 1000);
  // exp obligatorio; nbf opcional, pero si viene tiene que ser un número finito (no texto, no 1e400)
  if (!Number.isFinite(body.exp) || t > body.exp + LEEWAY) return { ok: false, why: 'exp' };
  if (body.nbf !== undefined && (!Number.isFinite(body.nbf) || t + LEEWAY < body.nbf)) return { ok: false, why: 'nbf' };
  if (!originOk(body.azp)) return { ok: false, why: 'azp' };
  if (typeof body.sub !== 'string' || !body.sub) return { ok: false, why: 'sub' };
  return { ok: true, sub: body.sub, sid: body.sid || null, iss };
}

// usuario del pedido, o null
export async function userOf(request, env, opts = {}) {
  const token = tokenOf(request);
  if (!token) return null;
  const v = await verifyToken(token, { issuers: issuersOf(env), ...opts });
  return v.ok ? v : null;
}

export const json = (obj, status = 200, headers = {}) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});
