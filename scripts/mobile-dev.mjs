import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RESET = '\x1b[0m';
const MAGENTA = '\x1b[35m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, '..');
const frontendPort = String(process.env.FRONTEND_PORT || process.env.PORT || '4200');
const localUrl = `http://localhost:${frontendPort}`;
const lanIp = detectLanIpv4();
const lanUrl = lanIp ? `http://${lanIp}:${frontendPort}` : null;
const allowedHosts = ['localhost', '127.0.0.1', lanIp].filter(Boolean);
const frontendOrigins = [localUrl, `http://127.0.0.1:${frontendPort}`, lanUrl]
  .filter(Boolean)
  .join(',');
const allowedHostsCsv = allowedHosts.join(',');
const mediaPublicBaseUrl = lanUrl || localUrl;

const childProcesses = new Set();
let shuttingDown = false;

function line(color, label, message = '') {
  const suffix = message ? ` ${message}` : '';
  console.log(`${color}${label}${RESET}${suffix}`);
}

function printBanner() {
  console.log('');
  line(MAGENTA, 'JANO', 'Mobile Development');
  console.log('');
  line(CYAN, 'Local:', localUrl);
  if (lanUrl) {
    line(GREEN, 'LAN:', lanUrl);
  } else {
    line(YELLOW, 'LAN:', 'No private IPv4 address detected on this machine');
  }
  console.log('');
  line(DIM, 'Hint', 'Abre la URL LAN desde tu movil para probar JANO.');
  line(DIM, 'Proxy', 'El frontend reenviara /api y /uploads al backend local.');
  console.log('');
}

function detectLanIpv4() {
  const interfaces = networkInterfaces();
  const candidates = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      const family = typeof entry.family === 'string' ? entry.family : String(entry.family);
      if (family !== 'IPv4' || entry.internal || !entry.address) {
        continue;
      }
      candidates.push(entry.address);
    }
  }

  return candidates.find(isPrivateIpv4) || candidates[0] || null;
}

function isPrivateIpv4(address) {
  return (
    /^10\./.test(address) ||
    /^192\.168\./.test(address) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: options.env || process.env,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 1}`));
    });

    child.on('error', rejectPromise);
  });
}

function spawnManaged(command, args, env) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
  });

  childProcesses.add(child);
  child.on('exit', () => childProcesses.delete(child));
  child.on('error', (error) => {
    line(RED, 'ERR', `Failed to start ${command}: ${error.message}`);
  });
  return child;
}

function stopChildren(signal = 'SIGTERM') {
  for (const child of childProcesses) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function attachShutdown(signal) {
  process.on(signal, () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    stopChildren(signal === 'SIGINT' ? 'SIGINT' : 'SIGTERM');
    setTimeout(() => process.exit(0), 100);
  });
}

async function main() {
  printBanner();
  line(DIM, 'DB', 'Ensuring local database containers are up...');
  await run('npm', ['run', 'db:up']);

  const backendEnv = {
    ...process.env,
    HOST: '0.0.0.0',
    FRONTEND_ORIGIN: frontendOrigins,
    MEDIA_PUBLIC_BASE_URL: mediaPublicBaseUrl,
    NG_ALLOWED_HOSTS: allowedHostsCsv,
  };

  const frontendEnv = {
    ...process.env,
    PORT: frontendPort,
    DEV_LAN_IP: lanIp || '',
    NG_ALLOWED_HOSTS: allowedHostsCsv,
    DEV_ALLOWED_HOSTS: allowedHostsCsv,
  };

  line(DIM, 'Backend', `FRONTEND_ORIGIN=${frontendOrigins}`);
  line(DIM, 'Hosts', `NG_ALLOWED_HOSTS=${allowedHostsCsv}`);
  line(DIM, 'Media', `MEDIA_PUBLIC_BASE_URL=${mediaPublicBaseUrl}`);
  console.log('');

  const backend = spawnManaged('npm', ['run', 'backend:dev'], backendEnv);
  const frontend = spawnManaged(
    'npm',
    ['--prefix', 'frontend', 'run', 'start:mobile'],
    frontendEnv,
  );

  attachShutdown('SIGINT');
  attachShutdown('SIGTERM');

  backend.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    if (code && code !== 0) {
      line(YELLOW, 'EXIT', `Backend exited with code ${code}`);
    }
    if (!frontend.killed) {
      frontend.kill('SIGTERM');
    }
    process.exit(code ?? 0);
  });

  frontend.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    if (code && code !== 0) {
      line(YELLOW, 'EXIT', `Frontend exited with code ${code}`);
    }
    if (!backend.killed) {
      backend.kill('SIGTERM');
    }
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  line(RED, 'ERR', error.message);
  stopChildren('SIGTERM');
  process.exit(1);
});
