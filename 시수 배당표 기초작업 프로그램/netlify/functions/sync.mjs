/**
 * Same-origin Netlify proxy for the Google Apps Script backend.
 * The deployment URL is allowlisted by an environment variable so callers
 * cannot turn this function into an arbitrary URL-fetch proxy (SSRF).
 * User access tokens are passed through in request bodies, NEVER stored here.
 */
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

const URL_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
const ACTIONS = new Set(['head', 'read', 'save', 'history']);
const MAX_BYTES = 2_500_000;
export default async function handler(request) {
  if (request.method !== 'POST') return json({ ok:false, error:'POST_ONLY' }, 405);
  const allowedURL = (process.env.GAS_WEBAPP_URL || '').trim();
  if (!URL_RE.test(allowedURL)) return json({ok:false, error:'SERVER_NOT_CONFIGURED'}, 503);
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BYTES) return json({ok:false,error:'REQUEST_TOO_LARGE'},413);
  let input;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return json({ok:false,error:'REQUEST_TOO_LARGE'},413);
    input = JSON.parse(raw);
  } catch { return json({ok:false,error:'INVALID_JSON'},400); }
  if (!input || !ACTIONS.has(input.action) ||
      typeof input.url !== 'string' || input.url.trim() !== allowedURL ||
      typeof input.token !== 'string' || input.token.length < 24 || input.token.length > 256) {
    return json({ok:false,error:'INVALID_REQUEST'},400);
  }
  if (input.action === 'save' &&
      (!Number.isSafeInteger(input.baseVersion) || input.baseVersion < 0 ||
       !input.data || typeof input.data !== 'object')) {
    return json({ok:false,error:'INVALID_SAVE'},400);
  }
  const payload = {
    action:input.action,
    token:input.token,
    baseVersion:input.action==='save' ? input.baseVersion : undefined,
    data:input.action==='save' ? input.data : undefined
  };
  try {
    const response = await fetch(allowedURL, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload),
      redirect:'follow',
      signal:AbortSignal.timeout(25000)
    });
    if (!response.ok) return json({ok:false,error:'GOOGLE_UPSTREAM',status:response.status},502);
    const responseText = await response.text();
    if (responseText.length > 3_500_000) return json({ok:false,error:'GOOGLE_RESPONSE_TOO_LARGE'},502);
    let result;
    try { result = JSON.parse(responseText); }
    catch { return json({ok:false,error:'GOOGLE_BAD_JSON'},502); }
    // Don't reflect internal details back to the browser, or ever echo access tokens.
    if (!result || typeof result.ok !== 'boolean') return json({ok:false,error:'GOOGLE_BAD_RESPONSE'},502);
    return json(result, result.ok ? 200 : (result.error==='CONFLICT' ? 409 : result.error==='UNAUTHORIZED' ? 401 : 400));
  } catch (error) {
    return json({ok:false,error:'GOOGLE_UNREACHABLE',message:'Google 동기화 서버 응답을 받지 못했습니다.'},502);
  }
}
