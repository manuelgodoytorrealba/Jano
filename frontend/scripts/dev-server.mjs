import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const RESET = '\x1b[0m';
const MAGENTA = '\x1b[35m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';

function line(color, label, message) {
  console.log(`${color}${label}${RESET} ${message}`);
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..');
const localNgEntrypoint = resolve(projectRoot, 'node_modules/@angular/cli/bin/ng.js');
const workspaceNgEntrypoint = resolve(projectRoot, '../node_modules/@angular/cli/bin/ng.js');
const ngEntrypoint = existsSync(localNgEntrypoint) ? localNgEntrypoint : workspaceNgEntrypoint;

const rawMode = process.argv[2];
const mode = rawMode === 'host' || rawMode === 'mobile' ? rawMode : 'local';
const port = process.env.PORT || '4200';
const proxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:3000';
const lanIp = process.env.DEV_LAN_IP?.trim() || '';
const extraAllowedHosts = (process.env.DEV_ALLOWED_HOSTS || process.env.NG_ALLOWED_HOSTS || '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

if (mode === 'mobile') {
  console.log('');
  line(MAGENTA, 'APP', 'JANO mobile frontend');
  console.log('');
  line(CYAN, 'Local:', `http://localhost:${port}`);
  if (lanIp) {
    line(GREEN, 'LAN:', `http://${lanIp}:${port}`);
  }
  console.log('');
} else {
  line(MAGENTA, 'APP', `Frontend dev server will run on http://localhost:${port}`);
}

line(DIM, 'API', `Proxying /api and /uploads to ${proxyTarget}`);

if (mode === 'host') {
  line(YELLOW, 'WATCH', 'Polling enabled for Docker bind mounts');
}

process.env.DANGEROUSLY_DISABLE_HOST_CHECK = 'true';

const args = [ngEntrypoint, 'serve', '--proxy-config', 'proxy.conf.js', '--no-hmr'];

if (mode === 'host' || mode === 'mobile') {
  args.push('--host', '0.0.0.0');
}

if (extraAllowedHosts.length) {
  args.push(`--allowed-hosts=${extraAllowedHosts.join(',')}`);
}

if (mode === 'host') {
  args.push('--poll', '1000');
}

const child = spawn(process.execPath, args, {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  if (code && code !== 0) {
    line(YELLOW, 'EXIT', `Frontend dev server exited with code ${code}`);
  }
  process.exit(code ?? 0);
});

child.on('error', (childError) => {
  line(RED, 'ERR', `Failed to start Angular CLI: ${childError.message}`);
  process.exit(1);
});
