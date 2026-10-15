import {useEffect,useMemo,useState} from 'react';
import {loadSDK} from './KakaoMap';
import visitor from './data/visitor.json';
import type {Facility} from './facilities';
const base:Facility[]=visitor.facilities.map(f=>({...f,sourceKind:'visitor' as const}));
// Reviewed facts and approved corrections are separate from transient building
// coordinates. An address change invalidates the previous geocoding result.
export function useVisitorFacilities(serverFacilities:Facility[]){
 const source=useMemo(()=>base.map(f=>({...f,...serverFacilities.find(s=>s.id===f.id)})),[serverFacilities]);
 const [points,setPoints]=useState<Record<string,{address:string;latitude:number;longitude:number}>>({});
 useEffect(()=>{let active=true;const key=import.meta.env.VITE_KAKAO_MAP_KEY?.trim();if(!key)return;
 loadSDK(key).then(sdk=>{if(!active)return;const geocoder=new sdk.services.Geocoder();
  for(const facility of source)geocoder.addressSearch(facility.address,(rows,status)=>{
   if(!active||status!==sdk.services.Status.OK||!rows[0])return;const latitude=Number(rows[0].y),longitude=Number(rows[0].x);
   if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<33||latitude>39||longitude<124||longitude>132)return;
   setPoints(previous=>({...previous,[facility.id]:{address:facility.address,latitude,longitude}}));
  });
 }).catch(()=>{});return()=>{active=false;};},[source]);
 return useMemo(()=>source.map(f=>points[f.id]?.address===f.address?{...f,latitude:points[f.id].latitude,longitude:points[f.id].longitude}:f),[source,points]);
}
