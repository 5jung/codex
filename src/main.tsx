import {useState,useMemo,useEffect,useCallback,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {examples,searchFacilities,distanceKm,inBounds,type Facility,type Position,type Bounds} from './facilities';
import './style.css';
import official from './data/official.json';
import {KakaoMap} from './KakaoMap';
import {directionsUrl,hasCoordinates} from './map';
import {Account} from './Account';
import {Community} from './Community';
import {Admin} from './Admin';
import {api,type User} from './api';
import {Icon} from './Icon';
import {useBookmarks} from './useBookmarks';
function App(){
 const [demo,setDemo]=useState(false),[position,setPosition]=useState<Position|null>(null),[bounds,setBounds]=useState<Bounds|null>(null);
 const [user,setUser]=useState<User|null>(null),[facilities,setFacilities]=useState<Facility[]>(official.facilities),[dataNotice,setDataNotice]=useState('');
 const [query,setQuery]=useState(''),[changing,setChanging]=useState(false),[hours,setHours]=useState(false),[selected,setSelected]=useState<Facility|null>(null),[notice,setNotice]=useState('');
 const [visibleCount,setVisibleCount]=useState(30),[savedOnly,setSavedOnly]=useState(false),[listOpen,setListOpen]=useState(true),[detailTab,setDetailTab]=useState<'info'|'community'>('info');
 const detailRef=useRef<HTMLElement>(null),accountDialog=useRef<HTMLDialogElement>(null),infoDialog=useRef<HTMLDialogElement>(null);
 const bookmarks=useBookmarks();
 const refresh=useCallback(()=>{api<Facility[]>('/facilities').then(f=>{if(!Array.isArray(f)||f.some(x=>typeof x.id!=='string'||typeof x.name!=='string'))throw new Error('잘못된 시설 응답');setFacilities(f);setDataNotice('');setSelected(s=>s?f.find(x=>x.id===s.id)??null:null);}).catch(()=>setDataNotice('서버에 연결하지 못해 공개 원본을 표시합니다. 승인된 수정 정보는 불러오지 못했습니다.'));},[]);
 useEffect(()=>{refresh();},[refresh]);
 const results=useMemo(()=>{
  const found=searchFacilities(demo?examples:facilities,query,changing,hours).filter(f=>(!bounds||inBounds(f,bounds))&&(!savedOnly||bookmarks.ids.includes(f.id)));
  if(position)found.sort((a,b)=>(hasCoordinates(a)?distanceKm(position,a):Infinity)-(hasCoordinates(b)?distanceKm(position,b):Infinity));
  return found;
 },[demo,facilities,query,changing,hours,position,bounds,savedOnly,bookmarks.ids]);
 const directions=selected?directionsUrl(selected):null;
 useEffect(()=>setVisibleCount(30),[results]);
 useEffect(()=>{setDetailTab('info');if(detailRef.current)detailRef.current.scrollTop=0;},[selected?.id]);
 const choose=useCallback((f:Facility)=>setSelected(f),[]);
 function reset(){setQuery('');setChanging(false);setHours(false);setBounds(null);setPosition(null);setNotice('');setSelected(null);}
 function region(value:string){setQuery(value);setBounds(null);setSelected(null);setListOpen(true);}
 function locate(){
  if(!navigator.geolocation){setNotice('위치를 사용할 수 없어요. 지역명으로 찾아보세요.');return;}
  setNotice('위치를 확인하고 있어요.');
  navigator.geolocation.getCurrentPosition(p=>{setPosition({latitude:p.coords.latitude,longitude:p.coords.longitude});setBounds(null);setNotice('직선거리순으로 정렬했어요. 현재 제공 지역 밖에서는 가까운 시설이 없을 수 있습니다. 위치는 서버에 저장하지 않습니다.');},()=>setNotice('위치를 사용할 수 없어요. 지역명으로 찾아보세요.'),{timeout:10000,maximumAge:60000});
 }
 function switchData(example:boolean){setDemo(example);reset();setSavedOnly(false);infoDialog.current?.close();}
 return <div className="app-shell">
  <header className="app-header">
   <a className="brand" href="#" onClick={e=>{e.preventDefault();reset();setSavedOnly(false);}} aria-label="수유실 지도 처음으로"><span className="brand-mark"><Icon name="baby" size={26}/></span><span>수유실 지도<small>아이와 함께, 편안한 외출</small></span></a>
   <div className="header-caption"><span className="live-dot"/>우리 곁의 작은 쉼표</div>
   <nav className="header-actions" aria-label="서비스 메뉴"><button className={`nav-button ${savedOnly?'active':''}`} aria-pressed={savedOnly} onClick={()=>{setSavedOnly(s=>!s);setSelected(null);setListOpen(true);}}><Icon name="heart"/><span>저장한 장소</span><span className="count-badge">{bookmarks.ids.length}</span></button><button className="icon-button" aria-label="이용 안내" onClick={()=>infoDialog.current?.showModal()}><Icon name="info"/></button><button className="profile-button" aria-label="내 계정 열기" onClick={()=>accountDialog.current?.showModal()}><Icon name="user"/><span>{user?user.handle:'로그인'}</span></button></nav>
  </header>
  <main className={`workspace ${selected?'has-selection':''} ${listOpen?'list-open':'list-closed'}`}>
   <aside className="explorer" aria-label="수유실 탐색">
    <section className="search-zone" aria-label="수유실 검색">
     <div className="section-eyebrow">FIND YOUR LITTLE REST</div><h1>{savedOnly?'다시 찾고 싶은 곳':'어디에서 찾으세요?'}</h1><p className="search-description">{savedOnly?'이 기기에 저장한 수유실을 모았어요.':'가까운 수유실, 필요한 정보를 한눈에.'}</p>
     <div className="search-field"><Icon name="search"/><label className="sr-only" htmlFor="query">지역·시설명</label><input id="query" value={query} onChange={e=>region(e.target.value)} placeholder="지역이나 시설 이름으로 검색" autoComplete="off"/>{query&&<button className="icon-button" aria-label="검색어 지우기" onClick={()=>region('')}><Icon name="close" size={16}/></button>}</div>
     <div className="region-chips" aria-label="제공 지역">{['전체','부산','성남','제주','인천','대구'].map(r=><button key={r} className={!bounds&&query===(r==='전체'?'':r)?'region-chip active':'region-chip'} onClick={()=>region(r==='전체'?'':r)} aria-pressed={!bounds&&query===(r==='전체'?'':r)}>{r}</button>)}</div>
     <div className="filter-row"><label className={`filter-chip ${changing?'checked':''}`}><input type="checkbox" checked={changing} onChange={e=>{setChanging(e.target.checked);setSelected(null);}}/><Icon name="baby" size={16}/><span>기저귀 교환대 있음</span></label><label className={`filter-chip ${hours?'checked':''}`}><input type="checkbox" checked={hours} onChange={e=>{setHours(e.target.checked);setSelected(null);}}/><Icon name="clock" size={16}/><span>운영시간 정보 있음</span></label></div>
     {(query||changing||hours||bounds||position)&&<button className="reset-button" onClick={reset}>필터 초기화</button>}
     {(notice||dataNotice||bookmarks.error)&&<p className="inline-notice" role="status">{notice||dataNotice||bookmarks.error}</p>}
     {demo&&<p className="demo-notice">예시 데이터 체험 중 · 실제 방문 장소가 아닙니다.</p>}
    </section>
    <section className="results-panel" aria-label="시설 목록">
     <div className="results-heading"><div><span className="eyebrow">{savedOnly?'SAVED PLACES':'NURSING ROOMS'}</span><h2>{savedOnly?'저장한 수유실':'검색 결과'} <span>{results.length}</span></h2></div><span className="sort-label">{position?'직선거리순':'시설명·지역 검색'}</span><button className="mobile-list-toggle icon-button" aria-label={listOpen?'시설 목록 접기':'시설 목록 펼치기'} aria-expanded={listOpen} onClick={()=>setListOpen(v=>!v)}><Icon name="list"/></button></div>
     <div className="results-scroll">{bounds&&<p className="bounds-notice">현재 지도 영역의 좌표 확인 시설만 표시합니다. <button onClick={()=>setBounds(null)}>영역 제한 해제</button></p>}
      {results.length===0?<div className="empty-results"><span className="empty-symbol"><Icon name={savedOnly?'heart':'search'} size={32}/></span><h3>{savedOnly?'아직 저장한 장소가 없어요':'조건에 맞는 수유실이 없어요'}</h3><p>{savedOnly?'시설 카드의 하트를 눌러 나만의 목록을 만들어보세요.':'검색 지역을 넓히거나 필터를 바꿔보세요.'}</p>{!savedOnly&&<button className="secondary-button" onClick={reset}>전체 시설 보기</button>}</div>:results.slice(0,visibleCount).map(f=><article className={`facility-card ${selected?.id===f.id?'selected':''}`} key={f.id}>
       <button className="card" aria-pressed={selected?.id===f.id} onClick={()=>choose(f)}><span className="card-topline"><span className="facility-type">{f.isExample?'예시 시설':f.location?.includes('가족')?'가족 수유실':'수유시설'}</span>{position&&hasCoordinates(f)&&<span className="distance">{distanceKm(position,f).toFixed(1)} km</span>}</span><h3>{f.name}</h3><p className="card-address">{f.address}</p><span className="card-amenities">{f.sourceStatus==='일시 중단'?<span className="status-paused">원본: 일시 중단</span>:<span><Icon name="clock" size={14}/>{f.hours??'운영시간 미확인'}</span>}{f.changingTable===true&&<span className="amenity-known"><Icon name="check" size={14}/>기저귀 교환대</span>}</span><span className="card-bottom"><span className={hasCoordinates(f)?'coordinate-badge':'unconfirmed-badge'}><Icon name={hasCoordinates(f)?'pin':'info'} size={13}/>{f.isExample?'예시 데이터':hasCoordinates(f)?'지도 위치 제공':'목록 정보 제공'}</span><Icon name="arrow" size={16}/></span></button>
       <button className={`save-button ${bookmarks.ids.includes(f.id)?'is-saved':''}`} aria-label={`${f.name} ${bookmarks.ids.includes(f.id)?'저장 취소':'저장'}`} aria-pressed={bookmarks.ids.includes(f.id)} onClick={()=>bookmarks.toggle(f.id)}><Icon name="heart" size={19}/></button>
      </article>)}{results.length>visibleCount&&<button className="load-more" onClick={()=>setVisibleCount(c=>c+30)}>시설 더 보기 <span>{results.length-visibleCount}곳 남음</span></button>}
     </div><footer className="coverage-footer"><span className="live-dot"/>공개자료 {facilities.length}건 · 일부 지역 제공<button onClick={()=>infoDialog.current?.showModal()}>범위 안내 <Icon name="arrow" size={13}/></button></footer>
    </section>
   </aside>
   <div className="map-workspace"><KakaoMap facilities={results} selected={selected} onSelect={choose} position={position} onSearchBounds={b=>{setBounds(b);setSelected(null);setListOpen(true);}}/>
    <div className="map-context"><Icon name="pin" size={15}/><span>{demo?'예시 데이터':savedOnly?'저장한 장소':query||'수유실 둘러보기'}</span><span className="context-separator"/>부산 원본 좌표 제공</div>
    <button className="locate-button" onClick={locate} aria-label="내 위치 확인"><Icon name="locate"/><span>내 주변 찾기</span></button>
    {selected&&<section ref={detailRef} className="detail" aria-label="시설 상세"><div className="sheet-grip" aria-hidden="true"/><div className="detail-top"><span className="detail-illustration"><Icon name="baby" size={30}/></span><div className="detail-tools"><button className={`icon-button ${bookmarks.ids.includes(selected.id)?'is-saved':''}`} aria-label={`${selected.name} ${bookmarks.ids.includes(selected.id)?'저장 취소':'저장'}`} aria-pressed={bookmarks.ids.includes(selected.id)} onClick={()=>bookmarks.toggle(selected.id)}><Icon name="heart"/></button><button className="icon-button" aria-label="상세 닫기" onClick={()=>setSelected(null)}><Icon name="close"/></button></div></div>
     <div className="detail-content"><span className="detail-category">{selected.isExample?'예시 데이터':selected.location?.includes('가족')?'가족 수유실':'수유시설'}<span className="category-dot">·</span>{selected.isExample?'가상 시설':'공개자료'}</span><h2>{selected.name}</h2><p className="detail-address"><Icon name="pin" size={16}/>{selected.address}</p>
      <div className="detail-actions">{directions?<a className="primary-button" href={directions} target="_blank" rel="noopener noreferrer"><Icon name="arrow" size={18}/>카카오맵 길찾기</a>:<span className="directions-unavailable">좌표가 확인되면 길찾기를 제공해요</span>}{selected.phone&&<a className="call-button" href={`tel:${selected.phone}`} aria-label="시설에 전화"><Icon name="phone" size={18}/></a>}</div>
      <div className="detail-tabs" role="tablist" aria-label="시설 상세 내용" onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'info':e.key==='End'?'community':detailTab==='info'?'community':'info';setDetailTab(next);document.getElementById(next==='info'?'facility-info-tab':'facility-community-tab')?.focus();}}}><button role="tab" id="facility-info-tab" aria-controls="facility-info" tabIndex={detailTab==='info'?0:-1} aria-selected={detailTab==='info'} onClick={()=>setDetailTab('info')}>시설 정보</button><button role="tab" id="facility-community-tab" aria-controls="facility-community" tabIndex={detailTab==='community'?0:-1} aria-selected={detailTab==='community'} onClick={()=>setDetailTab('community')}>후기·제보</button></div>
      {detailTab==='info'?<div role="tabpanel" id="facility-info" aria-labelledby="facility-info-tab"><div className="info-row"><Icon name="clock"/><div><h3>운영시간</h3><p>{selected.hours??'등록된 운영시간이 없어요'}</p></div></div><div className="info-row"><Icon name="baby"/><div><h3>기저귀 교환대</h3><p>{selected.changingTable===null?'제공 여부를 확인하지 못했어요':selected.changingTable?'있음':'없음'}</p></div></div>{selected.location&&<div className="info-row"><Icon name="building"/><div><h3>시설 내 위치·유형</h3><p>{selected.location}</p></div></div>}{selected.access&&<div className="info-row"><Icon name="user"/><div><h3>이용 대상</h3><p>{selected.access}</p></div></div>}{selected.sourceStatus==='일시 중단'&&<p className="status-paused">원본 상태: 일시 중단 · 방문 전 확인해주세요.</p>}
       <p className="visit-note"><Icon name="info" size={16}/>운영시간과 현장 이용 가능 여부는 방문 전 시설에 확인해주세요.</p><details className="source-details"><summary>데이터 출처·이용 안내</summary><dl><dt>출처</dt><dd>{selected.sourceUrl?<a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">{selected.sourceName}</a>:'화면 검증용 가상 데이터'}</dd><dt>원본 갱신일</dt><dd>{selected.sourceUpdatedAt??'원본에서 제공하지 않음'}</dd>{selected.sourceStatus&&<><dt>운영 상태 (원본 기준)</dt><dd>{selected.sourceStatus} · 현재 상태 확인 필요</dd></>}</dl>{selected.notes&&<p>{selected.notes}</p>}</details></div>:<div role="tabpanel" id="facility-community" aria-labelledby="facility-community-tab">{selected.isExample?<p className="visit-note">예시 시설에는 후기를 남길 수 없어요.</p>:<Community key={selected.id} facilityId={selected.id} user={user}/>}</div>}
     </div>
    </section>}
   </div>
  </main>
  <dialog ref={accountDialog} className="service-dialog" aria-label="내 계정"><div className="dialog-header"><h2>내 계정</h2><button className="icon-button" aria-label="계정 패널 닫기" onClick={()=>accountDialog.current?.close()}><Icon name="close"/></button></div><Account user={user} onChange={setUser}/>{user?.role==='admin'&&<Admin onUpdated={refresh}/>}</dialog>
  <dialog ref={infoDialog} className="service-dialog" aria-label="서비스 이용 안내"><div className="dialog-header"><h2>작은 쉼표를 찾는 지도</h2><button className="icon-button" aria-label="안내 닫기" onClick={()=>infoDialog.current?.close()}><Icon name="close"/></button></div><span className="info-hero"><Icon name="baby" size={36}/></span><p>아이와 함께하는 외출이 조금 더 편안해지도록,<br/>공개된 수유실 정보를 한곳에 모았어요.</p><div className="coverage-stat"><strong>{facilities.length}<small>건의 공개자료</small></strong><strong>{facilities.filter(hasCoordinates).length}<small>건의 지도 위치</small></strong></div><h3>현재 제공하는 지역</h3><p>부산 · 대구도시철도 1호선 · 성남 · 제주 · 인천 부평. 전국 데이터는 준비 중입니다. 좌표 없는 시설은 목록에서만 제공해요.</p><h3>저장한 장소</h3><p>하트를 누르면 현재 브라우저에 저장됩니다. 기기 간 동기화는 지원하지 않으며, 브라우저 데이터를 지우면 삭제됩니다.</p><h3>현재 위치</h3><p>‘내 주변 찾기’를 누를 때만 조회합니다. 자체 서버에 위치를 저장하지 않으며, 지도 표시에 필요한 조회는 지도 제공사에 발생합니다.</p><p className="fine-print">원본 수집일: {official.metadata.collectedAt.slice(0,10)} · 원본 정보와 실제 현장 상태가 다를 수 있습니다.</p><div className="demo-switch"><h3>화면 체험</h3><button className="secondary-button" aria-pressed={!demo} onClick={()=>switchData(false)}>공식 자료</button><button className="text-button" aria-pressed={demo} onClick={()=>switchData(true)}>예시 데이터 체험</button></div></dialog>
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
