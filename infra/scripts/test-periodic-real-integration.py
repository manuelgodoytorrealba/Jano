import json, os, shutil, subprocess, tarfile, tempfile, time, unittest, uuid
from pathlib import Path

SOURCE=Path(os.environ.get('PROOF_SOURCE', str(Path(__file__).resolve().parent)))
REAL_DOCKER=shutil.which('docker')
WRAPPER='''#!/usr/bin/env python3
import os,sys
args=sys.argv[1:]
real=os.environ['REAL_DOCKER']
if args[0]=='compose':
    if 'ps' in args:
        service=args[-1]
        if service!='adminer':
            import subprocess
            print(subprocess.check_output([real,'inspect','--format','{{.Id}}',os.environ['PROOF_PREFIX']+'-'+service],text=True).strip())
        sys.exit(0)
    if 'stop' in args or 'start' in args:
        verb='stop' if 'stop' in args else 'start'
        os.execv(real,[real,verb,os.environ['PROOF_PREFIX']+'-frontend',os.environ['PROOF_PREFIX']+'-backend'])
    if 'exec' in args:
        idx=args.index('db')
        os.execv(real,[real,'exec','-i',os.environ['PROOF_PREFIX']+'-db',*args[idx+1:]])
os.execv(real,[real,*args])
'''

@unittest.skipUnless(REAL_DOCKER and shutil.which('restic'), 'Docker and restic are required')
class RealCapture(unittest.TestCase):
    def test_capture_and_recover_postgres_and_uploads(self):
        prefix='jano-proof-'+uuid.uuid4().hex[:10]
        names=[prefix+'-'+x for x in ('backend','frontend','db')]
        vols=[prefix+'-uploads',prefix+'-pg']
        def docker(*args,**kw):
            return subprocess.run([REAL_DOCKER,*args],check=True,capture_output=True,**kw)
        def cleanup():
            subprocess.run([REAL_DOCKER,'rm','-f',*names],capture_output=True)
            subprocess.run([REAL_DOCKER,'volume','rm',*vols],capture_output=True)
        self.addCleanup(cleanup)
        with tempfile.TemporaryDirectory(prefix='jano-proof-') as td:
            root=Path(td); scripts=root/'infra/scripts'; scripts.mkdir(parents=True)
            for f in ('periodic-backup.sh','periodic-recover.sh','export-backup.sh'):
                shutil.copyfile(SOURCE/f,scripts/f)
            (root/'.deploy/backups/20200101T000000Z-abcdef12').mkdir(parents=True)
            (root/'.deploy/current-release').write_text('abcdef12\n')
            (root/'.deploy/last-backup').write_text(str(root/'.deploy/backups/20200101T000000Z-abcdef12'))
            (root/'infra/.env.production').write_text(f'UPLOADS_VOLUME={vols[0]}\nPOSTGRES_VOLUME={vols[1]}\n')
            (root/'infra/.env.production').chmod(0o600)
            cfg=root/'config/jano-periodic';cfg.mkdir(parents=True)
            periodic=root/'periodic';periodic.mkdir(mode=0o700)
            password=root/'password';password.write_text('test-only');password.chmod(0o600)
            settings=cfg/'settings';settings.write_text(f'JANO_PERIODIC_DIR={periodic}\nRESTIC_REPOSITORY={periodic}/repo\nRESTIC_PASSWORD_FILE={password}\n');settings.chmod(0o600)
            bindir=root/'bin';bindir.mkdir();(bindir/'docker').write_text(WRAPPER);(bindir/'docker').chmod(0o755)
            env={**os.environ,'PATH':f'{bindir}:{os.environ["PATH"]}','XDG_CONFIG_HOME':str(root/'config'),
                 'REAL_DOCKER':REAL_DOCKER,'PROOF_PREFIX':prefix,
                 'RESTIC_REPOSITORY':str(periodic/'repo'),'RESTIC_PASSWORD_FILE':str(password)}
            for volume in vols: docker('volume','create',volume)
            docker('run','--rm','--pull=never','--network','none','-v',vols[0]+':/data', 'postgres:16.15-trixie',
                   'sh','-c','mkdir /data/pictures && printf image-v1 > /data/pictures/test.txt')
            docker('run','-d','--pull=never','--name',names[2],'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_USER=postgres','-e','POSTGRES_DB=postgres',
                   '-v',vols[1]+':/var/lib/postgresql/data','postgres:16.15-trixie')
            for _ in range(30):
                if subprocess.run([REAL_DOCKER,'exec',names[2],'pg_isready','-U','postgres'],capture_output=True).returncode==0: break
                time.sleep(1)
            else: self.fail('isolated PostgreSQL did not start')
            docker('exec',names[2],'psql','-U','postgres','-c',"CREATE TABLE sentinel (value text); INSERT INTO sentinel VALUES ('database-v1');")
            for service,name in [('backend',names[0]),('frontend',names[1])]:
                mount=['-v',vols[0]+':/app/backend/api/uploads:ro'] if service=='backend' else []
                docker('run','-d','--pull=never','--name',name,'--network','none','--health-cmd','true','--health-interval','1s',*mount,'postgres:16.15-trixie','sleep','infinity')
            subprocess.run(['restic','init'],env=env,check=True,capture_output=True)
            result=subprocess.run(['bash',str(scripts/'periodic-backup.sh')],env=env,capture_output=True,text=True,timeout=90)
            self.assertEqual(result.returncode,0,result.stderr+'\n'+result.stdout)
            snapshots=json.loads(subprocess.run(['restic','snapshots','--json','--tag','periodic-verified'],env=env,check=True,capture_output=True,text=True).stdout)
            self.assertEqual(len(snapshots),1)
            result=subprocess.run(['bash',str(scripts/'export-backup.sh')],env=env,capture_output=True,timeout=90)
            self.assertEqual(result.returncode,0,result.stderr.decode())
            package=root/'export.tar';package.write_bytes(result.stdout)
            with tarfile.open(package) as archive:
                self.assertEqual(set(archive.getnames()),{'database.dump','database.dump.sha256','database.list','uploads.tar.gz','uploads.tar.gz.sha256','release.env'})
                dump=archive.extractfile('database.dump').read()
                with tempfile.TemporaryFile() as upload:
                    upload.write(archive.extractfile('uploads.tar.gz').read());upload.seek(0)
                    with tarfile.open(fileobj=upload,mode='r:gz') as pictures:
                        self.assertEqual(pictures.extractfile('./pictures/test.txt').read(),b'image-v1')
            docker('exec',names[2],'createdb','-U','postgres','restorecheck')
            docker('exec','-i',names[2],'pg_restore','--exit-on-error','--no-owner','--no-acl','-U','postgres','-d','restorecheck',input=dump)
            result=docker('exec',names[2],'psql','-U','postgres','-d','restorecheck','-Atc','SELECT value FROM sentinel')
            self.assertEqual(result.stdout.strip(),b'database-v1')
            for name in names[:2]: self.assertEqual(docker('inspect','--format','{{.State.Running}}',name).stdout.strip(),b'true')

if __name__=='__main__': unittest.main()
