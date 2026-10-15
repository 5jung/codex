import {useEffect,useMemo,useState} from 'react';
import {buildingCoordinates} from './buildingCoordinates';
import {loadSDK} from './KakaoMap';
import visitor from './data/visitor.json';
import type {Facility} from './facilities';
const base=visitor.facilities as Facility[];
// Reviewed facts and approved corrections are separate from transient building
// coordinates. An address change invalidates the previous geocoding result.
export function useVisitorFacilities(serverFacilities:Facility[]){
 const source=useMemo(()=>base.map(f=>({...f,...serverFacilities.find(s=>s.id===f.id)})),[serverFacilities]);
 const [points,setPoints]=useState<Record<string,{address:string;latitude:number;longitude:number}>>({});
 useEffect(()=>{let active=true;const key=import.meta.env.VITE_KAKAO_MAP_KEY?.trim();if(!key)return;
 loadSDK(key).then(sdk=>{if(!active)return;
  for(const facility of source)buildingCoordinates(sdk,facility.address).then(point=>{
   if(active&&point)setPoints(previous=>({...previous,[facility.id]:{address:facility.address,...point}}));
  });
 }).catch(()=>{});return()=>{active=false;};},[source]);
 return useMemo(()=>source.map(f=>points[f.id]?.address===f.address?{...f,latitude:points[f.id].latitude,longitude:points[f.id].longitude}:f),[source,points]);
}
