"use strict";
/* 기본 정의: '온라인'은 원본 과목 데이터의 분류 키로만 사용하고, 전공 행에서는 제외. */
const SEED = window.CG_BOOTSTRAP || {pyeonje:[],assign:[]};
const MAJORS = [
  {id:'국어'},{id:'수학'},{id:'영어'},{id:'역사'},
  {id:'지리',group:'사회'},{id:'일반사회',group:'사회'},{id:'윤리',group:'사회'},{id:'사회(통합)',group:'사회'},
  {id:'물리',group:'과학'},{id:'화학',group:'과학'},{id:'생명과학',group:'과학'},{id:'지구과학',group:'과학'},{id:'과학(통합)',group:'과학'},
  {id:'체육'},{id:'음악'},{id:'미술'},{id:'일본어'},{id:'중국어'},{id:'가정'},{id:'정보'},{id:'보건'},{id:'진로'},{id:'교양'},{id:'온라인'},{id:'전공없음'},{id:'미정'}
];
const MAJOR_IDS = MAJORS.map(m=>m.id);
const GROUPS = {'사회':['지리','일반사회','윤리','사회(통합)'],'과학':['물리','화학','생명과학','지구과학','과학(통합)']};
const groupOf = id => (MAJORS.find(m=>m.id===id)||{}).group||null;
// 전담 교사 정원이 따로 없는 온라인·통합 영역
const SHARED = ['사회(통합)','과학(통합)','온라인'];
const ONLINE_ITEM_ID='cg-online'; // 화면상 '창체 및 교과외'의 자동 산출 항목
const displayMajors = () => usedMajors().filter(m=>m!=='온라인');
// 6.5: '전공없음' = 정원 계산에서 빠지고, 마지막에 교사별 시수를 맞출 때 아무 교사에게나 배정하는 과목
const NOMAJOR='전공없음';
const MAJOR_LABEL={'온라인':'공동배분','전공없음':'전공없음 (정원 제외)','미정':'미정 (확인 필요)'};
const majorLabel = m => MAJOR_LABEL[m]||m;
const majorOptions = cur => MAJOR_IDS.filter(m=>m!=='온라인'||cur==='온라인').map(m=>`<option value="${m}" ${m===cur?'selected':''}>${majorLabel(m)}</option>`).join('');
const isShared = m => SHARED.includes(m);
const TEACHER_MAJORS = MAJORS.map(m=>m.id).filter(m=>!SHARED.includes(m) && m!=='미정' && m!=='전공없음');

function poolMajors(majors){
  if (majors.includes('온라인') || majors.includes('전공없음')) return TEACHER_MAJORS; // '온라인' 전공 과목은 모든 전공 교사가 제약 없이 담당 가능
  const s=new Set();
  majors.forEach(m=>{ s.add(m); const g=groupOf(m); if(g) GROUPS[g].forEach(x=>s.add(x)); });
  return [...s].filter(m=>!isShared(m));
}
const norm = s => String(s==null?'':s).replace(/\s+/g,'');

/* 창의 공학 설계, 언어생활과 한자 -> 전공 '온라인' 자동 배정 */
const NAME_MAJOR = {};
[['역사','한국사1 한국사2 세계사 동아시아역사기행 역사로탐구하는현대세계 국제분쟁으로보는세계사'],
 ['지리','한국지리탐구 여행지리 세계시민과지리 도시의미래탐구 기후변화와지속가능한세계'],
 ['일반사회','사회와문화 사회문제탐구 정치 법과사회 경제 금융과경제생활 국제관계의이해'],
 ['윤리','현대사회와윤리 윤리문제탐구 윤리와사상 인문학과윤리'],
 ['사회(통합)','통합사회1 통합사회2'],
 ['물리','물리학 역학과에너지 전자기와양자 물리학실험 고급물리학'],
 ['화학','화학 물질과에너지 화학반응의세계 화학실험 고급화학'],
 ['생명과학','생명과학 세포와물질대사 생물의유전 생명과학실험 고급생명과학'],
 ['지구과학','지구과학 지구시스템과학 행성우주과학 지구과학실험 고급지구과학'],
 ['과학(통합)','통합과학1 통합과학2 과학탐구실험1 과학탐구실험2 과학의역사와문화 기후변화와환경생태 융합과학탐구'],
 ['가정','생활과학탐구 지식재산일반 기술∙가정 기술·가정 아동발달과부모 생애설계와자립'],
 ['정보','정보 인공지능기초 데이터과학 소프트웨어와생활 데이터시각화프로그래밍'],
 ['보건','공중보건 보건'],
 ['진로','진로'],
 ['교양','진로·학업설계 진로∙학업설계 진로학업설계 진로와직업 인간과심리 논리와사고 환경과생태'],
 ['전공없음','창의공학설계 언어생활과한자']
].forEach(([m,list])=>list.split(' ').forEach(n=>NAME_MAJOR[n]=m));

function guessMajor(name, group, grade){
  const k = norm(name);
  if (k==='창의공학설계' || k==='언어생활과한자') return '전공없음';
  if (grade===3 && k.includes('진로')) return '교양';
  if (grade===1 && k==='진로') return '진로';
  if (NAME_MAJOR[k]) return NAME_MAJOR[k];
  const g = norm(group);
  if (g.startsWith('국어')) return '국어';
  if (g.startsWith('수학')) return '수학';
  if (g.startsWith('영어')) return '영어';
  if (g.startsWith('체육')) return '체육';
  if (g.startsWith('예술')) return k.includes('음악')?'음악':'미술';
  if (g.startsWith('제2외국어')) return k.includes('일본')?'일본어':k.includes('중국')?'중국어':'전공없음';
  if (g.startsWith('기술')) return '정보';
  if (g.startsWith('교양')) return grade===1 && k==='진로' ? '진로' : '교양';
  if (g.startsWith('진로')) return grade===3 ? '교양' : '진로';
  if (g.startsWith('사회')) return '일반사회';
  if (g.startsWith('과학')) return '과학(통합)';
  return '전공없음';
}

const DEFAULT_CHANG = [
  {id:'c1',name:'부장',need1:12,need2:12},
  {id:'c2',name:'담임(자치)',need1:30,need2:30},
  {id:'c3',name:'적응',need1:30,need2:30},
  {id:'c5',name:'2학년 운동',need1:10,need2:10},
  {id:'c6',name:'3학년 교과창체(NIE)',need1:10,need2:10},
  {id:'c7',name:'직업반',need1:4,need2:4}
];
const uid = (p='x') => p+Math.random().toString(36).slice(2,9);
const natCmp = (a,b) => String(a).localeCompare(String(b),'ko',{numeric:true});
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num = v => { const x = parseFloat(v); return isFinite(x)?x:0; };
const fmt1 = v => v==null||!isFinite(v)?'':(Math.round(v*10)/10).toFixed(1);

/* ========== 전역 상태 및 실행취소(Undo/Redo) ========== */
let S = null;
const UNDO_STACK = [];
const REDO_STACK = [];
const MAX_HISTORY = 60;

/* 과목·분반 탭은 상단 단일 버튼(matrixGrade, matrixSem)으로 좌측 검증표와 우측 과목 목록을 동시에 제어 */
const UI = {
  tab:'year', // 6.5: 1단계 '학년도 선택'으로 시작
  reviewGrade:3, reviewFilter:'changed',
  sem:1,
  sumMode:'single', // 'single', 'both', 'zoom'
  zoomMajor:'all',
  matrixGrade:2,
  matrixSem:1,
  matrixGroup:'all',
  assignMajor:'수학',
  teachSem:1,
  teachSort:'major',
  changSem:1
};
// === [Part 1 끝: 바로 아래에 Part 2를 붙여넣으세요] ===
// === [Part 2 시작: Part 1 주석 바로 아래에 이어 붙여넣으세요] ===

function blankState(){
  return {
    version:3, year:2027, savedAt:0,
    classes:{1:{g:8,s:2},2:{g:8,s:2},3:{g:8,s:2}},
    subjects:[], teachers:[],
    annualTeachingAvg:null, schoolQuota:null, sharedAlloc:{1:{},2:{}}, capacity:{'진로':{quota:1}}, chang:{items:JSON.parse(JSON.stringify(DEFAULT_CHANG)), alloc:{1:{},2:{}}},
    assignMeta:{}, pyeonjeMeta:{},
    sign:['담당','교과주임','교육과정부장','교감','교장']
  };
}

function classLabels(grade, track){
  const c = S.classes[grade]||{g:8,s:2}; const out=[];
  if (track==='g') for(let i=1;i<=c.g;i++) out.push(i+'반');
  else for(let j=1;j<=c.s;j++) out.push((c.g+j)+'반');
  return out;
}

/* ----- 학년 구분 없이 1~8반=일반(g), 9~10반=과중(s), 섞여 있으면 혼합(m) 판별 ----- */
function calcTrackFromByClass(byClass){
  let gN = 0, sN = 0;
  if (byClass){
    Object.entries(byClass).forEach(([clsStr, count])=>{
      const cNum = parseInt(clsStr, 10);
      const cntVal = num(count);
      if (!isFinite(cNum) || cntVal<=0) return;
      if (cNum>=1 && cNum<=8) gN += cntVal;
      else if (cNum>=9) sN += cntVal;
    });
  }
  if (gN>0 && sN>0) return {track:'m', gN, sN};
  if (sN>0 && gN===0) return {track:'s', gN:0, sN};
  return {track:'g', gN, sN:0};
}

function fixedSections(sub, old){
  const keep = {}; (old||[]).forEach(s=>keep[s.label]=s);
  const c = S.classes[sub.grade]||{g:8,s:2};
  let labs = [];
  if (sub.kind==='교차'){
    const gh = Math.ceil(c.g/2), sh = Math.ceil(c.s/2);
    const first = sub.crossFirst;
    for(let i=1;i<=c.g;i++){ if((i<=gh)===first) labs.push([i+'반','g']); }
    for(let j=1;j<=c.s;j++){ if((j<=sh)===first) labs.push([(c.g+j)+'반','s']); }
  } else {
    for(let i=1;i<=c.g;i++) labs.push([i+'반','g']);
    for(let j=1;j<=c.s;j++) labs.push([(c.g+j)+'반','s']);
  }
  return labs.map(([label,track])=>({label, track, n:null, teacher:(keep[label]||{}).teacher||''}));
}

/* ----- 1학년 진로(1,2학기 1~10반 1시수), 3학년 진로->교양, 창의공학설계/언어생활과한자->온라인 자동 보정 ----- */
function ensureSpecialSubjects(){
  [1,2].forEach(sem=>{
    let jinro = S.subjects.find(s=>s.grade===1 && s.sem===sem && norm(s.name)==='진로');
    if (!jinro){
      jinro = {
        id:uid('s'), grade:1, sem, name:'진로', group:'진로',
        major:'진로', credits:1, kind:'지정', block:'',
        note:'1학년 1~10반 필수(1시수)', online:false, include:true, src:'편제표', sections:[]
      };
      jinro.sections = fixedSections(jinro, []);
      S.subjects.push(jinro);
    } else {
      jinro.major = '진로';
      if (!jinro.credits) jinro.credits = 1;
      if (!jinro.sections || !jinro.sections.length) jinro.sections = fixedSections(jinro, []);
    }
  });
  S.subjects.forEach(s=>{
    const k = norm(s.name);
    if (k==='창의공학설계' || k==='언어생활과한자' || s.major==='미정'){
      if (k==='창의공학설계' || k==='언어생활과한자') s.major = '전공없음';
    }
    if (s.major==='온라인') s.major = '전공없음'; // 6.5: 공동배분(온라인)은 전공없음으로 통합
    if (s.grade===3 && (k.includes('진로') || norm(s.group).includes('교양') || s.major==='진로')){
      s.major = '교양';
    }
  });
}

/* ----- 편제표 적용 ----- */
function applyPyeonje(entries, grades){
  grades.forEach(g=>{ S.subjects = S.subjects.filter(s=>!(s.grade===g && s.src!=='manual' && s.src!=='배정only')); });
  const byKey = {};
  entries.filter(e=>grades.includes(e.grade)).forEach(e=>{
    const key = e.grade+'|'+norm(e.name);
    (byKey[key]=byKey[key]||[]).push(e);
  });
  Object.values(byKey).forEach(list=>{
    const isCross = list.some(e=>e.kind==='교차');
    list.forEach(e=>{
      const sub = {
        id:uid('s'), grade:e.grade, sem:e.sem, name:e.name, group:e.group||'',
        major:guessMajor(e.name,e.group,e.grade), credits:e.credits,
        kind: isCross?'교차':(e.kind==='선택'?'선택':'지정'),
        crossFirst: isCross ? e.kind!=='교차' : undefined,
        block:e.block||'', note:[e.note,e.open].filter(Boolean).join(' · '),
        online: /온라인/.test(e.open||''), include:true, src:'편제표', sections:[]
      };
      if (sub.kind!=='선택') sub.sections = fixedSections(sub,[]);
      S.subjects.push(sub);
    });
  });
  ensureSpecialSubjects();
}

/* ----- 리로스쿨 배정내역 적용 ----- */
function applyAssign(sum, grade, fileName){
  const c = S.classes[grade]||{g:8,s:2};
  const seen = new Set();
  sum.subjects.forEach(a=>{
    let sub = S.subjects.find(s=>s.grade===grade && s.sem===a.sem && norm(s.name)===norm(a.name));
    if (!sub){
      sub = {id:uid('s'), grade, sem:a.sem, name:a.name, group:'', major:guessMajor(a.name,'',grade), credits:3,
        kind:'선택', block:a.block||'', note:'편제표에 없는 과목 — 학점 확인', online:false, include:true, src:'배정only', sections:[], warn:true};
      S.subjects.push(sub);
    }
    seen.add(sub.id);
    const keep = {}; sub.sections.forEach(s=>keep[s.label]=s);
    const secs = [];
    const unit = a.sections.filter(x=>/^\d+$/.test(x.code));
    const timed = a.sections.filter(x=>!/^\d+$/.test(x.code));
    timed.forEach(x=>{
      const info = calcTrackFromByClass(x.byClass);
      const old = keep[x.code];
      secs.push({
        label:x.code,
        track: (old && old.trackManual) ? old.track : info.track,
        trackManual: !!(old && old.trackManual),
        n:x.n,
        gN:info.gN,
        sN:info.sN,
        byClass:x.byClass||{},
        teacher:old?old.teacher:''
      });
    });
    if (unit.length){
      const tot = unit.reduce((t,x)=>t+x.n,0);
      const combinedByClass = {};
      unit.forEach(x=>{
        Object.entries(x.byClass||{}).forEach(([k,v])=>{ combinedByClass[k]=(combinedByClass[k]||0)+v; });
      });
      if (c.s>0){
        classLabels(grade,'s').forEach((l, idx)=>{
          const clsNum = String(c.g + idx + 1);
          const clsCnt = combinedByClass[clsNum] != null ? combinedByClass[clsNum] : Math.round(tot/c.s);
          const old = keep[l];
          secs.push({
            label:l,
            track:'s',
            n:clsCnt,
            gN:0,
            sN:clsCnt,
            byClass:{[clsNum]:clsCnt},
            unit:true,
            unitCode:unit.map(u=>u.code).join(','),
            teacher:old?old.teacher:''
          });
        });
      } else {
        unit.forEach(x=>secs.push({label:x.code, track:'g', n:x.n, gN:x.n, sN:0, byClass:x.byClass||{}, teacher:(keep[x.code]||{}).teacher||''}));
      }
    }
    secs.sort((p,q)=>natCmp(p.label,q.label));
    sub.sections = secs;
    if (sub.kind !== '지정' || !norm(sub.name).includes('스포츠과학')) {
      sub.kind = '선택';
    }
    sub.fromAssign = true;
    sub.students = a.sections.reduce((t,x)=>t+x.n,0);
    if (!sub.block) sub.block = a.block||'';
  });
  S.subjects.filter(s=>s.grade===grade && s.kind==='선택' && !seen.has(s.id)).forEach(s=>{ s.sections=[]; s.fromAssign=true; s.students=0; });
  S.assignMeta[grade] = {file:fileName||'', at:new Date().toISOString(), students:sum.students, subjects:sum.subjects.length};
  ensureSpecialSubjects();
}

function rebuildFixed(grade){
  S.subjects.filter(s=>s.grade===grade && (s.kind==='지정'||s.kind==='교차') && !s.customSections).forEach(s=>{ s.sections = fixedSections(s, s.sections); });
}

function seedState(){
  S = blankState();
  if(!Array.isArray(SEED.pyeonje)||!Array.isArray(SEED.assign)) throw Error('초기 설정 파일 형식 오류');
  if(SEED.pyeonje.length){
    applyPyeonje(SEED.pyeonje,[1,2,3]);
    [1,2,3].forEach(g=>{S.pyeonjeMeta[g]=`${S.year-g+1} 입학생 편제표 (초기 자료)`;});
  } else {
    // Netlify 정적 배포본에는 학교 편제표나 학생 분반 데이터를 포함하지 않습니다.
    [1,2,3].forEach(g=>{S.pyeonjeMeta[g]='편제표 미등록 · 업로드 필요';});
  }
  SEED.assign.forEach(a=>applyAssign(a,a.grade,'초기 분반 자료'));
}

/* ========== 시수 및 분반 계산 (혼합 분반 셀병합 판별 포함) ========== */
const active = s => s.include && s.sections.length>0;
const hoursOf = s => active(s) ? num(s.credits)*s.sections.length : 0;
const cnt = (s,t) => s.sections.filter(x=>x.track===t).length;

function renderGSCountCells(s){
  if (!s || !s.sections.length) return '<td class="n"></td><td class="n"></td>';
  const gCnt = cnt(s,'g');
  const sCnt = cnt(s,'s');
  const mCnt = cnt(s,'m');
  if (mCnt > 0){
    const tot = s.sections.length;
    const parts = [];
    if (mCnt) parts.push(`혼${mCnt}`);
    if (gCnt) parts.push(`일${gCnt}`);
    if (sCnt) parts.push(`과${sCnt}`);
    return `<td colspan="2" class="merged-mix" title="일반(1~8반)+과중(9~10반) 혼합 분반 포함 과목 (셀병합)">${tot}<span class="mix-sub">(${parts.join('·')})</span></td>`;
  }
  return `<td class="n">${gCnt||''}</td><td class="n">${sCnt||''}</td>`;
}

function majorHours(major, sem){
  return S.subjects.filter(s=>s.major===major && s.sem===sem).reduce((t,s)=>t+hoursOf(s),0);
}
/* 학교 평균: 배정 전에도 변하지 않는 학교 전체 필요 업무 시수를 기준으로 계산.
   교과는 온라인·통합 교과 포함. 창체·부장·자치·적응 등은 항목별 '필요'만
   한 번 합산한다. 전공별 배정 수치는 별도로 집계하므로 중복 합산하지 않는다.
   온라인·통합(전담 정원 없는) 교과는 실제 전공별로 배분한 뒤 전공별 필요정원에 반영. */
function cgOnlineNeed(sem){return majorHours('온라인',sem);}
function cgExtraItems(){const on1=cgOnlineNeed(1),on2=cgOnlineNeed(2);return [...(on1||on2?[{id:ONLINE_ITEM_ID,name:'공동배분',need1:on1,need2:on2,computed:true}]:[]),...S.chang.items.filter(it=>norm(it.name)!=='진로'&&norm(it.name)!=='온라인')];}
function cgItemAllocated(item,major,sem){
  return item.id===ONLINE_ITEM_ID?cgSharedAllocated('온라인',major,sem):num((((S.chang.alloc||{})[sem]||{})[major]||{})[item.id]);
}
function cgTeacherItem(t,item,sem){return num((((t.chang||{})[sem])||{})[item.id]);}
function cgChangNeed(sem){return cgExtraItems().reduce((t,it)=>t+num(it['need'+sem]),0);}
function cgChangAssigned(sem){
  return usedMajors().filter(m=>!isShared(m)).reduce((t,m)=>t+changOf(m,sem),0);
}
function cgSharedSources(sem){
  return SHARED.filter(m=>m!=='온라인' && majorHours(m,sem)>0);
}
function cgSharedAllocated(source,major,sem){
  return num(((((S.sharedAlloc||{})[sem]||{})[source]||{})[major]));
}
function cgSharedTarget(major,sem){
  return cgSharedSources(sem).reduce((t,source)=>t+cgSharedAllocated(source,major,sem),0);
}
function cgSharedAssigned(source,sem){
  return usedMajors().filter(m=>!isShared(m)).reduce((t,m)=>t+cgSharedAllocated(source,m,sem),0);
}
function cgShareSummary(sem){
  const target=cgSharedSources(sem).reduce((t,source)=>t+majorHours(source,sem),0);
  const assigned=cgSharedSources(sem).reduce((t,source)=>t+cgSharedAssigned(source,sem),0);
  return {target,assigned,gap:target-assigned};
}
function cgEffectiveHours(major,sem){
  if(isShared(major) || major===NOMAJOR) return 0; // 온라인·통합은 담당 전공으로만 정원 계산, 전공없음은 정원 계산 제외
  const st=majorStats(major,sem);
  return st.total + cgSharedTarget(major,sem) - st.tutor;
}
function cgQuotaInfo(){
  const manual=Number(S.schoolQuota);
  const majors=usedMajors().filter(m=>!isShared(m) && (cgEffectiveHours(m,1)>0 || cgEffectiveHours(m,2)>0));
  const entered=majors.filter(m=>cap(m).quota!==undefined && cap(m).quota!==null && cap(m).quota!=='');
  const n=majors.reduce((t,m)=>t+num(cap(m).quota),0);
  if(Number.isFinite(manual)&&manual>0)return {quota:manual,source:'학교 전체 직접 입력',entered:entered.length,total:majors.length};
  if(majors.length && entered.length===majors.length && n>0)return {quota:n,source:'전공별 정원 합계',entered:entered.length,total:majors.length};
  return {quota:null,source:entered.length ? `전공별 정원 ${entered.length}/${majors.length}개 입력`:'교사 정원 미입력',entered:entered.length,total:majors.length};
}
function cgBreakdown(sem){
  const curriculum=displayMajors().filter(m=>m!==NOMAJOR).reduce((t,m)=>t+majorHours(m,sem),0); // 온라인 개설시수는 창체·교과외 열로 이동
  const extra=cgChangNeed(sem);
  const tutor=usedMajors().reduce((t,m)=>t+num(cap(m)['tutor'+sem]),0);
  const total=curriculum+extra-tutor;
  const allocated=usedMajors().filter(m=>!isShared(m)).reduce((t,m)=>t+cgEffectiveHours(m,sem),0);
  return {curriculum,extra,tutor,total,allocated,gap:total-allocated,
    changAllocated:cgChangAssigned(sem),changGap:extra-cgChangAssigned(sem),
    share:cgShareSummary(sem)};
}
function cgDuplicateWarnings(sem){
  const career=S.subjects.filter(x=>x.grade===1 && x.sem===sem && norm(x.name)==='진로').reduce((t,x)=>t+hoursOf(x),0);
  const addon=S.chang.items.filter(x=>norm(x.name)==='진로').reduce((t,x)=>t+num(x['need'+sem]),0);
  return career>0 && addon>0?`기존 교과외 진로 ${addon}시수는 1학년 진로 ${career}시수와 동일 수업으로 판단하여 자동 제외합니다.`:null;
}
function cgSchoolHours(sem){return cgBreakdown(sem).total;}
function cgSchoolAverage(){
  const quota=cgQuotaInfo().quota;
  if(quota==null || quota<=0)return null;
  return ((cgSchoolHours(1)+cgSchoolHours(2))/2)/quota;
}
function cgAnnualAverage(){return cgSchoolAverage();}
function cgNeededHours(hours){
  const avg=cgSchoolAverage();
  return avg!=null&&avg>0?hours/avg:null;
}
function cgNeededMajor(major,sem){
  if(isShared(major)||major===NOMAJOR)return null;
  const h=sem===1||sem===2?cgEffectiveHours(major,sem):(cgEffectiveHours(major,1)+cgEffectiveHours(major,2))/2;
  return cgNeededHours(h);
}
function cgNeededSchool(sem){
  const h=sem===1||sem===2?cgSchoolHours(sem):(cgSchoolHours(1)+cgSchoolHours(2))/2;
  return cgNeededHours(h);
}
function cgNeededGroup(majors,sem){
  // 전교 계는 미배정 창체·온라인 시수를 포함해야 실제 전체 정원과 일치한다.
  if(majors.length===displayMajors().length && majors.every(m=>displayMajors().includes(m))) return cgNeededSchool(sem);
  return cgNeededHours(majors.filter(m=>!isShared(m)).reduce((t,m)=>t+(sem===1||sem===2?cgEffectiveHours(m,sem):(cgEffectiveHours(m,1)+cgEffectiveHours(m,2))/2),0));
}
const cgFmtNeed = n => n==null?'—':(Math.round(n*10)/10).toFixed(1);
function majorGradeHours(major, sem, grade){
  return S.subjects.filter(s=>s.major===major && s.sem===sem && s.grade===grade).reduce((t,s)=>t+hoursOf(s),0);
}
function changOf(major, sem){
  if (isShared(major) || major===NOMAJOR) return 0;
  const a = (S.chang.alloc[sem]||{})[major]||{};
  return cgExtraItems().reduce((t,it)=>t+cgItemAllocated(it,major,sem),0);
}
const cap = m => S.capacity[m]||{};
function majorStats(major, sem){
  const subj = majorHours(major,sem), ch = changOf(major,sem), tutor = num(cap(major)['tutor'+sem]);
  const quota = (isShared(major)||major===NOMAJOR) ? 0 : num(cap(major).quota);
  return {subj, ch, tutor, total:subj+ch, quota, avg: quota? (subj+ch-tutor)/quota : null, avgSubj: quota?(subj-tutor)/quota:null};
}
function sumStats(list, sem){
  const r = {subj:0,ch:0,tutor:0,total:0,quota:0};
  list.forEach(m=>{ const x=majorStats(m,sem); r.subj+=x.subj; r.ch+=x.ch; r.tutor+=x.tutor; r.total+=x.total; r.quota+=x.quota; });
  r.avg = r.quota?(r.total-r.tutor)/r.quota:null; r.avgSubj = r.quota?(r.subj-r.tutor)/r.quota:null;
  return r;
}
function usedMajors(){
  const used = new Set(S.subjects.map(s=>s.major));
  return MAJOR_IDS.filter(m=>(m!=='미정'&&m!==NOMAJOR&&m!=='온라인') || used.has(m));
}
function teacherSubjHours(tid, sem){
  let h=0; S.subjects.forEach(s=>{ if(s.sem!==sem||!active(s)||s.major==='온라인')return; s.sections.forEach(x=>{ if(x.teacher===tid) h+=num(s.credits); }); });
  return h; // 온라인 수업은 교사별 '창체 및 교과외 > 온라인'에서만 합산해 이중 계산 방지
}
function teacherChang(t, sem){ return cgExtraItems().reduce((n,it)=>n+cgTeacherItem(t,it,sem),0); }
function teacherLoad(t,sem){const subj=teacherSubjHours(t.id,sem),extra=teacherChang(t,sem);return {subj,extra,total:subj+extra};} 
function teacherName(id){ const t=S.teachers.find(t=>t.id===id); return t?t.name:''; }

/* ========== 저장 및 실행취소(Undo / Redo) ========== */
let dbRef=null, dlCap=null, saveTimer=null, saving=false, pendingSave=false;
const LS_KEY='sisu-baedang-2027-v3'; // 이전 5.2 버전의 데이터 마이그레이션용: 읽기 전용
const CG_INDEX_KEY='cleargrid-year-index-v1';
const CG_COHORT_KEY='cleargrid-cohorts-v1';
const CG_DATA_PREFIX='cleargrid-year-data-v1-';
const CG_SNAP_PREFIX='cleargrid-checkpoints-v1-';
let CG_INDEX=null, CG_COHORTS=null;

let lastSnapshotStr = '';

function updateUndoUI(){
  const btnU = document.getElementById('btnUndo');
  const btnR = document.getElementById('btnRedo');
  const cntEl = document.getElementById('undoCnt');
  if (btnU) btnU.disabled = UNDO_STACK.length === 0;
  if (btnR) btnR.disabled = REDO_STACK.length === 0;
  if (cntEl) cntEl.textContent = UNDO_STACK.length ? `(${UNDO_STACK.length})` : '';
}

function recordHistory(){
  const curStr = JSON.stringify(S);
  if (lastSnapshotStr && curStr !== lastSnapshotStr){
    UNDO_STACK.push(lastSnapshotStr);
    if (UNDO_STACK.length > MAX_HISTORY) UNDO_STACK.shift();
    REDO_STACK.length = 0;
  }
  lastSnapshotStr = curStr;
  updateUndoUI();
}

function doUndo(){
  if(S.workspaceStatus==='confirmed'){toast('확정된 학년도예요. 7단계에서 잠금을 풀어야 고칠 수 있어요.');return;}
  if (!UNDO_STACK.length){ toast('실행취소할 이전 내역이 없어요'); return; }
  REDO_STACK.push(JSON.stringify(S));
  const prev = UNDO_STACK.pop();
  lastSnapshotStr = prev;
  S = JSON.parse(prev);
  persist(false);
  updateUndoUI();
  render();
  toast('실행취소 완료 (Ctrl+Z)');
}

function doRedo(){
  if(S.workspaceStatus==='confirmed'){toast('확정된 학년도예요. 7단계에서 잠금을 풀어야 고칠 수 있어요.');return;}
  if (!REDO_STACK.length){ toast('다시 실행할 내역이 없어요'); return; }
  UNDO_STACK.push(JSON.stringify(S));
  const next = REDO_STACK.pop();
  lastSnapshotStr = next;
  S = JSON.parse(next);
  persist(false);
  updateUndoUI();
  render();
  toast('다시실행 완료 (Ctrl+Y)');
}

function setSaveState(t){ if(window.CGCloud&&window.CGCloud.active()){ window.CGCloud.paint(); return; } document.getElementById('saveState').textContent=t; }
function persist(pushHist=true){
  if (pushHist) recordHistory();
  S.savedAt = Date.now();
  if(!cgWriteWorkspace()){ setSaveState('⚠ 저장 실패'); return; }
  if(window.CGCloud)window.CGCloud.markDirty();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(cloudSave, 900);
  setSaveState('✓ 저장됨');
}
async function cloudSave(){
  if (!dbRef){ setSaveState('✓ 저장됨'); return; }
  if (saving){ pendingSave=true; return; }
  saving=true;
  try{
    const body = JSON.stringify(S);
    await dbRef.set({json:body, savedAt:S.savedAt});
    setSaveState('저장됨 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){ setSaveState('자동 저장됨'); }
  saving=false;
  if (pendingSave){ pendingSave=false; cloudSave(); }
}
let cgRenderTicket=null;
function commit(rerender=true){ persist(true); if(rerender){ if(cgRenderTicket!=null) cancelAnimationFrame(cgRenderTicket); cgRenderTicket=requestAnimationFrame(()=>{cgRenderTicket=null;render();}); } }

function migrate(st){
  const b = blankState();
  for (const k in b) if (st[k]===undefined) st[k]=b[k];
  st.chang.alloc = st.chang.alloc||{1:{},2:{}};
  st.sharedAlloc = st.sharedAlloc||{1:{},2:{}};
  [1,2].forEach(sem=>{st.sharedAlloc[sem]=st.sharedAlloc[sem]||{};});
  S = st;
  // 진로는 전공 교사 1명이 전담합니다. 기존 데이터의 중복 창체 진로는
  // 교과(1학년 1~10반 × 1시수)에 이미 포함되어 있으므로 제거합니다.
  S.capacity = S.capacity||{};
  S.capacity['진로']={...(S.capacity['진로']||{}),quota:1};
  const duplicateCareerItems=(S.chang.items||[]).filter(it=>norm(it.name)==='진로');
  if(duplicateCareerItems.length){
    const oldIds=new Set(duplicateCareerItems.map(it=>it.id));
    S.chang.items=S.chang.items.filter(it=>!oldIds.has(it.id));
    [1,2].forEach(sem=>{
      Object.values((S.chang.alloc||{})[sem]||{}).forEach(a=>oldIds.forEach(id=>delete a[id]));
    });
    (S.teachers||[]).forEach(t=>[1,2].forEach(sem=>{
      const a=((t.chang||{})[sem]||{});oldIds.forEach(id=>delete a[id]);
    }));
  }
  // 과거 직접 추가한 '온라인' 교과외 항목도 새 자동 온라인 열로 통합한다.
  const legacyOnlineItems=(S.chang.items||[]).filter(it=>norm(it.name)==='온라인');
  if(legacyOnlineItems.length){
    [1,2].forEach(sem=>{
      const src=S.sharedAlloc[sem]=S.sharedAlloc[sem]||{};
      const target=src['온라인']=src['온라인']||{};
      Object.entries((S.chang.alloc||{})[sem]||{}).forEach(([m,alloc])=>{
        const n=legacyOnlineItems.reduce((a,it)=>a+num(alloc[it.id]),0);
        if(n && target[m]==null)target[m]=n;
        legacyOnlineItems.forEach(it=>delete alloc[it.id]);
      });
      (S.teachers||[]).forEach(t=>{
        const ta=((t.chang||{})[sem]||{});
        const n=legacyOnlineItems.reduce((a,it)=>a+num(ta[it.id]),0);
        if(n && ta[ONLINE_ITEM_ID]==null)ta[ONLINE_ITEM_ID]=n;
        legacyOnlineItems.forEach(it=>delete ta[it.id]);
      });
    });
    const ids=new Set(legacyOnlineItems.map(it=>it.id));
    S.chang.items=S.chang.items.filter(it=>!ids.has(it.id));
  }
  // 이전 파일(JSON/자동 저장)의 전공 '공동'을 '온라인'으로 변환합니다.
  (S.subjects||[]).forEach(s=>{ if(s.major==='공동'||s.major==='온라인')s.major='전공없음'; }); // 6.5: 공동배분·온라인 → 전공없음
  (S.teachers||[]).forEach(t=>{ if(t.major==='공동')t.major='온라인'; });
  if(S.capacity['공동']){ S.capacity['온라인']={...S.capacity['공동'],...(S.capacity['온라인']||{})};delete S.capacity['공동']; }
  [1,2].forEach(sem=>{const m=(S.chang.alloc||{})[sem]||{};if(m['공동']){m['온라인']={...m['공동'],...(m['온라인']||{})};delete m['공동'];}});
  ensureSpecialSubjects();
  S.subjects.forEach(s=>{
    (s.sections||[]).forEach(sec=>{
      if (sec.byClass && Object.keys(sec.byClass).length && !sec.trackManual){
        const info = calcTrackFromByClass(sec.byClass);
        sec.track = info.track;
        sec.gN = info.gN;
        sec.sN = info.sN;
      }
    });
  });
  return S;
}

async function saveFile(name, data){
  if (dlCap){
    try{ await dlCap.save({filename:name, data}); toast('저장 완료: '+name); }
    catch(e){ toast('저장 취소/오류'); }
    return;
  }
  const blob = data instanceof Blob ? data : new Blob([data]);
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},500);
}
function toast(t){ const el=document.getElementById('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'),2600); }

/* ========== 엑셀 파일 파서 ========== */
function readWorkbook(file){
  return new Promise((res,rej)=>{
    if (typeof XLSX==='undefined'){ rej(new Error('엑셀 읽기 도구를 불러오지 못했어요')); return; }
    const fr = new FileReader();
    fr.onload = ()=>{ try{ res(XLSX.read(new Uint8Array(fr.result),{type:'array'})); }catch(e){ rej(e); } };
    fr.onerror = ()=>rej(fr.error);
    fr.readAsArrayBuffer(file);
  });
}
const cellV = (ws,r,c) => { const x = ws[XLSX.utils.encode_cell({r,c})]; return x? x.v : null; };

function parseAssignWB(wb){
  const ws = wb.Sheets['배정내역'] || wb.Sheets[wb.SheetNames[0]];
  const ref = XLSX.utils.decode_range(ws['!ref']);
  const hdr1 = {}; let cur=null; let hbCol=null;
  for(let c=0;c<=ref.e.c;c++){
    const v=cellV(ws,0,c);
    if(v!=null&&v!==''){cur=String(v);}
    hdr1[c]=cur;
    if(String(v)==='반배정') hbCol=c;
  }
  let hakCol = 1;
  for(let c=0;c<=ref.e.c;c++){ if(String(cellV(ws,0,c))==='학번') hakCol=c; }
  const rows=[];
  for(let r=2;r<=ref.e.r;r++){ const v=cellV(ws,r,hakCol); if(typeof v!=='number') break; rows.push(r); }
  if (!rows.length) throw new Error('학생 행을 찾지 못했어요(2행 아래 학번 열 확인)');
  const curGrade = parseInt(String(Math.trunc(cellV(ws,rows[0],hakCol)))[0]);

  const rowClass = {};
  rows.forEach(r=>{
    let cls = hbCol!=null ? cellV(ws,r,hbCol) : null;
    if (cls!=null && String(cls).trim()!==''){
      rowClass[r] = String(parseInt(String(cls).trim(),10));
    } else {
      const hak = String(Math.trunc(cellV(ws,r,hakCol)));
      if (hak.length>=5){
        const cNum = parseInt(hak.slice(1,3), 10);
        if (isFinite(cNum) && cNum>0) rowClass[r] = String(cNum);
      }
    }
  });

  // 학생 식별정보는 이 함수 안에서만 사용하고 상태·백업·검토 결과에는 보관하지 않습니다.
  const seenHak=new Set(), rowProblems=[], timeClashes=[];
  const timeCode = raw => {const m=String(raw||'').trim().toUpperCase().match(/^([A-Z])(?:[0-9]+)?$/);return m?m[1]:null;};
  for(const r of rows){
    const hak=String(cellV(ws,r,hakCol)||'');
    if(seenHak.has(hak))rowProblems.push(`엑셀 ${r+1}행: 학번 중복`);
    seenHak.add(hak);
    const seenTime={1:{},2:{}};
    for(let c=0;c<=ref.e.c;c++){
      const h=hdr1[c]||'';const m=String(h).match(/([12])학기/);
      if(!m || !cellV(ws,1,c))continue;
      const raw=cellV(ws,r,c);if(raw==null||String(raw).trim()==='')continue;
      const code=timeCode(raw);
      // 과중반 숫자 '1' 등은 실제 수업 타임이 아니므로 충돌 검사에서 제외.
      if(!code)continue;
      const sem=+m[1], now=String(cellV(ws,1,c)).replace(/\s+/g,'').trim();
      const prev=seenTime[sem][code];
      if(prev && prev!==now && timeClashes.length<30)timeClashes.push(`${r+1}행 / ${sem}학기 ${code}타임: 서로 다른 선택과목 중복`);
      else if(prev===now && timeClashes.length<30)timeClashes.push(`${r+1}행 / ${sem}학기 ${code}타임: 같은 과목 중복`);
      seenTime[sem][code]=now;
    }
  }
  const subjects=[];
  for(let c=0;c<=ref.e.c;c++){
    const h = hdr1[c]||''; const m = h.match(/([12])학기/); const name = cellV(ws,1,c);
    if (!m || name==null || name==='') continue;
    const secs = {};
    rows.forEach(r=>{
      let v = cellV(ws,r,c); if (v==null||v==='') return;
      const code = String(typeof v==='number'?Math.trunc(v):v).trim();
      const s = secs[code] = secs[code]||{code,n:0,byClass:{}};
      s.n++;
      const k = rowClass[r];
      if (k) s.byClass[k] = (s.byClass[k]||0)+1;
    });
    subjects.push({sem:+m[1], block:h, name:String(name).replace(/\s+/g,' ').trim(), sections:Object.values(secs).sort((a,b)=>natCmp(a.code,b.code))});
  }
  const hasClass = Object.keys(rowClass).length > 0;
  const keyCounts={};subjects.forEach(a=>{const k=a.sem+'|'+norm(a.name);keyCounts[k]=(keyCounts[k]||0)+1;});
  const repeatSubjects=Object.keys(keyCounts).filter(k=>keyCounts[k]>1);
  const inconsistentSections=subjects.filter(a=>a.sections.some(sec=>sec.n!==Object.values(sec.byClass).reduce((n,c)=>n+c,0)&&hasClass)).map(a=>`${a.sem}학기 ${a.name}`);
  return {curGrade, grade:curGrade+1, students:rows.length, hasClass, subjects,
    validation:{duplicateStudents:rowProblems.slice(0,15),timeClashes,duplicateSubjects:repeatSubjects,inconsistentSections}};
}


/* ===== 6.2 리로스쿨 반편성 변경 미리보기 (승인 전 적용 금지) ===== */
let cgPendingAssign=null; // 브라우저 메모리에서만 보관하며 학생별 원본 파일은 저장하지 않음.
function cgDiscardReview(silent=false){cgPendingAssign=null;if(!silent){render();toast('검토 중이던 변경안을 취소했습니다. 기존 배정은 그대로입니다.');}}
function cgReviewBaseSignature(grade){return JSON.stringify({year:S.year,classes:S.classes[grade],meta:S.assignMeta?.[grade],subjects:S.subjects.filter(s=>s.grade===grade)});}
function cgReviewKey(s){return s.sem+'|'+norm(s.name);}
function cgSectionNumber(s){return (s.sections||[]).length;}
function cgSectionHeadcount(s){return (s.sections||[]).reduce((n,a)=>n+num(a.n),0);}
function cgSectionHours(s){return s.include===false?0:cgSectionNumber(s)*num(s.credits);}
function cgBalance(s){const ns=(s?.sections||[]).map(x=>num(x.n));return ns.length>=2?Math.max(...ns)-Math.min(...ns):0;}
function cgCompareStates(prev,next,grade){
  const getMap=state=>{const map=new Map();(state.subjects||[]).filter(s=>s.grade===grade && (s.fromAssign||s.kind==='선택'||s.src==='배정only')).forEach(s=>map.set(cgReviewKey(s),s));return map;};
  const left=getMap(prev),right=getMap(next),keys=new Set([...left.keys(),...right.keys()]),rows=[],summary={changed:0,new:0,removed:0,balanceWarnings:0,bySem:{1:{oldHours:0,newHours:0,oldClasses:0,newClasses:0},2:{oldHours:0,newHours:0,oldClasses:0,newClasses:0}}};
  [...keys].forEach(key=>{
    const a=left.get(key),b=right.get(key);if(!a&&!b)return;
    const oldN=a?cgSectionHeadcount(a):0,newN=b?cgSectionHeadcount(b):0;
    const oldCount=a?cgSectionNumber(a):0,newCount=b?cgSectionNumber(b):0;
    const oldHours=a?cgSectionHours(a):0,newHours=b?cgSectionHours(b):0;
    const oldSign=a?(a.sections||[]).map(x=>x.label+':'+num(x.n)).sort().join('|'):'';
    const newSign=b?(b.sections||[]).map(x=>x.label+':'+num(x.n)).sort().join('|'):'';
    const changed=oldSign!==newSign||oldHours!==newHours;
    const status=!a?'new':!b||(!newCount&&oldCount)?'removed':changed?'changed':'same';
    if(status==='changed')summary.changed++;if(status==='new')summary.new++;if(status==='removed')summary.removed++;
    const bal=b?cgBalance(b):0;if(bal>3&&newCount>1)summary.balanceWarnings++;
    const sem=(b||a).sem,m=summary.bySem[sem];if(m){m.oldHours+=oldHours;m.newHours+=newHours;m.oldClasses+=oldCount;m.newClasses+=newCount;}
    rows.push({key,sem,name:(b||a).name,status,changed,oldCount,newCount,oldN,newN,oldHours,newHours,balance:bal,
      oldLabels:a?(a.sections||[]).map(x=>x.label+':'+num(x.n)).join(', '):'',
      newLabels:b?(b.sections||[]).map(x=>x.label+':'+num(x.n)).join(', '):'',
      unknownCredits:!!(b?.warn)});
  });
  rows.sort((x,y)=>x.sem-y.sem||Number(y.changed)-Number(x.changed)||natCmp(x.name,y.name));
  return {rows,summary};
}
function cgStageAssign(sum,grade,file){
  if(![2,3].includes(grade))throw Error('현재 변경 비교 기능은 2·3학년 선택과목 반편성 파일을 지원합니다');
  if(sum.grade!==grade)throw Error(`학번으로 판별한 학년(${sum.grade})과 적용할 학년(${grade})이 다릅니다.`);
  const fm=file.name.match(/(20\d{2})학년도/);const fileYear=fm?Number(fm[1]):null;
  const fatal=[],warnings=[];
  if(fileYear!=null&&fileYear!==S.year)fatal.push(`파일명의 학년도 ${fileYear}와 현재 작업 학년도 ${S.year}가 다릅니다.`);
  if(!sum.subjects.length)fatal.push('과목별 배정 데이터가 없습니다.');
  const v=sum.validation||{};
  if(v.duplicateStudents?.length)fatal.push(`학번 중복 ${v.duplicateStudents.length}건: ${v.duplicateStudents.slice(0,3).join(' · ')}`);
  if(v.duplicateSubjects?.length)fatal.push(`동일 학기 과목명 중복: ${v.duplicateSubjects.slice(0,4).join(', ')}`);
  if(v.timeClashes?.length)fatal.push(`학생별 시간 중복 ${v.timeClashes.length}${v.timeClashes.length>=30?'건 이상':'건'}: ${v.timeClashes.slice(0,4).join(' · ')}`);
  if(v.inconsistentSections?.length)warnings.push('일부 분반 인원과 학급별 인원이 일치하지 않습니다: '+v.inconsistentSections.slice(0,4).join(', '));
  if(!sum.hasClass)warnings.push('학급 정보가 없어 일반·과중 분반 인원을 정확히 나눌 수 없습니다.');
  if(!S.assignMeta?.[grade])warnings.push('이 학년은 처음 올리는 배정내역이에요.');
  else if(num(S.assignMeta[grade].students)!==sum.students)warnings.push(`학생 수가 기존 ${S.assignMeta[grade].students}명에서 ${sum.students}명으로 달라졌습니다. 전체 자료인지 확인하세요.`);
  const original=S;let simulated;
  try{S=cgClone(original);applyAssign(sum,grade,file.name);simulated=S;}
  finally{S=original;}
  const cmp=cgCompareStates(original,simulated,grade);
  if(cmp.rows.some(r=>r.unknownCredits))warnings.push('편제표에 없는 과목이 있습니다. 해당 과목은 임시 3학점이 적용되므로 시수 확정 전에 학점을 확인하세요.');
  if(cmp.summary.balanceWarnings)warnings.push(`분반 인원 차이가 3명을 넘는 과목이 ${cmp.summary.balanceWarnings}개 있어요. 반영은 할 수 있어요.`);
  const oldTeachers=new Set();
  (original.subjects||[]).filter(s=>s.grade===grade).forEach(s=>{
    const upd=simulated.subjects.find(x=>x.grade===grade&&x.sem===s.sem&&norm(x.name)===norm(s.name));
    (s.sections||[]).filter(x=>x.teacher).forEach(sec=>{
      if(!upd||!(upd.sections||[]).some(x=>x.label===sec.label&&x.teacher===sec.teacher))oldTeachers.add(s.sem+'학기 '+s.name);
    });
  });
  if(oldTeachers.size)warnings.push(`기존 담당교사 배정이 변경·제거된 과목 ${oldTeachers.size}개가 있습니다. 승인 후 교과별 분반 배정에서 담당교사를 확인하세요.`);
  cgPendingAssign={year:S.year,grade,fileName:file.name,sum,comparison:cmp,fatal,warnings,baseSignature:cgReviewBaseSignature(grade),at:new Date().toISOString()};
  UI.reviewGrade=grade;UI.reviewFilter='changed';UI.tab='review';render();
  return cgPendingAssign;
}
function cgApproveAssign(){
  const p=cgPendingAssign;
  if(!p){toast('먼저 변경할 리로스쿨 엑셀을 선택해 주세요');return;}
  if(S.year!==p.year||S.workspaceStatus==='confirmed'){toast('그사이 학년도나 확정 상태가 바뀌었어요. 파일을 다시 올려 주세요');cgDiscardReview();return;}
  if(p.fatal.length){toast('오류를 해결해야 변경안을 승인할 수 있습니다');return;}
  if(cgReviewBaseSignature(p.grade)!==p.baseSignature){toast('검토 이후 해당 학년의 배정 또는 학급 설정이 변경되었습니다. 파일을 다시 비교하세요.');return;}
  const before=cgClone(S),grade=p.grade,cmp=p.comparison;
  // 적용 직전 시점을 보관한다. 실패하면 상태를 되돌린다.
  if(!cgCheckpoint(`리로스쿨 ${grade}학년 업로드 전 · ${p.fileName}`,'working')){toast('바꾸기 전 상태를 저장하지 못해서 반영을 멈췄어요.');return;}
  try{
    applyAssign(p.sum,grade,p.fileName);
    S.assignHistory=Array.isArray(S.assignHistory)?S.assignHistory:[];
    S.assignHistory.unshift({year:S.year,grade,at:new Date().toISOString(),file:p.fileName,students:p.sum.students,
      changed:cmp.summary.changed,new:cmp.summary.new,removed:cmp.summary.removed,
      beforeHours:cmp.summary.bySem,reviewed:true});
    S.assignHistory=S.assignHistory.slice(0,15);
    if(!cgWriteWorkspace())throw Error('저장 공간이 부족해요.');
    lastSnapshotStr=JSON.stringify(S);UNDO_STACK.length=0;REDO_STACK.length=0;
    cgPendingAssign=null;
    UI.matrixGrade=grade;UI.tab='review';render();
    toast(`${grade}학년 배정내역을 반영하고 시수를 다시 계산했어요`);
  }catch(e){S=migrate(before);cgWriteWorkspace();toast('적용 취소: '+e.message);render();}
}
function vReview(){
  const p=cgPendingAssign;
  const gh=[2,3].map(g=>{const m=S.assignMeta?.[g];return `<div class="cg-review-stat"><span>${g}학년 · ${S.year-g+1} 입학생</span><strong>${m?m.students+'명':'미등록'}</strong><small>${m?esc(m.file||'배정내역 있음'):'리로스쿨 파일을 등록해 주세요'}</small></div>`;}).join('');
  if(!p){const history=(S.assignHistory||[]).filter(x=>x.year===S.year).map(x=>`<tr><td>${x.grade}학년</td><td>${esc(x.file)}</td><td>${new Date(x.at).toLocaleString('ko-KR')}</td><td>${x.changed}과목 변경 · ${x.new}과목 추가</td></tr>`).join('');
    return `<div class="cg-review"><div class="cg-review-hero"><div><h2>리로스쿨 배정내역 올리기</h2><p class="cg-review-lead">파일을 올리면 지금 들어 있는 분반과 비교해서 보여 줘요. [이대로 반영하기]를 누르기 전에는 아무것도 바뀌지 않아요.</p></div><span class="cg-review-tag blue">${S.year}학년도</span></div>
      <div class="cg-review-stats">${gh}</div><section class="panel"><div class="cg-review-drop"><div style="font-size:28px">📂</div><h3>리로스쿨 배정내역 엑셀을 고르세요</h3><p>학생 이름·학번은 저장하지 않고, 과목별 분반 수와 인원만 가져와요.</p><button class="btn pri lg" data-act="cgReviewUpload" ${S.workspaceStatus==='confirmed'?'disabled':''}>배정내역 엑셀 고르기</button></div><p class="cg-small-note">학번을 보고 2학년·3학년을 알아서 구분해요. 한 학생이 같은 타임에 두 과목이 잡혀 있으면 알려 줘요.</p></section>
      <section class="panel"><h2>반영한 기록</h2><div class="tablewrap"><table class="cg-board-table"><thead><tr><th>학년</th><th>파일</th><th>반영한 때</th><th>바뀐 내용</th></tr></thead><tbody>${history||'<tr><td colspan="4" class="muted">아직 반영한 배정내역이 없어요.</td></tr>'}</tbody></table></div></section></div>`;}
  const c=p.comparison,st=c.summary,br=st.bySem;
  const errs=p.fatal.length?`<div class="cg-review-status bad"><strong>적용 차단 · ${p.fatal.length}개 오류</strong><ul>${p.fatal.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:`<div class="cg-review-status ok"><strong>문제 없음</strong> · 같은 타임에 겹친 학생이나 파일 오류가 없어요. 바뀌는 내용을 보고 반영해 주세요.</div>`;
  const warns=p.warnings.length?`<div class="cg-review-status warn"><strong>확인 사항 ${p.warnings.length}건</strong><ul>${p.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:'';
  const rows=c.rows.filter(r=>UI.reviewFilter==='all'||(UI.reviewFilter==='changed'&&r.changed)||(UI.reviewFilter==='balance'&&r.balance>3)||(UI.reviewFilter==='hours'&&r.oldHours!==r.newHours));
  const table=rows.map(r=>`<tr class="${r.changed?'change':''}"><td><span class="cg-review-tag ${r.status==='new'?'blue':r.status==='removed'?'red':r.changed?'orange':''}">${r.status==='new'?'신규':r.status==='removed'?'폐강':r.changed?'변경':'동일'}</span> ${r.sem}학기</td><td><strong>${esc(r.name)}</strong><span class="subline" title="${esc(r.newLabels)}">${esc(r.newLabels||'개설 분반 없음')}</span></td>
    <td>${r.oldCount}</td><td>${r.newCount}</td><td class="${r.newCount!==r.oldCount?'delta':''}">${r.newCount-r.oldCount>0?'+':''}${r.newCount-r.oldCount}</td>
    <td>${r.oldN}</td><td>${r.newN}</td><td>${r.oldHours}</td><td>${r.newHours}</td><td class="${r.oldHours!==r.newHours?'delta':''}">${r.newHours-r.oldHours>0?'+':''}${r.newHours-r.oldHours}</td>
    <td class="${r.balance>3?'bad':''}">${r.newCount<2?'—':r.balance+'명'}</td></tr>`).join('');
  const bigNum=st.changed+st.new+st.removed;
  return `<div class="cg-review"><div class="cg-review-hero"><div><h2>${p.grade}학년 배정내역 확인</h2><p class="cg-review-lead">${esc(p.fileName)} · ${S.year}학년도 / ${p.sum.students}명 · 총 ${p.sum.subjects.length}개 과목</p></div><span class="cg-review-tag ${p.fatal.length?'red':'blue'}">${p.fatal.length?'오류 확인 필요':'확인 중'}</span></div>
    <div class="cg-review-stats"><div class="cg-review-stat emph"><span>바뀌는 과목</span><strong>${bigNum}</strong><small>새로 생기거나 없어지는 과목 포함</small></div>
    <div class="cg-review-stat"><span>1학기 분반 수</span><strong>${br[1].oldClasses} → ${br[1].newClasses}</strong><small>총시수 ${br[1].oldHours} → ${br[1].newHours}</small></div>
    <div class="cg-review-stat"><span>2학기 분반 수</span><strong>${br[2].oldClasses} → ${br[2].newClasses}</strong><small>총시수 ${br[2].oldHours} → ${br[2].newHours}</small></div>
    <div class="cg-review-stat"><span>분반 인원 차이 3명 넘는 과목</span><strong>${st.balanceWarnings}</strong><small>분반이 2개 이상인 과목만</small></div></div>
    ${errs}${warns}
    <section class="panel"><div class="cg-review-toolbar"><h2 style="margin:0">과목별로 달라지는 점</h2><span class="seg">${[['changed','바뀌는 과목'],['all','전체'],['hours','시수가 바뀌는 과목'],['balance','인원 차이 큰 과목']].map(([k,label])=>`<button data-act="cgReviewFilter" data-filter="${k}" class="${UI.reviewFilter===k?'on':''}">${label}</button>`).join('')}</span></div>
    <div class="tablewrap"><table class="cg-review-table"><thead><tr><th>학기/상태</th><th>과목 · 신규 분반별 인원</th><th>이전 반</th><th>신규 반</th><th>반 증감</th><th>이전 인원</th><th>신규 인원</th><th>이전 시수</th><th>신규 시수</th><th>시수 증감</th><th>최대 인원 차이</th></tr></thead><tbody>${table||'<tr><td colspan="11" style="text-align:center;color:#64748b;padding:20px">이 조건에 해당하는 변경이 없습니다.</td></tr>'}</tbody></table></div><p class="cg-small-note">학교 지정 과목은 그대로예요. 이 표는 배정내역에 들어 있는 선택과목만 비교해요.</p></section>
    <div class="cg-review-actions"><button class="btn" data-act="cgReviewCancel">취소</button><button class="btn" data-act="cgReviewUpload">다른 파일 고르기</button><button class="btn pri lg" data-act="cgReviewApprove" ${p.fatal.length||S.workspaceStatus==='confirmed'?'disabled':''}>이대로 반영하기</button></div></div>`;
}

function parsePyeonjeWB(wb){
  const sn = wb.SheetNames.find(n=>/입학/.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sn];
  const ref = XLSX.utils.decode_range(ws['!ref']);
  let entry = null;
  const m1 = sn.match(/(20\d\d)/); if (m1) entry=+m1[1];
  for(let r=0;r<6 && !entry;r++) for(let c=0;c<6;c++){ const v=String(cellV(ws,r,c)||''); const m=v.match(/(20\d\d)학년도\s*입학/); if(m){entry=+m[1];break;} }
  let hr=-1, colName=3, colOp=5, colGroup=1, colA=0, colNote=-1, colOpen=-1, semCols=[6,7,8,9,10,11];
  for(let r=0;r<10;r++){ for(let c=0;c<=Math.min(ref.e.c,20);c++){ const v=norm(cellV(ws,r,c)); if(v==='과목'){hr=r;colName=c;} if(v==='운영학점')colOp=c; if(v==='교과(군)')colGroup=c; if(v==='비고')colNote=c; if(v==='과목개설유형')colOpen=c; } if(hr>=0) break; }
  if (hr<0) throw new Error('편제표에서 "과목" 머리글을 찾지 못했어요');
  const g1 = []; for(let c=0;c<=ref.e.c;c++){ const v=norm(cellV(ws,hr,c)); if(/^[123]학년$/.test(v)) g1.push([+v[0],c]); }
  if (g1.length===3) semCols = [g1[0][1],g1[0][1]+1,g1[1][1],g1[1][1]+1,g1[2][1],g1[2][1]+1];
  const block = {};
  (ws['!merges']||[]).forEach(m=>{ const v=cellV(ws,m.s.r,m.s.c); if(v!=null && /택/.test(String(v))) for(let r=m.s.r;r<=m.e.r;r++) block[m.s.c+'|'+r]=String(v); });
  for(let r=0;r<=ref.e.r;r++) semCols.forEach(c=>{ const v=cellV(ws,r,c); if(v!=null && /택/.test(String(v)) && !block[c+'|'+r]) block[c+'|'+r]=String(v); });
  const out=[]; let G=null;
  const groupNorm = s => { s=norm(s); if(s.startsWith('사회'))return '사회'; if(s.startsWith('기술'))return '기술가정정보'; return s; };
  for(let r=hr+2;r<=ref.e.r;r++){
    const a = cellV(ws,r,colA); if (a && /교과\s*이수/.test(String(a))) break;
    const b = cellV(ws,r,colGroup); if (b) G = groupNorm(b);
    const name = String(cellV(ws,r,colName)||'').replace(/\t/g,' ').replace(/\s+/g,' ').trim(); if(!name) continue;
    const op = num(cellV(ws,r,colOp));
    for(let gi=0;gi<3;gi++) for(let si=0;si<2;si++){
      const c = semCols[gi*2+si]; const v = cellV(ws,r,c); let e=null;
      if (v!=null && v!==''){ const sv=String(v).trim(); let mm;
        if ((mm=sv.match(/^\[(\d+)\]$/))) e={kind:'교차',credits:+mm[1]};
        else if (/^\d+$/.test(sv)) e={kind:'지정',credits:+sv}; }
      if (!e && block[c+'|'+r]) e={kind:'선택',credits:op,block:(block[c+'|'+r].match(/택\d+/)||[''])[0]};
      if (e){ e.grade=gi+1; e.sem=si+1; e.name=name; e.group=G; e.note=colNote>=0?String(cellV(ws,r,colNote)||'').trim():''; e.open=colOpen>=0?String(cellV(ws,r,colOpen)||'').trim():''; out.push(e); }
    }
  }
  return {sheet:sn, entry, entries:out};
}

/* ========== UI 렌더링 ========== */
const TABS = [
  ['years','학년도 관리'],
  ['review','반편성 변경 검토'],
  ['subjects','과목·분반 (수강인원 검증)'],
  ['summary','총괄 배당표'],
  ['compare','1·2학기 비교'],
  ['chang','정원·강사·창체'],
  ['teachers','교사 명단'],
  ['assign','교과별 분반 배정'],
  ['setup','기초 설정']
];

function renderTabs(){
  if (typeof renderStepNav==='function') renderStepNav(); // 6.5: 단계별 메뉴
  else document.getElementById('tabs').innerHTML = TABS.map(([k,l])=>`<button data-tab="${k}" class="${UI.tab===k?'on':''}">${l}</button>`).join('');
  document.getElementById('yearLabel').textContent = S.year+'학년도' + (S.workspaceStatus==='confirmed'?' · 확정됨':'');
  updateUndoUI();
}
function render(){
  renderTabs();
  const el = document.getElementById('main');
  const views = {years:vYears, review:vReview, setup:vSetup, subjects:vSubjects, summary:vSummary, compare:vCompare, chang:vChang, teachers:vTeachers, assign:vAssign};
  if (typeof vStepYear==='function') Object.assign(views,{year:vStepYear, pyeonje:vStepPyeonje, check:vStepCheck, finish:vStepFinish, setup:vStepSettings, years:vStepRecords});
  if (!views[UI.tab]) UI.tab = views.year ? 'year' : 'years';
  const f0 = views[UI.tab], f = typeof stepFrame==='function' ? ()=>stepFrame(f0()) : f0;
  const y = window.scrollY;
  el.innerHTML = (S.workspaceStatus==='confirmed'&&!['years','year','finish'].includes(UI.tab)?'<div class="cg-readonly">🔒 확정된 학년도라 볼 수만 있어요. 고치려면 7단계 [내보내기·확정]에서 잠금을 풀어 주세요.</div>':'')+f();
  window.scrollTo(0,y);
}
function semSeg(key){ return `<span class="seg">${[1,2].map(s=>`<button data-semset="${key}" data-v="${s}" class="${UI[key]===s?'on':''}">${s}학기</button>`).join('')}</span>`; }


/* ===== Clear Grid 학년도 관리 · 업무 상태 및 입학연도 코호트 분리 ===== */
const cgClone = x => JSON.parse(JSON.stringify(x));
function cgRead(key, fallback){ return window.CGStore.readJSON(key, fallback); }
function cgWrite(key, data){ return window.CGStore.writeJSON(key, data); }
const cgValidYear = y => Number.isInteger(Number(y)) && +y>=2020 && +y<=2100;
const cgDataKey = y => CG_DATA_PREFIX+y;
const cgSnapKey = y => CG_SNAP_PREFIX+y;
function cgYearIndex(){return CG_INDEX||{schema:1,activeYear:2027,years:[2027],updatedAt:new Date().toISOString()};}
function cgWriteWorkspace(){
  if(!S||!cgValidYear(S.year))return false;
  if(!CG_INDEX)CG_INDEX={schema:1,activeYear:S.year,years:[],updatedAt:''};
  const year=S.year;
  // 먼저 업무 상태 저장 후 연도 인덱스를 갱신한다. 이전 연도 자료는 건드리지 않는다.
  if(!cgWrite(cgDataKey(year),S))return false;
  if(!CG_INDEX.years.includes(year))CG_INDEX.years.push(year);
  CG_INDEX.years.sort((a,b)=>b-a);
  CG_INDEX.activeYear=year;CG_INDEX.updatedAt=new Date().toISOString();
  return cgWrite(CG_INDEX_KEY,CG_INDEX);
}
function cgSourceSubjects(state,grade){
  return (state.subjects||[]).filter(s=>s.grade===grade&&s.src!=='배정only'&&s.src!=='manual')
    .map(s=>{const {grade:oldGrade,id,sections,teacher,students,fromAssign,customSections,warn,...rest}=s;return {...rest,src:'편제표'};});
}
function cgCohortFromState(grade, overwrite=false){
  const entry=S.year-grade+1;
  if(!CG_COHORTS)CG_COHORTS={};
  if(CG_COHORTS[entry]&&!overwrite)return false;
  const subjects=cgSourceSubjects(S,grade);
  if(!subjects.length)return false;
  CG_COHORTS[entry]={year:entry,subjects,updatedAt:new Date().toISOString(),source:S.pyeonjeMeta?.[grade]||`${S.year}학년도 ${grade}학년 편제표`};
  cgWrite(CG_COHORT_KEY,CG_COHORTS);
  if(window.CGCloud)window.CGCloud.markDirty();
  return true;
}
function cgInitializeStore(){
  CG_INDEX=cgRead(CG_INDEX_KEY,null);
  CG_COHORTS=cgRead(CG_COHORT_KEY,{});
  if(CG_INDEX&&Array.isArray(CG_INDEX.years)&&CG_INDEX.years.length){
    const year=CG_INDEX.activeYear;
    const data=cgRead(cgDataKey(year),null);
    if(data&&Array.isArray(data.subjects)&&data.year===year){ S=migrate(data);return; }
    const recovered=CG_INDEX.years.find(y=>cgRead(cgDataKey(y),null)?.subjects);
    if(recovered){S=migrate(cgRead(cgDataKey(recovered),null));CG_INDEX.activeYear=recovered;cgWrite(CG_INDEX_KEY,CG_INDEX);return;}
  }
  const old=cgRead(LS_KEY,null);
  if(old&&Array.isArray(old.subjects))S=migrate(old);
  else seedState();
  S.workspaceStatus='working';
  CG_INDEX={schema:1,activeYear:S.year,years:[S.year],updatedAt:new Date().toISOString()};
  [1,2,3].forEach(g=>cgCohortFromState(g));
  if(!cgWriteWorkspace())setTimeout(()=>toast('저장 공간이 부족할 수 있어요. ⚙ 설정에서 작업 파일로 저장해 두세요.'),600);
}
function cgYearInfo(y){return cgRead(cgDataKey(y),null);}
function cgLoadYear(y){
  if(y===S.year){UI.tab='year';render();return;}
  const data=cgYearInfo(y);if(!data){toast('해당 학년도 저장 자료를 찾지 못했습니다');return;}
  if(!cgWriteWorkspace()){toast('지금 작업을 저장하지 못했어요. ⚙ 설정에서 작업 파일로 저장한 뒤 다시 해 보세요.');return;}
  cgPendingAssign=null;S=migrate(data);CG_INDEX.activeYear=S.year;cgWrite(CG_INDEX_KEY,CG_INDEX);
  lastSnapshotStr=JSON.stringify(S);UNDO_STACK.length=0;REDO_STACK.length=0;
  UI.tab='year';UI.matrixGrade=2;UI.matrixSem=1;if(window.CGCloud)window.CGCloud.markDirty();render();toast(S.year+'학년도로 전환했습니다');
}
function cgCreateYear(y){
  y=Number(y);
  if(!cgValidYear(y)){toast('2020~2100 사이의 학년도를 입력해 주세요');return;}
  if(CG_INDEX.years.includes(y)){cgLoadYear(y);return;}
  if(y!==S.year+1){toast('안전을 위해 현재 학년도 바로 다음 해만 생성할 수 있습니다');return;}
  if(!cgWriteWorkspace()){toast('지금 작업을 저장하지 못했어요. ⚙ 설정에서 작업 파일로 저장한 뒤 다시 해 보세요.');return;}
  const from=S;
  [1,2,3].forEach(g=>cgCohortFromState(g));
  const next=blankState();next.year=y;next.workspaceStatus='working';next.creationInfo={fromYear:from.year,at:new Date().toISOString()};
  next.sign=cgClone(from.sign||next.sign);
  next.classes={1:cgClone(from.classes?.[1]||{g:8,s:2}),2:cgClone(from.classes?.[1]||{g:8,s:2}),3:cgClone(from.classes?.[2]||{g:8,s:2})};
  // 분반·학생·담당교사·교사 정원·온라인/창체 배분 값은 연간 독립 자료이므로 복사하지 않는다.
  next.subjects=[];next.teachers=[];next.assignMeta={};next.schoolQuota=null;
  cgPendingAssign=null;S=next;
  [1,2,3].forEach(g=>{
    const entry=y-g+1, rec=CG_COHORTS[entry];
    S.pyeonjeMeta[g]=rec?`${entry} 입학생 교육과정 · 연결됨 (${rec.source||'등록 자료'})`:'교육과정 편제표 미등록 · 업로드 필요';
    if(!rec)return;
    rec.subjects.forEach(t=>{
      const item={...cgClone(t),id:uid('s'),grade:g,sections:[],src:'편제표'};
      if(item.kind!=='선택')item.sections=fixedSections(item,[]);
      S.subjects.push(item);
    });
  });
  ensureSpecialSubjects();
  if(!cgWriteWorkspace()){
    S=from;cgWriteWorkspace();toast('새 학년도를 저장할 공간이 부족해요. ⚙ 설정에서 작업 파일로 저장한 뒤 다시 해 보세요.');return;
  }
  lastSnapshotStr=JSON.stringify(S);UNDO_STACK.length=0;REDO_STACK.length=0;
  UI.tab='year';if(window.CGCloud)window.CGCloud.markDirty();render();toast(`${y}학년도 생성 완료 · 새 입학생 편제표와 반편성 자료를 등록하세요`);
}
function cgCheckpoints(y){return cgRead(cgSnapKey(y),[]);}
function cgCheckpoint(label, status='working'){
  const arr=cgCheckpoints(S.year);
  const entry={id:uid('cp'),at:new Date().toISOString(),label:String(label||'작업본').slice(0,60),status,data:cgClone(S)};
  arr.unshift(entry);
  // 로컬 저장 공간 한도를 고려하여 학년도별 최대 4개만 보유. 장기 보관은 포트폴리오 JSON 백업 권장.
  const kept=arr.slice(0,4);
  if(!cgWrite(cgSnapKey(S.year),kept)){toast('저장 공간이 부족해 중간 저장을 못 했어요. ⚙ 설정에서 작업 파일로 저장해 두세요.');return false;}
  toast('지금 상태를 중간 저장했어요');render();return true;
}
function cgConfirmYear(){
  if(S.workspaceStatus==='confirmed'){toast('이미 확정된 학년도입니다');return;}
  if(!cgCheckpoint(`확정본 ${new Date().toLocaleString('ko-KR')}`,'confirmed'))return;
  S.workspaceStatus='confirmed';cgWriteWorkspace();if(window.CGCloud)window.CGCloud.markDirty();render();toast('확정했어요 · 이 학년도는 잠겼어요');
}
function cgReopenYear(){S.workspaceStatus='working';cgWriteWorkspace();if(window.CGCloud)window.CGCloud.markDirty();lastSnapshotStr=JSON.stringify(S);render();toast('잠금을 풀었어요. 다시 고칠 수 있어요');}
function cgRestoreCheckpoint(id){
  const cp=cgCheckpoints(S.year).find(x=>x.id===id);if(!cp)return;
  const year=S.year;
  S=migrate(cgClone(cp.data));S.year=year;S.workspaceStatus='working';
  lastSnapshotStr=JSON.stringify(S);UNDO_STACK.length=0;REDO_STACK.length=0;
  cgWriteWorkspace();if(window.CGCloud)window.CGCloud.markDirty();render();toast('그 시점으로 되돌렸어요');
}
function cgExportAll(){
  if(!cgWriteWorkspace()){toast('지금 작업을 저장하지 못했어요.');return;}
  const workspaces={};CG_INDEX.years.forEach(y=>{const w=cgYearInfo(y);if(w)workspaces[y]=w;});
  const checkpoints={};CG_INDEX.years.forEach(y=>{checkpoints[y]=cgCheckpoints(y);});
  const portfolio={format:'cleargrid-portfolio-v1',exportedAt:new Date().toISOString(),activeYear:S.year,workspaces,cohorts:CG_COHORTS,checkpoints};
  saveFile(`ClearGrid_전체학년도백업_${S.year}_${stamp()}.json`,JSON.stringify(portfolio));
  toast('모든 학년도를 파일로 내려받아요');
}
function cgImportAll(file){
  const fr=new FileReader();fr.onload=()=>{
    try{
      const obj=JSON.parse(fr.result);
      if(obj.format!=='cleargrid-portfolio-v1'||!obj.workspaces||typeof obj.workspaces!=='object')throw Error('이 프로그램에서 만든 파일이 아니에요');
      const years=Object.keys(obj.workspaces).map(Number).filter(cgValidYear);
      if(!years.length)throw Error('유효한 학년도가 없습니다');
      for(const y of years){const w=obj.workspaces[y];if(!w||!Array.isArray(w.subjects)||Number(w.year)!==y)throw Error(`${y}학년도 데이터 오류`);}
      openConfirm(`${years.join(', ')}학년도 자료를 불러올까요? 지금 들어 있는 같은 학년도 자료는 이 파일 내용으로 바뀌어요.`,()=>{
        const newIndex={schema:1,activeYear:years.includes(+obj.activeYear)?+obj.activeYear:years[0],years:years.sort((a,b)=>b-a),updatedAt:new Date().toISOString()};
        // 저장 용량을 사전 추정하여 대규모 자료 로드시 일부만 덮어쓰지 않게 한다.
        const bytes=JSON.stringify(obj).length; if(bytes>4_000_000){toast('파일이 너무 커서 불러올 수 없어요.');return;}
        const previous={};let failure=false;
        const keys=[CG_COHORT_KEY,CG_INDEX_KEY,...years.map(cgDataKey),...years.map(cgSnapKey)];
        keys.forEach(k=>previous[k]=window.CGStore.getRaw(k));
        try{
          for(const y of years){window.CGStore.setRaw(cgDataKey(y),JSON.stringify(obj.workspaces[y]));window.CGStore.setRaw(cgSnapKey(y),JSON.stringify((obj.checkpoints||{})[y]||[]));}
          window.CGStore.setRaw(CG_COHORT_KEY,JSON.stringify(obj.cohorts||{}));
          window.CGStore.setRaw(CG_INDEX_KEY,JSON.stringify(newIndex));
        }catch(e){failure=true;keys.forEach(k=>{try{if(previous[k]==null)window.CGStore.removeRaw(k);else window.CGStore.setRaw(k,previous[k]);}catch(err){}});}
        if(failure){toast('저장 공간이 부족해 불러오지 못했어요');return;}
        CG_INDEX=newIndex;CG_COHORTS=obj.cohorts||{};S=migrate(cgYearInfo(newIndex.activeYear));
        lastSnapshotStr=JSON.stringify(S);UNDO_STACK.length=0;REDO_STACK.length=0;UI.tab='year';if(window.CGCloud)window.CGCloud.markDirty();render();toast('학년도 자료를 불러왔어요');
      });
    }catch(e){toast('파일을 읽지 못했어요: '+e.message);}
  };fr.readAsText(file);
}
function vYears(){
  const years=[...(CG_INDEX?.years||[S.year])].sort((a,b)=>b-a);
  const hasImportedData=Object.keys(CG_COHORTS||{}).length>0 || Object.keys(S.assignMeta||{}).length>0;
  const deploymentCard=`<section class="panel cg-ops-panel">
    <div class="row" style="justify-content:space-between;align-items:start;gap:14px">
      <div><h2 style="margin:0 0 6px">☁️ Netlify 운영 · Google 선택 동기화</h2>
      <p class="cg-help" style="margin:0">프로그램은 Netlify에 배포하고 업무 데이터는 브라우저에 먼저 저장합니다. 상단 'Google 동기화'에서 서버에 저장하면 승인된 다른 담당자 PC와 공유됩니다.</p></div>
      <span class="cg-board-tag ${hasImportedData?'':'missing'}">${hasImportedData?'업무 데이터 연결됨':'자료 복원 필요'}</span>
    </div>
    <div class="cg-ops-steps">
      <div><b>1</b> 이전 6.2에서 <strong>전체 학년도 JSON 백업</strong> 다운로드</div>
      <div><b>2</b> 이 사이트에서 <strong>전체 백업 복원</strong> → 검증</div>
      <div><b>3</b> 새 학년도에는 <strong>편제표·리로스쿨 파일</strong> 업로드</div>
    </div>
    <div class="row" style="margin-top:12px"><button class="btn pri" data-act="cgImportAll">전체 학년도 백업 복원</button>
    <button class="btn" data-act="cgExportAll">현재 브라우저 전체 백업</button></div>
    <div class="cg-ops-caution">🔐 <strong>중요:</strong> Google 동기화 연결 전에는 이 브라우저에서만 저장됩니다. 연결 후에도 클라우드 저장 버튼을 눌러야 다른 PC에 반영됩니다. 공유 PC 사용과 실명·학번 자료의 무단 게시를 피하세요. 브라우저 저장 데이터는 캐시 삭제, 프로필 변경 또는 다른 PC 접속 시 사라지거나 보이지 않을 수 있습니다.</div>
  </section>`;
  const locked=S.workspaceStatus==='confirmed';
  const cards=[1,2,3].map(g=>{
    const cy=S.year-g+1,rec=CG_COHORTS[cy],subs=(S.subjects||[]).filter(x=>x.grade===g&&x.src!=='배정only');
    const meta=S.assignMeta?.[g];
    return `<div class="cg-board-card"><div class="cg-overline">${g}학년 · ${cy} 입학생</div><h3>${cy} 입학생 교육과정</h3>
    <p>${rec?`입학연도 원본 ${rec.subjects.length}개 편제행 연결`:'해당 입학연도 편제표 미등록'}</p>
    <p>현재 학년도 ${subs.length}개 과목·학기 행 · ${meta?`반편성 ${meta.students}명`:'반편성 미등록'}</p>
    <span class="cg-board-tag ${rec?'':'missing'}">${rec?'편제표 연결됨':'편제표 필요'}</span>
    ${(!locked&&rec)?`<div style="margin-top:9px"><button class="btn sm" data-act="cgUpdateCohort" data-grade="${g}" title="현재 편제표의 과목·학점·전공 변경을 해당 입학연도의 기준 자료에 반영합니다">입학연도 편제표 최신화</button></div>`:''}</div>`;
  }).join('');
  const yearRows=years.map(y=>{
    const d=y===S.year?S:cgYearInfo(y);const ns=(d?.subjects||[]).length;
    return `<tr class="${y===S.year?'current':''}"><td><strong>${y}학년도</strong>${y===S.year?' · 현재':''}</td><td>${d?.workspaceStatus==='confirmed'?'확정':'작업 중'}</td><td>${ns}개</td><td><button class="btn sm" data-act="cgSwitchYear" data-year="${y}" ${y===S.year?'disabled':''}>${y===S.year?'열려 있음':'열기'}</button></td></tr>`;
  }).join('');
  const snaps=cgCheckpoints(S.year).map(cp=>`<tr><td><b>${esc(cp.label)}</b><div class="small muted">${new Date(cp.at).toLocaleString('ko-KR')}</div></td><td>${cp.status==='confirmed'?'확정본':'작업본'}</td><td><button class="btn sm" data-act="cgRestore" data-id="${esc(cp.id)}">복원</button></td></tr>`).join('');
  return `<div class="cg-yearboard">
    <section class="cg-hero"><div><div class="cg-overline">CLEAR GRID · ACADEMIC WORKSPACE</div><h2>${S.year}학년도 운영 관리</h2>
      <p class="muted" style="margin:0">매년 바뀌는 편제표·반편성·교사 배정을 학년도별로 분리합니다.</p></div>
      <div class="cg-year-actions"><span class="cg-yearflag ${locked?'locked':''}">${locked?'✓ 확정 · 편집 잠금':'● 작업 중'}</span>
      <button class="btn" data-act="cgNewYear">+ ${S.year+1}학년도 만들기</button></div></section>
    ${locked?'<div class="cg-readonly">🔒 확정본은 실수로 수정되지 않도록 잠겨 있습니다. 수정하려면 아래의 작업 모드 전환을 이용하세요.</div>':''}
    <div class="cg-board-steps"><div class="cg-step on">1. 학년도 생성</div><div class="cg-step">2. 신입생 편제표</div><div class="cg-step">3. 리로스쿨 반편성</div><div class="cg-step">4. 정원·시수 배분</div><div class="cg-step">5. 확정본</div></div>
    <section class="panel" style="margin:0"><div class="cg-review-hero"><div><h2 style="font-size:17px;margin:0">리로스쿨 반편성 변경 검토</h2><p class="cg-review-lead">새 배정 파일을 올려도 승인 전에는 기존 분반·교사·시수가 변경되지 않습니다.</p></div><button class="btn pri" data-act="cgGoReview">변경 비교 화면 열기</button></div></section>
    ${deploymentCard}
    <div class="cg-board-cards">${cards}</div>
    <div class="cg-board-cols"><section class="panel"><h2>학년도 목록</h2><p class="cg-help">연도를 바꾸어도 이전 학년도 배당표와 교사 데이터는 독립적으로 유지됩니다.</p>
      <div class="tablewrap"><table class="cg-board-table"><thead><tr><th>학년도</th><th>상태</th><th>과목·학기 행</th><th>열기</th></tr></thead><tbody>${yearRows}</tbody></table></div>
      <div class="cg-board-actions"><button class="btn pri" data-act="cgNewYear">+ 새 학년도 생성</button><button class="btn" data-act="cgExportAll">전체 학년도 JSON 백업</button>
      <button class="btn" data-act="cgImportAll">전체 백업 복원</button></div><div class="cg-board-note" style="margin-top:12px"><strong>중요:</strong> 이 단계는 PC 브라우저에 연도별로 저장하는 시제품입니다.
      Netlify에 올려도 다른 PC나 브라우저와 자동 동기화되지는 않습니다. 학교에서 공동 사용하기 전에는 별도 로그인과 서버 저장 구조가 필요합니다.</div></section>
    <section class="panel"><h2>작업본 · 확정본</h2><p class="cg-help">중요한 편집 전 작업 시점을 저장하고, 정리된 배당표는 확정본으로 잠급니다.</p>
      <div class="cg-board-actions"><button class="btn" data-act="cgSnapshot">현재 작업본 저장</button>
      ${locked?'<button class="btn pri" data-act="cgReopen">작업 모드로 전환</button>':'<button class="btn pri" data-act="cgConfirm">현재 학년도 확정</button>'}</div>
      <div class="tablewrap" style="margin-top:12px"><table class="cg-board-table"><thead><tr><th>시점</th><th>구분</th><th>복원</th></tr></thead><tbody>${snaps||'<tr><td colspan="3" class="muted">저장된 작업 시점이 없습니다.</td></tr>'}</tbody></table></div>
      <p class="cg-small-note">이 브라우저에는 학년도당 최대 최근 4개 작업 시점을 보관합니다. 장기 보관용으로는 전체 학년도 JSON을 별도로 저장하세요.</p>
      <div class="cg-mini-alert">🔐 학생 이름·학번이 포함된 원본 리로스쿨 파일은 학교 개인정보 처리 기준에 따라 관리해야 합니다. 이 시제품은 학생별 원본을 서버에 업로드하지 않습니다.</div>
    </section></div></div>`;
}

/* ----- 기초 설정 탭 (불필요한 빠른 파일 업로드 패널 완전 삭제, 한 화면 심플 구성) ----- */
function vSetup(){
  const curMap={1:String(S.year),2:String(S.year-1),3:String(S.year-2)};
  const grades=[1,2,3].map(g=>{
    const c=S.classes[g], m=S.assignMeta[g];
    const label=curMap[g]+'학년도 입학생';
    return `<article class="cg-grade-card">
      <div class="cg-grade-h"><div><h3>${g}학년</h3><div class="cg-entry">${label}</div></div><span class="cg-class-count">${c.g+c.s}학급</span></div>
      <div class="cg-field-row"><label for="general${g}">일반학급</label><input id="general${g}" type="number" min="0" data-cls="${g}" data-k="g" value="${c.g}" aria-label="${g}학년 일반학급 수"></div>
      <div class="cg-field-row"><label for="science${g}">과중학급</label><input id="science${g}" type="number" min="0" data-cls="${g}" data-k="s" value="${c.s}" aria-label="${g}학년 과학중점학급 수"></div>
      <div class="cg-grade-source"><span class="cg-source-k">적용 교육과정</span><strong>${esc(S.pyeonjeMeta[g]||label+' 교육과정 학점 배당표')}</strong>
       <span class="cg-source-b">${m?`배정: ${esc(m.students)}명 · 선택과목 ${esc(m.subjects)}개<br>${esc(m.file||'')}`:'배정: 선택과목 반편성 자료 없음 (지정과목 중심)'}</span></div>
    </article>`;
  }).join('');
  return `<div class="cg-setup-grid">
    <section class="panel"><div class="cg-settings-head"><div><h2 style="margin:0">학년도 · 학급 구성</h2><div class="cg-help">학년도별로 입학연도에 맞는 교육과정을 연결합니다.</div></div>
      <label class="cg-year-input" for="yearIn">현재 학년도 <input type="number" class="w70" id="yearIn" value="${S.year}" readonly title="학년도 관리 탭에서 변경하세요"></label></div>
      <div class="cg-grade-grid">${grades}</div>
      <details class="cg-rules"><summary>기본 적용 규칙 확인</summary><div class="rule-list">
        <div class="cg-rule"><span class="tag">1학년</span><div><strong>진로</strong><p>1·2학기 · 1~10반 · 각 1시수 · 전공: 진로</p></div></div>
        <div class="cg-rule"><span class="tag">3학년</span><div><strong>진로·학업 설계</strong><p>2학기 · 전공: 교양</p></div></div>
        <div class="cg-rule"><span class="tag">온라인</span><div><strong>창의 공학 설계 / 언어생활과 한자</strong><p>창체 및 교과외로 공동 배분 · 전담 전공 없음</p></div></div>
      </div></details>
      <p class="cg-small-note">일반·과중 구분은 반별 수강인원 및 시수 산정에 반영됩니다. 학급 수 변경 시 지정·교차 과목의 분반이 다시 계산됩니다.</p>
    </section>
    <section class="panel"><h2>작업 백업 · 결재란</h2><p class="cg-help" style="margin-bottom:14px">현재 작업 자료를 JSON으로 별도 저장할 수 있습니다.</p>
      <div class="cg-backup-actions"><button class="btn pri" data-act="saveJson">작업 파일 저장 (.json)</button><button class="btn" data-act="loadJson">작업 파일 불러오기</button></div>
      <hr style="border:none;border-top:1px solid #e6eaf0;margin:17px 0">
      <label class="cg-form-label">인쇄물 결재란 구성</label><div class="cg-sign-grid">${S.sign.map((x,i)=>`<input type="text" data-sign="${i}" value="${esc(x)}" aria-label="${i+1}번째 결재란">`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm" data-act="signAdd">+ 결재란 추가</button><button class="btn sm" data-act="signDel">− 결재란 삭제</button></div>
      <div style="height:20px"></div><button class="btn danger" data-act="reset">초기 자료로 복원</button>
      <p class="cg-small-note">초기 자료로 복원하면 수정 내용이 바뀝니다. 중요한 편집 전에는 JSON 작업 파일을 백업해 주세요.</p>
    </section>
  </div>`;
}

/* ----- 방식 A: 과목·분반 탭 (상단 단일 버튼으로 좌측 타임×과목 검증표 + 우측 과목·분반 상세 목록 동시 제어) ----- */
/* ========== Clear Grid · 수강인원 검증표(넓은 표 + 교과군 필터 + 하단 편집) ========== */
function cgSubjectGroup(s){
 const m=s.major||'';
 if(['국어','수학','영어'].includes(m)) return 'core';
 if(['역사','지리','일반사회','윤리','사회(통합)'].includes(m) || /사회/.test(s.group||'')) return 'social';
 if(['물리','화학','생명과학','지구과학','과학(통합)'].includes(m) || /과학/.test(s.group||'')) return 'science';
 return 'other';
}

/* 전체 보기 전용, 짧지만 서로 겹치지 않는 과목명 약어 */
const CG_ALIASES = {
 '주제탐구독서':'주제독서', '미적분Ⅱ':'미적Ⅱ', '심화영어':'심화영',
 '세계시민과지리':'세계지리', '도시의미래탐구':'도시탐구', '사회와문화':'사회문화',
 '역사로탐구하는현대세계':'현대세계', '사회문제탐구':'사회문제', '윤리와사상':'윤리사상',
 '전자기와양자':'전자양자', '화학반응의세계':'화학반응', '생물의유전':'생물유전',
 '행성우주과학':'행성우주', '물리학실험':'물리실험', '화학실험':'화학실험',
 '생명과학실험':'생명실험', '지구과학실험':'지구실험', '기초체육전공실기':'기초체육',
 '소프트웨어와생활':'SW생활', '창의공학설계':'창의공학', '공중보건':'공중보건',
 '일본문화':'일본문화', '중국문화':'중국문화', '언어생활과한자':'생활한자',
 '음악연주와창작':'음악연주', '미술창작':'미술창작',
 '매체의사소통':'매체소통', '언어생활탐구':'언어탐구', '수학과문화':'수학문화',
 '실용통계':'실용통계', '미디어영어':'미디어영', '심화영어독해와작문':'심영독작',
 '기후변화와지속가능한세계':'기후지속', '금융과경제생활':'금융경제',
 '인문학과윤리':'인문윤리', '과학의역사와문화':'과학역사',
 '기후변화와환경생태':'기후생태', '융합과학탐구':'융합탐구',
 '고급물리학':'고급물리', '고급화학':'고급화학', '고급생명과학':'고급생명',
 '고급지구과학':'고급지구', '심화체육전공실기':'심화체육',
 '데이터시각화프로그래밍':'데이터시각', '심화일본어':'심화일어', '심화중국어':'심화중어',
 '음악감상과비평':'음악감상', '미술감상과비평':'미술감상',
 '독서토론과글쓰기':'독서토론', '경제수학':'경제수학', '인공지능수학':'인공지수',
 '영미문학읽기':'영미문학', '한국지리탐구':'한국지리', '세계사':'세계사',
 '정치':'정치', '현대사회와윤리':'현대윤리', '물리학':'물리학',
 '화학':'화학', '생명과학':'생명과학', '지구과학':'지구과학',
 '인공지능기초':'인공지기', '일본어':'일본어', '중국어':'중국어',
 '문학과영상':'문학영상', '기하':'기하', '영어발표와토론':'영어토론',
 '여행지리':'여행지리', '동아시아역사기행':'동아역사', '윤리문제탐구':'윤리문제',
 '역학과에너지':'역학에너', '물질과에너지':'물질에너',
 '세포와물질대사':'세포대사', '지구시스템과학':'지구시스템',
 '데이터과학':'데이터과', '일본어회화':'일어회화', '중국어회화':'중어회화'
};
function cgCourseAliases(subs){
 const used=new Set();
 return subs.map(s=>{
   let short=CG_ALIASES[norm(s.name)] || norm(s.name).slice(0,5);
   if(used.has(short)) {
     let n=2; while(used.has(short+n))n++;
     short+=n;
   }
   used.add(short);
   return short;
 });
}
function vSubjects(){
 const g=+UI.matrixGrade||2, sem=+UI.matrixSem||1, group=UI.matrixGroup||'all';
 const groupOptions=[['all','전체'],['core','국어·수학·영어'],['social','사회'],['science','과학'],['other','기타 교과']];
 const nameOfGroup=Object.fromEntries(groupOptions);
 const allMatSubs=S.subjects.filter(s=>s.grade===g&&s.sem===sem&&s.sections.length>0&&(s.kind==='선택'||s.fromAssign))
     .sort((a,b)=>MAJOR_IDS.indexOf(a.major)-MAJOR_IDS.indexOf(b.major)||natCmp(a.name,b.name));
 const matSubs=allMatSubs.filter(s=>group==='all'||cgSubjectGroup(s)===group);
 const compact=group==='all';
 const shortNames=cgCourseAliases(matSubs);
 const allEdit=S.subjects.filter(s=>s.grade===g&&s.sem===sem).sort((a,b)=>(a.kind==='선택')-(b.kind==='선택')||MAJOR_IDS.indexOf(a.major)-MAJOR_IDS.indexOf(b.major)||natCmp(a.name,b.name));
 const editSubs=allEdit.filter(s=>group==='all'||cgSubjectGroup(s)===group);
 const meta=S.assignMeta[g]||{};
 const studentCount=meta.students??null;
 const totalSections=allMatSubs.reduce((n,s)=>n+s.sections.length,0);
 const hours=allEdit.reduce((n,s)=>n+hoursOf(s),0);
 const baseTimeKey=sec=>{
   if(sec.unit||/^\d+반$/.test(sec.label))return '통반(9·10)';
   const m=String(sec.label).match(/^([A-Z]+)/i);return m?m[1].toUpperCase():sec.label;
 };
 let matrixHTML='';
 if(!matSubs.length){
   matrixHTML=`<div class="cg-empty">이 학년·학기·교과군에 해당하는 이동수업 수강인원 자료가 없습니다.<br><span class="cg-headnote">다른 교과군을 선택하거나 아래의 개설 과목을 확인해 주세요.</span></div>`;
 } else {
   const times=[...new Set(matSubs.flatMap(s=>s.sections.map(baseTimeKey)))].sort((a,b)=>a.startsWith('통반')?1:b.startsWith('통반')?-1:natCmp(a,b));
   const heads=matSubs.map((s,i)=>compact
      ? `<th title="${esc(s.name)} · ${esc(s.major)}"><span class="cg-short-name">${esc(shortNames[i])}</span></th>`
      : `<th title="${esc(s.name)}"><span>${esc(s.name)}</span><span class="major-hint">${esc(s.major)}</span></th>`).join('');
   const rows=times.map(t=>{
     let rowSum=0,rowSecCnt=0;
     const cells=matSubs.map(s=>{
       const matches=s.sections.filter(x=>baseTimeKey(x)===t);
       if(!matches.length)return `<td style="color:#cbd5e1">—</td>`;
       const badges=matches.map(x=>{
         const n=num(x.n);rowSum+=n;rowSecCnt++;
         const mark=x.label!==t?`<small>${esc(x.label)} </small>`:'';
         const tip=x.track==='m'?`혼합(일반 ${x.gN||0} / 과중 ${x.sN||0})`:x.track==='s'?'과중':'일반';
         return `<span class="mat-badge ${x.track||'g'}" title="${esc(s.name)} · ${esc(x.label)} · ${n}명 · ${tip}">${mark}${n}</span>`;
       }).join('');
       return `<td><div class="mat-cell">${badges}</div></td>`;
     }).join('');
     return `<tr><td class="cg-time">${esc(t)}</td>${cells}<td class="cg-total">${rowSecCnt}반 · ${rowSum}명</td></tr>`;
   }).join('');
   let grandStu=0,grandSec=0;
   const foot=matSubs.map(s=>{
     const n=s.sections.reduce((t,x)=>t+num(x.n),0),cnt=s.sections.length;
     grandStu+=n;grandSec+=cnt;
     return `<td><strong>${n}</strong><div class="cg-headnote">(${cnt}반)</div></td>`;
   }).join('');
   matrixHTML=`<div class="cg-matrix-scroll ${compact?'cg-all-scroll':''}" role="region" aria-label="${g}학년 ${sem}학기 타임별 수강인원 표" tabindex="0">
      <table class="t cg-matrix ${compact?'cg-compact':''}"><thead><tr><th class="cg-time">타임</th>${heads}<th class="cg-total">합계</th></tr></thead>
      <tbody>${rows}</tbody><tfoot><tr><td class="cg-time">계</td>${foot}<td class="cg-total">${grandSec}반 · ${grandStu}명</td></tr>
</tfoot></table></div>`;
 }
 const opt=(v,cur,label)=>`<option value="${esc(v)}" ${String(cur)===String(v)?'selected':''}>${esc(label||v)}</option>`;
 const edits=editSubs.map(s=>{
   const secs=s.sections.map(x=>{
     const trk=x.track||'g';const detail=trk==='m'&&(x.gN||x.sN)?`<small class="mix-detail">(${x.gN}/${x.sN})</small>`:'';
     return `<span class="sec ${trk}" title="${esc(x.label)} · ${x.n==null?'':x.n+'명'}">${esc(x.label)}${x.n==null?'':` <span class="cnt">${x.n}</span>`}${detail}</span>`;
   }).join('');
   return `<tr class="${active(s)?'':'excl'}">
      <td class="cg-course-cell cg-course-cell-sticky"><b>${esc(s.name)}</b>${s.online?' <span class="pill warn">온라인학교</span>':''}<span class="course-note">${s.major==='온라인'?'창체·교과외 (온라인)':esc(s.major)}</span></td>
      <td><select data-sub="${s.id}" data-f="major" aria-label="${esc(s.name)} 전공">${majorOptions(s.major)}</select></td>
      <td class="c"><span class="pill">${esc(s.kind)}${s.block?' '+esc(s.block):''}</span></td>
      <td class="c"><input type="number" class="w40" min="0" data-sub="${s.id}" data-f="credits" value="${s.credits}" aria-label="${esc(s.name)} 학점"></td>
      ${renderGSCountCells(s)}<td class="n strong">${hoursOf(s)||'—'}</td>
      <td class="c"><input type="checkbox" data-sub="${s.id}" data-f="include" ${s.include?'checked':''} aria-label="${esc(s.name)} 포함 여부"></td>
      <td class="cg-section-cell"><div class="secs">${secs||'<span class="muted small">미개설</span>'}</div></td>
      <td class="c cg-edit-cell"><button class="btn sm" data-act="editSecsModal" data-id="${s.id}">분반 편집</button></td>
    </tr>`;
 }).join('');
 return `<section class="panel">
   <div class="cg-hero"><div><h2 style="margin:0">수강인원·분반 확인</h2><p class="cg-subtitle">학년·학기를 고르면 타임별 수강인원과 과목별 분반이 함께 보여요.</p></div>
      <div class="cg-toolbar"><span class="seg">${[1,2,3].map(gr=>`<button data-matg="${gr}" class="${g===gr?'on':''}">${gr}학년</button>`).join('')}</span>
      <span class="seg">${[1,2].map(sm=>`<button data-mats="${sm}" class="${sem===sm?'on':''}">${sm}학기</button>`).join('')}</span></div></div>
   <div class="cg-kpis">
     <div class="cg-kpi"><span class="k">배정 학생</span><strong>${studentCount==null?'—':studentCount.toLocaleString()}</strong><span class="u">${studentCount==null?'자료 미등록':'명'}</span></div>
     <div class="cg-kpi"><span class="k">선택과목 (전체)</span><strong>${allMatSubs.length}</strong><span class="u">개</span></div>
     <div class="cg-kpi"><span class="k">선택 분반 (전체)</span><strong>${totalSections}</strong><span class="u">개</span></div>
     <div class="cg-kpi"><span class="k">개설 과목 시수</span><strong>${hours}</strong><span class="u">시수</span></div>
   </div>
  </section>
  <section class="panel"><div class="cg-heading"><h2>타임별 수강인원 <small class="muted">${g}학년 ${sem}학기</small></h2>
      <span class="cg-headnote">현재 ${matSubs.length}과목 표시 · ${compact?'약어로 전체 한 화면 보기':'교과군별 자세히 보기'}</span></div>
    <div class="cg-group-tabs" role="group" aria-label="교과군 필터">${groupOptions.map(([id,label])=>`<button type="button" data-matgroup="${id}" class="${group===id?'on':''}" aria-pressed="${group===id}">${label}</button>`).join('')}</div>
    <div class="cg-legend" style="margin:12px 0 13px"><span><span class="sec g">25</span> 일반</span><span><span class="sec s">25</span> 과중</span><span><span class="sec m">25</span> 혼합</span></div>
    ${matrixHTML}
    ${compact?`<details class="cg-alias-legend"><summary>과목명 약어표 펼치기 (${matSubs.length}개)</summary><div class="cg-alias-list">${matSubs.map((s,i)=>`<span><b>${esc(shortNames[i])}</b> ${esc(s.name)}</span>`).join('')}</div></details>`:''}
    <p class="cg-help"><strong>표 읽는 법</strong> · 각 숫자는 해당 분반의 수강인원입니다. 과목별·타임별 합계에는 같은 학생이 여러 과목에서 중복 집계될 수 있습니다. 전체 보기는 과목 약어를 사용하고, 과목명은 제목에 마우스를 올리거나 약어표에서 확인할 수 있습니다.</p>
  </section>
  <section class="panel cg-edit"><div class="cg-heading"><div><h2>과목·분반 상세 편집</h2><div class="cg-help">${esc(nameOfGroup[group]||'전체')} · ${editSubs.length}개 과목 표시</div></div>
     <button class="btn pri sm" data-act="addSubject">+ 과목 추가</button></div>
    <div class="tablewrap"><table class="t"><thead><tr><th>과목명</th><th>담당 전공</th><th>구분</th><th>학점</th><th>일반</th><th>과중</th><th>시수</th><th>포함</th><th>분반 (인원)</th><th>편집</th></tr></thead>
      <tbody>${edits||'<tr><td colspan="10" class="c muted">해당 교과군의 과목이 없습니다.</td></tr>'}</tbody></table></div>
    <p class="cg-help">학점·전공·포함 여부를 바꾸면 시수가 바로 다시 계산돼요. 분반을 고치려면 오른쪽 버튼을 누르세요.</p>
  </section>`;
}

// === [Part 2 끝: 바로 아래에 Part 3를 붙여넣으세요] ===
// === [Part 3 시작: Part 2 주석 바로 아래에 이어 붙여넣으세요] ===

/* ----- 분반 편집 전용 깔끔한 모달 ----- */
function openSecEditModal(subId){
  const s = S.subjects.find(x=>x.id===subId);
  if (!s) return;
  const renderModalContent = () => {
    const rows = s.sections.map((x,i)=>`<tr>
      <td><input type="text" class="w70 m-sec-in" data-i="${i}" data-f="label" value="${esc(x.label)}"></td>
      <td><select class="m-sec-in" data-i="${i}" data-f="track">
        <option value="g" ${x.track==='g'?'selected':''}>일반 (1~8반)</option>
        <option value="s" ${x.track==='s'?'selected':''}>과중 (9~10반)</option>
        <option value="m" ${x.track==='m'?'selected':''}>혼합 (일반+과중)</option>
      </select></td>
      <td><input type="number" class="w70 m-sec-in" data-i="${i}" data-f="n" value="${x.n==null?'':x.n}"></td>
      <td class="small muted c">${x.gN||x.sN ? `일반 ${x.gN||0} / 과중 ${x.sN||0}` : '—'}</td>
      <td class="c strong">${esc(teacherName(x.teacher))||'—'}</td>
      <td class="c"><button class="btn sm danger m-sec-del" data-i="${i}">삭제</button></td></tr>`).join('');
    return `
      <h3>🛠️ [${s.grade}학년 ${s.sem}학기] ${esc(s.name)} — 분반 및 과목 편집</h3>
      <div class="row" style="margin-bottom:12px;background:#f8fafc;padding:10px 12px;border-radius:10px">
        <span>과목명 <input type="text" id="mSubName" style="width:170px;font-weight:700" value="${esc(s.name)}"></span>
        <span>전공 <select id="mSubMajor">${majorOptions(s.major)}</select></span>
        <span>학점 <input type="number" id="mSubCred" class="w40" value="${s.credits}"></span>
        <span>비고 <input type="text" id="mSubNote" style="width:150px" value="${esc(s.note||'')}"></span>
      </div>
      <div class="tablewrap" style="max-height:380px;overflow-y:auto;margin-bottom:12px">
        <table class="t">
          <thead><tr><th>분반 코드</th><th>과정 구분</th><th>수강인원</th><th>일반/과중 내역</th><th>담당교사</th><th>관리</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="6" class="c muted">분반이 없습니다.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="row">
        <button class="btn sm pri" id="mSecAdd">+ 분반 추가</button>
        ${s.kind!=='선택'?`<button class="btn sm" id="mSecReset">반 단위로 초기화</button>`:''}
        ${s.src==='manual'?`<button class="btn sm danger" id="mSubDel">과목 삭제</button>`:''}
        <span style="flex:1"></span>
        <button class="btn pri lg" id="mCloseDone">확인 및 닫기</button>
      </div>`;
  };

  const bindEvents = m => {
    m.querySelector('#mSubName').onchange = e => { s.name=e.target.value; commit(); };
    m.querySelector('#mSubMajor').onchange = e => { s.major=e.target.value; commit(); };
    m.querySelector('#mSubCred').onchange = e => { s.credits=num(e.target.value); commit(); };
    m.querySelector('#mSubNote').onchange = e => { s.note=e.target.value; commit(false); };
    m.querySelectorAll('.m-sec-in').forEach(el=>{
      el.onchange = () => {
        const idx = +el.dataset.i, f = el.dataset.f;
        const x = s.sections[idx];
        if (f==='n') x.n = el.value===''?null:num(el.value);
        else if (f==='track'){ x.track=el.value; x.trackManual=true; }
        else x[f]=el.value;
        if (s.kind!=='선택') s.customSections=true;
        commit();
      };
    });
    m.querySelectorAll('.m-sec-del').forEach(btn=>{
      btn.onclick = () => {
        s.sections.splice(+btn.dataset.i, 1);
        if (s.kind!=='선택') s.customSections=true;
        commit();
        m.querySelector('.modal').innerHTML = renderModalContent();
        bindEvents(m);
      };
    });
    const addBtn = m.querySelector('#mSecAdd');
    if (addBtn) addBtn.onclick = () => {
      s.sections.push({label:'새분반', track:'g', n:null, teacher:''});
      if (s.kind!=='선택') s.customSections=true;
      commit();
      m.querySelector('.modal').innerHTML = renderModalContent();
      bindEvents(m);
    };
    const rstBtn = m.querySelector('#mSecReset');
    if (rstBtn) rstBtn.onclick = () => {
      s.customSections=false;
      s.sections=fixedSections(s, s.sections);
      commit();
      m.querySelector('.modal').innerHTML = renderModalContent();
      bindEvents(m);
    };
    const delBtn = m.querySelector('#mSubDel');
    if (delBtn) delBtn.onclick = () => {
      S.subjects = S.subjects.filter(x=>x.id!==s.id);
      closeModal(); commit(); toast('과목을 삭제했어요');
    };
    m.querySelector('#mCloseDone').onclick = () => { closeModal(); render(); };
  };

  openModal(renderModalContent(), bindEvents);
}

/* ----- 3. 총괄 배당표 (한 화면 자동 맞춤 summary-compact 적용) ----- */
function summaryModel(sem){
  const items = cgExtraItems();
  const blocks = [];
  const majors = displayMajors();
  majors.forEach((m,idx)=>{
    const per = {};
    [3,2,1].forEach(g=>{ per[g] = S.subjects.filter(s=>s.major===m&&s.sem===sem&&s.grade===g&&s.sections.length>0).sort((a,b)=>(a.kind==='선택')-(b.kind==='선택')||natCmp(a.name,b.name)); });
    const n = Math.max(1,...[3,2,1].map(g=>per[g].length));
    blocks.push({type:'major', major:m, per, n, st:majorStats(m,sem), gradeH:{3:majorGradeHours(m,sem,3),2:majorGradeHours(m,sem,2),1:majorGradeHours(m,sem,1)}});
    const g = groupOf(m); const next = majors[idx+1];
    if (g && groupOf(next)!==g){ const list=GROUPS[g].filter(x=>majors.includes(x)); blocks.push({type:'group', name:g+' 계', st:sumStats(list,sem), list}); }
  });
  blocks.push({type:'total', name:'전체', st:sumStats(majors,sem),list:majors});
  return {items, blocks};
}

function buildSummaryTableHTML(sem){
  const {items, blocks} = summaryModel(sem);
  const head1 = `<tr><th rowspan="2">전공</th>${[3,2,1].map(g=>`<th colspan="6">${g}학년</th>`).join('')}<th rowspan="2">교과<br>계</th><th rowspan="2" title="실제 배정된 창체·부장·온라인·통합 시수 포함">필요<br>정원</th><th colspan="${items.length+1}">창체·부장 등</th><th rowspan="2">총계</th><th rowspan="2">강사</th><th rowspan="2">평균</th></tr>`;
  const head2 = `<tr>${[3,2,1].map(()=>`<th>과목</th><th>일반</th><th>과중</th><th>학점</th><th>시수</th><th>소계</th>`).join('')}${items.map(it=>`<th>${esc(it.name)}<br><span class="muted">(${num(it['need'+sem])})</span></th>`).join('')}<th>창체계</th></tr>`;
  let body='';
  blocks.forEach(b=>{
    if (b.type==='major'){
      const al = {...((S.chang.alloc[sem]||{})[b.major]||{}),[ONLINE_ITEM_ID]:cgSharedAllocated('온라인',b.major,sem)};
      for(let i=0;i<b.n;i++){
        body += '<tr>';
        if(i===0) body += `<td class="maj" rowspan="${b.n}">${esc(b.major)}<br><button class="link small noprint" style="font-size:11.5px" data-act="zoomMajor" data-m="${esc(b.major)}">🔍확대</button></td>`;
        [3,2,1].forEach(g=>{
          const s = b.per[g][i];
          if (s){
            const off=!active(s);
            body += `<td class="${off?'off':''}"><b>${esc(s.name)}</b></td>${renderGSCountCells(s)}<td class="n">${s.credits}</td><td class="n strong">${hoursOf(s)||''}</td>`;
          } else body += '<td></td><td></td><td></td><td></td><td></td>';
          if(i===0) body += `<td class="n sum" rowspan="${b.n}">${b.gradeH[g]||''}</td>`;
        });
        if(i===0){
          body += `<td class="n sum strong" rowspan="${b.n}">${b.st.subj||''}</td><td class="n cg-need-value" rowspan="${b.n}">${cgFmtNeed(cgNeededMajor(b.major,sem))}</td>`;
          body += items.map(it=>`<td class="n" rowspan="${b.n}">${num(al[it.id])||''}</td>`).join('');
          body += `<td class="n sum" rowspan="${b.n}">${b.st.ch||''}</td><td class="n sum strong" rowspan="${b.n}">${b.st.total||''}</td><td class="n" rowspan="${b.n}">${b.st.tutor||''}</td><td class="n strong" rowspan="${b.n}">${fmt1(b.st.avg)}</td>`;
        }
        body += '</tr>';
      }
    } else {
      const cls = b.type==='group'?'grp':'tot';
      const chs = items.map(it=>{ const list=b.list||displayMajors(); return list.reduce((t,m)=>t+cgItemAllocated(it,m,sem),0); });
      const gH = g => (b.list||displayMajors()).reduce((t,m)=>t+majorGradeHours(m,sem,g),0);
      body += `<tr class="${cls}"><td class="c">${esc(b.name)}</td>${[3,2,1].map(g=>`<td colspan="5"></td><td class="n">${gH(g)}</td>`).join('')}<td class="n">${b.st.subj}</td><td class="n cg-need-value">${cgFmtNeed(cgNeededGroup(b.list||displayMajors(),sem))}</td>${chs.map((v,i)=>{const need=num(items[i]['need'+sem]); const bad=b.type==='total'&&need&&v!==need; return `<td class="n" ${bad?'style="color:var(--bad)" title="필요 '+need+'"':''}>${v||''}</td>`;}).join('')}<td class="n">${b.st.ch}</td><td class="n">${b.st.total}</td><td class="n">${b.st.tutor||''}</td><td class="n">${fmt1(b.st.avg)}</td></tr>`;
    }
  });
  return `<table class="t summary-compact"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table>`;
}

function buildZoomSummaryHTML(){
  const majors = displayMajors();
  const targetMajors = UI.zoomMajor==='all' ? majors : majors.filter(m=>m===UI.zoomMajor || (GROUPS[UI.zoomMajor] && GROUPS[UI.zoomMajor].includes(m)));
  const cards = targetMajors.map(m=>{
    const st1 = majorStats(m,1), st2 = majorStats(m,2);
    const semTables = [1,2].map(sem=>{
      const subs = S.subjects.filter(s=>s.major===m && s.sem===sem && s.sections.length>0)
        .sort((a,b)=>b.grade-a.grade||(a.kind==='선택')-(b.kind==='선택')||natCmp(a.name,b.name));
      const rows = subs.map(s=>`<tr class="${active(s)?'':'excl'}">
        <td class="c num-lg">${s.grade}</td>
        <td><b>${esc(s.name)}</b> <span class="pill">${s.kind}</span></td>
        ${renderGSCountCells(s)}
        <td class="n">${s.credits}</td>
        <td class="n strong">${hoursOf(s)}</td>
      </tr>`).join('');
      const st = sem===1?st1:st2;
      return `<div style="flex:1 1 340px">
        <div class="row" style="margin-bottom:6px;justify-content:space-between">
          <b style="font-size:15px;color:var(--accent)">● ${sem}학기</b>
          <span class="small">교과 <b>${st.subj}</b> + 창체 <b>${st.ch}</b> = <b>${st.total}</b>시수 ${st.avg!=null?`(평균 <b>${fmt1(st.avg)}</b>)`:''}</span>
        </div>
        <div class="tablewrap"><table class="t">
          <thead><tr><th>학년</th><th>과목명</th><th>일반</th><th>과중</th><th>학점</th><th>시수</th></tr></thead>
          <tbody>${rows||`<tr><td colspan="6" class="c muted">${sem}학기 개설 과목 없음</td></tr>`}</tbody>
        </table></div>
      </div>`;
    }).join('');
    return `<div class="zoom-card">
      <h3>
        <span>${esc(m)} <small class="muted" style="font-size:13px;font-weight:500">${`연간 필요정원 ${cgFmtNeed(cgNeededMajor(m,null))}명`}</small></span>
        <span style="font-size:14.5px;color:var(--ink-sub)">1학기 <b>${st1.total}</b> / 2학기 <b>${st2.total}</b>시수</span>
      </h3>
      <div class="row" style="align-items:flex-start;gap:12px">${semTables}</div>
    </div>`;
  }).join('');

  return `<div>
    <div class="row" style="margin-bottom:12px">
      <b>교과(전공) 선택:</b>
      <select data-ui="zoomMajor" style="font-weight:700">
        <option value="all" ${UI.zoomMajor==='all'?'selected':''}>전체 전공 한눈에 보기</option>
        <option value="사회" ${UI.zoomMajor==='사회'?'selected':''}>사회 교과군 전체</option>
        <option value="과학" ${UI.zoomMajor==='과학'?'selected':''}>과학 교과군 전체</option>
        ${majors.map(m=>`<option value="${esc(m)}" ${UI.zoomMajor===m?'selected':''}>${esc(m)}</option>`).join('')}
      </select>
    </div>
    <div class="zoom-grid">${cards}</div>
  </div>`;
}


/* 1·2학기 동시 보기: 같은 학년·전공·과목은 하나의 행으로 결합한다.
   과목이 한 학기에만 있으면 다른 학기는 —로 표시한다. */
function bothSummaryModel(){
  const majors=displayMajors(), out=[];
  const rowOf=s=>{
    const sections=active(s)?s.sections.length:0;
    return {sections, credits:sections?num(s.credits):0, hours:hoursOf(s), exists:true};
  };
  let grand=[0,0];
  majors.forEach((m,i)=>{
    const courses=new Map();
    S.subjects.filter(s=>s.major===m && s.sections.length>0).forEach(s=>{
      const key=s.grade+'|'+norm(s.name);
      if(!courses.has(key)) courses.set(key,{major:m,grade:s.grade,name:s.name,sem:{1:null,2:null}});
      const item=courses.get(key), a=item.sem[s.sem], b=rowOf(s);
      if(a){a.sections+=b.sections;a.hours+=b.hours;if(a.credits!==b.credits)a.credits='혼합';}
      else item.sem[s.sem]=b;
    });
    const courseList=[...courses.values()].sort((a,b)=>b.grade-a.grade||natCmp(a.name,b.name));
    courseList.forEach(c=>out.push({type:'course',...c}));
    const s1=majorHours(m,1),s2=majorHours(m,2);
    grand[0]+=s1; grand[1]+=s2;
    out.push({type:'major',major:m,tot:[s1,s2]});
    const grp=groupOf(m), next=majors[i+1];
    if(grp && groupOf(next)!==grp){const list=GROUPS[grp].filter(x=>majors.includes(x));out.push({type:'group',major:grp+' 계',tot:[1,2].map(sem=>list.reduce((a,mm)=>a+majorHours(mm,sem),0))});}
  });
  out.push({type:'grand',major:'전체',tot:grand});
  return out;
}
function buildBothSummaryHTML(){
  const td=(v,cls='')=>`<td class="c ${cls}">${v==null||v===''?'—':v}</td>`;
  const out=bothSummaryModel().map(r=>{
    if(r.type==='course'){
      const info=[1,2].map(sem=>{
        const s=r.sem[sem];
        return s?[td(s.sections,'cg-sem'+sem),td(s.credits,'cg-sem'+sem),td(s.hours,'cg-net cg-sem'+sem)]:[td(null,'cg-grey'),td(null,'cg-grey'),td(null,'cg-grey')];
      });
      const year=(Number(r.sem[1]?.hours||0)+Number(r.sem[2]?.hours||0))/2;
      return `<tr><td class="c">${esc(r.major)}</td><td class="c">${r.grade}</td><td class="cg-course-name" title="${esc(r.name)}">${esc(r.name)}</td>${info.flat().join('')}<td class="c cg-yearavg">${fmt1(year)}</td><td class="c cg-grey">—</td></tr>`;
    }
    const cls=r.type==='grand'?'cg-grand-total':r.type==='group'?'cg-group-total':'cg-major-total';
    return `<tr class="${cls}"><td>${esc(r.major)}</td><td></td><td>${r.type==='major'?'전공 소계':'합계'}</td><td></td><td></td>${td(r.tot[0],'cg-net')}<td></td><td></td>${td(r.tot[1],'cg-net')}${td(fmt1((r.tot[0]+r.tot[1])/2),'cg-yearavg')}${td(cgFmtNeed(r.type==='major'?cgNeededMajor(r.major,null):cgNeededGroup(r.type==='grand'?displayMajors():GROUPS[r.major.replace(' 계','')]||[],null)),'cg-need-value')}</tr>`;
  }).join('');
  return `<div class="cg-both-head"><div><h3 style="margin:0 0 4px">1·2학기 과목별 한 줄 비교</h3><p class="cg-help">과목별 분반 이름·인원은 생략했습니다. '전공없음' 과목은 맨 아래 전공없음 줄에 따로 모여 있어요. <b>반 수</b>는 개설 분반 수, <b>단위 시수</b>는 분반당 시수, <b>합</b>은 반 수 × 단위 시수입니다.</p></div></div>
  <div class="tablewrap cg-both-scroll"><table class="t cg-both-summary"><thead><tr><th rowspan="2">전공</th><th rowspan="2">학년</th><th rowspan="2">과목명</th><th colspan="3">1학기</th><th colspan="3">2학기</th><th rowspan="2">연간<br>평균 합</th><th rowspan="2">전공별<br>필요정원</th></tr><tr><th>반 수</th><th>단위 시수</th><th>합</th><th>반 수</th><th>단위 시수</th><th>합</th></tr></thead><tbody>${out}</tbody></table></div>`;
}

function vSummary(){
  const mode = UI.sumMode || 'single';
  let content = '';
  if (mode === 'single'){
    content = `<div class="tablewrap">${buildSummaryTableHTML(UI.sem)}</div>`;
  } else if (mode === 'both'){
    content = buildBothSummaryHTML();
  } else if (mode === 'zoom'){
    content = buildZoomSummaryHTML();
  }

  return `<div class="panel">
    <div class="row" style="margin-bottom:12px">
      <h2 style="margin:0">${S.year}학년도 총괄 배당표</h2>
      <span class="seg">
        <button data-summode="single" data-v="1" class="${mode==='single'&&UI.sem===1?'on':''}">1학기</button>
        <button data-summode="single" data-v="2" class="${mode==='single'&&UI.sem===2?'on':''}">2학기</button>
        <button data-summode="both" class="${mode==='both'?'on':''}">1·2학기 동시 보기</button>
        <button data-summode="zoom" class="${mode==='zoom'?'on':''}">과목별 크게 보기</button>
      </span>
      <span class="muted small">혼합 = 일반·과중 학생이 섞인 분반</span>
      <span style="flex:1"></span>
      ${printBtn('printSummary')}
    </div>
    ${content}
  </div>`;
}

function printBtn(act){ return `<button class="btn" data-act="${act}">🖨️ ${inFrame()?'인쇄 파일 저장':'인쇄'}</button>`; }
const inFrame = () => { try{ return window.self!==window.top; }catch(e){ return true; } };

/* ----- 4. 1·2학기 비교 탭 ----- */
function compareRows(){
  const majors = displayMajors(); const rows=[];
  majors.forEach((m,idx)=>{
    rows.push({name:m, cls:'', s1:majorStats(m,1), s2:majorStats(m,2), indent:!!groupOf(m)});
    const g=groupOf(m); if(g && groupOf(majors[idx+1])!==g){ const list=GROUPS[g].filter(x=>majors.includes(x)); rows.push({name:g+' 계', cls:'grp', s1:sumStats(list,1), s2:sumStats(list,2)}); }
  });
  rows.push({name:'전체', cls:'tot', s1:sumStats(majors,1), s2:sumStats(majors,2)});
  return rows;
}
function vCompare(){
  const rows = compareRows();
  const body = rows.map(r=>{
    const d = (r.s1.avg!=null&&r.s2.avg!=null)? r.s2.avg-r.s1.avg : null;
    const yr = r.s1.quota? (r.s1.total+r.s2.total-r.s1.tutor-r.s2.tutor)/2/r.s1.quota : null;
    return `<tr class="${r.cls}"><td ${r.indent?'style="padding-left:18px;font-weight:600"':'style="font-weight:700"'}>${esc(r.name)}</td><td class="n cg-need-value">${cgFmtNeed(r.cls?cgNeededGroup(r.cls==='tot'?displayMajors():GROUPS[r.name.replace(' 계','')]||[],null):cgNeededMajor(r.name,null))}</td>
      <td class="n">${r.s1.subj}</td><td class="n">${r.s1.ch||''}</td><td class="n">${r.s1.tutor||''}</td><td class="n strong">${fmt1(r.s1.avg)}</td>
      <td class="n">${r.s2.subj}</td><td class="n">${r.s2.ch||''}</td><td class="n">${r.s2.tutor||''}</td><td class="n strong">${fmt1(r.s2.avg)}</td>
      <td class="n" style="${d>0?'color:var(--bad)':d<0?'color:var(--ok)':''}">${d==null?'':(d>0?'+':'')+fmt1(d)}</td><td class="n strong">${fmt1(yr)}</td></tr>`;
  }).join('');
  return `<div class="panel"><div class="row" style="margin-bottom:10px"><h2 style="margin:0">전공별 1·2학기 시수 비교</h2><span class="muted small">평균 = (교과 + 창체·부장 등 − 강사) ÷ 정원 · 필요정원 = 그 전공 시수 ÷ 교사 1인 평균 시수</span><span style="flex:1"></span>${printBtn('printCompare')}</div>
  <div class="tablewrap"><table class="t"><thead>
   <tr><th rowspan="2">교과(전공)</th><th rowspan="2">필요정원<br><small>(연간)</small></th><th colspan="4">1학기</th><th colspan="4">2학기</th><th rowspan="2">증감(2−1)</th><th rowspan="2">연간 평균</th></tr>
   <tr><th>교과</th><th>창체</th><th>강사</th><th>평균</th><th>교과</th><th>창체</th><th>강사</th><th>평균</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
}

/* ----- 5. 정원·강사·창체 탭 ----- */
function vChang(){
  const sem=UI.changSem,items=cgExtraItems(),majors=displayMajors();
  const teacherMajors=majors.filter(m=>!isShared(m)&&m!==NOMAJOR);
  const br1=cgBreakdown(1),br2=cgBreakdown(2),b=cgBreakdown(sem);
  const cQ=cgQuotaInfo(),schoolAvg=cgSchoolAverage();
  const sumTeach=teacherMajors.reduce((t,m)=>t+num(cap(m).quota),0);
  const capRows=majors.map(m=>{
    const c=cap(m),shared=isShared(m)||m===NOMAJOR;
    return `<tr><td><b>${esc(majorLabel(m))}</b>${shared?`<br><span class="cg-shared-label">${m===NOMAJOR?'정원 계산에서 빠짐':'다른 전공에 나눠 줌'}</span>`:''}</td>
      <td class="n">${shared?'—':cgEffectiveHours(m,1)}</td>
      <td class="n">${shared?'—':cgEffectiveHours(m,2)}</td>
      <td class="n cg-need-value"><b>${shared?(m===NOMAJOR?'제외':'나눠 줌'):cgFmtNeed(cgNeededMajor(m,null))}</b></td>
      <td class="c">${shared?'<span class="muted small">—</span>':m==='진로'?'<b title="1학년 진로 수업 전담 1명">1명 (전담)</b>':`<input type="number" min="0" data-cap="${m}" data-f="quota" value="${c.quota??''}" placeholder="미입력">`}</td>
      <td class="c">${shared?'—':`<input type="number" min="0" data-cap="${m}" data-f="tutor1" value="${c.tutor1??''}">`}</td>
      <td class="c">${shared?'—':`<input type="number" min="0" data-cap="${m}" data-f="tutor2" value="${c.tutor2??''}">`}</td>
      <td>${shared?'':`<input type="text" style="width:132px" data-cap="${m}" data-f="memo" value="${esc(c.memo||'')}">`}</td></tr>`;
  }).join('');
  const itemRows=S.chang.items.map((it,i)=>`<tr><td><input type="text" style="width:150px;font-weight:600" data-item="${i}" data-f="name" value="${esc(it.name)}"></td>
    <td class="c"><input type="number" min="0" data-item="${i}" data-f="need1" value="${it.need1}"></td>
    <td class="c"><input type="number" min="0" data-item="${i}" data-f="need2" value="${it.need2}"></td>
    <td><button class="btn sm danger" data-act="itemDel" data-i="${i}">삭제</button></td></tr>`).join('');
  const al=S.chang.alloc[sem]=S.chang.alloc[sem]||{};
  const colTot=items.map(it=>teacherMajors.reduce((t,m)=>t+cgItemAllocated(it,m,sem),0));
  const grid=teacherMajors.map(m=>`<tr><td><b>${esc(m)}</b></td>${items.map(it=>it.id===ONLINE_ITEM_ID?`<td class="c cg-online-col"><input type="number" min="0" class="w40" data-shared="온라인" data-shmaj="${esc(m)}" value="${cgItemAllocated(it,m,sem)||''}" aria-label="${esc(m)} 온라인 배정시수"></td>`:`<td class="c"><input type="number" min="0" class="w40" data-al="${m}" data-item="${it.id}" value="${(al[m]||{})[it.id]??''}"></td>`).join('')}<td class="n strong">${changOf(m,sem)||''}</td></tr>`).join('');
  const chk=items.map((it,i)=>{
    const need=num(it['need'+sem]),v=colTot[i],ok=v===need;
    return `<td class="c"><b>${v}/${need}</b> ${ok?'<span class="pill ok">✓</span>':`<span class="pill ${v>need?'bad':'warn'}">${v>need?'+':''}${v-need}</span>`}</td>`;
  }).join('');
  const sources=cgSharedSources(sem);
  const sharedGrid=teacherMajors.map(m=>`<tr><td><b>${esc(m)}</b></td>${sources.map(source=>`<td class="c"><input type="number" min="0" step="1" class="w40" data-shared="${esc(source)}" data-shmaj="${esc(m)}" value="${((((S.sharedAlloc||{})[sem]||{})[source]||{})[m])??''}" aria-label="${esc(m)} ${esc(source)} 배정시수"></td>`).join('')}<td class="n strong">${cgSharedTarget(m,sem)||''}</td></tr>`).join('');
  const sharedChecks=sources.map(source=>{
    const need=majorHours(source,sem),v=cgSharedAssigned(source,sem),diff=need-v;
    return `<td class="c"><b>${v}/${need}</b> <span class="pill ${diff===0?'ok':diff<0?'bad':'warn'}">${diff===0?'✓':diff>0?diff+' 남음':(-diff)+' 넘침'}</span></td>`;
  }).join('');
  const gapText=(g)=>g===0?'다 나눔':g>0?`${fmt1(g)}시수 남음`:`${fmt1(-g)}시수 넘침`;
  const warnings=[];
  if(b.changGap!==0)warnings.push(`창체·부장 등 ${gapText(b.changGap)}`);
  if(b.share.gap!==0)warnings.push(`통합 과목 ${gapText(b.share.gap)}`);
  const status=warnings.length?`<div class="cg-balance-alert" role="status"><b>${sem}학기 아직 나누지 않은 시수</b> · ${esc(warnings.join(' / '))}</div>`:
      `<div class="cg-balance-good" role="status">${sem}학기 창체·부장 등과 통합 과목 시수를 모두 나눴어요.</div>`;
  return `<div class="cg-capacity-page">
    <div class="panel"><h2>① 교사 정원</h2><p class="cg-help" style="margin-top:-4px">학교 전체 정원을 넣거나, 비워 두고 아래 표에 전공별 정원을 넣으세요. 넣으면 평균 시수와 전공별 필요정원이 계산돼요.</p>
      <div class="cg-school-quota">
        <div class="cg-quota-field"><label for="cgSchoolQuota">학교 전체 교사 정원</label><input id="cgSchoolQuota" data-schoolquota="1" type="number" min="1" step="1" placeholder="정원 확정 후 입력" value="${S.schoolQuota??''}"><small>진로 교사 1명 포함 · 비워 두면 전공별 정원을 더해요</small></div>
        <div class="cg-quota-metric"><span>학교 전체 시수 (1·2학기 평균)</span><strong>${fmt1((br1.total+br2.total)/2)}</strong><small>교과 + 창체·부장 등 − 강사</small></div>
        <div class="cg-quota-metric"><span>교사 1인 평균 시수</span><strong>${schoolAvg==null?'—':fmt1(schoolAvg)}</strong><small>${schoolAvg==null?'정원을 넣으면 계산돼요':'시수/명'}</small></div>
      </div>
      <div class="tablewrap cg-school-breakdown"><table class="t"><thead><tr><th>학기</th><th>교과<br><small>통합 포함</small></th><th>창체·부장 등</th><th>강사 담당</th><th>학교 전체 시수</th><th>전공에 나눈 시수</th><th>남은 시수</th></tr></thead><tbody>
        ${[1,2].map(n=>{const x=cgBreakdown(n);return `<tr><td class="c"><b>${n}학기</b></td><td class="n">${x.curriculum}</td><td class="n">+ ${x.extra}</td><td class="n">${x.tutor?'- '+x.tutor:'0'}</td><td class="n strong">${x.total}</td><td class="n">${x.allocated}</td><td class="n"><span class="pill ${x.gap===0?'ok':x.gap>0?'warn':'bad'}">${x.gap===0?'다 나눔':x.gap>0?x.gap+'시수 남음':(-x.gap)+'시수 넘침'}</span></td></tr>`;}).join('')}
      </tbody></table></div>
      <details class="cg-calc"><summary>계산 방법 보기</summary><p class="cg-help"><b>교사 1인 평균 시수</b> = (교과 시수 + 창체·부장 등 − 강사 시수)의 1·2학기 평균 ÷ 교사 정원<br>
      <b>전공별 필요정원</b> = (그 전공의 교과 시수 + 그 전공이 나눠 받은 창체·부장·통합 시수 − 강사 시수)의 1·2학기 평균 ÷ 교사 1인 평균 시수<br>
      '전공없음' 과목은 정원 계산에서 빠져요. 1학년 진로는 진로 교사 1명이 맡는 교과로 한 번만 계산해요. 지금 정원 기준: ${esc(cQ.source)}.</p></details>
      ${[1,2].some(n=>cgDuplicateWarnings(n))?`<div class="cg-balance-alert"><b>겹쳐서 계산될 뻔한 시수</b> · ${[1,2].map(n=>cgDuplicateWarnings(n)?`${n}학기: ${esc(cgDuplicateWarnings(n))}`:'').filter(Boolean).join(' / ')}</div>`:''}
    </div>
    <div class="panel"><h2>② 전공별 정원·강사 시수</h2><p class="cg-help" style="margin-top:-4px">강사 시수 = 학교 교사가 아닌 강사가 맡는 시수예요. 평균을 낼 때 빼요.</p>
      <div class="tablewrap"><table class="t"><thead><tr><th>전공</th><th>1학기<br>시수</th><th>2학기<br>시수</th><th>필요정원<br><small>(연간)</small></th><th>교사 정원(명)</th><th>강사 시수<br>1학기</th><th>강사 시수<br>2학기</th><th>메모</th></tr></thead><tbody>${capRows}
      <tr class="tot"><td>학교 전체</td><td class="n">${br1.total}</td><td class="n">${br2.total}</td><td class="n cg-need-value">${cgFmtNeed(cgNeededSchool(null))}</td><td class="n">${cQ.quota??'—'}</td><td class="n">${br1.tutor}</td><td class="n">${br2.tutor}</td><td></td></tr></tbody></table></div>
    </div>
    <div class="panel"><h2>③ 창체·부장 등 필요 시수</h2>
      <p class="cg-help">학교 전체에서 맡아야 하는 시수예요. 예: 담임(자치) 30학급이면 30. 1학년 진로는 진로 교사가 맡는 교과로 따로 계산돼요.</p>
      <div class="tablewrap"><table class="t"><thead><tr><th>항목</th><th>1학기</th><th>2학기</th><th></th></tr></thead><tbody>${itemRows}</tbody></table></div>
      <div class="row" style="margin-top:8px"><button class="btn pri sm" data-act="itemAdd">+ 항목 추가</button></div>
    </div>
    <div class="panel"><div class="row" style="margin-bottom:10px"><h2 style="margin:0">④ 창체·부장 시수를 전공별로 나누기</h2> ${semSeg('changSem')}
      <span style="flex:1"></span><button class="btn sm" data-act="copyChang">${sem}학기 값을 ${3-sem}학기에도 똑같이</button><button class="btn sm" data-act="fillFromTeachers">교사 탭에 적은 값으로 채우기</button></div>
      <div class="tablewrap"><table class="t"><thead><tr><th>전공</th>${items.map(it=>`<th>${esc(it.name)}</th>`).join('')}<th>합계</th></tr></thead>
      <tbody>${grid}<tr class="tot"><td>나눈 시수 / 필요</td>${chk}<td class="n">${colTot.reduce((a,bb)=>a+bb,0)} / ${cgChangNeed(sem)}</td></tr></tbody></table></div>
    </div>
    <div class="panel"><h2>⑤ 통합 과목 시수를 전공별로 나누기</h2>
      <p class="cg-help">통합사회·통합과학처럼 전담 교사가 없는 과목이에요. 맡을 전공에 시수를 나눠 적어 주세요.</p>
      ${sources.length?`<div class="tablewrap"><table class="t"><thead><tr><th>담당 전공</th>${sources.map(source=>`<th>${esc(source)}<br><small>총 ${majorHours(source,sem)}시수</small></th>`).join('')}<th>배정 합계</th></tr></thead>
      <tbody>${sharedGrid}<tr class="tot"><td>나눈 시수 / 필요</td>${sharedChecks}<td class="n">${b.share.assigned} / ${b.share.target}</td></tr></tbody></table></div>`:'<p class="muted small">이 학기에는 나눌 통합 과목이 없어요.</p>'}
      ${status}
    </div>
  </div>`;
}

/* ----- 6. 교사 탭 ----- */
function vTeachers(){
  const sem=UI.teachSem, items=cgExtraItems(), avg=cgSchoolAverage();
  const roster=S.teachers.map(t=>({t,...teacherLoad(t,sem)}));
  const rosterAvg=roster.length?roster.reduce((n,r)=>n+r.total,0)/roster.length:null;
  const ref=avg!=null?avg:rosterAvg;
  const sorted=[...roster].sort((a,b)=>UI.teachSort==='low'?a.total-b.total:UI.teachSort==='high'?b.total-a.total:MAJOR_IDS.indexOf(a.t.major)-MAJOR_IDS.indexOf(b.t.major)||natCmp(a.t.name,b.t.name));
  const balanceRows=sorted.map(({t,subj,extra,total})=>{
    const d=ref==null?null:total-ref;
    const barMax=Math.max(ref||0, ...roster.map(r=>r.total),1);
    const pct=Math.min(100,Math.max(0,total/barMax*100));
    return `<tr><td><b>${esc(t.name||'이름 미입력')}</b><br><span class="muted small">${esc(t.major)}</span></td><td class="n">${subj}</td><td class="n">${extra}</td><td class="n strong">${total}</td><td class="n"><span class="cg-load-diff ${d==null?'':d>0.05?'over':d<-.05?'under':'near'}">${d==null?'—':(d>0?'+':'')+fmt1(d)}</span></td><td><div class="cg-load-track" title="${esc(t.name)}: ${total}시수"><div class="cg-load-fill ${d!=null&&d>0.05?'over':''}" style="width:${pct}%"></div></div></td></tr>`;
  }).join('');
  const rows=sorted.map(({t,subj,extra,total})=>{
    const a=((t.chang=t.chang||{})[sem]=t.chang[sem]||{});
    return `<tr><td><select data-t="${t.id}" data-f="major">${!TEACHER_MAJORS.includes(t.major)?`<option value="${esc(t.major)}" selected disabled>전공 재지정 필요 (${esc(t.major)})</option>`:''}${TEACHER_MAJORS.map(m=>`<option ${m===t.major?'selected':''}>${m}</option>`).join('')}</select></td>
      <td><input type="text" style="width:100px;font-weight:700" data-t="${t.id}" data-f="name" value="${esc(t.name)}"></td>
      <td><input type="text" style="width:140px" data-t="${t.id}" data-f="note" value="${esc(t.note||'')}" placeholder="부장·담임 등"></td>
      ${items.map(it=>`<td class="c ${it.id===ONLINE_ITEM_ID?'cg-online-col':''}"><input type="number" min="0" class="w40" data-tc="${t.id}" data-item="${it.id}" value="${a[it.id]??''}" title="${esc(it.name)} 교사별 담당 시수"></td>`).join('')}
      <td class="n strong">${subj||''}</td><td class="n">${extra||''}</td><td class="n strong">${total||''}</td>
      <td><button class="btn sm danger" data-act="tDel" data-id="${t.id}">삭제</button></td></tr>`;
  }).join('');
  const metric=(name,value,desc)=>`<div class="cg-load-metric"><span>${name}</span><strong>${value}</strong><small>${desc}</small></div>`;
  const refName=avg!=null?'교사 1인 평균':'등록 교사 평균';
  return `<div class="cg-teacher-page">
    <div class="panel"><div class="row cg-head-row"><div><h2 style="margin:0">교사 명단</h2><p class="cg-help">[여러 명 붙여넣기]로 한 번에 넣을 수 있어요. 교사마다 창체·부장 시수를 적으면, 5단계에서 [교사 탭에 적은 값으로 채우기]로 전공별 표에 옮길 수 있어요.</p></div><span style="flex:1"></span><button class="btn sm" data-act="tAdd">+ 교사 1명 추가</button><button class="btn pri sm" data-act="tBulk">📋 여러 명 붙여넣기</button></div>
      ${S.teachers.length?`<div class="tablewrap"><table class="t"><thead><tr><th>전공</th><th>이름</th><th>비고</th>${items.map(it=>`<th class="${it.id===ONLINE_ITEM_ID?'cg-online-col':''}">${esc(it.name)}</th>`).join('')}<th>교과</th><th>창체·부장 등</th><th>총시수</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="info">아직 교사가 없어요. [📋 여러 명 붙여넣기]를 눌러 <b>전공 이름</b>을 한 줄에 한 명씩 붙여 넣으세요. 예: 수학 김남훈</div>'}
    </div>
    <div class="panel"><div class="row cg-head-row"><div><h2 style="margin:0">교사별 시수 비교</h2><p class="cg-help">맡은 분반 시수와 창체·부장 등을 더해서 비교해요. 분반 배정이나 시수를 바꾸면 바로 바뀌어요.</p></div>${semSeg('teachSem')}<select data-ui="teachSort" aria-label="교사 표시 순서"><option value="major" ${UI.teachSort==='major'?'selected':''}>전공순</option><option value="low" ${UI.teachSort==='low'?'selected':''}>총시수 낮은 순</option><option value="high" ${UI.teachSort==='high'?'selected':''}>총시수 높은 순</option></select></div>
      <div class="cg-load-metrics">${metric('등록된 교사',roster.length+'명','교사 명단 기준')}${metric('교사 1인 평균 시수',avg==null?'—':fmt1(avg),'5단계에서 정원을 넣으면 계산돼요')}${metric('등록 교사 평균',rosterAvg==null?'—':fmt1(rosterAvg),'지금 입력된 교사 기준')}</div>
      ${roster.length?`<div class="tablewrap"><table class="t cg-load-table"><thead><tr><th>교사 · 전공</th><th>교과</th><th>창체·부장 등</th><th>총시수</th><th>${refName}과 차이</th><th style="width:30%">비교</th></tr></thead><tbody>${balanceRows}</tbody></table></div><p class="cg-help">${avg==null?'아직 교사 정원이 없어서 <b>등록된 교사들끼리의 평균</b>과 비교하고 있어요.':'교사 1인 평균 시수와 비교해요.'} 분반을 아직 안 맡은 교사는 교과 시수가 0으로 보여요.</p>`:'<div class="info">교사 명단을 넣으면 여기에서 교사별 시수를 비교할 수 있어요.</div>'}
    </div>
  </div>`;
}

/* ----- 7. 교과별 분반 배정 탭 ('온라인' 전공은 모든 교사가 제약 없이 담당 가능) ----- */
function assignScope(key){ return GROUPS[key] ? GROUPS[key] : [key]; }
function assignModel(key, sem){
  const majors = assignScope(key);
  const subs = S.subjects.filter(s=>majors.includes(s.major)&&s.sem===sem&&active(s)).sort((a,b)=>b.grade-a.grade||MAJOR_IDS.indexOf(a.major)-MAJOR_IDS.indexOf(b.major)||(a.kind==='선택')-(b.kind==='선택')||natCmp(a.name,b.name));
  const pool = poolMajors(majors);
  const teachers = S.teachers.filter(t=>pool.includes(t.major));
  subs.forEach(s=>s.sections.forEach(x=>{ if(x.teacher && !teachers.find(t=>t.id===x.teacher)){ const t=S.teachers.find(t=>t.id===x.teacher); if(t) teachers.push(t);} }));
  return {majors, subs, teachers};
}
function teacherOptions(cur, majors0){
  const isCommon = majors0.includes('온라인');
  const majors = poolMajors(majors0);
  const own = S.teachers.filter(t=>majors.includes(t.major)).sort((a,b)=>MAJOR_IDS.indexOf(a.major)-MAJOR_IDS.indexOf(b.major)||natCmp(a.name,b.name));
  const other = S.teachers.filter(t=>!majors.includes(t.major)).sort((a,b)=>MAJOR_IDS.indexOf(a.major)-MAJOR_IDS.indexOf(b.major)||natCmp(a.name,b.name));
  const o = t => `<option value="${t.id}" ${t.id===cur?'selected':''}>${esc(t.name)}${(isCommon || !majors.includes(t.major))?' ('+t.major+')':''}</option>`;
  return `<option value="">— 미배정 —</option>${own.map(o).join('')}${other.length?`<optgroup label="다른 전공">${other.map(o).join('')}</optgroup>`:''}`;
}
function vAssign(){
  const sem=UI.sem, key=UI.assignMajor; const {majors, subs, teachers} = assignModel(key, sem);
  const keys = [...usedMajors(), '사회','과학'];
  let body='';
  subs.forEach(s=>{
    s.sections.forEach((x,i)=>{
      const trk = x.track||'g';
      const trkLabel = trk==='m' ? `혼합(${x.gN||0}/${x.sN||0})` : (trk==='s'?'과중':'일반');
      body += `<tr>${i===0?`<td class="c num-lg" rowspan="${s.sections.length}">${s.grade}</td><td rowspan="${s.sections.length}"><b>${esc(s.name)}</b>${majors.length>1||s.major==='온라인'?`<br><span class="muted small">${s.major==='온라인'?'온라인(전 교사 배정 가능)':s.major}</span>`:''}<br><span class="muted small">${s.credits}학점 · ${s.sections.length}분반</span><br><select class="small" style="margin-top:4px" data-bulk="${s.id}"><option value="">일괄 지정…</option>${teacherOptions('',majors).replace('<option value="">— 미배정 —</option>','')}</select></td>`:''}
        <td class="c num-lg">${esc(x.label)}</td><td class="c"><span class="pill ${trk}">${trkLabel}</span></td><td class="n">${x.n??''}</td><td class="n strong">${s.credits}</td>
        <td class="teach"><select data-asg="${s.id}" data-i="${i}">${teacherOptions(x.teacher,majors)}</select></td></tr>`;
    });
  });
  const unassigned = subs.reduce((t,s)=>t+s.sections.filter(x=>!x.teacher).length,0);
  const total = subs.reduce((t,s)=>t+hoursOf(s),0);
  const tsum = teachers.map(t=>{ const sh=teacherSubjHours(t.id,sem), ch=teacherChang(t,sem);
    const list=[]; S.subjects.forEach(s=>{ if(s.sem!==sem||!active(s))return; const ls=s.sections.filter(x=>x.teacher===t.id).map(x=>x.label); if(ls.length) list.push(`${s.grade}${s.name}(${ls.join(',')})`); });
    return `<tr><td><b>${esc(t.name)}</b> <span class="muted small">${t.major}</span></td><td class="n">${sh}</td><td class="n">${ch||''}</td><td class="n strong">${sh+ch}</td><td class="small">${esc(list.join(' · '))}</td></tr>`; }).join('');
  return `<div class="panel"><div class="row" style="margin-bottom:10px"><h2 style="margin:0">교과별 분반 배정</h2>
     <select data-ui="assignMajor" style="font-weight:700">${keys.map(k=>`<option ${k===key?'selected':''} value="${k}">${GROUPS[k]?k+' 교과군 전체':k==='온라인'?'공동배분 과목 확인 (시수는 창체·교과외)':k===NOMAJOR?'전공없음 과목 (아무 교사나 배정)':k}</option>`).join('')}</select> ${semSeg('sem')}
     <span class="muted small">${subs.length}과목 · <b>${total}</b>시수 · 미배정 <b>${unassigned}</b>개</span><span style="flex:1"></span>
     ${printBtn('printAssign')}</div>
   <div class="split-a">
    <div class="tablewrap"><table class="t"><thead><tr><th>학년</th><th>과목</th><th>분반</th><th>과정</th><th>인원</th><th>시수</th><th>담당교사</th></tr></thead><tbody>${body||'<tr><td colspan="7" class="muted c">개설된 과목이 없습니다.</td></tr>'}</tbody></table></div>
    <div class="tablewrap"><table class="t"><thead><tr><th>교사</th><th>교과</th><th>창체</th><th>총계</th><th>담당 분반</th></tr></thead><tbody>${tsum||'<tr><td colspan="5" class="muted c">등록된 교사가 없습니다.</td></tr>'}</tbody></table></div>
   </div></div>`;
}


// 확정 상태 편집 방지: 화면 탐색, 보기 필터, 내보내기, 학년도 관리만 허용.
document.addEventListener('click',e=>{
  if(!S||S.workspaceStatus!=='confirmed')return;
  const b=e.target.closest('button');if(!b)return;
  if(b.closest('#tabs'))return;
  if(b.dataset.stepgo||b.dataset.subview||b.dataset.chkgrade)return; // 6.5 단계 이동은 허용
  if(['cgSwitchYear','cgNewYear','cgReopen','cgSnapshot','cgRestore','cgExportAll','cgImportAll'].includes(b.dataset.act))return;
  if(b.closest('#modal'))return;
  const allowG=['years','exportXlsx','settings'];if(b.dataset.gact&&allowG.includes(b.dataset.gact))return;
  if(b.dataset.gact){e.preventDefault();e.stopImmediatePropagation();toast('확정된 학년도예요. 7단계에서 잠금을 풀어야 고칠 수 있어요.');return;}
  if(!b.closest('#main')||UI.tab==='years')return;
  if(b.dataset.matg||b.dataset.mats||b.dataset.matgroup||b.dataset.semset||b.dataset.summode)return;
  if(['saveJson','exportXlsx','printSummary','printCompare','printAssign','zoomMajor'].includes(b.dataset.act))return;
  e.preventDefault();e.stopImmediatePropagation();toast('확정된 학년도예요. 7단계에서 잠금을 풀어야 고칠 수 있어요.');
},true);
document.addEventListener('change',e=>{
  if(!S||S.workspaceStatus!=='confirmed')return;
  const t=e.target;
  if(['fileAssign','filePyeonje','fileJson'].includes(t.id)){e.preventDefault();e.stopImmediatePropagation();t.value='';toast('확정된 학년도예요. 7단계에서 잠금을 풀어야 고칠 수 있어요.');return;}
  if(t.closest('#main')&&UI.tab!=='years'&&!t.dataset.ui){e.preventDefault();e.stopImmediatePropagation();render();toast('확정된 학년도예요. 7단계에서 잠금을 풀어야 고칠 수 있어요.');}
},true);

/* ========== 이벤트 처리 ========== */
const main = document.getElementById('main');

document.querySelector('header').addEventListener('click', e=>{
  const gb = e.target.closest('[data-gact]');
  if (!gb) return;
  const gact = gb.dataset.gact;
  if (gact === 'undo') doUndo();
  else if (gact === 'redo') doRedo();
  else if (gact === 'uploadAssign') document.getElementById('fileAssign').click();
  else if (gact === 'uploadPyeonje') document.getElementById('filePyeonje').click();
  else if (gact === 'exportXlsx') exportXlsx();
  else if (gact === 'years'){UI.tab='years';render();}
  else if (gact === 'settings'){ if(UI.tab!=='setup'&&UI.tab!=='years') UI.stReturn=UI.tab; UI.tab='setup';render();window.scrollTo(0,0);}
});

document.addEventListener('keydown', e=>{
  if ((e.ctrlKey || e.metaKey) && !e.altKey){
    if (e.key.toLowerCase() === 'z'){
      if (e.shiftKey){ e.preventDefault(); doRedo(); }
      else { e.preventDefault(); doUndo(); }
    } else if (e.key.toLowerCase() === 'y'){
      e.preventDefault(); doRedo();
    }
  }
});

document.getElementById('tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-tab]'); if(!b)return; UI.tab=b.dataset.tab; render(); });

main.addEventListener('click', async e=>{
  const sb = e.target.closest('[data-semset]'); if (sb){ UI[sb.dataset.semset]=+sb.dataset.v; render(); return; }
  const sm = e.target.closest('[data-summode]');
  if (sm){
    UI.sumMode = sm.dataset.summode;
    if (sm.dataset.v) UI.sem = +sm.dataset.v;
    render(); return;
  }
  const gp = e.target.closest('[data-matgroup]'); if(gp){ UI.matrixGroup = gp.dataset.matgroup; render(); return; }
  const mg = e.target.closest('[data-matg]'); if (mg){ UI.matrixGrade = +mg.dataset.matg; render(); return; }
  const ms = e.target.closest('[data-mats]'); if (ms){ UI.matrixSem = +ms.dataset.mats; render(); return; }
  const b = e.target.closest('[data-act]'); if(!b) return;
  const act=b.dataset.act, id=b.dataset.id, i=+b.dataset.i;
  switch(act){
    case 'cgGoReview': UI.tab='review';render();break;
    case 'cgReviewUpload':document.getElementById('fileAssign').click();break;
    case 'cgReviewFilter':UI.reviewFilter=b.dataset.filter;render();break;
    case 'cgReviewCancel':cgDiscardReview();break;
    case 'cgReviewApprove': {
      if(!cgPendingAssign||cgPendingAssign.fatal.length)break;
      const p=cgPendingAssign, s=p.comparison.summary;
      openConfirm(`${S.year}학년도 ${p.grade}학년 분반을 '${p.fileName}' 내용으로 바꿀까요? 바꾸기 전 상태는 '중간 저장'에 자동으로 남아요. 1학기 시수 ${s.bySem[1].oldHours}→${s.bySem[1].newHours}, 2학기 시수 ${s.bySem[2].oldHours}→${s.bySem[2].newHours}.`,()=>cgApproveAssign());
      break;
    }
    case 'cgSwitchYear': cgLoadYear(Number(b.dataset.year)); break;
    case 'cgNewYear': {
      const y=S.year+1;
      openConfirm(`${y}학년도 새 작업 공간을 만들까요? 이어지는 2·3학년 입학연도별 교육과정만 가져오며, 반편성·교사명단·교사정원·시수 배분은 새로 시작합니다. 현재 ${S.year}학년도 데이터는 보존됩니다.`,()=>cgCreateYear(y));
      break;
    }
    case 'cgUpdateCohort': {
      const g=Number(b.dataset.grade), entry=S.year-g+1;
      openConfirm(`${entry} 입학생의 공통 교육과정 원본을 지금 열려 있는 ${S.year}학년도 ${g}학년 편제표 내용으로 갱신할까요? 다른 학년도에 이미 저장된 자료는 즉시 변경되지 않으며 새 학년도 생성 시 반영됩니다.`,()=>{
        const updated=cgCohortFromState(g,true);
        if(updated){render();toast(`${entry} 입학생 교육과정 원본을 최신화했습니다`);}else toast('갱신할 편제표 항목이 없습니다');
      });
      break;
    }
    case 'cgSnapshot': {
      openModal('<h3>지금 상태 중간 저장</h3><p class="small muted">나중에 알아보기 쉬운 이름을 붙여 주세요.</p><input id="cgCpName" type="text" style="width:100%" maxlength="60" placeholder="예: 1차 반편성 확정 전"><div class="row" style="margin-top:12px"><button class="btn pri" id="mOk">저장</button><button class="btn" id="mCancel">취소</button></div>',m=>{m.querySelector('#mOk').onclick=()=>{const v=m.querySelector('#cgCpName').value.trim()||'작업본';closeModal();cgCheckpoint(v);};});
      break;
    }
    case 'cgConfirm':openConfirm(`${S.year}학년도를 확정하고 잠글까요? 나중에 잠금을 풀 수 있고, 확정할 때의 상태는 따로 남아요.`,()=>cgConfirmYear());break;
    case 'cgReopen':openConfirm('잠금을 풀고 다시 고칠 수 있게 할까요? 확정할 때의 상태는 중간 저장 목록에 그대로 남아요.',()=>cgReopenYear());break;
    case 'cgRestore':openConfirm('이 시점으로 되돌릴까요? 그 뒤에 고친 내용은 사라져요. 필요하면 먼저 [지금 상태 중간 저장]을 눌러 두세요.',()=>cgRestoreCheckpoint(id));break;
    case 'cgExportAll':cgExportAll();break;
    case 'cgImportAll':document.getElementById('filePortfolio').click();break;
    case 'zoomMajor': UI.sumMode='zoom'; UI.zoomMajor=b.dataset.m; render(); break;
    case 'editSecsModal': openSecEditModal(id); break;
    case 'addSubject': openAddSubject(); break;
    case 'itemAdd': S.chang.items.push({id:uid('c'),name:'새 항목',need1:0,need2:0}); commit(); break;
    case 'itemDel': S.chang.items.splice(i,1); commit(); break;
    case 'copyChang': { const f=UI.changSem, t=3-f; S.chang.alloc[t]=JSON.parse(JSON.stringify(S.chang.alloc[f]||{})); S.sharedAlloc[t]=S.sharedAlloc[t]||{}; S.sharedAlloc[t]['온라인']=JSON.parse(JSON.stringify((S.sharedAlloc[f]||{})['온라인']||{})); commit(); toast(`${f}학기 배정을 ${t}학기로 복사했습니다. 온라인 개설시수 차이를 확인하세요.`); break; }
    case 'fillFromTeachers': { if(S.teachers.some(t=>!TEACHER_MAJORS.includes(t.major))){toast('전공 미지정 교사가 있습니다. 교사 명단에서 전공을 먼저 지정해 주세요.');break;} const sem=UI.changSem; const al={}, online={}; S.teachers.forEach(t=>{ const a=(t.chang||{})[sem]||{}; S.chang.items.forEach(it=>{ const v=num(a[it.id]); if(v){ al[t.major]=al[t.major]||{}; al[t.major][it.id]=num(al[t.major][it.id])+v; } }); const o=num(a[ONLINE_ITEM_ID]); if(o)online[t.major]=num(online[t.major])+o; });
      if(!S.teachers.length){ toast('교사 명단에 입력된 값이 없어요'); break; } S.chang.alloc[sem]=al; S.sharedAlloc[sem]=S.sharedAlloc[sem]||{};S.sharedAlloc[sem]['온라인']=online; commit(); toast('교사별 입력값(온라인 포함)을 전공별 배분표에 반영했어요'); break; }
    case 'tAdd': S.teachers.push({id:uid('t'), major:TEACHER_MAJORS.includes(UI.assignMajor)?UI.assignMajor:'국어', name:'', note:'', chang:{1:{},2:{}}}); commit(); break;
    case 'tDel': { const t=S.teachers.find(t=>t.id===id); openConfirm(`${t.name||'이 교사'}를 삭제할까요?`, ()=>{ S.teachers=S.teachers.filter(t=>t.id!==id); S.subjects.forEach(s=>s.sections.forEach(x=>{ if(x.teacher===id) x.teacher=''; })); commit(); }); break; }
    case 'tBulk': openBulkTeachers(); break;
    case 'exportXlsx': exportXlsx(); break;
    case 'saveJson': saveFile(`수업시수배당표_작업_${S.year}_${stamp()}.json`, JSON.stringify(S)); break;
    case 'loadJson': document.getElementById('fileJson').click(); break;
    case 'reset': openConfirm('초기 데이터로 되돌릴까요? 실행취소(Ctrl+Z)로도 복구 가능합니다.', ()=>{ seedState(); commit(); toast('초기 데이터로 복원했어요'); }); break;
    case 'signAdd': S.sign.push('결재'); commit(); break;
    case 'signDel': if(S.sign.length>1){ S.sign.pop(); commit(); } break;
    case 'printSummary':
      if (UI.sumMode==='both'){
        doPrint(`${S.year}학년도 1·2학기 교과 수업시수 통합표`, `<h1>${S.year}학년도 1·2학기 과목별 통합 배당표</h1>`+buildBothSummaryHTML(), true);
      } else {
        doPrint(`${S.year}학년도 ${UI.sem}학기 교과 수업시수 배당표`, printSummaryHTML(UI.sem), true);
      }
      break;
    case 'printCompare': doPrint(`${S.year}학년도 교과별 1·2학기 수업시수 비교`, printCompareHTML(), false); break;
    case 'printAssign': doPrint('', printAssignHTML(UI.assignMajor, UI.sem), true); break;
  }
});

main.addEventListener('change', e=>{
  const t = e.target; const ds = t.dataset;
  if (ds.ui){ UI[ds.ui]=t.value; render(); return; }
  if (t.id==='yearIn'){ UI.tab='years'; render(); return; }
  if (ds.cls){ S.classes[ds.cls][ds.k]=Math.max(0,parseInt(t.value)||0); rebuildFixed(+ds.cls); commit(); return; }
  if (ds.sign!=null){ S.sign[+ds.sign]=t.value; commit(false); return; }
  if (ds.sub){ const s=S.subjects.find(x=>x.id===ds.sub); const f=ds.f;
    if (f==='include') s.include=t.checked; else if (f==='credits') s.credits=num(t.value); else s[f]=t.value;
    commit(); return; }
  if (ds.schoolquota){ S.schoolQuota=t.value===''?null:Math.max(0,num(t.value)); commit(); return; }
  if (ds.cap){ const c=S.capacity[ds.cap]=S.capacity[ds.cap]||{}; c[ds.f]= ds.f==='memo'?t.value:(t.value===''?undefined:num(t.value)); commit(); return; }
  if (ds.item!=null && ds.f){ const it=S.chang.items[+ds.item]; if(ds.f==='name' && ['진로','온라인'].includes(norm(t.value))){toast('진로는 전공 교과, 온라인은 자동 산출 항목이므로 같은 이름으로 추가할 수 없어요');render();return;} it[ds.f]= ds.f==='name'?t.value:num(t.value); commit(); return; }
  if (ds.al){ const al=S.chang.alloc[UI.changSem]=S.chang.alloc[UI.changSem]||{}; const m=al[ds.al]=al[ds.al]||{}; if(t.value==='') delete m[ds.item]; else m[ds.item]=num(t.value); commit(); return; }
  if (ds.shared && ds.shmaj){ const sem=UI.changSem; const a=S.sharedAlloc[sem]=S.sharedAlloc[sem]||{}; const bySource=a[ds.shared]=a[ds.shared]||{}; if(t.value==='') delete bySource[ds.shmaj]; else bySource[ds.shmaj]=Math.max(0,num(t.value)); commit(); return; }
  if (ds.t){ const tt=S.teachers.find(x=>x.id===ds.t); tt[ds.f]=t.value; commit(ds.f==='major'); return; }
  if (ds.tc){ const tt=S.teachers.find(x=>x.id===ds.tc); const a=((tt.chang=tt.chang||{})[UI.teachSem]=tt.chang[UI.teachSem]||{}); if(t.value==='') delete a[ds.item]; else a[ds.item]=num(t.value); commit(); return; }
  if (ds.asg){ const s=S.subjects.find(x=>x.id===ds.asg); s.sections[+ds.i].teacher=t.value; commit(); return; }
  if (ds.bulk){ if(!t.value) return; const s=S.subjects.find(x=>x.id===ds.bulk); s.sections.forEach(x=>x.teacher=t.value); commit(); return; }
});

document.addEventListener('change', async e=>{
  const t=e.target; if(!t.files||!t.files[0]) return;
  const file=t.files[0]; t.value='';
  if (t.id==='fileAssign') handleAssignFile(file);
  else if (t.id==='filePyeonje') handlePyeonjeFile(file);
  else if (t.id==='fileJson') handleJsonFile(file);
  else if (t.id==='filePortfolio') cgImportAll(file);
});

async function handleAssignFile(file){
  try{
    if(S.workspaceStatus==='confirmed'){toast('확정된 학년도예요. 7단계에서 잠금을 풀어야 고칠 수 있어요.');return;}
    const wb=await readWorkbook(file),sum=parseAssignWB(wb);
    cgStageAssign(sum,sum.grade,file);
  }catch(e){cgPendingAssign=null;UI.tab='review';render();toast('배정내역 검토 오류: '+e.message);}
}

async function handlePyeonjeFile(file){
  try{
    if(S.workspaceStatus==='confirmed'){toast('확정된 학년도예요. 7단계에서 잠금을 풀어야 고칠 수 있어요.');return;}
    const wb = await readWorkbook(file); const p = parsePyeonjeWB(wb);
    const entry = p.entry; const yr = S.year;
    const def = g => entry && (yr-entry+1)===g;
    openModal(`<h3>📋 편제표 넣기</h3>
      <p><b>${esc(file.name)}</b> · 시트 '${esc(p.sheet)}' · ${entry?entry+'학년도 입학':'입학년도 미확인'}</p>
      ${[1,2,3].map(g=>`<div class="row" style="margin:6px 0"><label style="cursor:pointer"><input type="checkbox" class="mG" value="${g}" ${def(g)?'checked':''}> 편제표 ${g}학년 부분 → ${yr}학년도 ${g}학년</label></div>`).join('')}
      <div class="row" style="margin-top:12px"><button class="btn pri lg" id="mOk">적용하기</button><button class="btn lg" id="mCancel">취소</button></div>`,
      m=>{ m.querySelector('#mOk').onclick=()=>{ const gs=[...m.querySelectorAll('.mG:checked')].map(x=>+x.value); if(!gs.length){closeModal();return;} if(entry && gs.some(g=>S.year-g+1!==entry)){toast('이 편제표는 입학연도가 맞는 학년에만 넣을 수 있어요.');return;}
        applyPyeonje(p.entries,gs); gs.forEach(g=>{S.pyeonjeMeta[g]=file.name+(entry?` (${entry} 교육과정)`:'');if(entry)cgCohortFromState(g,true);}); closeModal(); commit(); toast(`${gs.join('·')}학년 편제표를 넣었어요`); }; });
  }catch(err){ toast('편제표를 읽지 못했어요: '+err.message); }
}

function handleJsonFile(file){
  const fr=new FileReader();fr.onload=()=>{
    try{
      const st=JSON.parse(fr.result);if(!Array.isArray(st.subjects)||!cgValidYear(st.year))throw Error('형식 오류');
      const y=+st.year;
      openConfirm(`${y}학년도 개별 작업 파일을 불러올까요? 해당 학년도에 이미 자료가 있으면 덮어씁니다. 현재 작업을 먼저 전체 백업하세요.`,()=>{
        if(!cgWriteWorkspace()){toast('현재 작업 저장에 실패했습니다');return;}
        const imported=cgClone(st);imported.year=y;imported.workspaceStatus='working';
        if(!cgWrite(cgDataKey(y),imported)){toast('저장 실패 · 브라우저 용량 확인');return;}
        if(!CG_INDEX.years.includes(y))CG_INDEX.years.push(y);
        CG_INDEX.years.sort((a,b)=>b-a);CG_INDEX.activeYear=y;cgWrite(CG_INDEX_KEY,CG_INDEX);
        S=migrate(imported);lastSnapshotStr=JSON.stringify(S);UNDO_STACK.length=0;REDO_STACK.length=0;
        UI.tab='year';render();toast(`${y}학년도 개별 작업 파일 복원 완료`);
      });
    }catch(e){toast('불러오기 실패: '+e.message);}
  };fr.readAsText(file);
}

/* ----- 모달 ----- */
function openModal(html, setup){
  closeModal(); const bg=document.createElement('div'); bg.className='modal-bg'; bg.id='modal'; bg.innerHTML=`<div class="modal">${html}</div>`;
  document.body.appendChild(bg); bg.addEventListener('click',e=>{ if(e.target===bg) closeModal(); });
  const c=bg.querySelector('#mCancel'); if(c) c.onclick=closeModal; if(setup) setup(bg);
}
function closeModal(){ const m=document.getElementById('modal'); if(m) m.remove(); }
function openConfirm(msg, ok){ openModal(`<h3>확인</h3><p>${esc(msg)}</p><div class="row"><button class="btn pri lg" id="mOk">확인</button><button class="btn lg" id="mCancel">취소</button></div>`, m=>{ m.querySelector('#mOk').onclick=()=>{ closeModal(); ok(); }; }); }
function openBulkTeachers(){
  openModal(`<h3>📋 교사 여러 명 붙여넣기</h3>
    <p class="small">한 줄에 한 명: <code>전공 이름 [비고]</code><br>전공: <b>${TEACHER_MAJORS.join(', ')}</b></p>
    <textarea id="mText" rows="10" style="width:100%" placeholder="수학	교사A	2-4 담임&#10;국어	교사B	교육과정부"></textarea>
    <div class="row" style="margin-top:10px"><button class="btn pri lg" id="mOk">추가</button><button class="btn lg" id="mCancel">취소</button><span class="muted small" id="mMsg"></span></div>`,
    m=>{ m.querySelector('#mOk').onclick=()=>{
      const alias={'일사':'일반사회','사회':'일반사회','물리학':'물리','생명':'생명과학','생물':'생명과학','지학':'지구과학','지구':'지구과학','기가':'가정','기술가정':'가정','기술':'가정','일어':'일본어','중국':'중국어','중어':'중국어','진로진학':'진로'};
      const lines=m.querySelector('#mText').value.split(/\n/).map(l=>l.trim()).filter(Boolean); let added=0, bad=[];
      lines.forEach(l=>{ const p=l.split(/\t|\s{1,}/).filter(Boolean); if(p.length<2){bad.push(l);return;} let mj=alias[p[0]]||p[0]; if(!TEACHER_MAJORS.includes(mj)){bad.push(l);return;} S.teachers.push({id:uid('t'),major:mj,name:p[1],note:p.slice(2).join(' '),chang:{1:{},2:{}}}); added++; });
      if(bad.length){ m.querySelector('#mMsg').textContent=`${added}명 추가, 미인식 ${bad.length}줄`; commit(); return; }
      closeModal(); commit(); toast(`${added}명을 추가했어요`); };
    });
}
function openAddSubject(){
  openModal(`<h3>+ 과목 직접 추가</h3>
   <div class="row">학년 <select id="aG"><option ${UI.matrixGrade===1?'selected':''}>1</option><option ${UI.matrixGrade===2?'selected':''}>2</option><option ${UI.matrixGrade===3?'selected':''}>3</option></select>
   학기 <select id="aS"><option ${UI.matrixSem===1?'selected':''}>1</option><option ${UI.matrixSem===2?'selected':''}>2</option></select>
   과목명 <input type="text" id="aN" style="width:160px"> 전공 <select id="aM">${majorOptions('')}</select> 학점 <input type="number" id="aC" value="3" class="w40"> 분반 수 <input type="number" id="aK" value="1" class="w40"></div>
   <div class="row" style="margin-top:12px"><button class="btn pri lg" id="mOk">추가하기</button><button class="btn lg" id="mCancel">취소</button></div>`,
   m=>{ m.querySelector('#mOk').onclick=()=>{ const n=m.querySelector('#aN').value.trim(); if(!n) return; const k=Math.max(1,parseInt(m.querySelector('#aK').value)||1);
     const g=+m.querySelector('#aG').value, sem=+m.querySelector('#aS').value;
     S.subjects.push({id:uid('s'),grade:g,sem,name:n,group:'',major:m.querySelector('#aM').value,credits:num(m.querySelector('#aC').value),kind:'선택',block:'',note:'직접 추가',online:false,include:true,src:'manual',customSections:true,
       sections:Array.from({length:k},(_,i)=>({label:String.fromCharCode(65+i),track:'g',n:null,teacher:''}))});
     UI.matrixGrade=g; UI.matrixSem=sem; closeModal(); commit(); toast('과목을 추가했어요'); }; });
}
const stamp = () => { const d=new Date(); return `${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; };

/* ========== 인쇄 및 엑셀 내보내기 ========== */
function signTable(){ return `<table class="sign"><tr><th rowspan="2" class="v">결<br>재</th>${S.sign.map(s=>`<th>${esc(s)}</th>`).join('')}</tr><tr>${S.sign.map(()=>'<td></td>').join('')}</tr></table>`; }
function printDoc(title, body, landscape){
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${esc(title||'배당표')}</title><style>
  @page{size:A4 ${landscape?'landscape':'portrait'};margin:10mm}
  body{font-family:"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif;font-size:9.5pt;color:#000;margin:0}
  h1{font-size:15pt;margin:0 0 4mm;text-align:center}
  .top{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:3mm}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #333;padding:1.3mm 1.6mm;text-align:center}
  th{background:#eaeaea;font-weight:700}
  td.l{text-align:left} tr.grp td{background:#f0f0f0;font-weight:700} tr.tot td{background:#e0e0e0;font-weight:700}
  td.off{color:#888;text-decoration:line-through}
  td.mix{background:#eef7f2;font-weight:700}
  table.sm{font-size:7.5pt} table.sm th,table.sm td{padding:.8mm .9mm} table.sm td.l{white-space:nowrap}
  table.sign{width:auto;margin-left:auto} table.sign th{min-width:16mm;font-weight:600} table.sign td{height:13mm} table.sign th.v{min-width:6mm}
  h2{font-size:11.5pt;margin:5mm 0 2mm}
  .page{page-break-after:always} .page:last-child{page-break-after:auto}
  tr{page-break-inside:avoid}
  </style></head><body>${body}<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`;
}
function doPrint(title, body, landscape){
  const html = printDoc(title, body, landscape);
  if (inFrame()){ saveFile(`${(title||'분반배정').replace(/[\\/:*?"<>|]/g,'')}_${stamp()}.html`, html); toast('인쇄용 파일을 저장했어요'); return; }
  const f=document.createElement('iframe'); f.style.position='fixed'; f.style.right='0'; f.style.bottom='0'; f.style.width='0'; f.style.height='0'; f.style.border='0';
  document.body.appendChild(f); f.srcdoc=html; setTimeout(()=>f.remove(), 60000);
}
function printSummaryHTML(sem){
  const {items, blocks} = summaryModel(sem);
  let rows='';
  blocks.forEach(b=>{
    if(b.type==='major'){ const al={...((S.chang.alloc[sem]||{})[b.major]||{}),[ONLINE_ITEM_ID]:cgSharedAllocated('온라인',b.major,sem)};
      for(let i=0;i<b.n;i++){ rows+='<tr>'; if(i===0) rows+=`<td rowspan="${b.n}"><b>${esc(b.major)}</b></td>`;
        [3,2,1].forEach(g=>{
          const s=b.per[g][i];
          if (s){
            const mCnt = cnt(s,'m');
            const gsCells = mCnt>0 ? `<td colspan="2" class="mix">${s.sections.length}(혼합)</td>` : `<td>${cnt(s,'g')||''}</td><td>${cnt(s,'s')||''}</td>`;
            rows += `<td class="l ${active(s)?'':'off'}">${esc(s.name)}</td>${gsCells}<td>${s.credits}</td><td><b>${hoursOf(s)||''}</b></td>`;
          } else rows += '<td></td><td></td><td></td><td></td><td></td>';
          if(i===0) rows+=`<td rowspan="${b.n}"><b>${b.gradeH[g]||''}</b></td>`;
        });
        if(i===0){ rows+=`<td rowspan="${b.n}"><b>${b.st.subj||''}</b></td><td rowspan="${b.n}">${cgFmtNeed(cgNeededMajor(b.major,sem))}</td>${items.map(it=>`<td rowspan="${b.n}">${num(al[it.id])||''}</td>`).join('')}<td rowspan="${b.n}">${b.st.ch||''}</td><td rowspan="${b.n}"><b>${b.st.total||''}</b></td><td rowspan="${b.n}">${b.st.tutor||''}</td><td rowspan="${b.n}"><b>${fmt1(b.st.avg)}</b></td>`; }
        rows+='</tr>'; }
    } else { const list=b.list||displayMajors(); rows+=`<tr class="${b.type==='group'?'grp':'tot'}"><td>${esc(b.name)}</td>${[3,2,1].map(g=>`<td colspan="5"></td><td>${list.reduce((t,m)=>t+majorGradeHours(m,sem,g),0)}</td>`).join('')}<td>${b.st.subj}</td><td>${cgFmtNeed(cgNeededGroup(list,sem))}</td>${items.map(it=>`<td>${list.reduce((t,m)=>t+num(((S.chang.alloc[sem]||{})[m]||{})[it.id]),0)||''}</td>`).join('')}<td>${b.st.ch}</td><td>${b.st.total}</td><td>${b.st.tutor||''}</td><td>${fmt1(b.st.avg)}</td></tr>`; }
  });
  return `<div class="top"><div></div>${signTable()}</div><h1>${S.year}학년도 ${sem}학기 교과 수업시수 배당표</h1>
   <table class="sm"><thead><tr><th rowspan="2">교과</th>${[3,2,1].map(g=>`<th colspan="6">${g}학년</th>`).join('')}<th rowspan="2">교과<br>계</th><th rowspan="2">필요정원</th><th colspan="${items.length+1}">창체·부장 등</th><th rowspan="2">총계</th><th rowspan="2">강사</th><th rowspan="2">평균</th></tr>
   <tr>${[3,2,1].map(()=>'<th>과목</th><th>일반</th><th>과중</th><th>학점</th><th>시수</th><th>소계</th>').join('')}${items.map(it=>`<th>${esc(it.name)}</th>`).join('')}<th>계</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function printCompareHTML(){
  const rows = compareRows().map(r=>{ const d=(r.s1.avg!=null&&r.s2.avg!=null)?r.s2.avg-r.s1.avg:null; return `<tr class="${r.cls}"><td class="l">${esc(r.name)}</td><td>${cgFmtNeed(r.cls?cgNeededGroup(r.cls==='tot'?displayMajors():GROUPS[r.name.replace(' 계','')]||[],null):cgNeededMajor(r.name,null))}</td><td>${r.s1.subj}</td><td>${r.s1.ch||''}</td><td>${r.s1.tutor||''}</td><td><b>${fmt1(r.s1.avg)}</b></td><td>${r.s2.subj}</td><td>${r.s2.ch||''}</td><td>${r.s2.tutor||''}</td><td><b>${fmt1(r.s2.avg)}</b></td><td>${d==null?'':(d>0?'+':'')+fmt1(d)}</td></tr>`; }).join('');
  return `<div class="top"><div></div>${signTable()}</div><h1>${S.year}학년도 교과별 1·2학기 수업시수 비교</h1><table><thead><tr><th rowspan="2">교과(전공)</th><th rowspan="2">필요정원</th><th colspan="4">1학기</th><th colspan="4">2학기</th><th rowspan="2">증감</th></tr><tr><th>교과</th><th>창체</th><th>강사</th><th>평균</th><th>교과</th><th>창체</th><th>강사</th><th>평균</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function printAssignHTML(key, sem){
  const {majors, subs, teachers} = assignModel(key, sem);
  const title = `${S.year}학년도 ${sem}학기 ${GROUPS[key]?key:key}과 수업시간 배당표 (교사 ${teachers.length}명)`;
  let rows='';
  subs.forEach(s=>{
    const by={}; s.sections.forEach(x=>{ const k=x.teacher||''; (by[k]=by[k]||[]).push(x.label+(x.track==='s'?'(과중)':x.track==='m'?'(혼합)':'')); });
    const who = Object.entries(by).sort((a,b)=>(a[0]==='')-(b[0]==='')).map(([k,ls])=>`<b>${k?esc(teacherName(k)):'미배정'}</b> ${ls.map(esc).join(', ')} <span style="color:#555">(${ls.length*num(s.credits)}시간)</span>`).join('<br>');
    const mCnt = cnt(s,'m');
    const gsCells = mCnt>0 ? `<td colspan="2" class="mix">${s.sections.length}(혼합)</td>` : `<td>${cnt(s,'g')||''}</td><td>${cnt(s,'s')||''}</td>`;
    rows+=`<tr><td>${s.grade}</td><td class="l">${esc(s.name)}${majors.length>1?` <span style="color:#555">(${s.major})</span>`:''}</td><td>${s.credits}</td>${gsCells}<td><b>${hoursOf(s)}</b></td><td class="l">${who}</td></tr>`;
  });
  const tot = subs.reduce((t,s)=>t+hoursOf(s),0);
  const items = cgExtraItems();
  const trows = teachers.map(t=>{ const sh=teacherSubjHours(t.id,sem); const a=((t.chang||{})[sem])||{}; const ch=teacherChang(t,sem); return `<tr><td>${esc(t.name)}</td><td class="l">${esc(t.note||'')}</td><td>${sh}</td>${items.map(it=>`<td>${num(a[it.id])||''}</td>`).join('')}<td>${ch||''}</td><td><b>${sh+ch}</b></td><td style="width:22mm"></td></tr>`; }).join('');
  return `<div class="top"><div></div>${signTable()}</div><h1>${esc(title)}</h1>
   <table><thead><tr><th style="width:9mm">학년</th><th style="width:48mm">과목</th><th style="width:10mm">학점</th><th style="width:11mm">일반<br>분반</th><th style="width:11mm">과중<br>분반</th><th style="width:12mm">시수</th><th>담당교사별 분반</th></tr></thead><tbody>${rows}<tr class="tot"><td colspan="5">교과 시수 계</td><td>${tot}</td><td></td></tr></tbody></table>
   <h2>교사별 시수</h2><table><thead><tr><th>교사</th><th>비고</th><th>교과</th>${items.map(it=>`<th>${esc(it.name)}</th>`).join('')}<th>창체 계</th><th>총시수</th><th>확인 서명</th></tr></thead><tbody>${trows||'<tr><td colspan="20">교사 미입력</td></tr>'}</tbody></table>
   <p style="margin-top:4mm">※ 시간표 편성과 관련된 필수 고려사항:</p><div style="border:1px solid #444;height:22mm"></div>`;
}

function exportXlsx(){
  if (typeof XLSX==='undefined'){ toast('엑셀 도구를 불러오지 못했어요'); return; }
  const wb = XLSX.utils.book_new();
  [1,2].forEach(sem=>{
    const {items, blocks} = summaryModel(sem); const aoa=[]; const merges=[];
    aoa.push([`${S.year}학년도 ${sem}학기 교과 수업시수 배당표`]);
    const h1=['교과']; [3,2,1].forEach(g=>h1.push(g+'학년','','','','','')); h1.push('교과 계','필요정원','창체·부장 등',...Array(items.length).fill(''),'총계','강사','평균');
    const h2=['']; [3,2,1].forEach(()=>h2.push('과목','일반','과중','학점','시수','소계')); h2.push('','',...items.map(it=>it.name),'창체 계','','','');
    aoa.push(h1,h2);
    merges.push({s:{r:1,c:0},e:{r:2,c:0}}); [0,1,2].forEach(k=>merges.push({s:{r:1,c:1+k*6},e:{r:1,c:6+k*6}}));
    const base=19; merges.push({s:{r:1,c:base},e:{r:2,c:base}},{s:{r:1,c:base+1},e:{r:2,c:base+1}},{s:{r:1,c:base+2},e:{r:1,c:base+2+items.length}});
    [base+3+items.length,base+4+items.length,base+5+items.length].forEach(c=>merges.push({s:{r:1,c},e:{r:2,c}}));
    blocks.forEach(b=>{
      if(b.type==='major'){ const al={...((S.chang.alloc[sem]||{})[b.major]||{}),[ONLINE_ITEM_ID]:cgSharedAllocated('온라인',b.major,sem)}; const r0=aoa.length;
        for(let i=0;i<b.n;i++){
          const curRowIdx = aoa.length;
          const row=[i===0?b.major:''];
          [3,2,1].forEach((g, gIdx)=>{
            const s=b.per[g][i];
            if(s){
              const mCnt = cnt(s,'m');
              if (mCnt > 0){
                row.push(s.name+(active(s)?'':' (제외)'), s.sections.length, null, num(s.credits), hoursOf(s)||null);
                const cStart = 1 + gIdx*6 + 1;
                merges.push({s:{r:curRowIdx, c:cStart}, e:{r:curRowIdx, c:cStart+1}});
              } else {
                row.push(s.name+(active(s)?'':' (제외)'), cnt(s,'g')||null, cnt(s,'s')||null, num(s.credits), hoursOf(s)||null);
              }
            } else row.push(null,null,null,null,null);
            row.push(i===0?b.gradeH[g]||null:null);
          });
          if(i===0) row.push(b.st.subj,cgNeededMajor(b.major,sem),...items.map(it=>num(al[it.id])||null),b.st.ch||null,b.st.total,b.st.tutor||null,b.st.avg==null?null:Math.round(b.st.avg*10)/10);
          aoa.push(row);
        }
        if(b.n>1){ [0,6,12,18].forEach(c=>merges.push({s:{r:r0,c},e:{r:r0+b.n-1,c}})); for(let c=base;c<=base+5+items.length;c++) merges.push({s:{r:r0,c},e:{r:r0+b.n-1,c}}); }
      } else { const list=b.list||displayMajors(); const row=[b.name]; [3,2,1].forEach(g=>row.push(null,null,null,null,null,list.reduce((t,m)=>t+majorGradeHours(m,sem,g),0)));
        row.push(b.st.subj,cgNeededGroup(list,sem),...items.map(it=>list.reduce((t,m)=>t+cgItemAllocated(it,m,sem),0)||null),b.st.ch,b.st.total,b.st.tutor||null,b.st.avg==null?null:Math.round(b.st.avg*10)/10); aoa.push(row); }
    });
    const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!merges']=merges;
    ws['!cols']=[{wch:10},...[0,1,2].flatMap(()=>[{wch:20},{wch:5},{wch:5},{wch:5},{wch:5},{wch:6}]),{wch:8},{wch:6},...items.map(()=>({wch:8})),{wch:7},{wch:7},{wch:6},{wch:7}];
    XLSX.utils.book_append_sheet(wb, ws, `총괄_${sem}학기`);
  });
  { const aoa=[[`${S.year}학년도 1·2학기 과목별 통합 배당표`],['전공','학년','과목','1학기 반 수','1학기 단위 시수','1학기 합','2학기 반 수','2학기 단위 시수','2학기 합','연간 평균 합','전공 필요정원']];
    bothSummaryModel().forEach(r=>{
      if(r.type==='course'){const a=r.sem[1],b=r.sem[2];aoa.push([r.major,r.grade,r.name,a?.sections??null,a?.credits??null,a?.hours??null,b?.sections??null,b?.credits??null,b?.hours??null,((a?.hours||0)+(b?.hours||0))/2,null]);}
      else aoa.push([r.major,null,r.type==='major'?'전공 소계':'합계',null,null,r.tot[0],null,null,r.tot[1],(r.tot[0]+r.tot[1])/2,r.type==='major'?cgNeededMajor(r.major,null):cgNeededGroup(r.type==='grand'?displayMajors():GROUPS[r.major.replace(' 계','')]||[],null)]);
    });
    const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=[{wch:14},{wch:6},{wch:27},...Array(8).fill({wch:12})];
    XLSX.utils.book_append_sheet(wb,ws,'1·2학기 한줄통합');
  }
  { const aoa=[[`${S.year}학년도 1·2학기 비교`],['교과(전공)','필요정원(연간)','1학기 교과','1학기 창체','1학기 강사','1학기 평균','2학기 교과','2학기 창체','2학기 강사','2학기 평균','증감']];
    compareRows().forEach(r=>{ const d=(r.s1.avg!=null&&r.s2.avg!=null)?r.s2.avg-r.s1.avg:null; const R=v=>v==null?null:Math.round(v*10)/10; aoa.push([r.name,r.cls?cgNeededGroup(r.cls==='tot'?usedMajors():GROUPS[r.name.replace(' 계','')]||[],null):cgNeededMajor(r.name,null),r.s1.subj,r.s1.ch,r.s1.tutor,R(r.s1.avg),r.s2.subj,r.s2.ch,r.s2.tutor,R(r.s2.avg),R(d)]); });
    const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[{wch:12},...Array(10).fill({wch:9})]; XLSX.utils.book_append_sheet(wb, ws, '1·2학기 비교'); }
  { const aoa=[[`${S.year}학년도 알파벳 타임 × 과목 수강인원 검증표`]];
    [2,3].forEach(g=>{
      [1,2].forEach(sem=>{
        const subs = S.subjects.filter(s=>s.grade===g && s.sem===sem && s.sections.length>0 && (s.kind==='선택' || s.fromAssign))
          .sort((a,b)=>MAJOR_IDS.indexOf(a.major)-MAJOR_IDS.indexOf(b.major)||natCmp(a.name,b.name));
        if(!subs.length) return;
        const baseKey = sec => (sec.unit || /^\d+반$/.test(sec.label)) ? '통반(9·10반)' : ((String(sec.label).match(/^([A-Z]+)/i)||[,''])[1].toUpperCase()||sec.label);
        const tSet = new Set(); subs.forEach(s=>s.sections.forEach(sec=>tSet.add(baseKey(sec))));
        const times = [...tSet].sort((a,b)=>a.startsWith('통반')?1:b.startsWith('통반')?-1:natCmp(a,b));
        aoa.push([],[`${g}학년 ${sem}학기`],['타임 \\ 과목', ...subs.map(s=>s.name), '타임 합계']);
        times.forEach(tk=>{
          let rSum=0;
          const row=[tk];
          subs.forEach(s=>{
            const ms = s.sections.filter(sec=>baseKey(sec)===tk);
            if(!ms.length){ row.push(null); }
            else {
              ms.forEach(x=>rSum+=num(x.n));
              row.push(ms.length===1 && ms[0].label===tk ? num(ms[0].n) : ms.map(x=>`${x.label}:${x.n}`).join(' / '));
            }
          });
          row.push(rSum);
          aoa.push(row);
        });
      });
    });
    const ws=XLSX.utils.aoa_to_sheet(aoa); XLSX.utils.book_append_sheet(wb, ws, '타임별_수강인원');
  }
  { const aoa=[['전공별 필요정원 (교사 정원 입력 후 자동 계산)'],['학교 전체 정원',cgQuotaInfo().quota??null,'학교 평균 시수',cgSchoolAverage(), '산정 기준','교과(온라인 제외, 진로 포함) + 온라인 개설 + 창체·부장·자치·적응(중복 진로 제외) − 강사 시수'],
      ['전공','1학기 배정 시수','2학기 배정 시수','연간 평균 배정 시수','학교 평균 시수','연간 필요정원','교사 정원']];
    const majors=displayMajors();
    majors.forEach(m=>aoa.push([m,cgEffectiveHours(m,1),cgEffectiveHours(m,2),(cgEffectiveHours(m,1)+cgEffectiveHours(m,2))/2,cgSchoolAverage(),cgNeededMajor(m,null),isShared(m)?null:cap(m).quota??null]));
    aoa.push(['전체(미배정분 포함)',cgSchoolHours(1),cgSchoolHours(2),(cgSchoolHours(1)+cgSchoolHours(2))/2,cgSchoolAverage(),cgNeededSchool(null),cgQuotaInfo().quota]);
    const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=[{wch:18},...Array(6).fill({wch:18})];
    XLSX.utils.book_append_sheet(wb, ws, '전공별_필요정원');
  }
  { const rows=[['학교 평균 산정 내역 · 전담 정원 없는 교과 포함'],['학기','전체 교과','창체·부장·자치·적응·온라인 필요','강사 제외','학교 전체 필요 시수','전공별 배정 합','미배정 차이']];
    [1,2].forEach(sem=>{const b=cgBreakdown(sem);rows.push([sem,b.curriculum,b.extra,b.tutor,b.total,b.allocated,b.gap]);});
    rows.push([],['전공','구분','1학기 배정','2학기 배정','연간 배정 평균','필요정원']);
    usedMajors().filter(m=>!isShared(m)).forEach(m=>rows.push([m,'전공',cgEffectiveHours(m,1),cgEffectiveHours(m,2),(cgEffectiveHours(m,1)+cgEffectiveHours(m,2))/2,cgNeededMajor(m,null)]));
    rows.push([],['통합 교과 배분 내역'],['학기','공통 영역','담당 전공','배정 시수','공통 영역 전체 시수','미배정 차이']);
    [1,2].forEach(sem=>{cgSharedSources(sem).forEach(source=>{const total=majorHours(source,sem),left=total-cgSharedAssigned(source,sem);usedMajors().filter(m=>!isShared(m)).forEach(m=>{const n=cgSharedAllocated(source,m,sem);if(n)rows.push([sem,source,m,n,total,left]);});if(!cgSharedAssigned(source,sem))rows.push([sem,source,'미배정',0,total,left]);});});
    const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:20},...Array(6).fill({wch:22})]; XLSX.utils.book_append_sheet(wb,ws,'평균시수_배분검증'); }
  { const items=cgExtraItems(); const majors=displayMajors(); const aoa=[['창체·부장 등 전공별 배정']];
    [1,2].forEach(sem=>{ aoa.push([],[`${sem}학기`],['전공',...items.map(it=>`${it.name}(${num(it['need'+sem])})`),'계']);
      majors.forEach(m=>{ aoa.push([m,...items.map(it=>cgItemAllocated(it,m,sem)||null),changOf(m,sem)||null]); });
      aoa.push(['계',...items.map(it=>majors.reduce((t,m)=>t+cgItemAllocated(it,m,sem),0)),majors.reduce((t,m)=>t+changOf(m,sem),0)]); });
    aoa.push([],['전공별 필요정원·학교평균'],['전공','1학기 담당 시수','2학기 담당 시수','학교 평균','연간 필요정원','교사 정원','강사 1학기','강사 2학기','메모']); majors.forEach(m=>{ const c=cap(m); aoa.push([m,cgEffectiveHours(m,1),cgEffectiveHours(m,2),cgSchoolAverage(),cgNeededMajor(m,null),c.quota??null,c.tutor1??null,c.tutor2??null,c.memo||'']); });
    aoa.push([],['통합 교과 배분(온라인은 위 창체 열에 포함, 학교 전체 시수에 재가산하지 않음)'],['학기','공통 영역','담당 전공','배정 시수']); [1,2].forEach(sem=>cgSharedSources(sem).forEach(source=>usedMajors().filter(m=>!isShared(m)).forEach(m=>{const n=cgSharedAllocated(source,m,sem); if(n)aoa.push([sem,source,m,n]);})));
    const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[{wch:16},...Array(Math.max(items.length+2,8)).fill({wch:16})]; XLSX.utils.book_append_sheet(wb, ws, '창체·정원'); }
  { const items=cgExtraItems(); const aoa=[['교사별 시수'],['전공','이름','비고','1학기 교과',...items.map(it=>'1학기 '+it.name),'1학기 총','2학기 교과',...items.map(it=>'2학기 '+it.name),'2학기 총']];
    [...S.teachers].sort((a,b)=>MAJOR_IDS.indexOf(a.major)-MAJOR_IDS.indexOf(b.major)||natCmp(a.name,b.name)).forEach(t=>{ const r=[t.major,t.name,t.note||'']; [1,2].forEach(sem=>{ const a=(t.chang||{})[sem]||{}; const sh=teacherSubjHours(t.id,sem); r.push(sh,...items.map(it=>num(a[it.id])||null),sh+teacherChang(t,sem)); }); aoa.push(r); });
    const ws=XLSX.utils.aoa_to_sheet(aoa); XLSX.utils.book_append_sheet(wb, ws, '교사별 시수'); }
  [1,2].forEach(sem=>{ const aoa=[[`${S.year}학년도 ${sem}학기 교과별 분반 배정`],['전공','학년','과목','구분','학점','분반','과정','인원','시수','담당교사']];
    S.subjects.filter(s=>s.sem===sem&&active(s)).sort((a,b)=>MAJOR_IDS.indexOf(a.major)-MAJOR_IDS.indexOf(b.major)||b.grade-a.grade||natCmp(a.name,b.name)).forEach(s=>s.sections.forEach(x=>aoa.push([s.major,s.grade,s.name,s.kind,num(s.credits),x.label,x.track==='s'?'과중':x.track==='m'?'혼합(일반+과중)':'일반',x.n??null,num(s.credits),teacherName(x.teacher)])));
    const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[{wch:10},{wch:5},{wch:22},{wch:6},{wch:5},{wch:7},{wch:12},{wch:6},{wch:5},{wch:10}]; ws['!autofilter']={ref:`A2:J${aoa.length}`}; XLSX.utils.book_append_sheet(wb, ws, `분반배정_${sem}학기`); });
  const out = XLSX.write(wb,{bookType:'xlsx',type:'array'});
  saveFile(`${S.year}_수업시수배당표_기초자료_${stamp()}.xlsx`, new Blob([out]));
}

/* ========== 초기화 및 시작 ========== */
(function start(){
  cgInitializeStore();
  lastSnapshotStr = JSON.stringify(S);
  updateUndoUI();
  render();
  setSaveState('✓ 저장됨');
})();



/* 6.4 protected two-editor cloud sync bridge. All changes remain locally backed up. */
window.CGBridge=Object.freeze({
  exportPortfolio(){
    if(!cgWriteWorkspace())throw Error('브라우저 저장 실패 · JSON 백업을 먼저 확인하세요');
    const workspaces={};
    for(const y of CG_INDEX.years){
      const w=cgYearInfo(y);
      if(w && Number(w.year)===Number(y))workspaces[y]=w;
    }
    return {format:'cleargrid-portfolio-v1',activeYear:S.year,workspaces,cohorts:CG_COHORTS||{}};
  },
  importPortfolio(obj, opts){
    if(!obj||obj.format!=='cleargrid-portfolio-v1'||!obj.workspaces||!Object.keys(obj.workspaces).length)throw Error('클라우드 백업 형식 오류');
    const years=Object.keys(obj.workspaces).map(Number).filter(cgValidYear).sort((a,b)=>b-a);
    if(!years.length||years.length!==Object.keys(obj.workspaces).length)throw Error('학년도 형식 오류');
    for(const y of years){const w=obj.workspaces[y];if(!w||Number(w.year)!==y||!Array.isArray(w.subjects)||!Array.isArray(w.teachers))throw Error(y+'학년도 자료 오류');}
    const target=years.includes(+obj.activeYear)?+obj.activeYear:years[0];
    const before={};const keys=[CG_COHORT_KEY,CG_INDEX_KEY,...years.map(cgDataKey)];
    keys.forEach(k=>before[k]=window.CGStore.getRaw(k));
    try{
      for(const y of years){if(!cgWrite(cgDataKey(y),obj.workspaces[y]))throw Error('브라우저 저장 실패');}
      if(!cgWrite(CG_COHORT_KEY,obj.cohorts||{}))throw Error('코호트 저장 실패');
      const idx={schema:1,activeYear:target,years,updatedAt:new Date().toISOString()};
      if(!cgWrite(CG_INDEX_KEY,idx))throw Error('학년도 인덱스 저장 실패');
      CG_COHORTS=obj.cohorts||{};CG_INDEX=idx;
      cgPendingAssign=null;S=migrate(cgYearInfo(target));
      lastSnapshotStr=JSON.stringify(S);UNDO_STACK.length=0;REDO_STACK.length=0;
      if(!(opts&&opts.keepView))UI.tab='year';render();setSaveState('✓ 최신 자료를 불러왔어요');
    }catch(err){
      keys.forEach(k=>{try{if(before[k]===null)window.CGStore.removeRaw(k);else window.CGStore.setRaw(k,before[k]);}catch(e){}});
      throw err;
    }
  }
});
