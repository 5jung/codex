import {useState} from 'react';
const key='nursing-bookmarks-v1';
export function useBookmarks(){
 const [ids,setIds]=useState<string[]>(()=>{try{const value=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(value)?value.filter((x:unknown):x is string=>typeof x==='string').slice(0,1000):[];}catch{return [];}});
 const [error,setError]=useState('');
 function toggle(id:string){const next=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];setIds(next);try{localStorage.setItem(key,JSON.stringify(next));setError('');}catch{setError('이 브라우저에 저장하지 못했어요. 현재 화면에서만 유지됩니다.');}}
 return {ids,toggle,error};
}
