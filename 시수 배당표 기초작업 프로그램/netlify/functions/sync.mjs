/**
 * 6.5 Netlify 함수: 학교 공용 비밀번호 확인 → Google Apps Script 중계
 *
 * Netlify 환경변수 (Site configuration > Environment variables, Functions 범위)
 *   GAS_WEBAPP_URL  : Apps Script 웹앱 /exec 주소
 *   GAS_TOKEN       : Apps Script 스크립트 속성 TOKEN_A 와 같은 값 (브라우저에는 절대 보내지 않음)
 *   SCHOOL_PASSWORD : 선생님들이 처음 한 번 입력하는 학교 공용 비밀번호 (8자 이상)
 *
 * 브라우저는 비밀번호 대신 SHA-256 값(key)만 보낸다. 이 함수가 그 값을 확인한 뒤,
 * 서버에만 있는 GAS_TOKEN으로 Apps Script를 호출한다. Apps Script 주소와 토큰은
 * 브라우저에 노출되지 않으며, 다른 주소로 요청을 보내지 않는다(SSRF 방지).
 */
import {createHash, timingSafeEqual} from 'node:crypto';

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

const URL_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
const ACTIONS = new Set(['status', 'head', 'read', 'save', 'history']);
const MAX_BYTES = 2_500_000;
const sha256 = s => createHash('sha256').update(String(s), 'utf8').digest('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function config(){
  const url = (process.env.GAS_WEBAPP_URL || '').trim();
  const token = (process.env.GAS_TOKEN || '').trim();
  const password = process.env.SCHOOL_PASSWORD || '';
  const ok = URL_RE.test(url) && token.length >= 24 && token.length <= 256 && password.length >= 8;
  return {ok, url, token, password};
}
function keyMatches(key, password){
  if (typeof key !== 'string' || !/^[0-9a-f]{64}$/.test(key)) return false;
  const a = Buffer.from(key, 'hex'), b = Buffer.from(sha256(password), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
function cleanEditor(v){
  return String(v || '').replace(/[\u0000-\u001f<>"'`\\]/g, '').trim().slice(0, 20);
}

export default async function handler(request) {
  if (request.method !== 'POST') return json({ok:false, error:'POST_ONLY'}, 405);
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BYTES) return json({ok:false, error:'REQUEST_TOO_LARGE'}, 413);
  let input;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return json({ok:false, error:'REQUEST_TOO_LARGE'}, 413);
    input = JSON.parse(raw);
  } catch { return json({ok:false, error:'INVALID_JSON'}, 400); }
  if (!input || !ACTIONS.has(input.action)) return json({ok:false, error:'INVALID_REQUEST'}, 400);

  const cfg = config();
  // 화면이 '함께 저장' 기능이 켜져 있는지만 알 수 있게 한다. 비밀값은 돌려주지 않는다.
  if (input.action === 'status') return json({ok:true, configured:cfg.ok});
  if (!cfg.ok) return json({ok:false, error:'SERVER_NOT_CONFIGURED'}, 503);

  if (!keyMatches(input.key, cfg.password)) {
    await sleep(400); // 비밀번호 마구 넣어 보기를 느리게
    return json({ok:false, error:'WRONG_PASSWORD'}, 401);
  }
  if (input.action === 'save' &&
      (!Number.isSafeInteger(input.baseVersion) || input.baseVersion < 0 ||
       !input.data || typeof input.data !== 'object')) {
    return json({ok:false, error:'INVALID_SAVE'}, 400);
  }
  const payload = {
    action: input.action,
    token: cfg.token,
    editor: cleanEditor(input.editor),
    baseVersion: input.action === 'save' ? input.baseVersion : undefined,
    data: input.action === 'save' ? input.data : undefined
  };
  try {
    const response = await fetch(cfg.url, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload),
      redirect:'follow',
      signal:AbortSignal.timeout(25000)
    });
    if (!response.ok) return json({ok:false, error:'GOOGLE_UPSTREAM', status:response.status}, 502);
    const responseText = await response.text();
    if (responseText.length > 3_500_000) return json({ok:false, error:'GOOGLE_RESPONSE_TOO_LARGE'}, 502);
    let result;
    try { result = JSON.parse(responseText); }
    catch { return json({ok:false, error:'GOOGLE_BAD_JSON'}, 502); }
    if (!result || typeof result.ok !== 'boolean') return json({ok:false, error:'GOOGLE_BAD_RESPONSE'}, 502);
    if (result.error === 'UNAUTHORIZED') return json({ok:false, error:'SERVER_TOKEN_MISMATCH'}, 503);
    return json(result, result.ok ? 200 : (result.error === 'CONFLICT' ? 409 : 400));
  } catch {
    return json({ok:false, error:'GOOGLE_UNREACHABLE'}, 502);
  }
}
