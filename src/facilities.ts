export type Facility = { id: string; name: string; address: string; latitude?: number; longitude?: number; isExample?: boolean; provider?:'kakao';sourceKind?:'visitor';aliases?:string[];evidence?:{url:string;date:string;label:string;summary:string}[]; roadAddress?:string; parcelAddress?:string; category?:string; location?: string; phone?: string | null; sourceName?: string; sourceUrl?: string; sourceUpdatedAt?: string | null; access?:string; notes?:string; sourceStatus?:string; hours: string | null; changingTable: boolean | null };
// Synthetic fixtures: these are not real facilities or verified addresses.
export const examples: Facility[] = [
 {isExample:true, id:'demo-1', name:'예시 A 수유실', address:'서울 · 가상 시설', hours:'평일 09:00–18:00 (예시)', changingTable:true},
 {isExample:true, id:'demo-2', name:'예시 B 수유실', address:'부산 · 가상 시설', hours:null, changingTable:null},
 {isExample:true, id:'demo-3', name:'예시 C 수유실', address:'서울 · 가상 시설', hours:null, changingTable:false},
];
export function searchFacilities(items: Facility[], query: string, changingOnly: boolean, hoursKnown: boolean) {
 const normalize=(value:string)=>value.toLocaleLowerCase('ko').replace(/[\s&＆·.\-]/g,'');
 const q=normalize(query.trim());
 return items.filter(f => normalize(`${f.name} ${f.address} ${(f.aliases??[]).join(' ')}`).includes(q) && (!changingOnly || f.changingTable===true) && (!hoursKnown || f.hours!==null));
}
export type Position={latitude:number;longitude:number};
export type Bounds={south:number;north:number;west:number;east:number};
export function distanceKm(a:Position,b:Position){
 const rad=(n:number)=>n*Math.PI/180;const dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);
 const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;
 return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function inBounds(f:Facility,b:Bounds){return typeof f.latitude==='number'&&typeof f.longitude==='number'&&f.latitude>=b.south&&f.latitude<=b.north&&f.longitude>=b.west&&f.longitude<=b.east;}
