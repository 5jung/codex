import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examples, searchFacilities } from '../src/facilities';
test('지역 검색은 공백을 정리하고 해당 지역만 반환한다',()=>assert.deepEqual(searchFacilities(examples,' 서울 ',false,false).map(f=>f.id),['demo-1','demo-3']));
test('편의시설 미확인과 없음은 있음 필터에 포함하지 않는다',()=>assert.deepEqual(searchFacilities(examples,'',true,false).map(f=>f.id),['demo-1']));
test('운영시간 미확인 시설은 정보 있음 필터에서 제외한다',()=>assert.equal(searchFacilities(examples,'',false,true).length,1));
test('검색과 필터는 함께 적용한다',()=>assert.equal(searchFacilities(examples,'부산',true,true).length,0));

import { directionsUrl, hasCoordinates } from '../src/map';
test('예시 시설에는 실제 길찾기를 제공하지 않는다',()=>assert.equal(directionsUrl({...examples[0],latitude:37.5,longitude:127}),null));
test('잘못된 좌표는 지도와 길찾기에서 제외한다',()=>{for(const latitude of [NaN,Infinity,91]){const f={...examples[0],isExample:false,latitude,longitude:127};assert.equal(hasCoordinates(f),false);assert.equal(directionsUrl(f),null);}});
test('시설 이름은 URL 인코딩하고 좌표 순서를 유지한다',()=>assert.equal(directionsUrl({...examples[0],isExample:false,name:'수유실 / A',latitude:37.5,longitude:127}),`https://map.kakao.com/link/to/${encodeURIComponent('수유실 / A')},37.5,127`));

import { distanceKm,inBounds } from '../src/facilities';
test('거리 계산은 같은 지점 0km이며 서울~부산은 약 325km',()=>{assert.equal(distanceKm({latitude:37.5665,longitude:126.978},{latitude:37.5665,longitude:126.978}),0);const d=distanceKm({latitude:37.5665,longitude:126.978},{latitude:35.1796,longitude:129.0756});assert.ok(d>320&&d<330);});
test('지도 영역 검색은 경계점을 포함하고 좌표 미확인 시설은 제외한다',()=>{const b={south:35,north:36,west:128,east:130};assert.equal(inBounds({...examples[0],latitude:35,longitude:128},b),true);assert.equal(inBounds({...examples[0],latitude:37,longitude:129},b),false);assert.equal(inBounds(examples[0],b),false);});
