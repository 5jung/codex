import { useEffect, useRef, useState } from 'react';
import type { Facility, Position, Bounds } from './facilities';
import { Icon } from './Icon';
import { hasCoordinates } from './map';
type Point = object;
type MapInstance = {getLevel():number;setLevel(level:number):void;setCenter(p:Point):void; setBounds(b:object):void; relayout():void; getBounds():{getSouthWest():{getLat():number;getLng():number};getNorthEast():{getLat():number;getLng():number}}};
type MarkerInstance = {setMap(m:MapInstance|null):void};
export type KakaoPlace={id:string;place_name:string;address_name:string;road_address_name:string;phone:string;x:string;y:string;place_url:string};
export type SDK = {
 services:{SortBy:{DISTANCE:string};Places:new()=>{keywordSearch(query:string,callback:(data:KakaoPlace[],status:string,pagination:{totalCount:number})=>void,options:{size:number;page:number;location?:Point;radius?:number;sort?:string}):void};Status:{OK:string;ZERO_RESULT:string}};
 load(fn:()=>void):void;
 LatLng:new(lat:number,lng:number)=>Point;
 LatLngBounds:new()=>{extend(p:Point):void};
 Map:new(el:HTMLElement, options:{center:Point;level:number})=>MapInstance;
 Marker:new(options:{map:MapInstance;position:Point;title:string})=>MarkerInstance;
 MarkerClusterer:new(options:{map:MapInstance;averageCenter:boolean;minLevel:number;gridSize:number;styles:Record<string,string>[]})=>{addMarkers(markers:MarkerInstance[]):void;clear():void};
 event:{addListener(target:MarkerInstance,name:string,fn:()=>void):void;removeListener(target:MarkerInstance,name:string,fn:()=>void):void};
};
declare global {interface Window {kakao?:{maps:SDK}}}
let pending:Promise<SDK>|null=null;
export function loadSDK(key:string):Promise<SDK>{
 if(pending)return pending;
 pending=new Promise<SDK>((resolve,reject)=>{
  const script=document.createElement('script');
  const timer=setTimeout(()=>fail(),15000);
  function fail(){clearTimeout(timer);script.remove();reject(new Error('지도 SDK를 불러오지 못했습니다.'));}
  script.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=clusterer,services`;
  script.onerror=fail;
  script.onload=()=>{const sdk=window.kakao?.maps;if(!sdk){fail();return;}sdk.load(()=>{clearTimeout(timer);resolve(sdk);});};
  document.head.appendChild(script);
 }).catch(error=>{pending=null;throw error;});
 return pending;
}
export function KakaoMap({facilities,selected,onSelect,position,onSearchBounds}:{facilities:Facility[];selected:Facility|null;onSelect:(f:Facility)=>void;position:Position|null;onSearchBounds:(b:Bounds)=>void}){
 const host=useRef<HTMLDivElement>(null);const [sdk,setSDK]=useState<SDK|null>(null);const [error,setError]=useState(false);const [attempt,setAttempt]=useState(0);const [ready,setReady]=useState(false);const instance=useRef<MapInstance|null>(null);
 const key=import.meta.env.VITE_KAKAO_MAP_KEY?.trim();
 useEffect(()=>{if(!key||!host.current)return;let active=true;setError(false);setReady(false);
 loadSDK(key).then(api=>{if(!active||!host.current)return;try{instance.current=new api.Map(host.current,{center:new api.LatLng(36.5,127.8),level:13});setSDK(api);setReady(true);}catch{setError(true);}}).catch(()=>{if(active)setError(true);});
 return()=>{active=false;instance.current=null;setSDK(null);};},[key,attempt]);
 useEffect(()=>{if(!sdk||!instance.current)return;const map=instance.current;const bounds=new sdk.LatLngBounds();
 const entries=facilities.filter(f=>!f.isExample&&hasCoordinates(f)).map(f=>{if(!hasCoordinates(f))throw new Error('Invalid coordinates');const position=new sdk.LatLng(f.latitude,f.longitude);bounds.extend(position);const marker=new sdk.Marker({map,position,title:f.name});const click=()=>onSelect(f);sdk.event.addListener(marker,'click',click);return {marker,click};});
 if(entries.length)map.setBounds(bounds);
 const clusterer=new sdk.MarkerClusterer({map,averageCenter:true,minLevel:6,gridSize:70,styles:[{width:'42px',height:'42px',borderRadius:'50%',background:'#206b53',border:'3px solid white',color:'#ffffff',fontSize:'12px',fontWeight:'700',textAlign:'center',lineHeight:'36px',boxShadow:'0 3px 12px #1a47252b'}]});
 clusterer.addMarkers(entries.map(e=>e.marker));
 return()=>{clusterer.clear();entries.forEach(({marker,click})=>{sdk.event.removeListener(marker,'click',click);marker.setMap(null);});};},[sdk,facilities,onSelect]);
 useEffect(()=>{if(sdk&&instance.current&&selected&&!selected.isExample&&hasCoordinates(selected)){instance.current.setLevel(Math.min(instance.current.getLevel(),5));instance.current.setCenter(new sdk.LatLng(selected.latitude,selected.longitude));}},[sdk,selected,facilities]);
 useEffect(()=>{if(!ready||!host.current)return;const observer=new ResizeObserver(()=>instance.current?.relayout());observer.observe(host.current);return()=>observer.disconnect();},[ready]);
 useEffect(()=>{if(sdk&&instance.current&&position)instance.current.setCenter(new sdk.LatLng(position.latitude,position.longitude));},[sdk,position]);
 return <section className="map-panel" aria-label="카카오 지도"><h2>수유실 지도</h2><div className="map-canvas" ref={host}/>{!key?<div className="map-error map-loading" role="status"><p>지도를 준비하고 있어요. 시설 정보는 목록에서 확인할 수 있습니다.</p></div>:<>{ready&&<><button className="map-search-button" onClick={()=>{const b=instance.current?.getBounds();if(!b)return;const sw=b.getSouthWest(),ne=b.getNorthEast();onSearchBounds({south:sw.getLat(),west:sw.getLng(),north:ne.getLat(),east:ne.getLng()});}}><Icon name="locate" size={15}/>이 지도 영역에서 찾기</button><div className="map-zoom"><button aria-label="지도 확대" onClick={()=>{const m=instance.current;if(m)m.setLevel(Math.max(1,m.getLevel()-1));}}>+</button><button aria-label="지도 축소" onClick={()=>{const m=instance.current;if(m)m.setLevel(Math.min(14,m.getLevel()+1));}}>−</button></div></>}{error?<div className="map-error" role="alert"><p>지도를 불러오지 못했어요. 목록을 이용하거나 다시 시도해주세요.</p><button onClick={()=>setAttempt(a=>a+1)}>지도 다시 시도</button></div>:!ready?<div className="map-error map-loading" role="status"><p>주변 지도를 불러오고 있어요.</p></div>:<p className="map-status">지도 표시 {facilities.some(f=>f.provider==='kakao')?'장소':'시설'} {facilities.filter(f=>!f.isExample&&hasCoordinates(f)).length}곳 · 좌표 없는 시설은 목록 제공</p>}</>}</section>;
}
