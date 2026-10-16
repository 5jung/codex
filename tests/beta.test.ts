import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {privateBetaGate} from '../server/beta';

test('초대 인증은 재접속 후 유지되고 위조·만료·자격정보 변경 시 거부된다',async()=>{
 const password=randomUUID();let gate=privateBetaGate('tester',password);
 const app=express();app.use((req,res,next)=>gate(req,res,next));app.use((_req,res)=>res.send('private'));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
 try{
  assert.equal((await fetch(base)).status,401);
  const login=await fetch(base,{headers:{Authorization:'Basic '+Buffer.from('tester:'+password).toString('base64')}});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!;
  assert.match(cookie,/Max-Age=2592000/);assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=Lax/i);if(process.env.NODE_ENV==='production')assert.match(cookie,/; Secure/i);
  const saved=cookie.split(';')[0];gate=privateBetaGate('tester',password);
  assert.equal((await fetch(base,{headers:{Cookie:saved}})).status,200);
  assert.equal((await fetch(base+'/api/facilities',{headers:{Cookie:saved}})).status,200);
  assert.equal((await fetch(base,{headers:{Cookie:saved.slice(0,-1)+(saved.endsWith('0')?'1':'0')}})).status,401);
  const expired=String(Math.floor(Date.now()/1000)-1),key=createHash('sha256').update('tester:'+password).digest();
  const signature=createHmac('sha256',key).update('nursing-beta:'+expired).digest('hex');
  assert.equal((await fetch(base,{headers:{Cookie:'nursing_beta='+expired+'.'+signature}})).status,401);
  gate=privateBetaGate('tester',randomUUID());assert.equal((await fetch(base,{headers:{Cookie:saved}})).status,401);
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
