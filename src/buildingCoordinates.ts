import type {SDK} from './KakaoMap';
type Coordinates={latitude:number;longitude:number};
// Session memory only: coalesce the initial catalog and server refresh requests.
const pending=new Map<string,Promise<Coordinates|null>>();
let startQueue=Promise.resolve();
export function buildingCoordinates(sdk:SDK,address:string):Promise<Coordinates|null>{
 const existing=pending.get(address);if(existing)return existing;
 const start=startQueue.then(()=>new Promise<void>(resolve=>setTimeout(resolve,150)));startQueue=start;
 const request=start.then(()=>new Promise<Coordinates|null>(resolve=>{
  const timer=setTimeout(()=>resolve(null),10000);
  try{new sdk.services.Geocoder().addressSearch(address,(rows,status)=>{
   clearTimeout(timer);if(status!==sdk.services.Status.OK||!rows[0]){resolve(null);return;}
   const latitude=Number(rows[0].y),longitude=Number(rows[0].x);
   resolve(Number.isFinite(latitude)&&Number.isFinite(longitude)&&latitude>=33&&latitude<=39&&longitude>=124&&longitude<=132?{latitude,longitude}:null);
  });}catch{clearTimeout(timer);resolve(null);}
 })).then(result=>{if(!result)pending.delete(address);return result;});
 pending.set(address,request);return request;
}
