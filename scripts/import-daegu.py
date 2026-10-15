"""Import the openly licensed official CSV. Never invent missing coordinates."""
import csv, io, json, hashlib, urllib.request
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
URL='https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000007709122&fileDetailSn=1&insertDataPrcus=N'
SOURCE='https://www.data.go.kr/data/15041346/fileData.do'
def normalize(raw):
 rows=list(csv.DictReader(io.StringIO(raw.decode('cp949'))))
 required={'역명','선명','상세위치','이용가능시간'}
 if not rows or not required.issubset(rows[0]):raise ValueError('Unexpected CSV schema')
 result=[];seen=set()
 for row in rows:
  station=row['역명'].strip();line=row['선명'].strip()
  if not station or not line:raise ValueError('Missing source identity')
  identity=f'{line}:{station}:{row["상세위치"].strip()}'
  id='kr-daegu-'+hashlib.sha256(identity.encode()).hexdigest()[:16]
  if id in seen:raise ValueError('Duplicate source facility')
  seen.add(id)
  result.append(dict(id=id,name=f'{station}역 수유실',address=f'대구도시철도 {line} {station}역',location=row['상세위치'].strip(),hours=row['이용가능시간'].strip() or None,changingTable=None,phone=row.get('전화번호','').strip() or None,isExample=False,sourceName='국가철도공단_대구1호선_수유실',sourceUrl=SOURCE,sourceUpdatedAt=None))
 return result
if __name__=='__main__':
 with urllib.request.urlopen(URL,timeout=30) as res:raw=res.read()
 facilities=normalize(raw)
 meta=dict(sourceUrl=SOURCE,downloadUrl=URL,license='이용허락범위 제한 없음',licenseCheckedAt='2026-10-15',collectedAt=datetime.now(timezone.utc).isoformat(),sha256=hashlib.sha256(raw).hexdigest(),count=len(facilities),coverage='대구도시철도 1호선 원본 수록 시설 (경산 소재 역 포함)',limitations=['좌표·도로명주소·기저귀 교환대 정보 미제공','원본 시설 갱신일 미제공','05:30~24:00 표기는 원본 기준이며 휴일·현장 운영 미확인'])
 (ROOT/'data/daegu-source.csv').write_bytes(raw)
 (ROOT/'src/data/official.json').write_text(json.dumps(dict(metadata=meta,facilities=facilities),ensure_ascii=False,indent=2)+'\n')
 print('Imported official facilities:',len(facilities))
