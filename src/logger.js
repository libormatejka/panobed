const fs   = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || path.join(__dirname, '../data/app.log');

let logStream = null;

function getStream() {
  if (!logStream) {
    try {
      logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    } catch {
      // data/ neexistuje v dev prostředí – tiše ignoruj
    }
  }
  return logStream;
}

function write(level, args) {
  const line = `${new Date().toISOString()} [${level}] ${args.map(a =>
    typeof a === 'string' ? a : JSON.stringify(a)
  ).join(' ')}\n`;
  process.stdout.write(line);
  getStream()?.write(line);
}

const _log   = console.log.bind(console);
const _error = console.error.bind(console);
const _warn  = console.warn.bind(console);

console.log   = (...a) => write('INFO',  a);
console.error = (...a) => write('ERROR', a);
console.warn  = (...a) => write('WARN',  a);

// Nezachycené chyby
process.on('uncaughtException',  (err) => { console.error('uncaughtException', err.stack || err.message); process.exit(1); });
process.on('unhandledRejection', (err) => { console.error('unhandledRejection', err?.stack || err); });
