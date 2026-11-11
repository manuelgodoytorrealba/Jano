import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest


class ExportBackupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        script = self.root / 'infra/scripts/export-backup.sh'
        script.parent.mkdir(parents=True)
        shutil.copyfile(Path(__file__).with_name('export-backup.sh'), script)
        self.script = script
        self.state = self.root / '.deploy'
        self.backup = self.state / 'backups/20261110T162107Z-69e4b61d30da'
        self.backup.mkdir(parents=True)
        (self.state / 'last-backup').write_text(str(self.backup))
        for name in ['database.dump', 'uploads.tar.gz']:
            content = ('fixture ' + name).encode()
            (self.backup / name).write_bytes(content)
            (self.backup / (name + '.sha256')).write_text(
                hashlib.sha256(content).hexdigest() + '  ' + name + '\n'
            )
        for name in ['database.list', 'release.env']:
            (self.backup / name).write_text('fixture')

    def run_export(self):
        return subprocess.run(['bash', str(self.script)], capture_output=True,
                              env={**os.environ, 'XDG_CONFIG_HOME': str(self.root / 'config'), 'RESTIC_CACHE_DIR': str(self.root / 'cache')})

    def assert_rejected(self):
        result = self.run_export()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, b'')

    def test_exports_only_complete_verified_backup(self):
        result = self.run_export()
        self.assertEqual(result.returncode, 0, result.stderr)
        with tarfile.open(fileobj=io.BytesIO(result.stdout)) as archive:
            self.assertEqual(set(archive.getnames()), {p.name for p in self.backup.iterdir()})
        self.assertFalse((self.state / 'deploy.lock').exists())

    def test_rejects_corrupted_archive(self):
        (self.backup / 'uploads.tar.gz').write_bytes(b'corrupt')
        self.assert_rejected()

    def test_rejects_external_path(self):
        (self.state / 'last-backup').write_text('/etc')
        self.assert_rejected()

    def test_rejects_symlink(self):
        (self.backup / 'database.dump').unlink()
        (self.backup / 'database.dump').symlink_to('/etc/hosts')
        self.assert_rejected()

    def test_respects_existing_deploy_lock(self):
        (self.state / 'deploy.lock').mkdir()
        self.assert_rejected()
        self.assertTrue((self.state / 'deploy.lock').exists())

    @unittest.skipUnless(shutil.which('restic'), 'restic is required')
    def test_exports_newer_verified_incremental_snapshot(self):
        periodic = self.root / 'periodic'
        periodic.mkdir()
        capture = periodic / 'capture'
        (capture / 'uploads').mkdir(parents=True)
        (capture / 'uploads/image.txt').write_bytes(b'image-v2')
        dump = b'database-v2'
        (capture / 'database.dump').write_bytes(dump)
        (capture / 'database.dump.sha256').write_text(hashlib.sha256(dump).hexdigest() + '  database.dump\n')
        (capture / 'database.list').write_text('fixture')
        (capture / 'release.env').write_text('JANO_RELEASE=abcdef12\nCREATED_AT=20261111T170000Z\n')
        password = self.root / 'periodic-password'
        password.write_text('test-only-password')
        password.chmod(0o600)
        environment = {**os.environ, 'RESTIC_REPOSITORY': str(periodic / 'repo'),
                       'RESTIC_PASSWORD_FILE': str(password)}
        def restic(*args):
            subprocess.run(['restic', *args], env=environment, check=True, capture_output=True)
        restic('init')
        restic('backup', '--host', 'jano-production', '--tag', 'periodic-verified', str(capture))
        shutil.rmtree(capture)
        config = self.root / 'config/jano-periodic'
        config.mkdir(parents=True)
        settings = config / 'settings'
        settings.write_text(f'JANO_PERIODIC_DIR={periodic}\nRESTIC_REPOSITORY={periodic}/repo\nRESTIC_PASSWORD_FILE={password}\n')
        settings.chmod(0o600)
        result = self.run_export()
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        with tarfile.open(fileobj=io.BytesIO(result.stdout)) as archive:
            self.assertEqual(archive.extractfile('database.dump').read(), dump)
            with tarfile.open(fileobj=io.BytesIO(archive.extractfile('uploads.tar.gz').read()), mode='r:gz') as uploads:
                self.assertEqual(uploads.extractfile('./image.txt').read(), b'image-v2')
        self.assertFalse(list(periodic.glob('export.*')))
        newer = self.state / 'backups/20261112T170000Z-abcdef12'
        shutil.copytree(self.backup, newer)
        (self.state / 'last-backup').write_text(str(newer))
        result = self.run_export()
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        with tarfile.open(fileobj=io.BytesIO(result.stdout)) as archive:
            self.assertEqual(archive.extractfile('database.dump').read(), b'fixture database.dump')
        (self.state / 'last-backup').write_text(str(self.backup))
        snapshots = json.loads(subprocess.run(['restic', 'snapshots', '--json'], env=environment, check=True, capture_output=True).stdout)
        pack = next(path for path in (periodic / 'repo/data').rglob('*') if path.is_file())
        pack.unlink()
        shutil.rmtree(self.root / 'cache', ignore_errors=True)
        self.assertNotEqual(len(snapshots), 0)
        self.assert_rejected()

    def run_pull(self, settings):
        return subprocess.run(
            ['bash', str(Path(__file__).with_name('pull-encrypted-backup.sh'))],
            env={**os.environ, 'XDG_CONFIG_HOME': str(settings.parent.parent)},
            capture_output=True,
        )

    def test_pull_rejects_readable_configuration(self):
        settings = self.root / 'config/jano-backup/settings'
        settings.parent.mkdir(parents=True)
        settings.write_text('exit 0\n')
        settings.chmod(0o644)
        self.assertNotEqual(self.run_pull(settings).returncode, 0)

    def test_pull_rejects_symlink_configuration(self):
        settings = self.root / 'config/jano-backup/settings'
        settings.parent.mkdir(parents=True)
        target = self.root / 'private-settings'
        target.write_text('exit 0\n')
        target.chmod(0o600)
        settings.symlink_to(target)
        self.assertNotEqual(self.run_pull(settings).returncode, 0)

    @unittest.skipUnless(shutil.which('restic'), 'restic is required for the integration check')
    def test_encrypted_restore_and_failed_export_does_not_create_snapshot(self):
        password = self.root / 'password'
        password.write_text('isolated-test-fixture-password')
        environment = {
            **os.environ,
            'RESTIC_REPOSITORY': str(self.root / 'encrypted-repository'),
            'RESTIC_PASSWORD_FILE': str(password),
            'RESTIC_CACHE_DIR': str(self.root / 'cache'),
        }

        def restic(*args, check=True):
            return subprocess.run(
                ['restic', *args], env=environment, capture_output=True, check=check
            )

        restic('init')
        args = ('backup', '--stdin-filename', 'jano-backup.tar',
                '--stdin-from-command', '--', 'bash', str(self.script))
        restic(*args)
        restic('check', '--read-data')
        restored = restic('dump', 'latest', 'jano-backup.tar').stdout
        with tarfile.open(fileobj=io.BytesIO(restored)) as archive:
            self.assertEqual(archive.extractfile('database.dump').read(), b'fixture database.dump')
        (self.backup / 'database.dump').write_bytes(b'corrupt')
        self.assertNotEqual(restic(*args, check=False).returncode, 0)
        self.assertEqual(len(json.loads(restic('snapshots', '--json').stdout)), 1)


if __name__ == '__main__':
    unittest.main()
