import {test} from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/visitor.json';
import {searchFacilities,type Facility} from '../src/facilities';
const items=data.facilities as Facility[];
test('AK 명칭 변형을 찾고 방문 후기와 공식 확인을 구분한다',()=>{
 for(const query of ['AK 세종','AK&세종','세종 AK몰','에이케이 세종'])assert.equal(searchFacilities(items,query,false,false)[0]?.id,'visitor-ak-sejong-nursing');
 const facility=items[0];assert.equal(facility.sourceKind,'visitor');assert.equal(facility.hours,null);assert.equal(facility.changingTable,null);assert.ok(facility.evidence?.every(e=>e.url.startsWith('https://blog.naver.com/')&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)));assert.equal(facility.latitude,undefined);
});

test('보완 카탈로그는 중복 없는 주소·근거·확인 수준을 유지하고 지도 좌표를 저장하지 않는다',()=>{
 assert.equal(items.filter(f=>f.region==='세종').length,10);assert.equal(items.filter(f=>f.region==='대전').length,4);assert.equal(items.filter(f=>f.region==='청주').length,3);assert.equal(new Set(items.map(f=>f.id)).size,items.length);
 assert.equal(items.filter(f=>f.evidenceLevel==='facility-guide').length,5);
 for(const f of items){
  assert.equal(f.sourceKind,'visitor');assert.match(f.address,/^(세종특별자치시|대전광역시|충청북도 청주시) /);assert.ok(f.region);assert.ok(f.location);assert.ok(f.evidence?.length);assert.equal(f.latitude,undefined);assert.equal(f.longitude,undefined);
  for(const e of f.evidence!){assert.ok(e.url.startsWith('https://'));assert.match(e.date,/^\d{4}-\d{2}-\d{2}$/);assert.ok(e.date<='2026-10-15');if(e.dateKind==='checked')assert.ok(!e.url.includes('blog.naver.com'));}
 }
 const homeplus=items.find(f=>f.id==='visitor-homeplus-sejong')!;assert.equal(homeplus.address,'세종특별자치시 절재로 154');assert.ok(homeplus.location?.includes('서로 다름'));
});
