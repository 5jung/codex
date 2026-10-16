import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import type {RequestHandler} from 'express';
const cookieName='nursing_beta';
const lifetime=30*24*60*60;
export function privateBetaGate(user:string,password:string):RequestHandler{
 if(!user||user.includes(':')||password.length<16)throw new Error('Private beta requires a user and a password of at least 16 characters');
 const expected=createHash('sha256').update(user+':'+password).digest();
 // Changing either invitation credential invalidates all remembered invitations.
 const sign=(value:string)=>createHmac('sha256',expected).update('nursing-beta:'+value).digest('hex');
 return (req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  const saved=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)??'';
  const match=/^(\d{10})\.([a-f0-9]{64})$/.exec(saved);
  const now=Math.floor(Date.now()/1000);
  if(match&&Number(match[1])>now&&Number(match[1])<=now+lifetime&&timingSafeEqual(Buffer.from(match[2],'hex'),Buffer.from(sign(match[1]),'hex'))){next();return;}
  const header=req.get('authorization')??'';const raw=header.startsWith('Basic ')?Buffer.from(header.slice(6),'base64').toString('utf8'):'';
  if(timingSafeEqual(createHash('sha256').update(raw).digest(),expected)){
   const expires=String(now+lifetime);
   res.cookie(cookieName,expires+'.'+sign(expires),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:lifetime*1000,path:'/'});
   next();return;
  }
  res.setHeader('WWW-Authenticate','Basic realm="Nursing Private Beta", charset="UTF-8"');res.status(401).send('비공개 테스트 초대 계정이 필요합니다.');
 };
}
