const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

function format(color: string, icon: string, message: string) {
  return `${color}${icon} ${message}${RESET}`;
}

export function success(message: string) {
  return format(GREEN, 'OK', message);
}

export function warning(message: string) {
  return format(YELLOW, 'WARN', message);
}

export function error(message: string) {
  return format(RED, 'ERR', message);
}

export function info(message: string) {
  return format(BLUE, 'INFO', message);
}

export function muted(message: string) {
  return `${DIM}${message}${RESET}`;
}
