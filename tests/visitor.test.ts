import {test} from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/visitor.json';
import {searchFacilities,type Facility} from '../src/facilities';
const items=data.facilities as Facility[];
test('AK 명칭 변형을 찾고 방문 후기와 공식 확인을 구분한다',()=>{
 for(const query of ['AK 세종','AK&세종','세종 AK몰','에이케이 세종'])assert.equal(searchFacilities(items,query,false,false)[0]?.id,'visitor-ak-sejong-nursing');
 const facility=items[0];assert.equal(facility.sourceKind,'visitor');assert.equal(facility.hours,null);assert.equal(facility.changingTable,null);assert.ok(facility.evidence?.every(e=>e.url.startsWith('https://blog.naver.com/')&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)));assert.equal(facility.latitude,undefined);
});
