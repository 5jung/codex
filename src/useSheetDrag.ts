import {useEffect,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';

// Gestures start only on the handle, leaving list scrolling and the map independent.
export function useSheetDrag(open:boolean,onChange:(open:boolean)=>void){
 const panelRef=useRef<HTMLElement>(null);
 const gesture=useRef<{id:number;y:number;height:number;min:number;max:number;lastY:number;lastTime:number;velocity:number}|null>(null);
 const [height,setHeight]=useState<number|null>(null);
 useEffect(()=>{const cancel=()=>{gesture.current=null;setHeight(null);};window.addEventListener('resize',cancel);return()=>window.removeEventListener('resize',cancel);},[]);
 useEffect(()=>{gesture.current=null;setHeight(null);},[open]);
 function onPointerDown(e:PointerEvent<HTMLElement>){
  if(!e.isPrimary||e.button!==0||!window.matchMedia('(max-width:760px)').matches||!panelRef.current)return;
  const min=70+(parseFloat(getComputedStyle(panelRef.current).paddingBottom)||0),max=Math.max(min,innerHeight*(innerHeight<=540?.6:.52));
  gesture.current={id:e.pointerId,y:e.clientY,height:panelRef.current.getBoundingClientRect().height,min,max,lastY:e.clientY,lastTime:e.timeStamp,velocity:0};
  e.currentTarget.setPointerCapture(e.pointerId);
 }
 function onPointerMove(e:PointerEvent<HTMLElement>){
  const g=gesture.current;if(!g||g.id!==e.pointerId)return;e.preventDefault();
  const elapsed=e.timeStamp-g.lastTime;if(elapsed>0){g.velocity=(g.lastY-e.clientY)/elapsed;g.lastTime=e.timeStamp;g.lastY=e.clientY;}
  setHeight(Math.max(g.min,Math.min(g.max,g.height+g.y-e.clientY)));
 }
 function finish(e:PointerEvent<HTMLElement>,cancel=false){
  const g=gesture.current;if(!g||g.id!==e.pointerId)return;gesture.current=null;setHeight(null);
  if(!cancel){const next=Math.max(g.min,Math.min(g.max,g.height+g.y-e.clientY));const moved=Math.abs(g.y-e.clientY)>8;
   if(moved)onChange(e.timeStamp-g.lastTime<120&&Math.abs(g.velocity)>.45?g.velocity>0:next>(g.min+g.max)/2);
  }
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 }
 function onKeyDown(e:KeyboardEvent<HTMLElement>){
  if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();onChange(e.key==='ArrowUp'||e.key==='End');}
 }
 return {panelRef,height,handlers:{onPointerDown,onPointerMove,onPointerUp:(e:PointerEvent<HTMLElement>)=>finish(e),onPointerCancel:(e:PointerEvent<HTMLElement>)=>finish(e,true),onLostPointerCapture:(e:PointerEvent<HTMLElement>)=>finish(e,true),onKeyDown}};
}
