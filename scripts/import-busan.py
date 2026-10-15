"""Read coordinates directly from the officially published UTF-8/WGS84 DBF."""
import io,zipfile,struct,json,hashlib,math,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE='https://www.data.go.kr/data/15084232/fileData.do'
URL='https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003585358&fileDetailSn=1&insertDataPrcus=N'
def normalize(raw):
 z=zipfile.ZipFile(io.BytesIO(raw))
 if z.read('nursingRoomFacilities.cpg').decode().strip()!='UTF-8':raise ValueError('Unknown encoding')
 if 'GCS_WGS_1984' not in z.read('nursingRoomFacilities.prj').decode():raise ValueError('Unknown CRS')
 b=z.read('nursingRoomFacilities.dbf');n=struct.unpack_from('<I',b,4)[0];hl,rl=struct.unpack_from('<HH',b,8)
 fields=[(b[i:i+11].split(b'\0')[0].decode(),b[i+16]) for i in range(32,hl-1,32)]
 if not {'기관명','주소','위도','경도','상태','용도'}.issubset(dict(fields)):raise ValueError('Unknown fields')
 out=[];seen=set()
 for j in range(n):
  row=b[hl+j*rl:hl+(j+1)*rl]
  if len(row)!=rl:raise ValueError('Truncated DBF')
  if row[0:1]==b'*':continue
  offset=1;d={}
  for name,length in fields:d[name]=row[offset:offset+length].decode().strip();offset+=length
  lat=float(d['위도']);lon=float(d['경도'])
  if not(math.isfinite(lat) and math.isfinite(lon) and 33<=lat<=39 and 124<=lon<=132):raise ValueError('Invalid Korean coordinates')
  identity=d['기관명']+'|'+d['주소']
  id='kr-busan-'+hashlib.sha256(identity.encode()).hexdigest()[:16]
  if id in seen:raise ValueError('Duplicate source facility')
  seen.add(id)
  out.append(dict(id=id,name=d['기관명'],address=d['주소'],latitude=lat,longitude=lon,location=d['용도'],hours=None,changingTable=None,isExample=False,sourceName='부산광역시_수유실 보유시설 현황(SHP)',sourceUrl=SOURCE,sourceUpdatedAt=None,sourceStatus=d['상태'],notes='원본 운영 상태는 현재 상태를 보장하지 않습니다. 실내 위치·운영시간은 방문 전 확인해주세요.'))
 return out
if __name__=='__main__':
 with urllib.request.urlopen(SOURCE,timeout=30) as r:page=r.read().decode()
 if '이용허락범위 제한 없음' not in page:raise ValueError('License needs review')
 with urllib.request.urlopen(URL,timeout=30) as r:raw=r.read()
 rows=normalize(raw)
 data=json.loads((ROOT/'src/data/official.json').read_text());data['facilities']=[f for f in data['facilities'] if not f['id'].startswith('kr-busan-')]+rows
 meta=data['metadata'];meta['count']=len(data['facilities']);meta['coverage']='부산·대구도시철도 1호선·성남·제주·인천 부평의 공개 원본 수록 시설'
 meta['sources']=[s for s in meta['sources'] if s['sourceUrl']!=SOURCE]+[dict(name='부산광역시_수유실 보유시설 현황(SHP)',sourceUrl=SOURCE,downloadUrl=URL,license='이용허락범위 제한 없음',licenseCheckedAt='2026-10-15',sha256=hashlib.sha256(raw).hexdigest(),count=len(rows))]
 meta['limitations']=['전국 전체를 포함하지 않음','부산 자료만 원본 좌표 제공','원본 갱신일 미제공 자료와 수집일을 구분','원본 운영 상태와 현재 현장 상태는 다를 수 있음','서로 다른 출처 간 동일 시설 여부는 별도 검토 필요']
 (ROOT/'data/busan-source.zip').write_bytes(raw)
 (ROOT/'src/data/official.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 print('Busan facilities:',len(rows),'Total:',len(data['facilities']))
