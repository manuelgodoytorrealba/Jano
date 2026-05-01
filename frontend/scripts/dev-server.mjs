import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const RESET = '\x1b[0m';
const MAGENTA = '\x1b[35m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

function line(color, label, message) {
  console.log(`${color}${label}${RESET} ${message}`);
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..');
const ngEntrypoint = resolve(projectRoot, 'node_modules/@angular/cli/bin/ng.js');

const mode = process.argv[2] === 'host' ? 'host' : 'local';
const port = process.env.PORT || '4200';
const proxyTarget = process.env.API_PROXY_TARGET || 'http://backend:3000';

line(MAGENTA, 'APP', `Frontend dev server will run on http://localhost:${port}`);
line(DIM, 'API', `Proxying /api and /uploads to ${proxyTarget}`);

if (mode === 'host') {
  line(YELLOW, 'WATCH', 'Polling enabled for Docker bind mounts');
}

// 🔥 CLAVE: desactivar bloqueo de hosts en Angular moderno
process.env['DANGEROUSLY_DISABLE_HOST_CHECK'] = 'true';

const args = [
  ngEntrypoint,
  'serve',
  '--proxy-config',
  'proxy.conf.js',
];

// Solo flags válidos
if (mode === 'host') {
  args.push('--host', '0.0.0.0', '--poll', '1000');
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