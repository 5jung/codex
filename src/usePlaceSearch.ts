import {useEffect,useState} from 'react';
import {loadSDK} from './KakaoMap';
import {normalizePlace} from './placeResults';
import type {Facility,Position} from './facilities';
export function usePlaceSearch(query:string,enabled:boolean,nearby:Position|null=null){
 const requestKey=query.trim()|| (nearby?`nearby:${nearby.latitude},${nearby.longitude}`:'');
 const [state,setState]=useState<{query:string;items:Facility[];loading:boolean;error:string}>({query:'',items:[],loading:false,error:''});
 useEffect(()=>{
  const term=query.trim();if(!enabled||(!nearby&&term.length<2)){setState({query:requestKey,items:[],loading:false,error:''});return;}
  let active=true;setState({query:requestKey,items:[],loading:true,error:''});
  const timer=setTimeout(async()=>{
   try{
    const key=import.meta.env.VITE_KAKAO_MAP_KEY?.trim();if(!key)throw new Error('지도 키를 설정한 후 추가 검색을 사용할 수 있어요.');
    const sdk=await loadSDK(key);if(!active)return;
    const places=new sdk.services.Places();const phrase=!term&&nearby?'수유실':/수유/.test(term)?term:term+' 수유실';const results:Facility[]=[];
    for(let page=1;page<=3;page++){
     const data=await new Promise<{items:Facility[];total:number}>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('장소검색 응답이 늦어지고 있어요. 검색어를 다시 입력해주세요.')),15000);places.keywordSearch(phrase,(rows,status,pagination)=>{clearTimeout(timeout);
      if(status===sdk.services.Status.ZERO_RESULT){resolve({items:[],total:0});return;}
      if(status!==sdk.services.Status.OK){reject(new Error('카카오 장소검색을 불러오지 못했어요. 잠시 후 다시 검색해주세요.'));return;}
      resolve({items:rows.map(normalizePlace).filter((f):f is Facility=>f!==null),total:Number(pagination.totalCount)||0});
     },{size:15,page,...(!term&&nearby?{location:new sdk.LatLng(nearby.latitude,nearby.longitude),radius:10000,sort:sdk.services.SortBy.DISTANCE}:{})});});
     if(!active)return;results.push(...data.items);if(page*15>=data.total)break;
    }
    if(active)setState({query:requestKey,items:[...new Map(results.map(f=>[f.id,f])).values()],loading:false,error:''});
   }catch(error){if(active)setState({query:requestKey,items:[],loading:false,error:error instanceof Error?error.message:'추가 검색에 실패했습니다.'});}
  },500);
  return()=>{active=false;clearTimeout(timer);};
 },[query,enabled,nearby?.latitude,nearby?.longitude]);
 return state.query===requestKey?state:{query:requestKey,items:[],loading:enabled,error:''};
}
