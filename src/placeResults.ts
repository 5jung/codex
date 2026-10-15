import type {Facility} from './facilities';
export type PlaceResult={id:string;place_name:string;address_name:string;road_address_name:string;phone:string;x:string;y:string;place_url:string;category_name?:string};
export function normalizePlace(place:PlaceResult):Facility|null{
 if(!/^\d+$/.test(place.id)||!place.place_name.trim()||(!place.road_address_name.trim()&&!place.address_name.trim()))return null;
 const latitude=Number(place.y),longitude=Number(place.x);
 if(!place.y.trim()||!place.x.trim()||!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<33||latitude>39||longitude<124||longitude>132)return null;
 return {id:'kakao-'+place.id,provider:'kakao',name:place.place_name,address:place.road_address_name||place.address_name,phone:place.phone||null,roadAddress:place.road_address_name||undefined,parcelAddress:place.address_name||undefined,category:place.category_name||undefined,latitude,longitude,hours:null,changingTable:null,sourceName:'카카오 장소검색',sourceUrl:'https://place.map.kakao.com/'+place.id,sourceUpdatedAt:null,notes:'‘수유실’ 키워드로 검색된 장소 후보입니다. 수유실 유무·층·운영시간은 방문 전 해당 시설에 확인해주세요.'};
}
