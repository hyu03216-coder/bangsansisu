/**
 * Clear Grid 6.4 Google Apps Script backend.
 * In Apps Script Project settings > Script properties configure:
 * SHEET_ID : target spreadsheet ID
 * TOKEN_A  : long random secret assigned to editor A (>=24 characters)
 * TOKEN_B  : different long random secret for editor B (>=24 characters)
 * Deploy web app: Execute as me; appropriate access policy.
 * IMPORTANT: Do not put actual tokens or student roster in GitHub.
 */
var CG_PAYLOAD_CHUNK = 30000;
var CG_MAX_JSON_CHARS = 1800000;
var CG_SHEETS = {
  HEAD:'CG_Head', PAYLOAD:'CG_Payload', LOG:'CG_History'
};

function cgResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function cgSheet_(name, headers) {
  var ss=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  var sh=ss.getSheetByName(name);
  if(!sh){ sh=ss.insertSheet(name);sh.appendRow(headers);sh.setFrozenRows(1); }
  return sh;
}
function cgAuth_(token){
  var p=PropertiesService.getScriptProperties();
  if(typeof token!=='string'||token.length<24||token.length>256)return null;
  if(token===p.getProperty('TOKEN_A'))return '담당자 A';
  if(token===p.getProperty('TOKEN_B'))return '담당자 B';
  return null;
}
function cgHead_() {
  var sh=cgSheet_(CG_SHEETS.HEAD,['key','revision','updatedAt','actor','payloadRow','chunkCount']);
  if(sh.getLastRow()<2)return {revision:0,updatedAt:'',actor:'',payloadRow:0,chunkCount:0};
  var row=sh.getRange(2,1,1,6).getValues()[0];
  return {revision:Number(row[1])||0,updatedAt:String(row[2]||''),actor:String(row[3]||''),payloadRow:Number(row[4])||0,chunkCount:Number(row[5])||0};
}
function cgValidate_(data){
  if(!data || data.format!=='cleargrid-portfolio-v1' || !data.workspaces ||
    typeof data.workspaces!=='object' || Array.isArray(data.workspaces))throw Error('INVALID_PORTFOLIO');
  // Reject known student-level payload keys anywhere, not only at root.
  // The numerical 'students' field in assignMeta is an aggregated count.
  function scan_(obj,depth){
    if(depth>20)throw Error('NESTING_TOO_DEEP');
    if(!obj || typeof obj!=='object')return;
    Object.keys(obj).forEach(function(k){
      var v=obj[k];
      if(/^(student(name|names|id|ids|rows|list|records)?|roster|studentRoster|학번|학생명|학생목록|생년월일|주민등록번호)$/i.test(k)){
        if(!(k==='students' && typeof v==='number'))throw Error('STUDENT_ROSTER_NOT_ALLOWED');
      }
      if(v && typeof v==='object')scan_(v,depth+1);
    });
  }
  scan_(data,0);
  var years=Object.keys(data.workspaces);
  if(!years.length || years.length>40)throw Error('INVALID_YEARS');
  for(var i=0;i<years.length;i++){
    var y=years[i], w=data.workspaces[y];
    if(!/^20\d\d$/.test(y)||!w||Number(w.year)!==Number(y)||!Array.isArray(w.subjects)||!Array.isArray(w.teachers))throw Error('INVALID_WORKSPACE');
    // This app synchronizes subject/section aggregates, NEVER student roster rows.
    if('studentRows' in w || 'studentList' in w || 'roster' in w)throw Error('STUDENT_ROSTER_NOT_ALLOWED');
  }
}
function cgEncode_(data){
  var plain=JSON.stringify(data);
  if(plain.length>CG_MAX_JSON_CHARS)throw Error('DATA_TOO_LARGE');
  var gz=Utilities.gzip(Utilities.newBlob(plain,'application/json','cg.json'));
  return Utilities.base64Encode(gz.getBytes());
}
function cgDecode_(base64){
  var zip=Utilities.base64Decode(base64);
  return JSON.parse(Utilities.ungzip(Utilities.newBlob(zip,'application/octet-stream')).getDataAsString('UTF-8'));
}
function cgRead_(head){
  if(!head.revision)return null;
  if(!head.payloadRow || !head.chunkCount || head.chunkCount>100)return null;
  var sh=cgSheet_(CG_SHEETS.PAYLOAD,['revision','part','payload']);
  var rows=sh.getRange(head.payloadRow,1,head.chunkCount,3).getValues();
  var chunks=[];
  rows.forEach(function(row,i){
    if(Number(row[0])!==head.revision || Number(row[1])!==i+1)throw Error('PAYLOAD_MISMATCH');
    chunks.push(String(row[2]));
  });
  return cgDecode_(chunks.join(''));
}
function cgSave_(request, actor){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))return {ok:false,error:'BUSY'};
  try{
    var current=cgHead_();
    var base=Number(request.baseVersion);
    if(!Number.isInteger(base) || base<0)return {ok:false,error:'INVALID_VERSION'};
    if(base!==current.revision){
      return {ok:false,error:'CONFLICT',version:current.revision,updatedAt:current.updatedAt,actor:current.actor};
    }
    cgValidate_(request.data);
    var encoded=cgEncode_(request.data);
    var count=Math.ceil(encoded.length/CG_PAYLOAD_CHUNK);
    if(count>100)throw Error('DATA_TOO_LARGE');
    var next=current.revision+1;
    var payloadSh=cgSheet_(CG_SHEETS.PAYLOAD,['revision','part','payload']);
    var start=payloadSh.getLastRow()+1;
    var rows=[];
    for(var i=0;i<count;i++)rows.push([next,i+1,encoded.slice(i*CG_PAYLOAD_CHUNK,(i+1)*CG_PAYLOAD_CHUNK)]);
    payloadSh.getRange(start,1,rows.length,3).setValues(rows);
    SpreadsheetApp.flush(); // payload durable before committing the head pointer
    var at=new Date().toISOString();
    var hsh=cgSheet_(CG_SHEETS.HEAD,['key','revision','updatedAt','actor','payloadRow','chunkCount']);
    hsh.getRange(2,1,1,6).setValues([['portfolio',next,at,actor,start,count]]);
    SpreadsheetApp.flush();
    try{
      cgSheet_(CG_SHEETS.LOG,['timestamp','revision','actor','operation','compressedChars'])
        .appendRow([at,next,actor,'SAVE',encoded.length]);
    }catch(logError){ /* a failed audit append must not roll back already-committed state */ }
    return {ok:true,version:next,updatedAt:at,actor:actor};
  }finally{lock.releaseLock();}
}
function cgHistory_(){
  var sh=cgSheet_(CG_SHEETS.LOG,['timestamp','revision','actor','operation','compressedChars']);
  var n=sh.getLastRow()-1;
  if(n<=0)return [];
  return sh.getRange(Math.max(2,n-19+1),1,Math.min(n,20),4).getValues().reverse()
    .map(function(r){return {at:String(r[0]),revision:r[1],actor:r[2],action:r[3]};});
}
function doGet(){return cgResponse_({ok:false,error:'POST_ONLY'});}
function doPost(e){
  try{
    var raw=e && e.postData && e.postData.contents || '';
    if(raw.length>CG_MAX_JSON_CHARS+100000)return cgResponse_({ok:false,error:'DATA_TOO_LARGE'});
    var input=JSON.parse(raw);
    var actor=cgAuth_(input.token);
    if(!actor)return cgResponse_({ok:false,error:'UNAUTHORIZED'});
    if(input.action==='head')return cgResponse_({ok:true,head:cgHead_(),actor:actor});
    if(input.action==='read'){
      var h=cgHead_();return cgResponse_({ok:true,head:h,data:cgRead_(h),actor:actor});
    }
    if(input.action==='history')return cgResponse_({ok:true,head:cgHead_(),history:cgHistory_(),actor:actor});
    if(input.action==='save')return cgResponse_(cgSave_(input,actor));
    return cgResponse_({ok:false,error:'INVALID_ACTION'});
  }catch(error){
    // Never echo request bodies or secrets, even on error.
    return cgResponse_({ok:false,error:'SERVER_ERROR',message:String(error.message||'요청 실패').slice(0,90)});
  }
}
