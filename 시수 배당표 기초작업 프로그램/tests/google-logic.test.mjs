import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';
const source=readFileSync(new URL('../google-apps-script/Code.gs',import.meta.url),'utf8');
function mockApp(){
 const sheets=new Map();
 class Sheet{
  constructor(){this.rows=[];}
  appendRow(row){this.rows.push([...row]);}
  deleteRows(start,n){this.rows.splice(start-1,n);}
  getLastRow(){return this.rows.length;}
  setFrozenRows(){}
  getRange(row,col,n,m){
   return {
    getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>this.rows[row-1+i]?.[col-1+j]??'')),
    setValues:(vals)=>{vals.forEach((list,i)=>{while(this.rows.length<row+i)this.rows.push([]);list.forEach((v,j)=>this.rows[row-1+i][col-1+j]=v);});}
   };
  }
 }
 const props={SHEET_ID:'sheet',TOKEN_A:'A'.repeat(32),TOKEN_B:'B'.repeat(32)};
 const spreadsheet={getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=new Sheet();sheets.set(n,s);return s;}};
 const context={JSON,Date,Math,Number,String,Object,Array,Error,console,
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  SpreadsheetApp:{openById:()=>spreadsheet,flush(){}},
  Utilities:{
   newBlob:(value)=>({getBytes:()=>Buffer.isBuffer(value)?value:Buffer.from(value),getDataAsString:()=>Buffer.from(value).toString('utf8')}),
   gzip:o=>({getBytes:()=>zlib.gzipSync(o.getBytes())}),
   ungzip:o=>({getDataAsString:()=>zlib.gunzipSync(o.getBytes()).toString('utf8')}),
   base64Encode:b=>Buffer.from(b).toString('base64'),base64Decode:s=>Buffer.from(s,'base64')
  },
  ContentService:{MimeType:{JSON:'application/json'},createTextOutput:s=>({setMimeType(){return this;},getContent:()=>s})}
 };
 vm.createContext(context);vm.runInContext(source,context);
 const call=(body)=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(body)}}).getContent());
 return {call,sheets};
}
const sample={format:'cleargrid-portfolio-v1',activeYear:2027,workspaces:{2027:{year:2027,subjects:[],teachers:[],assignMeta:{2:{students:291}}}},cohorts:{2027:{year:2027,subjects:[]}}};
test('two users can authenticate, read version 0',()=>{
 const {call}=mockApp();
 assert.equal(call({action:'head',token:'A'.repeat(32)}).head.revision,0);
 assert.equal(call({action:'head',token:'B'.repeat(32)}).actor,'담당자 B');
 assert.equal(call({action:'head',token:'bad'}).error,'UNAUTHORIZED');
});
test('A saves; B stale save fails; B reads uncorrupted state',()=>{
 const {call}=mockApp();
 const first=call({action:'save',token:'A'.repeat(32),baseVersion:0,data:sample});
 assert.equal(first.ok,true);assert.equal(first.version,1);
 const conflict=call({action:'save',token:'B'.repeat(32),baseVersion:0,data:sample});
 assert.equal(conflict.ok,false);assert.equal(conflict.error,'CONFLICT');assert.equal(conflict.version,1);
 const read=call({action:'read',token:'B'.repeat(32)});
 assert.equal(read.data.workspaces[2027].assignMeta[2].students,291);
 assert.equal(read.head.revision,1);
 const saved=call({action:'save',token:'B'.repeat(32),baseVersion:1,data:{...sample,workspaces:{2027:{...sample.workspaces[2027],schoolQuota:42}}}});
 assert.equal(saved.version,2);
 assert.equal(call({action:'history',token:'A'.repeat(32)}).history.length,2);
});
test('student-level rosters cannot be saved',()=>{
 const {call}=mockApp();
 const v=call({action:'save',token:'A'.repeat(32),baseVersion:0,data:{...sample,workspaces:{2027:{...sample.workspaces[2027],studentRows:[{name:'private'}]}}}});
 assert.equal(v.ok,false);assert.match(v.message,/STUDENT_ROSTER_NOT_ALLOWED/);
});

test('6.5: editor name from Netlify is recorded as the saver',()=>{
 const {call}=mockApp();
 const r=call({action:'save',token:'A'.repeat(32),editor:'김남훈',baseVersion:0,data:sample});
 assert.equal(r.actor,'김남훈');
 assert.equal(call({action:'head',token:'A'.repeat(32)}).head.actor,'김남훈');
});
test('6.5: old autosave revisions are pruned and latest still reads correctly',()=>{
 const {call,sheets}=mockApp();
 let v=0;
 for(let i=0;i<80;i++){
  const r=call({action:'save',token:'A'.repeat(32),baseVersion:v,data:{...sample,workspaces:{2027:{...sample.workspaces[2027],schoolQuota:i}}}});
  assert.equal(r.ok,true); v=r.version;
 }
 const payload=sheets.get('CG_Payload');
 const revs=payload.rows.slice(1).map(r=>Number(r[0]));
 assert.ok(Math.min(...revs)>=80-40-20, 'old rows pruned: min='+Math.min(...revs));
 assert.ok(payload.rows.length-1<=60);
 const read=call({action:'read',token:'B'.repeat(32)});
 assert.equal(read.head.revision,80);
 assert.equal(read.data.workspaces[2027].schoolQuota,79);
});
