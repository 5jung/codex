import express from 'express';
import path from 'node:path';
// Only non-personal installation metadata is public. Pages, bundles and APIs
// continue through the private-beta gate, including unknown asset paths.
export function appMetadata(dist:string){
 const router=express.Router();
 for(const asset of ['manifest.webmanifest','icons/app-180.png','icons/app-192.png','icons/app-512.png']){
  router.get('/'+asset,(_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','public, max-age=3600');if(asset.endsWith('.webmanifest'))res.type('application/manifest+json');res.sendFile(path.join(dist,asset),error=>{if(error)next(error);});});
 }
 return router;
}
