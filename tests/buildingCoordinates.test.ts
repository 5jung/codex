import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildingCoordinates} from '../src/buildingCoordinates';
import type {SDK} from '../src/KakaoMap';
test('서버 갱신과 초기 조회가 겹쳐도 같은 주소는 한 번만 조회하고 비정상 좌표는 쓰지 않는다',async()=>{
 let calls=0;
 const sdk={services:{Status:{OK:'OK'},Geocoder:class{addressSearch(address:string,callback:Function){calls++;callback([{x:address==='valid'?'127.2':'0',y:'36.5'}],'OK');}}}} as unknown as SDK;
 const first=buildingCoordinates(sdk,'valid'),second=buildingCoordinates(sdk,'valid');assert.equal(first,second);assert.deepEqual(await first,{latitude:36.5,longitude:127.2});assert.equal(calls,1);
 assert.equal(await buildingCoordinates(sdk,'invalid'),null);
});
