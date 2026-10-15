"""Start the development DB with generated local credentials. Never print them."""
import os,secrets,subprocess,json,time
from pathlib import Path
p=Path('/workspace/.nursing-runtime');p.mkdir(mode=0o700,exist_ok=True)
f=p/'database.env'
if not f.exists() and (p/'db/mysql').exists():raise SystemExit('Database exists but local credentials are missing; restore credentials instead of regenerating.')
if not f.exists():
 f.write_text('MARIADB_ROOT_PASSWORD='+secrets.token_hex(32)+'\nMARIADB_DATABASE=nursing\nMARIADB_USER=nursing\nMARIADB_PASSWORD='+secrets.token_hex(32)+'\n');f.chmod(0o600)
v=dict(line.split('=',1) for line in f.read_text().splitlines())
server=p/'server.env'
if not server.exists():
 server.write_text('DB_HOST=127.0.0.1\nDB_PORT=33306\nDB_USER=nursing\nDB_NAME=nursing\nDB_PASSWORD='+v['MARIADB_PASSWORD']+'\n');server.chmod(0o600)
name='nursing-mariadb'
exists=subprocess.run(['docker','container','inspect',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
if exists:
 info=json.loads(subprocess.check_output(['docker','container','inspect',name]))[0]
 if not any(m.get('Source')==str(p/'db') and m.get('Destination')=='/var/lib/mysql' for m in info.get('Mounts',[])):raise SystemExit('Existing container belongs to another setup; refusing to reuse it.')
 subprocess.run(['docker','start',name],check=True,stdout=subprocess.DEVNULL)
else:subprocess.run(['docker','run','-d','--name',name,'--env-file',str(f),'-p','127.0.0.1:33306:3306','-v',str(p/'db')+':/var/lib/mysql','mariadb@sha256:1292844148b311e4ed4300022a996d39083f415a963e970cf47cad1b3b18e3a6'],check=True,stdout=subprocess.DEVNULL)
for attempt in range(45):
 result=subprocess.run(['docker','exec',name,'healthcheck.sh','--connect','--innodb_initialized'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 if result.returncode==0:break
 time.sleep(1)
else:raise SystemExit('Database readiness check failed')
print('MariaDB ready on loopback port 33306.')
