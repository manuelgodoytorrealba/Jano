import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time
import unittest


FAKE_DOCKER = r'''#!/usr/bin/env python3
import os, subprocess, sys, time
args=sys.argv[1:]
with open(os.environ['CALL_LOG'], 'a') as f: f.write(' '.join(args)+'\n')
fail=os.environ.get('FAIL_AT','')
if args[0]=='compose':
    if 'ps' in args:
        service=args[-1]
        if service!='adminer': print(service+'-id')
    elif 'stop' in args:
        if fail=='stop': sys.exit(2)
        if fail=='hang': time.sleep(60)
    elif 'exec' in args:
        if fail=='dump': sys.exit(2)
        sys.stdout.write('database fixture')
elif args[0]=='start':
    if fail=='start': sys.exit(2)
elif args[0]=='inspect':
    fmt=args[args.index('--format')+1]
    if 'Destination' in fmt:
        print('pg-volume' if 'postgresql/data' in fmt else 'upload-volume')
    elif '.State.Running' in fmt: print('true')
    else: print('healthy')
elif args[0]=='ps':
    print('backend-id')
    if fail=='other-writer': print('other-id')
elif args[0]=='run':
    if 'pg_restore' in args:
        sys.stdin.buffer.read(); print('database list')
    elif '--entrypoint' in args:
        if fail=='tar' and '--checksum' in args: sys.exit(2)
        if fail=='precopy' and '--checksum' not in args: sys.exit(2)
        mount=next(x for x in args if x.startswith('type=bind,src=') and x.endswith(',dst=/stage'))
        dest=mount.removeprefix('type=bind,src=').removesuffix(',dst=/stage')
        sys.exit(subprocess.call(['rsync','-a','--delete','--checksum',os.environ['UPLOADS_FIXTURE']+'/',dest+'/']))
'''
FAKE_RESTIC = r'''#!/usr/bin/env python3
import os,sys
args=sys.argv[1:]
with open(os.environ['CALL_LOG'], 'a') as f: f.write('restic '+' '.join(args)+'\n')
if os.environ.get('FAIL_AT')=='restic' and args[0]=='check': sys.exit(2)
if args[0]=='backup': print('{"message_type":"summary","snapshot_id":"'+'a'*64+'"}')
'''


class PeriodicBackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.scripts=self.root/'infra/scripts'
        self.scripts.mkdir(parents=True)
        for name in ('periodic-backup.sh','periodic-recover.sh'):
            shutil.copyfile(Path(__file__).with_name(name), self.scripts/name)
        (self.root/'.deploy').mkdir()
        (self.root/'.deploy/current-release').write_text('abcdef12\n')
        env_file=self.root/'infra/.env.production'
        env_file.write_text('UPLOADS_VOLUME=upload-volume\nPOSTGRES_VOLUME=pg-volume\n')
        env_file.chmod(0o600)
        config=self.root/'config/jano-periodic'
        config.mkdir(parents=True)
        self.store=self.root/'store'
        self.store.mkdir(mode=0o700)
        password=self.root/'password'
        password.write_text('test')
        password.chmod(0o600)
        settings=config/'settings'
        settings.write_text(f'JANO_PERIODIC_DIR={self.store}\nRESTIC_REPOSITORY={self.store}/repo\nRESTIC_PASSWORD_FILE={password}\n')
        settings.chmod(0o600)
        bindir=self.root/'bin'
        bindir.mkdir()
        for name,content in [('docker',FAKE_DOCKER),('restic',FAKE_RESTIC)]:
            executable=bindir/name
            executable.write_text(content)
            executable.chmod(0o755)
        uploads=self.root/'uploads'
        uploads.mkdir()
        (uploads/'image').write_text('image fixture')
        self.log=self.root/'calls'
        self.env={**os.environ,'PATH':f'{bindir}:{os.environ["PATH"]}',
                  'XDG_CONFIG_HOME':str(self.root/'config'),'CALL_LOG':str(self.log),
                  'UPLOADS_FIXTURE':str(uploads)}
        self.marker=self.root/'.deploy/periodic-quiesced'
        self.lock=self.root/'.deploy/deploy.lock'

    def run_backup(self, failure=''):
        return subprocess.run(['bash',str(self.scripts/'periodic-backup.sh')],
                              env={**self.env,'FAIL_AT':failure},capture_output=True,text=True)

    def test_success_publishes_only_after_check_and_recovers_services(self):
        result=self.run_backup()
        self.assertEqual(result.returncode,0,result.stderr)
        calls=self.log.read_text()
        self.assertLess(calls.index('restic check'),calls.index('restic tag'))
        self.assertIn('start backend-id frontend-id',calls)
        self.assertFalse(self.marker.exists())
        self.assertFalse(self.lock.exists())
        self.assertFalse((self.store/'capture').exists())

    def test_failure_restores_services_and_never_publishes(self):
        for failure in ('stop','dump','tar','restic'):
            with self.subTest(failure=failure):
                shutil.rmtree(self.store/'capture',ignore_errors=True)
                self.log.unlink(missing_ok=True)
                result=self.run_backup(failure)
                self.assertNotEqual(result.returncode,0)
                self.assertIn('start backend-id frontend-id',self.log.read_text())
                self.assertNotIn('restic tag',self.log.read_text())
                self.assertFalse(self.marker.exists())
                self.assertFalse(self.lock.exists())

    def test_failed_restart_keeps_marker_and_lock(self):
        result=self.run_backup('start')
        self.assertNotEqual(result.returncode,0)
        self.assertTrue(self.marker.exists())
        self.assertTrue(self.lock.exists())
        self.assertNotIn('restic tag',self.log.read_text())

    def test_existing_lock_is_not_removed(self):
        self.lock.mkdir()
        (self.lock/'pid').write_text('123\n')
        result=self.run_backup()
        self.assertNotEqual(result.returncode,0)
        self.assertEqual((self.lock/'pid').read_text(),'123\n')
        self.assertNotIn('stop frontend backend',self.log.read_text() if self.log.exists() else '')

    def test_unowned_capture_is_never_removed(self):
        (self.store/'capture').mkdir()
        (self.store/'capture/keep').write_text('user data')
        result=self.run_backup()
        self.assertNotEqual(result.returncode,0)
        self.assertEqual((self.store/'capture/keep').read_text(),'user data')

    def test_precopy_failure_does_not_stop_services(self):
        result=self.run_backup('precopy')
        self.assertNotEqual(result.returncode,0)
        self.assertNotIn('stop frontend backend',self.log.read_text())
        self.assertFalse(self.lock.exists())

    def test_other_volume_writer_prevents_stopping_services(self):
        result=self.run_backup('other-writer')
        self.assertNotEqual(result.returncode,0)
        self.assertNotIn('stop frontend backend',self.log.read_text())
        self.assertFalse(self.marker.exists())

    def test_killed_capture_is_recovered_by_stop_post(self):
        process=subprocess.Popen(['bash',str(self.scripts/'periodic-backup.sh')],
            env={**self.env,'FAIL_AT':'hang'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
            start_new_session=True)
        try:
            for _ in range(100):
                if self.marker.exists() and self.log.exists() and 'stop frontend backend' in self.log.read_text():
                    break
                time.sleep(.05)
            else: self.fail('did not reach paused capture')
            os.killpg(process.pid,signal.SIGKILL)
            process.wait(timeout=5)
            result=subprocess.run(['bash',str(self.scripts/'periodic-recover.sh')],
                                  env=self.env,capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertIn('start backend-id frontend-id',self.log.read_text())
            self.assertFalse(self.marker.exists())
            self.assertFalse(self.lock.exists())
            self.assertFalse((self.store/'capture').exists())
        finally:
            if process.poll() is None:
                os.killpg(process.pid,signal.SIGKILL)
                process.wait()


if __name__=='__main__': unittest.main()
