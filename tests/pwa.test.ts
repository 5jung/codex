import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import {appMetadata} from '../server/pwa';
import {privateBetaGate} from '../server/beta';
import {randomUUID} from 'node:crypto';

test('홈 화면 설치 자료만 공개하고 초대 인증은 페이지·API에 유지한다',async()=>{
 const app=express(),password=randomUUID();app.use(appMetadata(path.resolve('public')));app.use(privateBetaGate('tester',password));app.use((_req,res)=>res.send('authenticated'));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
 try{
  const response=await fetch(base+'/manifest.webmanifest');assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/application\/manifest\+json/);
  const manifest=await response.json();assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');
  for(const size of [180,192,512]){const icon=await fetch(base+`/icons/app-${size}.png`);assert.equal(icon.status,200);assert.match(icon.headers.get('content-type')??'',/image\/png/);const bytes=Buffer.from(await icon.arrayBuffer());assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
  for(const route of ['/','/api/facilities','/assets/private.js','/icons/other.png'])assert.equal((await fetch(base+route)).status,401,route);
  assert.equal((await fetch(base+'/',{headers:{Authorization:'Basic '+Buffer.from('tester:'+password).toString('base64')}})).status,200);
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
