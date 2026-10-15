import { test, expect, type Page } from '@playwright/test';
async function dragList(page:Page,open:boolean){
 const handle=page.getByRole('slider',{name:'시설 목록 높이'}),box=(await handle.boundingBox())!;
 const x=box.x+box.width/2,y=box.y+35;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+(open?-280:280),{steps:14});await page.mouse.up();
 await expect(handle).toHaveAttribute('aria-valuenow',open?'100':'0');
 const viewport=page.viewportSize()!;const target=open?viewport.height*(viewport.height<=540?.6:.52):70;
 await expect.poll(async()=>Math.abs((await page.locator('.results-panel').boundingBox())!.height-target)).toBeLessThan(1);
}
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
 await page.setViewportSize({width:360,height:800});await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByLabel('지역·시설명').fill('강서구청');await dragList(page,true);await page.locator('.card').filter({has:page.getByRole('heading',{name:'강서구청',exact:true})}).click();
 await expect(page.getByRole('region',{name:'시설 상세'})).toBeVisible();await page.getByRole('button',{name:'상세 닫기'}).click();await expect(page.getByRole('region',{name:'시설 상세'})).toHaveCount(0);
 await page.getByRole('button',{name:'이용 안내',exact:true}).click();await expect(page.getByRole('dialog',{name:'서비스 이용 안내'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'서비스 이용 안내'})).not.toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
});
test('넓은 지도는 마커를 묶고 시설 선택 시 상세 제공',async({page})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByText(/지도 표시 시설/).waitFor({timeout:25000});
 await expect.poll(()=>page.locator('.map-canvas').evaluate(el=>[...el.querySelectorAll('div')].filter(d=>d.style.backgroundColor==='rgb(166, 83, 72)'&&/^\d+$/.test(d.textContent??'')).length),{timeout:15000}).toBeGreaterThan(0);
 await page.getByLabel('지역·시설명').fill('강서구청');await page.locator('.card').filter({has:page.getByRole('heading',{name:'강서구청',exact:true})}).click();await expect(page.getByRole('region',{name:'시설 상세'}).getByRole('heading',{name:'강서구청',exact:true})).toBeVisible();
});
test('세종은 카카오 장소검색 후보를 지도와 목록에 표시',async({page})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'세종',exact:true}).click();
 await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toBeVisible({timeout:30000});await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('수유실 검색 후보');await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('세종');
 await expect(page.getByText(/지도 표시 장소/)).toBeVisible();await page.locator('.card').filter({hasText:'수유실 검색 후보'}).first().click();const detail=page.getByRole('region',{name:'시설 상세'});await expect(detail.locator('.detail-category')).toContainText('카카오 장소검색');await expect(detail.getByText(/수유실이 확인된 시설로 보장하지/)).toBeVisible();await expect(detail.getByRole('link',{name:'카카오맵 길찾기'})).toBeVisible();
 await page.getByRole('tab',{name:'후기·제보'}).click();await expect(detail.getByText('검색 후보의 후기·제보는 아직 지원하지 않습니다.',{exact:false})).toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/workspace/artifacts/nursing-sejong-search.png'});
});

test('세종 현재 위치에서도 주변 검색 후보를 제공',async({page,context})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:36.48,longitude:127.26});await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'내 위치 확인'}).click();
 await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('수유실 검색 후보',{timeout:30000});await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('세종');await expect(page.locator('.card').filter({hasText:'수유실 검색 후보'}).first()).toContainText('km');await expect(page.getByText(/내 주변 10km의 자료/)).toBeVisible();
});


test('모바일에서 넓은 지도·필터·목록·상세 펼치기 전환',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('slider',{name:'시설 목록 높이'})).toHaveAttribute('aria-valuenow','0');
 const search=await page.locator('.search-zone').boundingBox(),sheet=await page.locator('.results-panel').boundingBox();
 expect(search).not.toBeNull();expect(sheet).not.toBeNull();expect(sheet!.y-(search!.y+search!.height)).toBeGreaterThan(844*.65);
 await expect(page.getByLabel('기저귀 교환대 있음')).not.toBeVisible();await page.getByRole('button',{name:'지역·필터 설정'}).click();await expect(page.getByLabel('기저귀 교환대 있음')).toBeVisible();
 await page.getByLabel('기저귀 교환대 있음').check();await page.getByRole('button',{name:'지역·필터 설정'}).click();await expect(page.getByRole('button',{name:'지역·필터 설정'})).toContainText('1');
 await page.getByRole('button',{name:'지도 크게 보기'}).click();await expect(page.getByRole('textbox',{name:'지역·시설명'})).not.toBeVisible();await expect(page.locator('.results-panel')).not.toBeVisible();
 await page.screenshot({path:'/workspace/artifacts/nursing-map-focus.png'});
 await page.getByRole('button',{name:'검색·목록 보기'}).click();await expect(page.getByRole('textbox',{name:'지역·시설명'})).toBeVisible();
 await page.getByRole('button',{name:'지역·필터 설정'}).click();await page.getByLabel('기저귀 교환대 있음').uncheck();await page.getByRole('button',{name:'지역·필터 설정'}).click();
 await page.getByLabel('지역·시설명').fill('강서구청');await page.screenshot({path:'/workspace/artifacts/nursing-map-first.png'});
 await dragList(page,true);await expect(page.locator('.card').first()).toBeVisible();await page.locator('.card').filter({has:page.getByRole('heading',{name:'강서구청',exact:true})}).click();
 const detail=page.getByRole('region',{name:'시설 상세'});expect((await detail.boundingBox())!.height).toBeLessThanOrEqual(844*.34+1);
 await page.getByRole('button',{name:'상세 펼치기'}).click();await expect(page.getByRole('button',{name:'상세 접기'})).toHaveAttribute('aria-expanded','true');await detail.getByRole('link',{name:'카카오맵 길찾기'}).scrollIntoViewIfNeeded();await expect(detail.getByRole('link',{name:'카카오맵 길찾기'})).toBeInViewport();
 await page.getByRole('button',{name:'상세 접기'}).click();await page.getByRole('button',{name:'상세 닫기'}).click();await dragList(page,false);
 for(const viewport of [{width:360,height:640},{width:844,height:390}]){await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await expect(page.getByRole('button',{name:'내 위치 확인'})).toBeInViewport();}
});


test('목록은 터치 드래그에 따라 움직이고 취소·키보드 조작도 지원',async({page,context})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/',{waitUntil:'domcontentloaded'});
 const handle=page.getByRole('slider',{name:'시설 목록 높이'}),panel=page.getByRole('region',{name:'시설 목록'});
 const box=(await handle.boundingBox())!,x=200,y=box.y+35;
 const session=await context.newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-130}]});
 await expect.poll(async()=> (await panel.boundingBox())!.height).toBeGreaterThan(150);
 await expect(handle).toHaveAttribute('aria-valuenow','0');
 await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 await expect.poll(async()=>Math.round((await panel.boundingBox())!.height)).toBe(70);
 await dragList(page,true);
 const scroll=page.locator('.results-scroll');await scroll.evaluate(el=>el.scrollTop=180);expect(await scroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await dragList(page,false);await handle.focus();await page.keyboard.press('ArrowUp');await expect(handle).toHaveAttribute('aria-valuenow','100');
 await page.keyboard.press('Home');await expect(handle).toHaveAttribute('aria-valuenow','0');
 await expect(page.getByRole('button',{name:'목록 보기',exact:true})).toHaveCount(0);
 await page.screenshot({path:'/workspace/artifacts/nursing-cute-mobile.png'});
});

test('홈 화면 아이콘 설정과 기기별 설치 안내·설치 요청',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const manifestResponse=await page.request.get('/manifest.webmanifest');expect(manifestResponse.ok()).toBe(true);expect((await manifestResponse.json()).display).toBe('standalone');
 await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href','/icons/app-180.png');
 await page.getByRole('button',{name:'이용 안내',exact:true}).click();const guide=page.getByRole('region',{name:'홈 화면에 추가 안내'});await expect(guide).toContainText('Safari의 공유 메뉴');await expect(guide).toContainText('앱 설치');
 await page.evaluate(()=>{const event=new Event('beforeinstallprompt',{cancelable:true});Object.assign(event,{prompt:async()=>{},userChoice:Promise.resolve({outcome:'accepted'})});window.dispatchEvent(event);});
 await guide.getByRole('button',{name:'홈 화면에 설치'}).click();await expect(guide.getByRole('status')).toContainText('추가 요청을 보냈어요');
 await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));await expect(guide).toContainText('지금 앱 화면으로 이용하고 있어요.');await expect(guide.getByRole('button',{name:'홈 화면에 설치'})).toHaveCount(0);
});

test('모바일 위치 안내와 검색어·필터가 있어도 지도 영역 검색을 누를 수 있다',async({page,context})=>{
 test.skip(!process.env.VITE_KAKAO_MAP_KEY,'지도 키가 없는 환경');
 await page.setViewportSize({width:390,height:844});await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:36.48,longitude:127.26});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'내 위치 확인'}).click();await expect(page.getByText(/내 주변 10km의 자료/)).toBeVisible();
 await page.getByLabel('지역·시설명').fill('Ak');
 const button=page.getByRole('button',{name:'이 지도 영역에서 찾기'});await expect(button).toBeVisible({timeout:25000});
 async function unobstructed(){
  await expect.poll(async()=>{const search=(await page.locator('.search-zone').boundingBox())!,target=(await button.boundingBox())!;return target.y-(search.y+search.height);}).toBeGreaterThanOrEqual(8);
  expect(await button.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  await button.click({trial:true});
 }
 await unobstructed();await button.click();await dragList(page,true);await expect(page.getByText('현재 지도 영역에서 새로 검색한 후보와 좌표 확인 시설을 표시합니다.',{exact:false})).toBeVisible();await expect(page.getByLabel('지역·시설명')).toHaveValue('');
 await page.getByRole('button',{name:'지역·필터 설정'}).click();await expect(page.getByLabel('기저귀 교환대 있음')).toBeVisible();await unobstructed();
 await page.setViewportSize({width:360,height:640});await unobstructed();
 await page.getByRole('button',{name:'지역·필터 설정'}).click();await unobstructed();
 await page.screenshot({path:'/workspace/artifacts/nursing-map-search-visible.png'});
});


test('AK 세종 누락 시설은 방문 후기 근거와 층·현재 확인 필요 안내로 제공한다',async({page})=>{
 await page.goto('/');await page.getByLabel('지역·시설명').fill('AK 세종');
 const card=page.locator('.card').filter({has:page.getByRole('heading',{name:'AK& 세종 수유실',exact:true})});await expect(card).toBeVisible();await expect(card).toContainText('방문 후기');await card.click();
 const detail=page.getByRole('region',{name:'시설 상세'});await expect(detail.getByText('2층 H&M 인근 화장실 옆 (방문 후기 기준)',{exact:true})).toBeVisible();
 const evidence=detail.getByRole('region',{name:'방문 후기 근거'});await expect(evidence).toContainText('시설의 공식 확인은 아니며');await expect(evidence).toContainText('2025-05-10');await expect(evidence.getByRole('link').first()).toHaveAttribute('href','https://blog.naver.com/honest_2sm/222967582820');await expect(detail.getByRole('link',{name:'방문 후기 찾기'})).toHaveAttribute('href',/^https:\/\/search.naver.com\//);
 await expect(detail.getByText('현재 동반 보호자 출입 조건과 유모차 이동 동선은 시설에 확인해주세요.',{exact:true})).toBeVisible();await expect(detail.getByRole('button',{name:'AK& 세종 수유실 저장',exact:true})).toBeEnabled();
});

test('세종 보완 시설은 검색·실내 위치·근거 수준을 구분해 제공한다',async({page})=>{
 await page.goto('/');
 for(const name of ['국립세종도서관 수유실','세종시립도서관 수유실','국립세종수목원 수유실','국립어린이박물관 수유실','이마트 세종점 수유실','홈플러스 세종점 수유실','코스트코 세종점 수유실','스타벅스 세종예술의전당점 수유실','대통령기록관 수유실']){
  await page.getByLabel('지역·시설명').fill(name);const card=page.locator('.card').filter({has:page.getByRole('heading',{name,exact:true})});await expect(card).toHaveCount(1);await expect(card).toBeEnabled();
 }
 await page.getByLabel('지역·시설명').fill('국립세종수목원 수유실');await page.locator('.card').filter({has:page.getByRole('heading',{name:'국립세종수목원 수유실',exact:true})}).click();
 const detail=page.getByRole('region',{name:'시설 상세'}),official=detail.getByRole('region',{name:'시설 안내 근거'});await expect(official).toContainText('시설 공식 안내');await expect(official).toContainText('안내 확인일 2026-10-15');await expect(detail.getByRole('link',{name:'044-251-0001'})).toHaveAttribute('href','tel:044-251-0001');await expect(detail.getByText(/방문자센터 1층·단풍정원/)).toBeVisible();
 await page.getByRole('button',{name:'상세 닫기'}).click();await page.getByLabel('지역·시설명').fill('홈플러스 세종점 수유실');await page.locator('.card').filter({has:page.getByRole('heading',{name:'홈플러스 세종점 수유실',exact:true})}).click();await expect(detail.getByText('문화센터 안 · 후기의 층 표기가 1층/B1층으로 서로 다름',{exact:true})).toBeVisible();await expect(detail.getByText('세종특별자치시 절재로 154',{exact:true})).toBeVisible();
});

test('대전·청주 보완 시설은 지역별로 검색되고 공식 위치·입장 제약을 제공한다',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'대전',exact:true}).click();
 for(const name of ['국립중앙과학관 수유실','한밭수목원 열대식물원 수유실','대전신세계 Art&Science 수유실','한밭도서관 수유실'])await expect(page.locator('.card').getByRole('heading',{name,exact:true})).toBeVisible();
 await page.locator('.card').filter({has:page.getByRole('heading',{name:'대전신세계 Art&Science 수유실',exact:true})}).click();const detail=page.getByRole('region',{name:'시설 상세'});await expect(detail.getByText(/방문 후기에는 신세계포인트 회원 확인/)).toBeVisible();await page.getByRole('button',{name:'상세 닫기'}).click();
 await page.getByRole('button',{name:'청주',exact:true}).click();
 for(const name of ['국립청주박물관 수유실','현대백화점 충청점 유아휴게실','동부창고 카페C 수유실'])await expect(page.locator('.card').getByRole('heading',{name,exact:true})).toBeVisible();
 await page.locator('.card').filter({has:page.getByRole('heading',{name:'현대백화점 충청점 유아휴게실',exact:true})}).click();await expect(detail.getByText('3층 유아휴게실 (시설 공식 안내)',{exact:true})).toBeVisible();await expect(detail.getByRole('link',{name:'043-909-2670'})).toHaveAttribute('href','tel:043-909-2670');await expect(detail.getByRole('region',{name:'시설 안내 근거'})).toBeVisible();
 await page.getByRole('button',{name:'상세 닫기'}).click();await page.getByRole('button',{name:'이용 안내',exact:true}).click();await expect(page.getByRole('dialog',{name:'서비스 이용 안내'})).toContainText('세종 10곳 · 대전 4곳 · 청주 3곳');
});
