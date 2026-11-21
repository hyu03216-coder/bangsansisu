import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import handler from '../netlify/functions/sync.mjs';
const realFetch = globalThis.fetch;
const VALID='https://script.google.com/macros/s/AbCdEf0123456789_TEST-deploy/exec';
const TOKEN='12345678901234567890123456789012';
const PASSWORD='bangsan-2027!';
const KEY=createHash('sha256').update(PASSWORD).digest('hex');
function req(data){ return new Request('https://example.netlify.app/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); }
function env(on=true){
 if(on){process.env.GAS_WEBAPP_URL=VALID;process.env.GAS_TOKEN=TOKEN;process.env.SCHOOL_PASSWORD=PASSWORD;}
 else{delete process.env.GAS_WEBAPP_URL;delete process.env.GAS_TOKEN;delete process.env.SCHOOL_PASSWORD;}
}
test('status tells whether sharing is configured, without secrets',async()=>{
 env(false); let r=await handler(req({action:'status'})); let b=await r.json();
 assert.equal(b.configured,false); assert.equal(JSON.stringify(b).includes(TOKEN),false);
 env(true); r=await handler(req({action:'status'})); b=await r.json();
 assert.equal(b.configured,true); assert.equal(JSON.stringify(b).includes(TOKEN),false);
});
test('missing environment blocks data actions',async()=>{
 env(false); const r=await handler(req({action:'head',key:KEY}));
 assert.equal(r.status,503); assert.equal((await r.json()).error,'SERVER_NOT_CONFIGURED');
});
test('wrong password is rejected before any Google call',async()=>{
 env(true); globalThis.fetch=async()=>{throw Error('MUST NOT CALL');};
 const bad=createHash('sha256').update('wrong').digest('hex');
 for(const key of [bad,'',undefined,'xyz']){
  const r=await handler(req({action:'head',key})); assert.equal(r.status,401); assert.equal((await r.json()).error,'WRONG_PASSWORD');
 }
 globalThis.fetch=realFetch;
});
test('right password forwards to the configured GAS URL with the server token and editor name',async()=>{
 env(true);
 globalThis.fetch=async(url,opts)=>{
  assert.equal(url,VALID); const body=JSON.parse(opts.body);
  assert.equal(body.token,TOKEN); assert.equal(body.action,'head'); assert.equal(body.editor,'김남훈script');
  assert.equal('key' in body,false);
  return new Response(JSON.stringify({ok:true,head:{revision:3}}),{status:200});
 };
 const r=await handler(req({action:'head',key:KEY,editor:'김남훈<script>',url:'https://attacker.example.com'}));
 assert.equal(r.status,200); assert.equal((await r.json()).head.revision,3);
 globalThis.fetch=realFetch;
});
test('conflict keeps status 409 and the newer version',async()=>{
 env(true); globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,error:'CONFLICT',version:6,actor:'담당자 B'}),{status:200});
 const r=await handler(req({action:'save',key:KEY,baseVersion:5,data:{format:'cleargrid-portfolio-v1',workspaces:{}}}));
 assert.equal(r.status,409); assert.equal((await r.json()).version,6);
 globalThis.fetch=realFetch;
});
test('a token mismatch between Netlify and Apps Script is reported as setup problem',async()=>{
 env(true); globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,error:'UNAUTHORIZED'}),{status:200});
 const r=await handler(req({action:'head',key:KEY})); assert.equal(r.status,503); assert.equal((await r.json()).error,'SERVER_TOKEN_MISMATCH');
 globalThis.fetch=realFetch;
});
