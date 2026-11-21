/* Clear Grid 6.4: Google cloud sync. Tokens are held in JS memory ONLY.
 * Design: explicit save/load; 30s revision checking; optimistic concurrency;
 * never replace locally edited data automatically. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const re = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
  let serverURL='', token='', actor='', baseVersion=null, currentRemote=0;
  let dirty=false, busy=false, remoteChanged=false, baseUpdatedAt='';
  let checking=false;
  const message = txt => { const n=$('cgCloudStatus');if(n)n.textContent=txt; };
  const formatDate = v => v ? new Date(v).toLocaleString('ko-KR') : '아직 저장되지 않음';
  function paintHeader(){
    const btn=$('cgCloudButton');if(!btn)return;
    btn.textContent= serverURL ? (remoteChanged?'☁ 최신 자료 확인 필요':dirty?'☁ 미동기화 변경 있음':'☁ 동기화 연결됨') : '☁ Google 동기화';
    btn.title=serverURL?`${actor} · 서버 버전 ${currentRemote}`:'Google Apps Script URL 및 담당자 토큰을 입력하세요';
  }
  function render(){
    const root=$('cgCloudBody');if(!root)return;
    if(!serverURL){
      root.innerHTML=`<div class="cg-cloud-grid">
        <label>Google Apps Script 웹앱 URL<input id="cgCloudURL" type="url" autocomplete="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec"></label>
        <label>담당자별 암호 토큰<input id="cgCloudToken" type="password" autocomplete="off" placeholder="32자 이상 권장"></label>
        <button id="cgCloudConnect" class="btn pri">서버 연결 확인</button></div>
        <p class="cg-cloud-hint">토큰은 현재 화면의 메모리에만 보관하며 브라우저 저장소·GitHub에 기록하지 않습니다. Google 연결을 위해 HTTPS Netlify 배포가 필요합니다.</p>`;
      return;
    }
    root.innerHTML=`<div class="cg-cloud-overview">
      <div><small>연결 계정</small><b>${esc(actor)}</b></div>
      <div><small>서버 버전</small><b>${currentRemote || '최초 등록 전'}</b></div>
      <div><small>내 작업</small><b>${dirty?'저장 전 변경 있음':'서버 저장 이후 변경 없음'}</b></div>
    </div>
    <p class="cg-cloud-hint">서버 마지막 수정: ${esc(formatDate(baseUpdatedAt))} ${remoteChanged?'<strong class="cg-cloud-alert">다른 담당자가 저장했습니다. 지금 저장하면 충돌됩니다.</strong>':''}</p>
    <div class="cg-cloud-actions">
      <button class="btn" id="cgCloudPull" ${busy?'disabled':''}>클라우드 최신 자료 불러오기</button>
      <button class="btn pri" id="cgCloudPush" ${busy||baseVersion===null?'disabled':''}>${baseVersion===0?'현재 자료 첫 등록':'현재 작업 클라우드 저장'}</button>
      <button class="btn" id="cgCloudCheck" ${busy?'disabled':''}>최신 버전 확인</button>
      <button class="btn" id="cgCloudHistory" ${busy?'disabled':''}>저장 이력</button>
      <button class="btn" id="cgCloudDisconnect" ${busy?'disabled':''}>연결 해제</button>
    </div>
    ${baseVersion===null&&currentRemote>0?'<p class="cg-cloud-alert">먼저 서버 자료를 불러와야 저장할 수 있습니다. 현재 로컬 작업은 JSON으로 백업한 뒤 불러오세요.</p>':''}
    <p class="cg-cloud-hint">수정은 브라우저에 먼저 저장됩니다. 다른 PC와 공유하려면 <b>클라우드 저장</b>을 눌러야 합니다. 30초마다 다른 담당자의 저장 여부만 확인하며, 변경 중인 자료를 자동 덮어쓰지 않습니다.</p>
    <div id="cgCloudHistoryList"></div>`;
  }
  function open(){ $('cgCloudOverlay').hidden=false;render(); }
  function close(){ $('cgCloudOverlay').hidden=true; }
  function failMsg(error){
    const k=error.code || error.message || 'UNKNOWN';
    const names={INVALID_REQUEST:'입력 URL 또는 토큰 형식을 확인해 주세요.',SERVER_NOT_CONFIGURED:'Netlify에서 GAS_WEBAPP_URL 환경변수를 설정해야 합니다.',UNAUTHORIZED:'토큰이 올바르지 않습니다.',CONFLICT:'다른 담당자가 먼저 저장했습니다. 최신본을 확인해 주세요.',GOOGLE_UNREACHABLE:'Google Apps Script 서버에 연결하지 못했습니다.',GOOGLE_BAD_JSON:'Apps Script 배포·접근권한을 확인해 주세요.',GOOGLE_UPSTREAM:'Apps Script 배포·접근권한을 확인해 주세요.',GOOGLE_BAD_RESPONSE:'Google에서 올바른 JSON 응답을 받지 못했습니다.',DATA_TOO_LARGE:'Google 저장 허용 크기를 초과했습니다.',BUSY:'다른 담당자가 저장 중입니다. 다시 확인해 주세요.',HTTP_404:'Netlify Functions가 아직 배포되지 않았습니다. GitHub 연동 배포 상태를 확인해 주세요.'};
    return names[k] || '요청 오류: '+k;
  }
  async function api(action, extra={}){
    if(!serverURL||!token)throw new Error('NOT_CONNECTED');
    const response=await fetch('/api/sync', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      cache:'no-store',
      body:JSON.stringify({action,url:serverURL,token,...extra})
    });
    let body;
    try{body=await response.json();}catch{throw Object.assign(new Error('HTTP_'+response.status),{code:'HTTP_'+response.status});}
    if(!response.ok||!body.ok)throw Object.assign(new Error(body.error||'SERVER_ERROR'),{code:body.error||'HTTP_'+response.status,detail:body});
    return body;
  }
  async function connect(){
    const url=$('cgCloudURL').value.trim();
    const t=$('cgCloudToken').value;
    if(!re.test(url)){message('Apps Script /exec 주소를 정확히 입력해 주세요.');return;}
    if(t.length<24){message('담당자 토큰은 24자 이상이어야 합니다.');return;}
    serverURL=url;token=t;busy=true;message('연결 확인 중…');
    try{
      const r=await api('head');
      actor=r.actor||'담당자';currentRemote=r.head.revision||0;baseUpdatedAt=r.head.updatedAt||'';
      baseVersion=currentRemote===0?0:null;dirty=currentRemote===0;
      remoteChanged=false;message('서버 연결 성공 · '+actor);render();paintHeader();
    }catch(e){serverURL='';token='';actor='';baseVersion=null;message(failMsg(e));render();}
    finally{busy=false;}
  }
  function markDirty(){
    if(!serverURL)return;
    dirty=true;paintHeader();
    // The sync UI is a separate overlay; its status is updated only if open.
    if(!$('cgCloudOverlay').hidden)render();
  }
  async function headCheck(show=true){
    if(!serverURL||busy||checking)return;
    checking=true;
    try{
      const r=await api('head');currentRemote=r.head.revision||0;
      remoteChanged=baseVersion!==null && currentRemote>baseVersion;
      baseUpdatedAt=r.head.updatedAt||'';
      if(show)message(remoteChanged?'다른 담당자의 새 저장본이 발견되었습니다.':'서버 최신 버전 확인 완료');
      paintHeader();if(!$('cgCloudOverlay').hidden)render();
    }catch(e){if(show)message(failMsg(e));}
    finally{checking=false;}
  }
  async function pull(){
    if(dirty && !confirm('이 브라우저에서 저장하지 않은 변경사항이 있습니다. 먼저 JSON 백업을 내려받으셨나요? 클라우드 자료를 불러오면 현재 작업이 교체됩니다.'))return;
    if(!confirm('클라우드의 전체 학년도 자료로 이 브라우저의 작업을 교체할까요?'))return;
    busy=true;message('클라우드 자료 읽는 중…');
    try{
      const r=await api('read');
      if(!r.data){
        baseVersion=0;dirty=true;currentRemote=0;
        message('서버가 비어 있습니다. 현재 자료를 첫 등록할 수 있습니다.');
      }else{
        window.CGBridge.importPortfolio(r.data);
        baseVersion=r.head.revision;currentRemote=baseVersion;dirty=false;remoteChanged=false;
        baseUpdatedAt=r.head.updatedAt||'';message('클라우드 자료를 가져왔습니다.');
      }
      paintHeader();render();
    }catch(e){message(failMsg(e));}
    finally{busy=false;}
  }
  async function push(){
    if(baseVersion===null){message('클라우드 자료를 먼저 불러와 주세요.');return;}
    if(remoteChanged){message('다른 담당자가 먼저 저장했습니다. JSON 백업 후 서버본을 검토해 주세요.');return;}
    if(!confirm('현재 브라우저의 모든 학년도 작업본을 클라우드에 저장할까요? 다른 담당자와 공유됩니다.'))return;
    busy=true;message('클라우드 저장 중…');
    try{
      const snapshot=window.CGBridge.exportPortfolio();
      const snapshotJSON=JSON.stringify(snapshot);
      const r=await api('save',{baseVersion,data:snapshot});
      baseVersion=r.version;currentRemote=r.version;baseUpdatedAt=r.updatedAt||'';remoteChanged=false;
      // If another edit happened while the request was in flight, it is still unsynced.
      dirty=JSON.stringify(window.CGBridge.exportPortfolio())!==snapshotJSON;
      message(dirty?'일부 변경이 저장 요청 중 추가되었습니다. 다시 저장해 주세요.':'클라우드 저장 완료 · 버전 '+r.version);
      paintHeader();render();
    }catch(e){
      if(e.code==='CONFLICT'){
        remoteChanged=true;currentRemote=e.detail?.version||currentRemote;
      }
      dirty=true;message(failMsg(e));paintHeader();render();
    }finally{busy=false;}
  }
  async function history(){
    busy=true;
    try{
      const r=await api('history');
      render();
      const target=$('cgCloudHistoryList');
      if(target)target.innerHTML='<h4>최근 저장 이력</h4>'+(r.history||[]).map(x=>`<div class="cg-cloud-history">v${Number(x.revision)} · ${esc(x.actor)} · ${esc(formatDate(x.at))}</div>`).join('')||'저장 이력이 없습니다.';
      message('최근 저장 이력을 표시했습니다.');
    }catch(e){message(failMsg(e));}
    finally{busy=false;}
  }
  function disconnect(){
    serverURL='';token='';actor='';baseVersion=null;currentRemote=0;remoteChanged=false;dirty=false;paintHeader();render();message('연결 해제 · 로컬 저장은 유지됩니다.');
  }
  window.CGCloud=Object.freeze({open,markDirty,check:headCheck});
  $('cgCloudButton').addEventListener('click',open);
  $('cgCloudDismiss').addEventListener('click',close);
  $('cgCloudOverlay').addEventListener('click',e=>{if(e.target===$('cgCloudOverlay'))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('cgCloudOverlay').hidden)close();});
  $('cgCloudBody').addEventListener('click',e=>{
    const id=e.target.id;
    if(id==='cgCloudConnect')connect();
    else if(id==='cgCloudPush')push();
    else if(id==='cgCloudPull')pull();
    else if(id==='cgCloudCheck')headCheck();
    else if(id==='cgCloudHistory')history();
    else if(id==='cgCloudDisconnect')disconnect();
  });
  setInterval(()=>{if(serverURL)headCheck(false);},30000);
  window.addEventListener('focus',()=>{if(serverURL)headCheck(false);});
  render();paintHeader();
})();
