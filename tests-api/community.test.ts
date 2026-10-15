import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
import { pool } from '../server/db';
const base='http://127.0.0.1:3001/api';
test('실제 DB에서 로그인·소유권·검토·신고·제보 반영과 원본 보존',async()=>{
 const tag=randomUUID().slice(0,8);const handles=['a','b','admin'].map(s=>'test_'+s+'_'+tag);const password=randomBytes(24).toString('hex');const facility='test-facility-'+tag;const original={id:facility,name:'테스트 시설',address:'테스트 지역',hours:null,changingTable:null};const cookies:string[]=[];
 async function request(path:string,method='GET',body?:unknown,who?:number,origin?:string){const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(who===undefined?{}:{Cookie:cookies[who]??''}),...(origin?{Origin:origin}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const json=await res.json();return {status:res.status,json,cookie:res.headers.get('set-cookie')?.split(';')[0]};}
 try{
 await pool.query('INSERT INTO facilities(id,source_data) VALUES(?,?)',[facility,JSON.stringify(original)]);
 assert.equal((await request('/health')).json.database,'connected');
 for(let i=0;i<handles.length;i++){assert.equal((await request('/auth/register','POST',{handle:handles[i],password})).status,201);const login=await request('/auth/login','POST',{handle:handles[i],password});assert.equal(login.status,200);assert.ok(login.cookie);cookies.push(login.cookie!);}
 await pool.query("UPDATE users SET role='admin' WHERE handle=?",[handles[2]]);
 assert.equal((await request('/admin/queue','GET',undefined,0)).status,403);
 assert.equal((await request('/admin/queue')).status,401);
 assert.equal((await request(`/facilities/${facility}/reviews`,'POST',{body:'좋은 시설입니다.'})).status,401);
 assert.equal((await request(`/facilities/${facility}/reviews`,'POST',{body:'좋은 시설입니다.'},0,'https://untrusted.example')).status,403);
 assert.equal((await request(`/facilities/${facility}/reviews`,'POST',{body:'짧음'},0)).status,400);
 const review=await request(`/facilities/${facility}/reviews`,'POST',{body:'방문 후 작성한 테스트 후기입니다.'},0);assert.equal(review.status,201);
 assert.equal((await request(`/facilities/${facility}/reviews`)).json.length,0);
 assert.equal((await request(`/facilities/${facility}/reviews`,'GET',undefined,0)).json[0].status,'pending');
 assert.equal((await request('/reviews/'+review.json.id,'DELETE',undefined,1)).status,404);
 assert.equal((await request('/admin/moderate','POST',{kind:'review',id:review.json.id,approve:true},0)).status,403);
 assert.equal((await request('/admin/moderate','POST',{kind:'review',id:review.json.id,approve:true},2)).status,200);
 assert.equal((await request(`/facilities/${facility}/reviews`)).json[0].body,'방문 후 작성한 테스트 후기입니다.');
 assert.equal((await request('/admin/moderate','POST',{kind:'review',id:review.json.id,approve:true},2)).status,409);
 const report=await request(`/reviews/${review.json.id}/reports`,'POST',{reason:'확인 필요한 테스트 신고입니다.'},1);assert.equal(report.status,201);
 assert.equal((await request(`/reviews/${review.json.id}/reports`,'POST',{reason:'중복 신고 테스트입니다.'},1)).status,409);
 const queue=(await request('/admin/queue','GET',undefined,2)).json;
 const target=queue.reports.find((r:any)=>r.review_id===review.json.id);assert.ok(target);
 assert.equal((await request('/admin/moderate','POST',{kind:'report',id:target.id,approve:true},2)).status,200);
 assert.equal((await request(`/facilities/${facility}/reviews`)).json.length,0);
 const correction=await request(`/facilities/${facility}/corrections`,'POST',{field:'hours',value:'09:00~18:00',reason:'현장 안내판을 확인했습니다.'},0);assert.equal(correction.status,201);
 assert.equal((await request('/corrections/mine','GET',undefined,0)).json.find((c:any)=>c.id===correction.json.id).status,'pending');
 assert.equal((await request('/admin/moderate','POST',{kind:'correction',id:correction.json.id,approve:true},2)).status,200);
 const f=(await request('/facilities')).json.find((f:any)=>f.id===facility);assert.equal(f.hours,'09:00~18:00');
 const db=(await pool.query('SELECT source_data FROM facilities WHERE id=?',[facility]))[0];assert.equal(JSON.parse(db.source_data).hours,null);
 assert.equal((await request('/reviews/'+review.json.id,'DELETE',undefined,0)).status,200);
 await request('/auth/logout','POST',undefined,0);assert.equal((await request('/auth/me','GET',undefined,0)).json.user,null);
 }finally{
 const users=await pool.query('SELECT id FROM users WHERE handle IN (?,?,?)',handles);const ids=users.map((u:any)=>u.id);
 for(const id of ids){await pool.query('DELETE FROM moderation_actions WHERE actor_id=?',[id]);await pool.query('DELETE FROM reports WHERE author_id=?',[id]);await pool.query('DELETE FROM corrections WHERE author_id=?',[id]);}
 await pool.query('DELETE FROM reports WHERE review_id IN (SELECT id FROM reviews WHERE facility_id=?)',[facility]);await pool.query('DELETE FROM reviews WHERE facility_id=?',[facility]);
 for(const id of ids)await pool.query('DELETE FROM users WHERE id=?',[id]);await pool.query('DELETE FROM facilities WHERE id=?',[facility]);await pool.end();
 }
});
