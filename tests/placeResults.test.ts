import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePlace,type PlaceResult} from '../src/placeResults';
const sample:PlaceResult={id:'12345',place_name:'테스트 건물',address_name:'세종특별자치시 테스트 주소',road_address_name:'',phone:'',x:'127.25',y:'36.5',place_url:'javascript:alert(1)'};
test('장소 검색은 확인된 수유실로 승격하지 않고 출처·확인 필요 안내를 유지한다',()=>{const f=normalizePlace(sample)!;assert.equal(f.provider,'kakao');assert.equal(f.hours,null);assert.equal(f.changingTable,null);assert.ok(f.notes?.includes('장소 후보'));assert.equal(f.sourceUrl,'https://place.map.kakao.com/12345');});
test('비정상 좌표와 빈 주소 및 비정상 장소 ID는 제외한다',()=>{for(const change of [{x:'NaN'},{x:''},{y:'90'},{address_name:''},{id:'../bad'}])assert.equal(normalizePlace({...sample,...change}),null);});
