import {createHash,timingSafeEqual} from 'node:crypto';
import type {RequestHandler} from 'express';
export function privateBetaGate(user:string,password:string):RequestHandler{
 if(!user||user.includes(':')||password.length<16)throw new Error('Private beta requires a user and a password of at least 16 characters');
 const expected=createHash('sha256').update(user+':'+password).digest();
 return (req,res,next)=>{
  const header=req.get('authorization')??'';const raw=header.startsWith('Basic ')?Buffer.from(header.slice(6),'base64').toString('utf8'):'';
  if(timingSafeEqual(createHash('sha256').update(raw).digest(),expected)){next();return;}
  res.setHeader('WWW-Authenticate','Basic realm="Nursing Private Beta", charset="UTF-8"');res.status(401).send('비공개 테스트 초대 계정이 필요합니다.');
 };
}
