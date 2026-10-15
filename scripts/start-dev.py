"""Start or reuse only verified development services; do not stop unrelated processes."""
import subprocess,time,json,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RUNTIME=Path('/workspace/.nursing-runtime')
subprocess.run(['npm','run','db:start'],cwd=ROOT,check=True)
def ready(url,kind):
 try:
  with urllib.request.urlopen(url,timeout=2) as response:
   if response.status!=200:return False
   body=response.read().decode()
   if kind=='api':
    j=json.loads(body);return j.get('service')=='nursing-room-api' and j.get('database')=='connected'
   return '<title>수유실 지도</title>' in body
 except Exception:return False
def start(name,args,url,kind):
 if ready(url,kind):print(name+': already ready');return
 # Refuse to take over a port occupied by an unknown HTTP service.
 try:
  urllib.request.urlopen(url,timeout=2)
 except urllib.error.URLError as e:
  if isinstance(e,urllib.error.HTTPError):raise SystemExit(name+': port is occupied by another service')
 else:raise SystemExit(name+': port is occupied by another service')
 log_path=RUNTIME/(name+'.log')
 with log_path.open('a') as log:
  log_path.chmod(0o600)
  process=subprocess.Popen(args,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 (RUNTIME/(name+'.pid')).write_text(str(process.pid))
 for attempt in range(25):
  if ready(url,kind):print(name+': ready');return
  if process.poll() is not None:raise SystemExit(name+': startup failed; inspect '+str(log_path))
  time.sleep(1)
 raise SystemExit(name+': readiness timeout; inspect '+str(log_path))
start('api',['npm','run','dev:api'],'http://127.0.0.1:3001/api/health','api')
start('web',['npm','run','dev','--','--port','5173','--strictPort'],'http://localhost:5173/','web')
