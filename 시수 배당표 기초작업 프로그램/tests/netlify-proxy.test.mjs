import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/sync.mjs';
const realFetch = globalThis.fetch;
const VALID='https://script.google.com/macros/s/AbCdEf0123456789_TEST-deploy/exec';
const TOKEN='12345678901234567890123456789012';
function req(data){ return new Request('https://example.netlify.app/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); }
function env(v){ if(v===undefined)delete process.env.GAS_WEBAPP_URL;else process.env.GAS_WEBAPP_URL=v; }
test('missing Netlify environment variable blocks proxy', async()=>{
 env(undefined);
 const r=await handler(req({action:'head',url:VALID,token:TOKEN}));
 assert.equal(r.status,503);assert.equal((await r.json()).error,'SERVER_NOT_CONFIGURED');
});
test('rejects URL mismatches (SSRF prevention) before network call',async()=>{
 env(VALID);globalThis.fetch=async()=>{throw Error('MUST NOT CALL');};
 const r=await handler(req({action:'head',url:'https://attacker.example.com',token:TOKEN}));
 assert.equal(r.status,400);assert.equal((await r.json()).error,'INVALID_REQUEST');
 globalThis.fetch=realFetch;
});
test('success forwards action and token only to allowlisted GAS URL',async()=>{
 env(VALID);
 globalThis.fetch=async(url,opts)=>{
  assert.equal(url,VALID);assert.equal(opts.method,'POST');
  assert.equal(JSON.parse(opts.body).action,'head');
  assert.equal(JSON.parse(opts.body).token,TOKEN);
  return new Response(JSON.stringify({ok:true,head:{revision:3}}),{status:200});
 };
 const r=await handler(req({action:'head',url:VALID,token:TOKEN}));
 assert.equal(r.status,200);assert.equal((await r.json()).head.revision,3);
 globalThis.fetch=realFetch;
});
test('conflict preserves status 409 and current version',async()=>{
 env(VALID);globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,error:'CONFLICT',version:6,actor:'담당자 B'}),{status:200});
 const r=await handler(req({action:'save',url:VALID,token:TOKEN,baseVersion:5,data:{format:'cleargrid-portfolio-v1',workspaces:{}}}));
 assert.equal(r.status,409);assert.equal((await r.json()).version,6);
 globalThis.fetch=realFetch;
});
test('short tokens are rejected',async()=>{
 env(VALID);const r=await handler(req({action:'head',url:VALID,token:'123'}));
 assert.equal(r.status,400);
});
