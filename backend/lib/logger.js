const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };
const current = process.env.LOG_LEVEL || 'info';
const currentLevel = LEVELS[current] ?? LEVELS.info;

function ts() {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
}

function debug(...args) {
  if (currentLevel <= LEVELS.debug) console.log(`[${ts()}] [DEBUG]`, ...args);
}
function info(...args) {
  if (currentLevel <= LEVELS.info) console.log(`[${ts()}] [INFO]`, ...args);
}
function warn(...args) {
  if (currentLevel <= LEVELS.warn) console.warn(`[${ts()}] [WARN]`, ...args);
}
function error(...args) {
  console.error(`[${ts()}] [ERROR]`, ...args);
}

module.exports = { debug, info, warn, error };
