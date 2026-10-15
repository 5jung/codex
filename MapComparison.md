# 지도 제공사 비교

확인일: 2026-10-15 (한국 시간). 공식 문서 HTTP 200 확인. 계정 생성·키 발급·실제 SDK 지도 렌더링은 미검증이다.

## 결론
첫 연동은 카카오맵을 제안한다. 수유실 위치는 별도 공식 데이터로 확보하고, 자체 검색·필터 후 지도 마커로 표시한다. 경로를 직접 계산하지 않고 공식 길찾기 URL로 연결하는 작은 초기 범위에 잘 맞는다. 네이버도 필요한 지도 기능을 제공하므로 기술적으로 배제할 이유는 없다. 이 추천은 비용 우위나 검색 품질 우위를 입증한 결론이 아니다.

| 항목 | 카카오 | 네이버 |
|---|---|---|
| 웹 지도 | JavaScript SDK, 도메인 등록·JavaScript 키 | Web Dynamic Map, 신규 SDK 예시는 ncpKeyId |
| 시설 마커·이벤트 | 지원 | 지원 |
| 주소 좌표 변환 | 별도 API·쿼터 | 별도 Geocoding API·과금 조건 |
| 길찾기 연결 | 공식 가이드의 HTTPS 목적지 링크 제공 | 공식 가이드에서 지도 앱 URL Scheme 제공 확인; 설치 안 된 환경의 대체 동작 검증 필요 |
| 무료 조건 | 개발자 계정에서 첫 활성화 앱에 제공 | Maps 대표 계정에 제공, 구 AI NAVER API 지도와 구분 |
| 확인한 지도 한도 | Web SDK 일 300,000건, 공통 월간 쿼터 등 함께 확인 필요 | Maps 상품 페이지 월 6,000,000건 안내. 해당 상품·대표 계정 적용 여부 확인 필요 |
| 유료 조건 | Web SDK 추가 사용량 0.1원/건 안내 | 초과 단가가 페이지 정적 응답에 비어 있어 확정하지 못함 |

카카오는 2026-07-21 사용 방식과 무료 쿼터 정책 변경을 명시한다. 두 번째 이후 활성화 앱이나 무료량 초과 사용 시 비즈월렛과 유료 API 설정이 필요하다. 계정의 무료 적용 여부를 확인하기 전 무료라고 약속하지 않는다. 월간 전체 API 한도와 API별 일간 한도를 단순 합산하거나 월 환산해 비교하지 않는다.

네이버는 2025년 신규 Maps 출시와 구 AI NAVER API 지도 무료량 종료를 공지한다. 신규 Maps 상품과 구상품의 요금을 섞어 비교하면 안 된다. SDK 문서는 ncpClientId에서 ncpKeyId로 변경된 예시를 제공한다. 요금표와 실제 신청 콘솔의 대표 계정·상품·단가를 확인해야 최종 비용을 산정할 수 있다.

## 출처
- https://apis.map.kakao.com/web/guide/ (키·도메인·길찾기 URL)
- https://developers.kakao.com/docs/latest/ko/getting-started/quota (쿼터·추가 요금)
- https://developers.kakao.com/docs/latest/ko/kakaomap/common (무료 적용 앱·정책 변경)
- https://www.ncloud.com/product/applicationService/maps (Maps 요금·무료량)
- https://www.ncloud.com/support/notice/all/1965?page=2 (2025년 상품 변경)
- https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html (신규 SDK 키 파라미터)
- https://guide.ncloud-docs.com/docs/application-maps-overview (기능·대표 계정·앱 연동 안내)

## 다음 확인
사용자 선택 후 키 발급과 등록 도메인을 준비한다. 비밀 값은 채팅이나 저장소에 입력하지 않는다. 실제 시설 출처·라이선스·좌표 품질은 별도로 검증한다. 지도 제공사 변경을 쉽게 하기 위해 자체 데이터 모델과 검색을 지도 SDK에서 분리한다.
