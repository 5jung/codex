import { test, expect } from '@playwright/test';
// Delegate external requests to Playwright's Node transport, which trusts the
// environment-provided CA. TLS verification remains enabled.
test.beforeEach(async({page})=>{
 await page.route('https://**/*',async route=>{
  try{await route.fulfill({response:await route.fetch({timeout:20000})});}
  catch{await route.abort('failed');}
 });
});
test('지역 검색·필터·상세',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'이용 안내',exact:true}).click();
 await page.getByRole('button',{name:'예시 데이터 체험'}).click();
 await expect(page.getByRole('heading',{name:'어디에서 찾으세요?'})).toBeVisible();
 await page.getByLabel('지역·시설명').fill('서울');
 await expect(page.getByRole('button',{name:/예시 시설/})).toHaveCount(2);
 await page.getByLabel('기저귀 교환대 있음').check();
 await expect(page.getByRole('button',{name:/예시 시설/})).toHaveCount(1);
 await page.locator('.card').filter({has:page.getByRole('heading',{name:'예시 A 수유실',exact:true})}).click();
 await expect(page.getByRole('region',{name:'시설 상세'}).getByRole('heading',{name:'예시 A 수유실'})).toBeVisible();
 await expect(page.getByRole('link',{name:'카카오맵 길찾기'})).toHaveCount(0);
});
test('카카오 SDK 실패 시 목록 유지와 재시도',async({page})=>{
 await page.route('https://dapi.kakao.com/**',route=>route.abort());
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'이용 안내',exact:true}).click();
 await page.getByRole('button',{name:'예시 데이터 체험'}).click();
 await expect(page.getByRole('button',{name:'지도 다시 시도'})).toBeVisible();
 await expect(page.getByRole('button',{name:/예시 시설/})).toHaveCount(3);
});
test('등록된 키로 실제 카카오 지도 초기화',async({page})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.getByText(/지도 표시 시설/)).toBeVisible({timeout:25000});
 await expect(page.locator('.map-canvas > div').first()).toBeVisible();
});
test('부산 공식 좌표 시설 선택과 길찾기',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.getByLabel('지역·시설명').fill('강서구청');
 const card=page.locator('.card').filter({has:page.getByRole('heading',{name:'강서구청',exact:true})});await expect(card).toHaveCount(1);await card.click();
 const detail=page.getByRole('region',{name:'시설 상세'});
 await expect(detail.getByRole('link',{name:'카카오맵 길찾기'})).toHaveAttribute('href',/^https:\/\/map\.kakao\.com\/link\/to\/.+,35\.2122246,128\.9805942$/);
 await detail.getByText('데이터 출처·이용 안내',{exact:true}).click();
 await expect(detail.getByRole('link',{name:'부산광역시_수유실 보유시설 현황(SHP)'})).toHaveAttribute('href','https://www.data.go.kr/data/15084232/fileData.do');
 await page.getByRole('tab',{name:'후기·제보'}).click();await expect(detail.getByRole('heading',{name:'방문 후기'})).toBeVisible();
});
test('API가 잘못된 형식을 반환해도 공개 원본 목록 유지',async({page})=>{
 await page.route('**/api/facilities',route=>route.fulfill({status:200,contentType:'text/html',body:'<html>fallback</html>'}));
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.getByText('서버에 연결하지 못해 공개 원본을 표시합니다. 승인된 수정 정보는 불러오지 못했습니다.')).toBeVisible();
 await page.getByLabel('지역·시설명').fill('강서구청');await expect(page.locator('.card')).toHaveCount(2);
});
test('위치 권한 거부 시 검색 유지',async({page,context})=>{
 await context.clearPermissions();await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'내 위치 확인'}).click();
 await expect(page.getByText('위치를 사용할 수 없어요. 지역명으로 찾아보세요.')).toBeVisible({timeout:15000});
 await page.getByLabel('지역·시설명').fill('강서구청');await expect(page.locator('.card')).toHaveCount(2);
});
test('회원가입·후기·제보·로그아웃·복구·탈퇴',async({page})=>{
 process.loadEnvFile('/workspace/.nursing-runtime/server.env');
 const {pool}=await import('../server/db');
 const handle='test_ui_'+Date.now().toString(36);const password=crypto.randomUUID();let id:string|undefined;
 try{
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'내 계정 열기'}).click();await page.getByText('후기·제보를 위한 로그인',{exact:true}).click();
 await page.getByLabel('아이디 (영문·숫자·밑줄·하이픈 3~40자)').fill(handle);await page.getByLabel('비밀번호 (12자 이상)').fill(password);
 await page.getByRole('button',{name:'가입하고 로그인'}).click();await expect(page.getByText(handle+'님 · 계정',{exact:true})).toBeVisible();
 id=(await pool.query('SELECT id FROM users WHERE handle=?',[handle]))[0].id;
 const recoveryCode=(await page.locator('.recovery-code').textContent())!;
 await page.getByRole('button',{name:'계정 패널 닫기'}).click();
 await page.getByLabel('지역·시설명').fill('강서구청');await page.locator('.card').filter({has:page.getByRole('heading',{name:'강서구청',exact:true})}).click();
 await page.getByRole('tab',{name:'후기·제보'}).click();
 await page.getByLabel('방문 후기 작성').fill('브라우저 테스트로 작성한 시설 후기입니다.');await page.getByRole('button',{name:'후기 제출',exact:true}).click();
 await expect(page.getByText('후기를 접수했습니다. 검토 후 공개됩니다.',{exact:true})).toBeVisible();
 await expect(page.getByText('검토 중',{exact:true})).toBeVisible();
 await page.getByLabel('수정할 정보').fill('09:00~18:00');await page.getByLabel('확인 근거').fill('브라우저 테스트로 등록한 제보입니다.');await page.getByRole('button',{name:'수정 제보 제출'}).click();
 await expect(page.getByText('수정 제보를 접수했습니다.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'내 후기 삭제'}).click();await expect(page.getByText('후기를 삭제했습니다.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'내 계정 열기'}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByText('후기·제보를 위한 로그인',{exact:true})).toBeVisible();
 await page.getByText('복구 코드로 비밀번호 재설정',{exact:true}).click();
 const newPassword=crypto.randomUUID();await page.getByLabel('복구할 아이디').fill(handle);await page.getByLabel('저장한 복구 코드').fill(recoveryCode);await page.getByLabel('재설정할 비밀번호').fill(newPassword);await page.getByRole('button',{name:'복구 코드로 재설정',exact:true}).click();
 await expect(page.getByText('비밀번호를 재설정했습니다. 새 복구 코드를 보관하고 다시 로그인해주세요.',{exact:true})).toBeVisible();
 await page.getByLabel('아이디 (영문·숫자·밑줄·하이픈 3~40자)').fill(handle);await page.getByLabel('비밀번호 (12자 이상)',{exact:true}).fill(newPassword);await page.getByRole('button',{name:'로그인',exact:true}).click();await expect(page.getByText(handle+'님 · 계정',{exact:true})).toBeVisible();
 await page.getByText('회원 탈퇴',{exact:true}).click();await page.getByLabel('탈퇴 확인 비밀번호').fill(newPassword);await page.getByLabel('삭제 내용을 확인했습니다.').check();await page.getByRole('button',{name:'계정과 작성 데이터 삭제'}).click();await expect(page.getByText('회원 탈퇴와 작성 데이터 삭제를 완료했습니다.',{exact:true})).toBeVisible();

 }finally{
 if(!id)id=(await pool.query('SELECT id FROM users WHERE handle=?',[handle]))[0]?.id;
 if(id){await pool.query('DELETE FROM reports WHERE author_id=?',[id]);await pool.query('DELETE FROM corrections WHERE author_id=?',[id]);await pool.query('DELETE FROM reviews WHERE author_id=?',[id]);await pool.query('DELETE FROM users WHERE id=?',[id]);}await pool.end();
 }
});
test('모바일 지도 타일·마커 선택과 상세 접근',async({page})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');
 await page.setViewportSize({width:390,height:844});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByLabel('지역·시설명').fill('강서구청');
 await expect(page.getByText(/지도 표시 시설/)).toBeVisible({timeout:25000});
 const tiles=page.locator('.map-canvas img[src*="mts.kakaocdn.net"]');
 await expect.poll(()=>tiles.evaluateAll(images=>images.filter(i=>(i as HTMLImageElement).complete&&(i as HTMLImageElement).naturalWidth>0).length),{timeout:20000}).toBeGreaterThan(0);
 const imageMap=page.locator('.map-canvas map').filter({has:page.locator('area[title="강서구청"]')});
 const name=await imageMap.getAttribute('name');
 const marker=page.locator(`.map-canvas img[usemap="#${name}"]`);await expect(marker).toBeVisible();await marker.click({position:{x:14,y:14}});
 const heading=page.getByRole('region',{name:'시설 상세'}).getByRole('heading',{name:'강서구청',exact:true});await expect(heading).toBeInViewport();
 await page.screenshot({path:'/workspace/artifacts/nursing-mobile.png',fullPage:true});
});

test('저장한 장소는 새로고침 후 유지되고 저장 취소 가능',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByLabel('지역·시설명').fill('강서구청');await page.getByRole('button',{name:'강서구청 저장',exact:true}).click();
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/저장한 장소/}).click();await expect(page.locator('.card')).toHaveCount(1);await expect(page.locator('.card').getByRole('heading',{name:'강서구청',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'강서구청 저장 취소',exact:true}).click();await expect(page.getByRole('heading',{name:'아직 저장한 장소가 없어요'})).toBeVisible();
});
test('모바일 탐색·상세·닫기·안내 접근성',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByLabel('지역·시설명').fill('강서구청');await page.locator('.card').filter({has:page.getByRole('heading',{name:'강서구청',exact:true})}).click();
 await expect(page.getByRole('region',{name:'시설 상세'})).toBeVisible();await page.getByRole('button',{name:'상세 닫기'}).click();await expect(page.getByRole('region',{name:'시설 상세'})).toHaveCount(0);
 await page.getByRole('button',{name:'이용 안내',exact:true}).click();await expect(page.getByRole('dialog',{name:'서비스 이용 안내'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'서비스 이용 안내'})).not.toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
});
test('넓은 지도는 마커를 묶고 시설 선택 시 상세 제공',async({page})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByText(/지도 표시 시설/).waitFor({timeout:25000});
 await expect.poll(()=>page.locator('.map-canvas').evaluate(el=>[...el.querySelectorAll('div')].filter(d=>d.style.backgroundColor==='rgb(32, 107, 83)'&&/^\d+$/.test(d.textContent??'')).length),{timeout:15000}).toBeGreaterThan(0);
 await page.getByLabel('지역·시설명').fill('강서구청');await page.locator('.card').filter({has:page.getByRole('heading',{name:'강서구청',exact:true})}).click();await expect(page.getByRole('region',{name:'시설 상세'}).getByRole('heading',{name:'강서구청',exact:true})).toBeVisible();
});
test('세종은 카카오 장소검색 후보를 지도와 목록에 표시',async({page})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'세종',exact:true}).click();
 await expect(page.locator('.card').first()).toBeVisible({timeout:30000});await expect(page.locator('.card').first()).toContainText('수유실 검색 후보');await expect(page.locator('.card').first()).toContainText('세종');
 await expect(page.getByText(/지도 표시 장소/)).toBeVisible();await page.locator('.card').first().click();const detail=page.getByRole('region',{name:'시설 상세'});await expect(detail.locator('.detail-category')).toContainText('카카오 장소검색');await expect(detail.getByText(/수유실이 확인된 시설로 보장하지/)).toBeVisible();await expect(detail.getByRole('link',{name:'카카오맵 길찾기'})).toBeVisible();
 await page.getByRole('tab',{name:'후기·제보'}).click();await expect(detail.getByText('검색 후보의 후기·제보는 아직 지원하지 않습니다.',{exact:false})).toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/workspace/artifacts/nursing-sejong-search.png'});
});

test('세종 현재 위치에서도 주변 검색 후보를 제공',async({page,context})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:36.48,longitude:127.26});await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'내 위치 확인'}).click();
 await expect(page.locator('.card').first()).toContainText('수유실 검색 후보',{timeout:30000});await expect(page.locator('.card').first()).toContainText('세종');await expect(page.locator('.card').first()).toContainText('km');await expect(page.getByText(/내 주변 10km의 자료/)).toBeVisible();
});
