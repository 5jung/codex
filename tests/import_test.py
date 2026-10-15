import unittest,importlib.util,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(name,file):
 s=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
class ImportTest(unittest.TestCase):
 def test_provenance_integrity_and_unknown_values(self):
  data=json.loads((ROOT/'src/data/official.json').read_text());self.assertEqual(len(data['facilities']),data['metadata']['count'])
  self.assertEqual(len({f['id'] for f in data['facilities']}),len(data['facilities']))
  for s in data['metadata']['sources']:
   kind='busan' if s['sourceUrl'].endswith('15084232/fileData.do') else {'15041346':'daegu','15084089':'seongnam','15045348':'jeju','15102567':'bupyeong'}[s['sourceUrl'].split('/')[-2]]
   raw=(ROOT/'data'/f'{kind}-source.{"zip" if kind=="busan" else "csv"}').read_bytes()
   self.assertEqual(hashlib.sha256(raw).hexdigest(),s['sha256'])
  for f in data['facilities']:
   if f['id'].startswith('kr-busan-'):
    self.assertTrue(33<=f['latitude']<=39 and 124<=f['longitude']<=132)
   else:self.assertNotIn('latitude',f)
   if f['id'].startswith('kr-seongnam-'):self.assertIn(f['changingTable'],[True,None])
 def test_busan_binary_is_validated(self):
  module=load('busan','import-busan.py');raw=(ROOT/'data/busan-source.zip').read_bytes();self.assertEqual(len(module.normalize(raw)),291)
  with self.assertRaises(Exception):module.normalize(b'invalid archive')
 def test_missing_source_fields_rejected(self):
  module=load('public','import-public.py')
  with self.assertRaises(KeyError):module.normalize('jeju','이름\n잘못된 스키마\n'.encode(),'url','name')
if __name__=='__main__':unittest.main()
