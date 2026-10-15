import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pool,syncFacilities} from '../server/db';
test('계정 복구·탈퇴·페이지 탐색·원본 삭제 동기화',async()=>{
 const tag=randomUUID();const handle='test_life_'+tag.slice(0,8);const source='https://test.invalid/'+tag;const a='test-a-'+tag,b='test-b-'+tag;let cookie='';let userId:string|undefined;const p1=randomUUID(),p2=randomUUID(),p3=randomUUID();
 async function req(path:string,method='GET',body?:unknown){const r=await fetch('http://127.0.0.1:3001/api'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
 const facility=(id:string)=>({id,name:'수명주기 테스트',address:'테스트',sourceUrl:source,hours:null,changingTable:null});
 await syncFacilities([facility(a),facility(b)],[source]);
 const registration=await req('/auth/register','POST',{handle,password:p1});assert.equal(registration.status,201);const recovery=registration.body.recoveryCode;assert.ok(typeof recovery==='string'&&recovery.length===64);
 const login=await req('/auth/login','POST',{handle,password:p1});cookie=login.cookie!;userId=(await req('/auth/me')).body.user.id;
 assert.equal((await req('/auth/password','POST',{currentPassword:p2,newPassword:p3})).status,401);
 assert.equal((await req('/auth/password','POST',{currentPassword:p1,newPassword:p2})).status,200);
 assert.equal((await req('/auth/me')).body.user,null);
 assert.equal((await req('/auth/login','POST',{handle,password:p1})).status,401);
 assert.equal((await req('/auth/login','POST',{handle,password:p2})).status,200);
 const recovered=await req('/auth/recover','POST',{handle,recoveryCode:recovery,newPassword:p3});assert.equal(recovered.status,200);assert.ok(recovered.body.recoveryCode!==recovery);
 assert.equal((await req('/auth/recover','POST',{handle,recoveryCode:recovery,newPassword:p1})).status,401);
 cookie=(await req('/auth/login','POST',{handle,password:p3})).cookie!;
 for(let i=0;i<51;i++)await pool.query("INSERT INTO reviews(id,facility_id,author_id,body,status) VALUES(?,?,?,?,'published')",[randomUUID(),a,userId,'페이지 테스트 '+i]);
 const first=await req(`/facilities/${a}/reviews?page=0`),second=await req(`/facilities/${a}/reviews?page=1`);assert.equal(first.body.length,50);assert.equal(second.body.length,1);assert.equal(new Set([...first.body,...second.body].map(r=>r.id)).size,51);
 assert.equal((await req(`/facilities/${a}/reviews?page=-1`)).status,400);
 await pool.query('UPDATE facilities SET override_data=? WHERE id=?',[JSON.stringify({hours:'승인된 정보'}),a]);
 await syncFacilities([facility(a)],[source]);assert.equal((await pool.query('SELECT is_active FROM facilities WHERE id=?',[b]))[0].is_active,0);
 assert.equal((await req(`/facilities/${b}/reviews`,'POST',{body:'비공개 시설 테스트'})).status,410);
 assert.equal((await req('/facilities')).body.find((f:any)=>f.id===a).hours,'승인된 정보');
 assert.equal((await req('/facilities')).body.some((f:any)=>f.id===b),false);
 await syncFacilities([facility(a),facility(b)],[source]);assert.equal((await pool.query('SELECT is_active FROM facilities WHERE id=?',[b]))[0].is_active,1);
 await pool.query("UPDATE users SET role='admin' WHERE id=?",[userId]);assert.equal((await req('/auth/account','DELETE',{password:p3})).status,409);await pool.query("UPDATE users SET role='user' WHERE id=?",[userId]);
 assert.equal((await req('/auth/account','DELETE',{password:p2})).status,401);
 assert.equal((await req('/auth/account','DELETE',{password:p3})).status,200);
 assert.equal((await req('/auth/me')).body.user,null);assert.equal((await pool.query('SELECT id FROM users WHERE id=?',[userId])).length,0);assert.equal((await pool.query('SELECT id FROM reviews WHERE author_id=?',[userId])).length,0);
 }finally{
 if(!userId)userId=(await pool.query('SELECT id FROM users WHERE handle=?',[handle]))[0]?.id;
 if(userId){await pool.query('DELETE FROM reviews WHERE author_id=?',[userId]);await pool.query('DELETE FROM users WHERE id=?',[userId]);}
 await pool.query('DELETE FROM facilities WHERE source_url=?',[source]);await pool.end();
 }
});
