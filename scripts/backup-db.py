"""Back up development MariaDB; optionally verify restoration in an isolated DB."""
import subprocess,os,secrets,sys
from pathlib import Path
from datetime import datetime,timezone
container='nursing-mariadb'
root=Path('/workspace/.nursing-runtime/backups');root.mkdir(mode=0o700,parents=True,exist_ok=True)
target=root/(datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')+'-'+secrets.token_hex(4)+'.sql')
# The generated client config stays inside the container and is removed by trap.
config='umask 077; task_cnf=$(mktemp); trap \'rm -f "$task_cnf"\' EXIT; printf \'[client]\\nuser=root\\npassword=%s\\n\' "$MARIADB_ROOT_PASSWORD" > "$task_cnf"; '
with target.open('wb') as file:
 target.chmod(0o600)
 result=subprocess.run(['docker','exec',container,'sh','-c',config+'mariadb-dump --defaults-extra-file="$task_cnf" --single-transaction --skip-comments nursing'],stdout=file,stderr=subprocess.PIPE)
if result.returncode:
 target.unlink(missing_ok=True);raise SystemExit('Backup failed; no partial backup retained')
if '--verify-restore' in sys.argv:
 name='restore_check_'+secrets.token_hex(8)
 def sql(statement):
  return subprocess.run(['docker','exec',container,'sh','-c',config+'mariadb --defaults-extra-file="$task_cnf" --batch --skip-column-names -e "$1"','sh',statement],capture_output=True,check=True).stdout
 try:
  sql('CREATE DATABASE `'+name+'`')
  with target.open('rb') as file:
   subprocess.run(['docker','exec','-i',container,'sh','-c',config+'mariadb --defaults-extra-file="$task_cnf" "$1"','sh',name],stdin=file,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=True)
  original=sql('SELECT COUNT(*) FROM nursing.facilities');restored=sql('SELECT COUNT(*) FROM `'+name+'`.facilities')
  if original!=restored:raise SystemExit('Restore facility count mismatch')
  print('Isolated restore verified; facility rows:',restored.decode().strip())
 finally:sql('DROP DATABASE IF EXISTS `'+name+'`')
print('Backup saved outside repository:',target.name)
