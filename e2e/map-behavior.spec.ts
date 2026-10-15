import {test,expect} from '@playwright/test';
// Deterministic SDK responses let us inspect viewport intent and delayed replies.
// app.spec.ts separately exercises the real SDK, tiles and place search.
const sdk=`
window.__map={center:null,fits:0,requests:[],responses:[],fail:false};
class LatLng{constructor(lat,lng){this.lat=lat;this.lng=lng}getLat(){return this.lat}getLng(){return this.lng}}
class Bounds{constructor(){this.points=[]}extend(p){this.points.push(p)}}
class MapView{constructor(el,options){window.__view=this;window.__map.center=options.center;this.level=options.level;el.innerHTML='<div style="width:100%;height:100%"></div>'}getCenter(){return window.__map.center}setCenter(p){window.__map.center=p}getLevel(){return this.level}setLevel(l){this.level=l}relayout(){}setBounds(b){window.__map.fits++;this.setCenter(new LatLng(b.points.reduce((a,p)=>a+p.lat,0)/b.points.length,b.points.reduce((a,p)=>a+p.lng,0)/b.points.length))}getBounds(){const b=window.__bounds||{south:36.4,north:36.6,west:127.1,east:127.4};return{getSouthWest:()=>new LatLng(b.south,b.west),getNorthEast:()=>new LatLng(b.north,b.east)}}}
class Marker{setMap(){}}class Overlay{constructor(o){this.el=document.createElement('div');this.el.innerHTML=o.content;document.querySelector('.map-canvas').append(this.el)}setMap(m){if(!m)this.el.remove()}}
class Cluster{addMarkers(){}clear(){}}
class Places{keywordSearch(query,callback,options){window.__map.requests.push({query,options});let lat=36.48,lng=127.26;if(options.rect){const r=options.rect.split(',').map(Number);lng=(r[0]+r[2])/2;lat=(r[1]+r[3])/2}const row={id:'12345',place_name:options.rect?'지도 영역 테스트 후보':query.includes('느린')?'이전 느린 결과':'세종 테스트 건물',address_name:'세종특별자치시 테스트동 1',road_address_name:'세종특별자치시 테스트로 1',phone:'044-123-4567',category_name:'공공기관 > 보건소',x:String(lng),y:String(lat),place_url:'https://place.map.kakao.com/12345'};setTimeout(()=>{window.__map.responses.push(query);callback([row],window.__map.fail?'ERROR':'OK',{totalCount:1})},query.includes('느린')?1200:30)}}
window.kakao={maps:{load:f=>f(),LatLng,LatLngBounds:Bounds,Map:MapView,Marker,CustomOverlay:Overlay,MarkerClusterer:Cluster,event:{addListener(){},removeListener(){}},services:{Places,SortBy:{DISTANCE:'distance'},Status:{OK:'OK',ZERO_RESULT:'ZERO_RESULT'}}}};
`;
test.beforeEach(async({page})=>{await page.route('https://dapi.kakao.com/v2/maps/sdk.js*',route=>route.fulfill({contentType:'application/javascript',body:sdk}));});
const state=async(page:any)=>page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__map)));

test('현재 위치에서 검색창 포커스·한 글자 입력·지우기·목록 전환이 지도를 부산으로 옮기지 않는다',async({page,context})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:36.48,longitude:127.26});await page.goto('/');
 await page.getByLabel('지역·시설명').fill('강서구청');await expect.poll(async()=> (await state(page)).fits).toBe(1);
 await page.getByRole('button',{name:'내 위치 확인'}).click();await expect(page.getByLabel('지역·시설명')).toHaveValue('');await expect.poll(async()=> (await state(page)).center.lat).toBe(36.48);
 const before=await state(page);await page.getByLabel('지역·시설명').focus();await page.getByLabel('지역·시설명').fill('부');
 await expect(page.locator('.results-heading')).not.toContainText('입력 중');await page.getByRole('button',{name:'검색어 지우기'}).click();await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('세종 테스트 건물');
 await page.getByRole('button',{name:'저장한 장소',exact:false}).click();await page.getByRole('button',{name:'저장한 장소',exact:false}).click();
 expect((await state(page)).center).toEqual(before.center);expect((await state(page)).fits).toBe(before.fits);
 await expect(page.getByRole('img',{name:'내 현재 위치'})).toBeVisible();
});

test('지도 영역 검색은 이전 검색어·10km 제한을 해제하고 새 영역 후보를 조회하며 지도를 유지한다',async({page,context})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:36.48,longitude:127.26});await page.goto('/');await page.getByRole('button',{name:'내 위치 확인'}).click();await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('세종 테스트 건물');
 await page.getByLabel('지역·시설명').fill('강서구청');await expect.poll(async()=> (await state(page)).fits).toBe(1);
 await page.evaluate(()=>{(window as any).__bounds={south:37.4,north:37.6,west:127,east:127.2};(window as any).__view.setCenter(new (window as any).kakao.maps.LatLng(37.5,127.1));});
 const before=await state(page);await page.getByRole('button',{name:'이 지도 영역에서 찾기'}).click();await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('지도 영역 테스트 후보');
 const after=await state(page);expect(after.requests.at(-1).options.rect).toBe('127,37.4,127.2,37.6');expect(after.requests.at(-1).query).toBe('수유실');expect(after.center).toEqual(before.center);expect(after.fits).toBe(before.fits);await expect(page.getByLabel('지역·시설명')).toHaveValue('');
});

test('추가 정보·주소 복사·검색 오류 재시도와 늦은 검색 응답을 확인한다',async({page,context})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');await context.grantPermissions(['clipboard-read','clipboard-write']);await page.goto('/');await expect(page.getByText(/지도 표시 시설/)).toBeVisible();
 await page.evaluate(()=>{(window as any).__map.fail=true;});await page.getByLabel('지역·시설명').fill('세종');await expect(page.getByRole('button',{name:'장소검색 다시 시도'})).toBeVisible();
 await page.evaluate(()=>{(window as any).__map.fail=false;});await page.getByRole('button',{name:'장소검색 다시 시도'}).click();await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('세종 테스트 건물');
 await page.locator('.card').filter({hasText:'수유실 검색 후보'}).first().click();const detail=page.getByRole('region',{name:'시설 상세'});
 await expect(detail.getByText('공공기관 > 보건소',{exact:true})).toBeVisible();await expect(detail.getByRole('link',{name:'044-123-4567'})).toHaveAttribute('href','tel:044-123-4567');await expect(detail.getByText('세종특별자치시 테스트동 1',{exact:true})).toBeVisible();await expect(detail.getByRole('link',{name:'카카오맵 장소 정보'})).toHaveAttribute('href','https://place.map.kakao.com/12345');
 await detail.getByRole('button',{name:'주소 복사'}).click();await expect(detail.getByRole('status')).toContainText('주소를 복사');expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('세종특별자치시 테스트로 1');
 await page.getByRole('button',{name:'상세 닫기'}).click();await page.getByLabel('지역·시설명').fill('느린');await expect.poll(async()=> (await state(page)).requests.at(-1).query).toBe('느린 수유실');
 await page.getByLabel('지역·시설명').fill('세종');await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('세종 테스트 건물');await expect.poll(async()=> (await state(page)).requests.at(-1).query).toBe('세종 수유실');
 await expect.poll(async()=> (await state(page)).responses.includes('느린 수유실')).toBe(true);await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('세종 테스트 건물');
});


test('늦게 도착한 위치 응답이 사용자가 새로 검색한 지역을 덮어쓰지 않는다',async({page})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');
 await page.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(success:any)=>{(window as any).__finishLocation=()=>success({coords:{latitude:36.48,longitude:127.26}});}}});});
 await page.goto('/');await page.getByRole('button',{name:'내 위치 확인'}).click();await page.getByLabel('지역·시설명').fill('강서구청');await expect.poll(async()=> (await state(page)).fits).toBe(1);
 const before=await state(page);await page.evaluate(()=>(window as any).__finishLocation());await expect(page.getByLabel('지역·시설명')).toHaveValue('강서구청');expect((await state(page)).center).toEqual(before.center);
});

test('저장 목록은 이전 검색·편의시설 필터를 해제하고 좌표 없는 시설도 위치 확인 링크를 제공한다',async({page})=>{
 await page.goto('/');await page.getByLabel('지역·시설명').fill('강서구청');await page.getByRole('button',{name:'강서구청 저장',exact:true}).click();await page.getByLabel('기저귀 교환대 있음').check();
 await page.getByRole('button',{name:/저장한 장소/}).click();await expect(page.locator('.card')).toHaveCount(1);await expect(page.getByLabel('기저귀 교환대 있음')).not.toBeChecked();await expect(page.getByLabel('지역·시설명')).toHaveValue('');
 await page.getByRole('button',{name:/저장한 장소/}).click();await page.getByLabel('지역·시설명').fill('성남수정구보건소');await page.locator('.card').filter({has:page.getByRole('heading',{name:'성남수정구보건소',exact:true})}).click();
 const detail=page.getByRole('region',{name:'시설 상세'});await expect(detail.getByText('2층 모자보건실 내',{exact:true})).toBeVisible();await expect(detail.getByRole('link',{name:'031-729-2498'})).toHaveAttribute('href','tel:031-729-2498');await expect(detail.getByRole('link',{name:'카카오맵에서 위치 확인'})).toHaveAttribute('href',/^https:\/\/map.kakao.com\/link\/search\//);
});
