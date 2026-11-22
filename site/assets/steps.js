"use strict";
/* ==========================================================================
   단계별 작업 흐름 (6.5)
   - 상단 메뉴를 '작업 순서' 7단계로 재배치하고, 단계마다 할 일·다음 단계를 안내한다.
   - 기존 화면(vReview, vSubjects, vChang …)은 그대로 쓰고, 새 화면 4개만 추가한다.
     · year    : 1단계 학년도 선택 + 학급 수
     · pyeonje : 2단계 편제표 올리기
     · check   : 3단계 과목·전공 확인 (공동 배분 과목 포함)
     · finish  : 7단계 출력·확정
   - app.js보다 먼저 불러오며, 안의 함수는 화면을 그릴 때 app.js의 전역 값(S, UI …)을 씀.
   ========================================================================== */

const STEPS = [
  {id:'year',     title:'학년도 선택',       short:'학년도',
   desc:'작업할 학년도를 고르고, 학년별 학급 수를 확인합니다.',
   todo:['작업할 학년도 고르기 (새 학년도는 여기서 만들기)','학년별 일반·과중 학급 수 확인'],
   views:[['year','학년도·학급']]},
  {id:'pyeonje',  title:'편제표 올리기',     short:'편제표',
   desc:'입학연도별 편제표(학점 배당표) 엑셀을 올립니다. 파일 속 입학연도를 보고 맞는 학년에 자동으로 들어갑니다.',
   todo:['1·2·3학년 편제표가 모두 들어갔는지 확인','바뀐 편제표가 있으면 다시 올리기'],
   views:[['pyeonje','편제표 등록']]},
  {id:'check',    title:'과목·전공 확인',    short:'전공 확인',
   desc:'편제표 과목이 학점·전공에 맞게 들어갔는지 보고, 여러 전공이 나눠 맡는 과목을 확인합니다.',
   todo:['과목마다 담당 전공이 맞는지 확인 (틀리면 바로 고치기)','나눠 맡는 과목(통합·전공없음) 확인','다 봤으면 [확인 완료] 누르기'],
   views:[['check','과목·전공 확인']]},
  {id:'elective', title:'선택과목 반편성',   short:'반편성',
   desc:'리로스쿨에서 내려받은 2·3학년 배정내역 엑셀을 올리고, 분반 수·인원을 확인한 뒤 반영합니다.',
   todo:['2학년·3학년 배정내역 엑셀 올리기','바뀌는 분반·시수 확인 후 [이대로 반영하기]','수강인원 표에서 인원이 몰린 분반 확인'],
   views:[['review','배정내역 올리기'],['subjects','수강인원·분반 확인']]},
  {id:'quota',    title:'정원·창체 배분',    short:'정원·창체',
   desc:'교사 정원을 넣고, 창체·부장 시수를 전공별로 나눕니다. 통합사회·통합과학은 사회과·과학과 전체로 계산돼요.',
   todo:['학교 전체 교사 정원(또는 전공별 정원) 입력','창체·부장 시수를 전공별로 나누기'],
   views:[['chang','정원·창체']]},
  {id:'teacher',  title:'교사 배정',         short:'교사 배정',
   desc:'교사 명단을 넣고, 분반마다 담당 교사를 정합니다. 교사별 시수가 바로 합산됩니다.',
   todo:['교사 명단 붙여넣기 (전공 이름)','교과별로 분반마다 담당 교사 고르기','교사별 시수가 고르게 나뉘었는지 확인'],
   views:[['teachers','교사 명단'],['assign','교과별 분반 배정']]},
  {id:'result',   title:'결과 확인·출력',    short:'결과·출력',
   desc:'총괄 배당표와 1·2학기 비교를 확인하고, 엑셀로 내보내거나 인쇄합니다. 끝나면 확정합니다.',
   todo:['총괄 배당표·1·2학기 비교 확인','엑셀 내보내기 또는 인쇄','다 끝나면 [이 학년도 확정]'],
   views:[['summary','총괄 배당표'],['compare','1·2학기 비교'],['finish','내보내기·확정']]}
];
const STEP_SETTINGS = {id:'settings', title:'설정', views:[['setup','기본 설정'],['years','학년도 기록']]};
const stepOfTab = tab => STEPS.find(s=>s.views.some(v=>v[0]===tab)) || (STEP_SETTINGS.views.some(v=>v[0]===tab)?STEP_SETTINGS:STEPS[0]);
const stLastView = {}; // 단계별 마지막으로 본 하위 화면

/* ----- 단계별 진행 상태 ----- */
function stPyeonjeGrades(){
  return [1,2,3].filter(g=>(S.subjects||[]).some(s=>s.grade===g && s.src==='편제표' && !(g===1 && norm(s.name)==='진로')));
}
function stUnassignedCount(){
  let n=0; (S.subjects||[]).forEach(s=>{ if(s.include===false) return; (s.sections||[]).forEach(x=>{ if(!x.teacher) n++; }); }); return n;
}
function stStatus(id){
  const flags=S.stepFlags||{};
  switch(id){
    case 'year': return {done:true, text:`${S.year}학년도`};
    case 'pyeonje': { const n=stPyeonjeGrades().length; return {done:n===3, text:`${n}/3개 학년`}; }
    case 'check': {
      const und=(S.subjects||[]).filter(s=>s.major==='미정'||s.warn).length;
      if(und) return {done:false, text:`확인 필요 ${und}`, warn:true};
      return {done:!!flags.checked, text:flags.checked?'확인 완료':'확인 전'};
    }
    case 'elective': { const n=[2,3].filter(g=>S.assignMeta&&S.assignMeta[g]).length; return {done:n===2, text:`${n}/2개 학년`}; }
    case 'quota': { let q=null; try{ q=cgQuotaInfo().quota; }catch(e){} return {done:!!q, text:q?`정원 ${q}명`:'정원 미입력'}; }
    case 'teacher': {
      const t=(S.teachers||[]).length; if(!t) return {done:false, text:'교사 없음'};
      const u=stUnassignedCount(); return {done:u===0, text:u?`미배정 ${u}개`:`${t}명 배정 완료`};
    }
    case 'result': return {done:S.workspaceStatus==='confirmed', text:S.workspaceStatus==='confirmed'?'확정됨':'확정 전'};
  }
  return {done:false,text:''};
}
function stNextTodo(){ return STEPS.find(s=>!stStatus(s.id).done) || null; }

/* ----- 상단 단계 표시 ----- */
function renderStepNav(){
  const cur = stepOfTab(UI.tab);
  const nav = document.getElementById('tabs');
  nav.classList.add('st-nav');
  nav.innerHTML = STEPS.map((s,i)=>{
    const st=stStatus(s.id), on=cur.id===s.id;
    return `<button type="button" class="st-pill ${on?'on':''} ${st.done?'done':''} ${st.warn?'warn':''}" data-stepgo="${s.id}" title="${esc(s.title)} · ${esc(st.text)}">
      <span class="st-num">${st.done&&!on?'✓':i+1}</span><span class="st-txt"><b>${esc(s.title)}</b><small>${esc(st.text)}</small></span></button>${i<STEPS.length-1?'<span class="st-line" aria-hidden="true"></span>':''}`;
  }).join('');
}

/* ----- 단계 머리말·하위 화면·이전/다음 ----- */
function stepFrame(inner){
  const step = stepOfTab(UI.tab);
  if (step===STEP_SETTINGS){
    return `<div class="st-head st-head-plain"><div><div class="st-kicker">설정</div><h2>설정</h2>
      <p>인쇄 결재란, 다른 컴퓨터로 옮기기, 지난 학년도 기록을 다뤄요. 평소 작업에는 필요하지 않아요.</p></div>
      <button class="btn" data-stepgo="${esc(stepOfTab(UI.stReturn||'year').id)}">← 작업 화면으로</button></div>
      ${subTabs(STEP_SETTINGS)}${inner}`;
  }
  const idx = STEPS.indexOf(step), st=stStatus(step.id);
  const prev = STEPS[idx-1], next = STEPS[idx+1];
  const head = `<div class="st-head">
    <div class="st-head-main"><div class="st-kicker">${idx+1}단계 / ${STEPS.length}</div><h2>${esc(step.title)}</h2><p>${esc(step.desc)}</p></div>
    <div class="st-todo"><div class="st-todo-h">이 단계에서 할 일 <span class="st-badge ${st.done?'ok':st.warn?'warn':''}">${esc(st.text)}</span></div>
      <ol>${step.todo.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div></div>`;
  const foot = `<div class="st-foot">
    ${prev?`<button class="btn lg" data-stepgo="${prev.id}">← ${idx}단계 ${esc(prev.title)}</button>`:'<span></span>'}
    ${next?`<button class="btn pri lg" data-stepgo="${next.id}">${idx+2}단계 ${esc(next.title)} →</button>`:'<span></span>'}</div>`;
  return head + subTabs(step) + `<div class="st-body">${inner}</div>` + foot;
}
function subTabs(step){
  if (step.views.length<2) return '';
  return `<div class="st-subtabs" role="tablist">${step.views.map(([k,l],i)=>`<button type="button" role="tab" class="${UI.tab===k?'on':''}" data-subview="${k}"><span>${String.fromCharCode(9312+i)}</span> ${esc(l)}</button>`).join('')}</div>`;
}

/* ===== 1단계: 학년도 선택 ===== */
function vStepYear(){
  const years=[...((typeof CG_INDEX!=='undefined'&&CG_INDEX&&CG_INDEX.years)||[S.year])].sort((a,b)=>b-a);
  const nextTodo = stNextTodo();
  const cards = years.map(y=>{
    const cur = y===S.year;
    const d = cur?S:(typeof cgYearInfo==='function'?cgYearInfo(y):null);
    const locked = d&&d.workspaceStatus==='confirmed';
    const nSub = (d&&d.subjects||[]).length, nT=(d&&d.teachers||[]).length;
    return `<article class="st-year ${cur?'on':''}">
      <div class="st-year-top"><span class="st-year-y">${y}</span><span class="st-year-unit">학년도</span>
        <span class="st-chip ${locked?'lock':cur?'cur':''}">${locked?'확정됨':cur?'지금 작업 중':'작업 중'}</span></div>
      <div class="st-year-meta">과목 ${nSub}개 · 교사 ${nT}명</div>
      ${cur?`<div class="st-year-next">${nextTodo?`다음 할 일: <b>${STEPS.indexOf(nextTodo)+1}단계 ${esc(nextTodo.title)}</b>`:'모든 단계를 마쳤어요'}</div>
        <button class="btn pri" data-stepgo="${nextTodo?nextTodo.id:'result'}">이어서 작업하기 →</button>`
       :`<button class="btn" data-act="cgSwitchYear" data-year="${y}">이 학년도 열기</button>`}
    </article>`;
  }).join('');
  const canNew = !years.includes(S.year+1);
  const newCard = canNew?`<article class="st-year st-year-new" data-act="cgNewYear" role="button" tabindex="0">
      <div class="st-plus">+</div><b>${S.year+1}학년도 새로 만들기</b>
      <small>2·3학년 편제표는 이어받고, 반편성·교사·정원은 새로 시작해요</small></article>`:'';
  const grades=[1,2,3].map(g=>{
    const c=S.classes[g]||{g:8,s:2};
    return `<div class="st-grade"><div class="st-grade-h"><b>${g}학년</b><small>${S.year-g+1}학년도 입학생</small></div>
      <label>일반 <input type="number" min="0" data-cls="${g}" data-k="g" value="${c.g}" aria-label="${g}학년 일반학급 수"> 반</label>
      <label>과중 <input type="number" min="0" data-cls="${g}" data-k="s" value="${c.s}" aria-label="${g}학년 과학중점학급 수"> 반</label>
      <div class="st-grade-sum">모두 ${c.g+c.s}학급 · 과중은 ${c.g+1}${c.s>1?'~'+(c.g+c.s):''}반</div></div>`;
  }).join('');
  return `<section class="panel"><h3 class="st-h3">어느 학년도를 작업할까요?</h3>
      <div class="st-years">${cards}${newCard}</div></section>
    <section class="panel"><h3 class="st-h3">${S.year}학년도 학급 수</h3>
      <p class="st-help">학급 수를 바꾸면 학년 공통 과목의 반이 다시 만들어져요. 같은 반의 담당 교사는 그대로 남아요.</p>
      <div class="st-grades">${grades}</div></section>`;
}

/* ===== 2단계: 편제표 올리기 ===== */
function vStepPyeonje(){
  const have = stPyeonjeGrades();
  const cards=[1,2,3].map(g=>{
    const entry=S.year-g+1, ok=have.includes(g);
    const subs=(S.subjects||[]).filter(s=>s.grade===g && s.src==='편제표' && !(g===1&&norm(s.name)==='진로'));
    const nFixed=new Set(subs.filter(s=>s.kind!=='선택').map(s=>norm(s.name))).size;
    const nSel=new Set(subs.filter(s=>s.kind==='선택').map(s=>norm(s.name))).size;
    const cr=sem=>subs.filter(s=>s.sem===sem&&s.kind!=='선택').reduce((t,s)=>t+num(s.credits),0);
    const meta=(S.pyeonjeMeta||{})[g]||'';
    return `<article class="st-pj ${ok?'ok':''}">
      <div class="st-pj-h"><div><b>${g}학년</b><small>${entry}학년도 입학생 편제표</small></div><span class="st-chip ${ok?'ok':'need'}">${ok?'들어감':'필요'}</span></div>
      ${ok?`<ul class="st-pj-facts"><li>학교 지정 과목 <b>${nFixed}</b>개 · 선택 과목 <b>${nSel}</b>개</li>
        <li>지정 과목 학점: 1학기 <b>${cr(1)}</b> · 2학기 <b>${cr(2)}</b></li>
        <li class="st-src">${esc(meta.replace(/\s*·\s*연결됨/,'').replace(/^교육과정 편제표 미등록.*$/,''))||'지난 학년도에서 이어받음'}</li></ul>
        <button class="btn sm" data-act="stUploadPyeonje">다시 올리기</button>`
      :`<p class="st-help">${entry}학년도 입학생 편제표 엑셀을 올려 주세요.</p><button class="btn pri" data-act="stUploadPyeonje">편제표 파일 올리기</button>`}
    </article>`;
  }).join('');
  return `<section class="panel"><div class="st-pjs">${cards}</div>
    <div class="st-drop" data-act="stUploadPyeonje" role="button" tabindex="0"><b>편제표 엑셀을 여기에 끌어다 놓거나 눌러서 고르세요</b>
      <small>'○○○○입학생' 시트가 있는 학점 배당표 파일 · 한 번에 한 파일씩 · 입학연도에 맞는 학년이 자동으로 선택돼요</small></div></section>`;
}

/* ===== 3단계: 과목·전공 확인 ===== */
function vStepCheck(){
  const g = +(UI.chkGrade||3);
  const opts = cur => majorOptions(cur);
  const shared = (S.subjects||[]).filter(s=>(isShared(s.major)||s.major===NOMAJOR) && s.include!==false);
  const groupShared = {};
  shared.forEach(s=>{ (groupShared[s.major]=groupShared[s.major]||[]).push(s); });
  const sharedHelp = {'사회(통합)':'지리·일반사회·윤리 선생님이 나눠 맡아요 · 사회과 계에 합산',
    '과학(통합)':'물리·화학·생명과학·지구과학 선생님이 나눠 맡아요 · 과학과 계에 합산',
        '전공없음':'정원 계산에서 빠져요 · 마지막에 교사별 시수를 맞출 때 아무 선생님에게나 배정해요 (6단계)'};
  const order=['사회(통합)','과학(통합)','전공없음'];
  const sharedHtml = Object.keys(groupShared).length ? order.filter(m=>groupShared[m]).map(m=>[m,groupShared[m]]).map(([m,list])=>{
    const names=[...new Map(list.sort((a,b)=>a.grade-b.grade||a.sem-b.sem).map(s=>[s.grade+norm(s.name),s])).values()];
    return `<div class="st-shared"><div class="st-shared-h"><b>${esc(majorLabel(m).replace(' (정원 제외)',''))}</b><small>${esc(sharedHelp[m]||'')}</small></div>
      <div class="st-tags">${names.map(s=>`<span class="st-tag">${s.grade}학년 ${esc(s.name)}</span>`).join('')}</div></div>`;
  }).join('') : '<p class="st-help">공동 배분 과목이 없어요.</p>';
  const issues=(S.subjects||[]).filter(s=>s.major==='미정'||s.warn);
  const issueHtml = issues.length?`<div class="st-alert"><b>확인이 필요한 과목 ${issues.length}개</b> — 아래 표에서 노란 줄을 확인해 주세요.<div class="st-tags">${issues.map(s=>`<span class="st-tag warn">${s.grade}학년 ${s.sem}학기 ${esc(s.name)}${s.warn?' (편제표에 없음)':' (전공 미정)'}</span>`).join('')}</div></div>`:'';
  const table = sem => {
    const subs=(S.subjects||[]).filter(s=>s.grade===g&&s.sem===sem)
      .sort((a,b)=>(a.kind==='선택')-(b.kind==='선택')||MAJOR_IDS.indexOf(a.major)-MAJOR_IDS.indexOf(b.major)||natCmp(a.name,b.name));
    const rows=subs.map(s=>{
      const bad=s.major==='미정'||s.warn, sh=isShared(s.major)||s.major===NOMAJOR;
      const closed = s.kind==='선택' && S.assignMeta && S.assignMeta[s.grade] && !(s.sections||[]).length;
      return `<tr class="${bad?'st-bad':''} ${s.include===false||closed?'st-off':''}">
        <td><span class="st-kind ${s.kind==='선택'?'sel':''}">${s.kind==='선택'?'선택':s.kind==='교차'?'교차':'지정'}</span></td>
        <td class="st-name">${esc(s.name)}${s.online?' <span class="st-mini">온라인학교</span>':''}${closed?' <span class="st-closed">미개설</span>':''}</td>
        <td class="c"><input type="number" min="0" class="st-cr" data-sub="${s.id}" data-f="credits" value="${s.credits}" aria-label="${esc(s.name)} 학점"></td>
        <td><select data-sub="${s.id}" data-f="major" class="${sh?'st-sh':''}" aria-label="${esc(s.name)} 담당 전공">${opts(s.major)}</select></td></tr>`;
    }).join('');
    const total=subs.filter(s=>s.kind!=='선택').reduce((t,s)=>t+num(s.credits),0);
    return `<div class="st-sem"><div class="st-sem-h"><b>${sem}학기</b><small>지정 과목 ${total}학점 · 모두 ${subs.length}과목</small></div>
      <table class="st-table"><thead><tr><th>구분</th><th>과목</th><th>학점</th><th>담당 전공</th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="st-empty">과목이 없어요 · 2단계에서 편제표를 올려 주세요</td></tr>'}</tbody></table></div>`;
  };
  return `<div class="st-check-top">
      <section class="panel"><h3 class="st-h3">나눠 맡는 과목</h3><p class="st-help">전담 교사가 없는 과목이에요. 다른 과목도 이렇게 처리하려면 아래 표의 담당 전공에서 <b>사회(통합)·과학(통합)·전공없음</b> 중 하나를 고르세요.</p>${sharedHtml}</section>
      <section class="panel st-check-done"><h3 class="st-h3">다 확인했나요?</h3><p class="st-help">학년마다 학점과 담당 전공을 훑어보고, 맞으면 눌러 주세요.</p>${issueHtml}
        ${S.stepFlags&&S.stepFlags.checked?'<div class="st-okline">✓ 확인 완료</div><button class="btn sm" data-act="stCheckUndo">다시 확인하기</button>':`<button class="btn pri lg" data-act="stCheckDone" ${issues.length?'disabled title="확인이 필요한 과목을 먼저 정리해 주세요"':''}>확인 완료</button>`}</section></div>
    <section class="panel"><div class="st-row"><h3 class="st-h3" style="margin:0">학년별 과목</h3>
      <span class="seg">${[3,2,1].map(x=>`<button data-chkgrade="${x}" class="${g===x?'on':''}">${x}학년</button>`).join('')}</span>
      <small class="st-help" style="margin:0">구분: 지정 = 학교가 정한 과목 · 교차 = 반을 반씩 나눠 학기를 바꿔 듣는 과목 · 선택 = 학생 선택</small></div>
      <div class="st-sems">${table(1)}${table(2)}</div></section>`;
}

/* ===== 7단계: 내보내기·확정 ===== */
function vStepFinish(){
  const locked=S.workspaceStatus==='confirmed';
  const snaps=(typeof cgCheckpoints==='function'?cgCheckpoints(S.year):[]).map(cp=>`<tr><td><b>${esc(cp.label)}</b><div class="st-help" style="margin:0">${new Date(cp.at).toLocaleString('ko-KR')}</div></td><td>${cp.status==='confirmed'?'확정':'중간 저장'}</td><td><button class="btn sm" data-act="cgRestore" data-id="${esc(cp.id)}">이 시점으로 되돌리기</button></td></tr>`).join('');
  const undone = STEPS.slice(0,-1).filter(s=>!stStatus(s.id).done);
  return `<div class="st-finish">
    <section class="panel"><h3 class="st-h3">내보내기·인쇄</h3>
      <div class="st-actions"><button class="btn pri lg" data-act="exportXlsx">엑셀 파일로 내려받기</button></div>
      <p class="st-help">총괄 배당표(1·2학기), 1·2학기 비교, 창체, 교사별 시수, 교과별 분반 배정이 시트별로 들어가요. 인쇄는 각 표 오른쪽 위의 [인쇄] 버튼을 쓰세요.</p></section>
    <section class="panel"><h3 class="st-h3">이 학년도 확정</h3>
      ${undone.length&&!locked?`<div class="st-alert">아직 끝나지 않은 단계: ${undone.map(s=>`<b>${STEPS.indexOf(s)+1}단계 ${esc(s.title)}</b>`).join(', ')}</div>`:''}
      <p class="st-help">확정하면 실수로 바뀌지 않도록 잠겨요. 필요하면 언제든 다시 풀 수 있어요.</p>
      <div class="st-actions">${locked?'<button class="btn pri" data-act="cgReopen">잠금 풀고 다시 고치기</button>':'<button class="btn pri" data-act="cgConfirm">이 학년도 확정</button>'}
      <button class="btn" data-act="cgSnapshot">지금 상태 중간 저장</button></div>
      <div class="tablewrap" style="margin-top:12px"><table class="cg-board-table"><thead><tr><th>저장 시점</th><th>구분</th><th></th></tr></thead><tbody>${snaps||'<tr><td colspan="3" class="muted">중간 저장한 시점이 없어요.</td></tr>'}</tbody></table></div>
      <p class="st-help">중간 저장은 학년도마다 최근 4개까지 남아요.</p></section></div>`;
}

/* ===== 공통 이벤트 (단계 이동·새 화면 동작) ===== */
function stGo(tab){
  const step = stepOfTab(tab);
  if (step!==STEP_SETTINGS) UI.stReturn = tab;
  UI.tab = tab; stLastView[step.id]=tab;
  render(); window.scrollTo({top:0,behavior:'smooth'});
}
document.addEventListener('click', e=>{
  const go = e.target.closest('[data-stepgo]');
  if (go){ const step = go.dataset.stepgo==='settings'?STEP_SETTINGS:STEPS.find(s=>s.id===go.dataset.stepgo);
    if(step) stGo(stLastView[step.id] || step.views[0][0]); return; }
  const sv = e.target.closest('[data-subview]'); if (sv){ stGo(sv.dataset.subview); return; }
  const cg = e.target.closest('[data-chkgrade]'); if (cg){ UI.chkGrade=+cg.dataset.chkgrade; render(); return; }
  const a = e.target.closest('[data-act]'); if (!a || !a.closest('#main')) return;
  if (a.dataset.act==='stUploadPyeonje'){ document.getElementById('filePyeonje').click(); }
  else if (a.dataset.act==='stCheckDone'){ S.stepFlags=Object.assign({},S.stepFlags,{checked:true}); commit(); toast('3단계 확인 완료 · 다음은 선택과목 반편성이에요'); }
  else if (a.dataset.act==='stCheckUndo'){ S.stepFlags=Object.assign({},S.stepFlags,{checked:false}); commit(); }
});
document.addEventListener('keydown', e=>{
  if ((e.key==='Enter'||e.key===' ') && e.target.matches && e.target.matches('.st-drop,.st-year-new')){ e.preventDefault(); e.target.click(); }
});
// 편제표 끌어다 놓기
document.addEventListener('dragover', e=>{ const d=e.target.closest&&e.target.closest('.st-drop'); if(d){ e.preventDefault(); d.classList.add('over'); } });
document.addEventListener('dragleave', e=>{ const d=e.target.closest&&e.target.closest('.st-drop'); if(d) d.classList.remove('over'); });
document.addEventListener('drop', e=>{ const d=e.target.closest&&e.target.closest('.st-drop'); if(!d) return; e.preventDefault(); d.classList.remove('over');
  const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) handlePyeonjeFile(f); });

/* ===== 설정: 기본 설정 ===== */
function vStepSettings(){
  return `<div class="st-finish">
    <section class="panel"><h3 class="st-h3">인쇄 결재란</h3><p class="st-help">인쇄물 오른쪽 위에 들어가는 결재 칸이에요.</p>
      <div class="cg-sign-grid">${S.sign.map((x,i)=>`<input type="text" data-sign="${i}" value="${esc(x)}" aria-label="${i+1}번째 결재란">`).join('')}</div>
      <div class="st-actions" style="margin-top:10px"><button class="btn sm" data-act="signAdd">+ 칸 추가</button><button class="btn sm" data-act="signDel">− 칸 빼기</button></div></section>
    <section class="panel"><h3 class="st-h3">다른 컴퓨터로 옮기기</h3><p class="st-help">지금 학년도 작업을 파일 하나로 저장했다가, 다른 컴퓨터에서 열 수 있어요.</p>
      <div class="st-actions"><button class="btn pri" data-act="saveJson">작업 파일로 저장</button><button class="btn" data-act="loadJson">작업 파일 열기</button></div></section>
    <section class="panel"><h3 class="st-h3">여러 컴퓨터에서 함께 쓰기</h3><p class="st-help">학교 비밀번호를 컴퓨터마다 한 번만 넣으면, 고칠 때마다 자동으로 저장되고 다른 선생님이 고친 내용도 자동으로 들어와요. 화면 위 저장 표시를 눌러도 열려요.</p>
      <div class="st-actions"><button class="btn" data-act="stOpenCloud">함께 쓰기 상태 보기</button></div></section>
    <section class="panel"><h3 class="st-h3">처음 상태로 되돌리기</h3><p class="st-help">이 학년도에 넣은 자료를 모두 지우고 처음부터 다시 시작해요. 잘못 눌렀다면 바로 [되돌리기]를 누르세요.</p>
      <div class="st-actions"><button class="btn danger" data-act="reset">처음 상태로 되돌리기</button></div></section>
  </div>`;
}

/* ===== 설정: 학년도 기록 ===== */
function vStepRecords(){
  const years=[...((typeof CG_INDEX!=='undefined'&&CG_INDEX&&CG_INDEX.years)||[S.year])].sort((a,b)=>b-a);
  const locked=S.workspaceStatus==='confirmed';
  const rows=years.map(y=>{ const d=y===S.year?S:cgYearInfo(y);
    return `<tr><td><b>${y}학년도</b>${y===S.year?' <span class="st-chip cur">지금 작업 중</span>':''}</td><td>${d&&d.workspaceStatus==='confirmed'?'확정됨':'작업 중'}</td><td>과목 ${(d&&d.subjects||[]).length}개 · 교사 ${(d&&d.teachers||[]).length}명</td>
      <td>${y===S.year?'':`<button class="btn sm" data-act="cgSwitchYear" data-year="${y}">열기</button>`}</td></tr>`; }).join('');
  const cohort=[1,2,3].map(g=>{ const entry=S.year-g+1, rec=(typeof CG_COHORTS!=='undefined'&&CG_COHORTS||{})[entry];
    return `<tr><td><b>${g}학년</b> · ${entry}학년도 입학생</td><td>${rec?`과목 ${rec.subjects.length}개 저장됨`:'<span class="muted">아직 없음</span>'}</td>
      <td>${!locked&&rec?`<button class="btn sm" data-act="cgUpdateCohort" data-grade="${g}">지금 내용으로 저장</button>`:''}</td></tr>`; }).join('');
  return `<section class="panel"><h3 class="st-h3">학년도 목록</h3><p class="st-help">학년도마다 따로 저장돼요. 다른 학년도를 열어도 지금 학년도 자료는 그대로 남아요.</p>
      <div class="tablewrap"><table class="cg-board-table"><thead><tr><th>학년도</th><th>상태</th><th>내용</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="st-actions" style="margin-top:10px">${years.includes(S.year+1)?'':`<button class="btn" data-act="cgNewYear">+ ${S.year+1}학년도 새로 만들기</button>`}</div></section>
    <section class="panel"><h3 class="st-h3">다음 학년도로 넘겨줄 편제표</h3>
      <p class="st-help">새 학년도를 만들면 2·3학년 편제표는 여기 저장된 내용을 이어받아요. 3단계에서 학점이나 전공을 고쳤다면 [지금 내용으로 저장]을 눌러 두세요.</p>
      <div class="tablewrap"><table class="cg-board-table"><thead><tr><th>학년</th><th>저장된 편제표</th><th></th></tr></thead><tbody>${cohort}</tbody></table></div></section>
    <section class="panel"><h3 class="st-h3">모든 학년도를 파일로 보관</h3>
      <p class="st-help">모든 학년도 자료를 파일 하나로 내려받거나, 그 파일을 다시 불러와요. 컴퓨터를 바꿀 때 써요.</p>
      <div class="st-actions"><button class="btn" data-act="cgExportAll">모든 학년도 파일로 내려받기</button><button class="btn" data-act="cgImportAll">파일에서 불러오기</button></div></section>`;
}
document.addEventListener('click', e=>{
  const a=e.target.closest('[data-act="stOpenCloud"]'); if(!a) return;
  const b=document.getElementById('cgCloudButton'); if(b) b.click();
});
