/* 수업시수배당표 6.5 · 여러 컴퓨터에서 함께 쓰기 (자동 저장)
 *
 * - 학교 공용 비밀번호를 컴퓨터마다 처음 한 번만 넣으면, 그 뒤로는 고칠 때마다 자동으로 저장된다.
 * - 비밀번호는 저장하지 않고 SHA-256 값만 이 컴퓨터에 기억한다. 확인은 Netlify 함수가 한다.
 * - 다른 선생님이 저장한 내용은 20초마다 확인해서, 내가 고치는 중이 아니면 자동으로 불러온다.
 * - 두 사람이 동시에 고쳐 저장이 겹치면 덮어쓰지 않고 어느 쪽을 남길지 묻는다.
 * - 서버가 설정되지 않았거나(미리보기·파일로 열기) 연결이 끊기면 이 컴퓨터에만 저장하고, 다시 연결되면 올린다.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LS = {key:'cg-sync-key', name:'cg-sync-name', base:'cg-sync-base', dirty:'cg-sync-dirty'};
  const ls = {
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k,v){ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,String(v)); }catch(e){} }
  };
  const PUSH_DELAY = 2500, POLL_MS = 20000, RETRY_MS = 15000;

  let mode = 'starting';         // starting | local | need-key | on
  let status = 'idle';           // idle | pending | saving | synced | offline | conflict
  let key = ls.get(LS.key) || '';
  let editor = ls.get(LS.name) || '';
  let base = ls.get(LS.base) == null ? null : Number(ls.get(LS.base));
  let dirty = ls.get(LS.dirty) === '1';
  let busy = false, applying = false, pushTimer = null, retryTimer = null;
  let lastAt = '', lastBy = '', conflictInfo = null, lastError = '';

  const fmtTime = v => { if(!v) return ''; const d=new Date(v); return isNaN(d)?'':`${d.getMonth()+1}월 ${d.getDate()}일 `+d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}); };
  const who = name => name ? name+' 님' : '다른 선생님';
  const fmtClock = v => { if(!v) return ''; const d=new Date(v); return isNaN(d)?'':d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}); };
  const toast = t => { if(typeof window.toast==='function') window.toast(t); };
  function setBase(v){ base=v; ls.set(LS.base, v==null?null:v); }
  function setDirty(v){ dirty=!!v; ls.set(LS.dirty, v?'1':null); }

  /* ----- 상단 저장 표시 ----- */
  function paint(){
    const el=$('saveState'); if(!el) return;
    let text='✓ 저장됨', cls='', title='이 컴퓨터에 저장됐어요';
    if (mode==='need-key'){ text='이 컴퓨터에만 저장 중 · 함께 쓰기 켜기'; cls='warn'; title='눌러서 학교 비밀번호를 넣으면 다른 컴퓨터와 함께 써요'; }
    else if (mode==='on'){
      title='눌러서 저장 상태 보기';
      if (status==='saving'||status==='pending'){ text='저장 중…'; }
      else if (status==='offline'){ text='⚠ 연결 끊김 · 이 컴퓨터에만 저장됨'; cls='warn'; title='다시 연결되면 자동으로 올려요'; }
      else if (status==='conflict'){ text='⚠ 확인 필요 · 다른 선생님과 겹침'; cls='bad'; }
      else { text='✓ 저장됨'+(lastAt?' · '+fmtClock(lastAt):''); }
    }
    el.textContent=text; el.title=title;
    el.classList.toggle('cg-sync-warn', cls==='warn'); el.classList.toggle('cg-sync-bad', cls==='bad');
    el.classList.toggle('cg-sync-click', mode==='on'||mode==='need-key');
  }

  /* ----- 서버 호출 ----- */
  async function api(action, extra={}){
    const response = await fetch('/api/sync', {
      method:'POST', headers:{'Content-Type':'application/json'}, cache:'no-store',
      body:JSON.stringify({action, key, editor, ...extra})
    });
    let body;
    try{ body=await response.json(); }catch{ throw Object.assign(new Error('HTTP_'+response.status),{code:'HTTP_'+response.status}); }
    if(!response.ok||!body.ok) throw Object.assign(new Error(body.error||'SERVER_ERROR'),{code:body.error||('HTTP_'+response.status),detail:body});
    return body;
  }
  const NETWORK = new Set(['GOOGLE_UNREACHABLE','GOOGLE_UPSTREAM','BUSY','HTTP_502','HTTP_503','HTTP_504','NETWORK']);
  function errorText(e){
    const k=e.code||e.message;
    return ({WRONG_PASSWORD:'비밀번호가 맞지 않아요.',SERVER_NOT_CONFIGURED:'아직 함께 쓰기 설정이 끝나지 않았어요. 관리자에게 알려 주세요.',
      SERVER_TOKEN_MISMATCH:'저장소 연결 설정이 맞지 않아요. 관리자에게 알려 주세요.',DATA_TOO_LARGE:'자료가 너무 커서 저장하지 못했어요.',
      BUSY:'다른 선생님이 저장하는 중이에요. 잠시 뒤 다시 저장해요.'})[k] || '저장소와 연결하지 못했어요. 잠시 뒤 다시 시도해요.';
  }
  async function sha256(text){
    const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  /* ----- 자료 주고받기 ----- */
  function hasLocalData(){
    try{ const p=window.CGBridge.exportPortfolio(); return Object.values(p.workspaces||{}).some(w=>(w.subjects||[]).length>0); }catch(e){ return false; }
  }
  async function pull(note){
    busy=true;
    try{
      const r=await api('read');
      if(r.data){ applying=true; try{ window.CGBridge.importPortfolio(r.data,{keepView:true}); } finally{ applying=false; } }
      setBase(r.head.revision||0); setDirty(false); lastAt=r.head.updatedAt||''; lastBy=r.head.actor||'';
      conflictInfo=null; status='synced'; if(note) toast(note);
    } finally { busy=false; paint(); }
  }
  function schedulePush(ms=PUSH_DELAY){
    clearTimeout(pushTimer);
    pushTimer=setTimeout(push, ms);
  }
  async function push(){
    if (mode!=='on' || status==='conflict') return;
    if (busy){ schedulePush(800); return; }
    if (base==null){ return start(); }
    busy=true; status='saving'; paint();
    let snapshotJSON='';
    try{
      const snapshot=window.CGBridge.exportPortfolio(); snapshotJSON=JSON.stringify(snapshot);
      const r=await api('save',{baseVersion:base, data:snapshot});
      setBase(r.version); lastAt=r.updatedAt||new Date().toISOString(); lastBy=r.actor||editor;
      const changed=JSON.stringify(window.CGBridge.exportPortfolio())!==snapshotJSON;
      setDirty(changed); status=changed?'pending':'synced'; lastError='';
      if (changed) schedulePush(1200);
    }catch(e){
      if (e.code==='CONFLICT'){ status='conflict'; conflictInfo={actor:e.detail&&e.detail.actor, at:e.detail&&e.detail.updatedAt}; openPanel(); }
      else if (e.code==='WRONG_PASSWORD'){ forgetKey(); openPassword('비밀번호가 바뀌었어요. 새 비밀번호를 넣어 주세요.'); }
      else { status='offline'; lastError=errorText(e); clearTimeout(retryTimer); retryTimer=setTimeout(()=>{ if(dirty) push(); }, RETRY_MS); }
    } finally { busy=false; paint(); refreshPanel(); }
  }
  async function poll(){
    if (mode!=='on' || busy || document.hidden || status==='conflict') return;
    try{
      const r=await api('head'); const rev=r.head.revision||0;
      if (status==='offline'){ status=dirty?'pending':'synced'; if(dirty) schedulePush(300); }
      if (base!=null && rev>base){
        if (dirty){ status='conflict'; conflictInfo={actor:r.head.actor, at:r.head.updatedAt}; openPanel(); }
        else await pull(`${who(r.head.actor)}이 고친 내용을 불러왔어요`);
      }
    }catch(e){ if(NETWORK.has(e.code)||e instanceof TypeError){ status='offline'; } }
    paint();
  }
  async function start(){
    busy=true;
    try{
      const r=await api('head'); const rev=r.head.revision||0;
      lastAt=r.head.updatedAt||''; lastBy=r.head.actor||'';
      busy=false;
      if (rev===0){ setBase(0); if(hasLocalData()){ setDirty(true); status='pending'; schedulePush(200); } else status='synced'; }
      else if (base==null){
        if (!hasLocalData()) await pull('함께 쓰는 자료를 불러왔어요');
        else { status='conflict'; conflictInfo={first:true, actor:lastBy, at:lastAt}; openPanel(); }
      }
      else if (rev===base){ if(dirty){ status='pending'; schedulePush(200); } else status='synced'; }
      else { if(!dirty) await pull('다른 컴퓨터에서 고친 내용을 불러왔어요'); else { status='conflict'; conflictInfo={actor:lastBy, at:lastAt}; openPanel(); } }
    }catch(e){
      busy=false;
      if (e.code==='WRONG_PASSWORD'){ forgetKey(); openPassword('비밀번호가 바뀌었어요. 새 비밀번호를 넣어 주세요.'); }
      else { status='offline'; lastError=errorText(e); clearTimeout(retryTimer); retryTimer=setTimeout(start, RETRY_MS); }
    }
    paint(); refreshPanel();
  }
  function forgetKey(){ key=''; ls.set(LS.key,null); mode='need-key'; status='idle'; paint(); }

  /* ----- 창: 비밀번호 / 저장 상태 / 겹침 해결 ----- */
  const overlay = () => $('cgCloudOverlay');
  function show(title, sub, html){
    $('cgCloudTitle').textContent=title;
    const p=overlay().querySelector('.cg-cloud-heading p'); if(p) p.textContent=sub||'';
    $('cgCloudBody').innerHTML=html; $('cgCloudStatus').textContent='';
    overlay().hidden=false;
  }
  function close(){ overlay().hidden=true; }
  function openPassword(msg){
    mode='need-key'; paint();
    show('여러 컴퓨터에서 함께 쓰기','이 컴퓨터에서 처음 한 번만 넣으면 돼요.',
      `<div class="cg-cloud-grid">
        <label>학교 비밀번호<input id="cgSyncPw" type="password" autocomplete="current-password" placeholder="관리자에게 받은 비밀번호"></label>
        <label>내 이름 <small>(선택 · 저장 기록에 보여요)</small><input id="cgSyncName" type="text" maxlength="20" value="${esc(editor)}" placeholder="예: 김남훈"></label>
        <button id="cgSyncLogin" class="btn pri">함께 쓰기 시작</button></div>
       <p class="cg-cloud-hint">넣은 뒤에는 고칠 때마다 자동으로 저장되고, 다른 선생님이 고친 내용도 자동으로 불러와요. 공용 컴퓨터라면 다 쓴 뒤 [이 컴퓨터에서 함께 쓰기 끄기]를 눌러 주세요.</p>
       <div class="cg-cloud-actions"><button class="btn" id="cgSyncLater">나중에 (이 컴퓨터에만 저장)</button></div>`);
    if(msg) $('cgCloudStatus').textContent=msg;
    setTimeout(()=>{ const i=$('cgSyncPw'); if(i) i.focus(); },50);
  }
  async function login(){
    const pw=$('cgSyncPw').value, name=$('cgSyncName').value.trim().slice(0,20);
    if (pw.length<4){ $('cgCloudStatus').textContent='비밀번호를 넣어 주세요.'; return; }
    $('cgCloudStatus').textContent='확인하는 중…';
    try{
      key=await sha256(pw); editor=name;
      await api('head');
      ls.set(LS.key,key); ls.set(LS.name,editor||null);
      mode='on'; close(); toast('함께 쓰기를 켰어요. 이제 고칠 때마다 자동으로 저장돼요');
      await start();
    }catch(e){
      key=''; $('cgCloudStatus').textContent=errorText(e);
    }
  }
  function panelHTML(){
    if (status==='conflict' && conflictInfo){
      const w=esc(who(conflictInfo.actor)), when=esc(fmtTime(conflictInfo.at));
      return conflictInfo.first
        ? `<div class="cg-cloud-alert">함께 쓰는 곳에 이미 자료가 있어요${when?` (마지막 저장: ${w}, ${when})`:''}. 이 컴퓨터에도 따로 넣어 둔 자료가 있어요.</div>
           <p class="cg-cloud-hint">보통은 <b>함께 쓰는 자료 불러오기</b>를 고르면 돼요. 이 컴퓨터의 자료가 더 최신일 때만 오른쪽을 고르세요.</p>
           <div class="cg-cloud-actions"><button class="btn pri" id="cgSyncTakeRemote">함께 쓰는 자료 불러오기</button><button class="btn" id="cgSyncKeepMine">이 컴퓨터 자료로 바꾸기</button><button class="btn" id="cgSyncExport">이 컴퓨터 자료를 파일로 먼저 저장</button></div>`
        : `<div class="cg-cloud-alert">${w}이 ${when||'방금'}에 먼저 저장했어요. 내가 고친 내용과 겹쳐서 자동으로 합칠 수 없어요.</div>
           <p class="cg-cloud-hint">어느 쪽을 남길지 골라 주세요. 고르지 않은 쪽의 최근 수정은 사라져요. 걱정되면 먼저 내 자료를 파일로 저장해 두세요.</p>
           <div class="cg-cloud-actions"><button class="btn pri" id="cgSyncTakeRemote">${w} 자료 불러오기</button><button class="btn" id="cgSyncKeepMine">내 자료로 덮어쓰기</button><button class="btn" id="cgSyncExport">내 자료를 파일로 먼저 저장</button></div>`;
    }
    const state = status==='offline' ? `<span class="cg-cloud-alert">연결이 끊겼어요 · 이 컴퓨터에는 저장돼 있고, 다시 연결되면 자동으로 올려요.</span>`
      : (status==='saving'||status==='pending') ? '저장하는 중…' : '✓ 모두 저장됐어요';
    return `<div class="cg-cloud-overview">
        <div><small>상태</small><b>${state}</b></div>
        <div><small>마지막 저장</small><b>${esc(fmtTime(lastAt)||'—')}${lastBy?` · ${esc(lastBy)}`:''}</b></div>
        <div><small>이 컴퓨터 이름표</small><b>${esc(editor||'이름 없음')}</b></div></div>
      <div class="cg-cloud-actions"><button class="btn" id="cgSyncHistory">최근 저장 기록</button><button class="btn" id="cgSyncRename">이름 바꾸기</button><button class="btn" id="cgSyncOff">이 컴퓨터에서 함께 쓰기 끄기</button></div>
      <div id="cgCloudHistoryList"></div>
      <p class="cg-cloud-hint">고칠 때마다 자동으로 저장되고, 다른 선생님이 고친 내용은 20초 안에 자동으로 들어와요.</p>`;
  }
  function openPanel(){
    if (mode==='need-key'||mode==='starting'&&!key) return openPassword();
    if (mode==='local'){ show('여러 컴퓨터에서 함께 쓰기','',`<p class="cg-cloud-hint">이 주소에서는 함께 쓰기를 쓸 수 없어요. 지금은 이 컴퓨터에만 저장돼요. 학교에서 쓰는 사이트 주소로 열면 함께 쓸 수 있어요.</p>`); return; }
    show(status==='conflict'?'다른 선생님과 저장이 겹쳤어요':'함께 쓰기 · 저장 상태','',panelHTML());
    if (lastError && status==='offline') $('cgCloudStatus').textContent=lastError;
  }
  function refreshPanel(){ if(!overlay().hidden && mode==='on' && $('cgSyncPw')==null) { $('cgCloudBody').innerHTML=panelHTML(); } }
  async function showHistory(){
    try{
      const r=await api('history'); const box=$('cgCloudHistoryList'); if(!box) return;
      box.innerHTML='<h4>최근 저장 기록</h4>'+((r.history||[]).map(x=>`<div class="cg-cloud-history">${esc(fmtTime(x.at))} · ${esc(x.actor)}</div>`).join('')||'<p class="cg-cloud-hint">아직 기록이 없어요.</p>');
    }catch(e){ $('cgCloudStatus').textContent=errorText(e); }
  }

  /* ----- 앱과 연결 ----- */
  function markDirty(){
    if (applying) return;
    if (mode!=='on'){ if(mode==='need-key') setDirty(true); return; }
    setDirty(true);
    if (status!=='conflict'){ status='pending'; paint(); schedulePush(); }
  }
  window.CGCloud=Object.freeze({
    open:openPanel, markDirty, check:poll, paint,
    active:()=>mode==='on'||mode==='need-key'
  });

  $('cgCloudButton').addEventListener('click',openPanel);
  $('saveState').addEventListener('click',()=>{ if(mode==='on'||mode==='need-key') openPanel(); });
  $('cgCloudDismiss').addEventListener('click',close);
  overlay().addEventListener('click',e=>{ if(e.target===overlay()) close(); });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!overlay().hidden) close();
    if(e.key==='Enter'&&document.activeElement&&(document.activeElement.id==='cgSyncPw'||document.activeElement.id==='cgSyncName')) login();
  });
  $('cgCloudBody').addEventListener('click', async e=>{
    const id=e.target.id;
    if (id==='cgSyncLogin') login();
    else if (id==='cgSyncLater'){ close(); mode='need-key'; paint(); }
    else if (id==='cgSyncHistory') showHistory();
    else if (id==='cgSyncRename'){ const n=prompt; /* prompt 대신 입력칸 */
      $('cgCloudBody').insertAdjacentHTML('afterbegin',`<div class="cg-cloud-grid"><label>내 이름<input id="cgSyncNewName" type="text" maxlength="20" value="${esc(editor)}"></label><button class="btn pri" id="cgSyncNameSave">저장</button></div>`); }
    else if (id==='cgSyncNameSave'){ editor=$('cgSyncNewName').value.trim().slice(0,20); ls.set(LS.name,editor||null); refreshPanel(); toast('이름을 바꿨어요'); }
    else if (id==='cgSyncOff'){ forgetKey(); setBase(null); close(); toast('이 컴퓨터에서 함께 쓰기를 껐어요. 자료는 이 컴퓨터에 남아 있어요'); }
    else if (id==='cgSyncExport'){ if(typeof window.cgExportAll==='function') window.cgExportAll(); }
    else if (id==='cgSyncTakeRemote'){
      e.target.disabled=true; status='synced';
      try{ await pull('함께 쓰는 자료를 불러왔어요'); close(); }catch(err){ status='conflict'; $('cgCloudStatus').textContent=errorText(err); }
    }
    else if (id==='cgSyncKeepMine'){
      e.target.disabled=true;
      try{ const r=await api('head'); setBase(r.head.revision||0); status='pending'; conflictInfo=null; close(); await push(); toast('내 자료로 저장했어요'); }
      catch(err){ $('cgCloudStatus').textContent=errorText(err); }
    }
  });
  window.addEventListener('beforeunload', e=>{ if(mode==='on' && dirty && status!=='offline'){ e.preventDefault(); e.returnValue=''; } });
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) poll(); });
  setInterval(poll, POLL_MS);

  /* ----- 시작 ----- */
  (async () => {
    if (location.protocol==='file:'){ mode='local'; paint(); return; }
    let configured=false;
    try{ const r=await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({action:'status'})});
         const b=await r.json(); configured=!!(b&&b.ok&&b.configured); }catch(e){ configured=false; }
    if (!configured){ mode='local'; paint(); return; }
    if (!key){ mode='need-key'; paint(); try{ if(!sessionStorage.getItem('cg-sync-asked')){ sessionStorage.setItem('cg-sync-asked','1'); openPassword(); } }catch(e){ openPassword(); } return; }
    mode='on'; paint(); await start();
  })();
})();
