"""Refresh approved public CSV sources, preserving provenance and unknown values."""
import csv,io,json,hashlib,urllib.request
from pathlib import Path
from datetime import datetime,timezone
from importlib.util import spec_from_file_location,module_from_spec
ROOT=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('daegu',ROOT/'scripts/import-daegu.py');module=module_from_spec(spec);spec.loader.exec_module(module)
sources=[
 ('daegu',module.SOURCE,module.URL,'국가철도공단_대구1호선_수유실'),
 ('seongnam','https://www.data.go.kr/data/15084089/fileData.do','https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003648157&fileDetailSn=1&insertDataPrcus=N','경기도 성남시_수유시설_현황'),
 ('jeju','https://www.data.go.kr/data/15045348/fileData.do','https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000007679526&fileDetailSn=1&insertDataPrcus=N','제주특별자치도_모유수유시설설치현황'),
 ('bupyeong','https://www.data.go.kr/data/15102567/fileData.do','https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000002939749&fileDetailSn=1&insertDataPrcus=N','인천광역시 부평구_수유실 현황')]
def normalize(kind,raw,url,title):
 if kind=='daegu':return module.normalize(raw)
 for enc in ['utf-8-sig','cp949']:
  try:text=raw.decode(enc);break
  except UnicodeDecodeError:continue
 else:raise ValueError('Unsupported encoding')
 rows=list(csv.DictReader(io.StringIO(text)));out=[];seen=set()
 for row in rows:
  if kind=='seongnam':
   name=row['시설명'].strip();address=(row['소재지도로명주소'] or row['소재지지번주소']).strip();location=row['상세위치'].strip();phone=row['관리부서 전화번호'].strip() or None;date=row['데이터기준일자'].strip() or None
   # A list that omits a changing table does not prove its absence.
   changing=True if '기저귀교환대' in row['비치 물품'] else None;access=row['이용대상'].strip();notes=row['비고'].strip()
  elif kind=='jeju':
   name=row['설치장소(기관)'].strip();address=row['주소'].strip();location=row['용도'].strip();phone=None;date=row['데이터기준일자'].strip() or None;changing=None;access='이용 대상 확인 필요';notes=''
  else:
   if row['종별'].strip()!='수유실':continue
   name=row['장소명'].strip();address=row['소재지'].strip();location='';phone=row['연락처'].strip() or None;date=None;changing=None;access='이용 대상 확인 필요';notes=''
  if not name or not address:raise ValueError('Missing required source field')
  identity=name+'|'+address+'|'+location
  id='kr-'+kind+'-'+hashlib.sha256(identity.encode()).hexdigest()[:16]
  if id in seen:raise ValueError('Duplicate source identity')
  seen.add(id)
  out.append(dict(id=id,name=name,address=address,location=location,phone=phone,hours=None,changingTable=changing,isExample=False,sourceName=title,sourceUrl=url,sourceUpdatedAt=date,access=access,notes=notes))
 return out
if __name__=='__main__':
 all_facilities=[];records=[]
 for kind,url,download,title in sources:
  with urllib.request.urlopen(url,timeout=30) as res:page=res.read().decode()
  if '이용허락범위 제한 없음' not in page:raise ValueError('License needs review for '+kind)
  with urllib.request.urlopen(download,timeout=30) as res:raw=res.read()
  facilities=normalize(kind,raw,url,title)
  (ROOT/'data'/f'{kind}-source.csv').write_bytes(raw)
  records.append(dict(name=title,sourceUrl=url,downloadUrl=download,license='이용허락범위 제한 없음',licenseCheckedAt='2026-10-15',sha256=hashlib.sha256(raw).hexdigest(),count=len(facilities)))
  all_facilities.extend(facilities)
  print(kind,len(facilities))
 meta=dict(collectedAt=datetime.now(timezone.utc).isoformat(),count=len(all_facilities),coverage='대구도시철도 1호선·성남·제주·인천 부평의 공개 원본 수록 시설',sources=records,limitations=['전국 전체를 포함하지 않음','원본 좌표 미제공: 주소 변환 시 건물 기준 위치로 안내','기준일 이후 운영 변동과 휴일 정보 미확인','서로 다른 출처 간 동일 시설 여부는 별도 검토 필요'])
 (ROOT/'src/data/official.json').write_text(json.dumps(dict(metadata=meta,facilities=all_facilities),ensure_ascii=False,indent=2)+'\n')
 print('Total',len(all_facilities))
