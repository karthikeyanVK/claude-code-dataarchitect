/**
 * Shared helpers: .env parsing, mssql config building and YAML rule loading.
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const dotenv = require('dotenv');

const PIPELINE_DIR = __dirname;
const ENV_PATH = path.join(PIPELINE_DIR, '..', '.env');
const RULES_DIR = path.join(PIPELINE_DIR, 'dq_rules');

const BOOL_KEYS = new Set(['encrypt', 'trustservercertificate']);
const BOOL_MAP = {
  true: true, yes: true, 1: true, false: false, no: false, 0: false,
};

const KEYWORDS = [
  'driver', 'server', 'address', 'addr', 'data source', 'database', 'initial catalog',
  'uid', 'user id', 'user', 'pwd', 'password', 'encrypt', 'trustservercertificate',
  'trusted_connection', 'connection timeout', 'timeout', 'authentication', 'app',
  'application name', 'multipleactiveresultsets', 'hostnameincertificate',
].join('|');

// A password may itself contain `;` or `=`, so capture it lazily up to the next known keyword.
const PWD_RE = new RegExp(
  `\\b(pwd|password)\\s*=\\s*([\\s\\S]*?)\\s*(?:;\\s*(?=(?:${KEYWORDS})\\s*=)|;\\s*$|$)`,
  'i',
);

function loadEnv(file = ENV_PATH) {
  if (!fs.existsSync(file)) return {};
  return dotenv.parse(fs.readFileSync(file));
}

function isMasked(value) {
  const v = (value || '').trim();
  return !v || /^\*+$/.test(v);
}

function buildConfig() {
  const env = loadEnv();
  const raw = process.env.SQLCONECTION || env.sqlconection;
  if (!raw) throw new Error('`sqlconection` not found in environment or .env');

  const match = raw.match(PWD_RE);
  const password = process.env.SQL_PASSWORD || (match ? match[2] : '');
  if (isMasked(password)) {
    throw new Error(
      'No usable password in the connection string (it looks masked). Put the real value in '
      + '.env or set the SQL_PASSWORD environment variable.',
    );
  }

  const remainder = match ? raw.replace(PWD_RE, '') : raw;
  const opts = {};
  for (const part of remainder.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (!key || !value) continue;
    const mapped = BOOL_MAP[value.toLowerCase()];
    opts[key] = BOOL_KEYS.has(key) && mapped !== undefined ? mapped : value;
  }

  const hostPort = String(opts.server || opts['data source'] || '').split(',');
  const config = {
    server: hostPort[0].trim(),
    port: hostPort[1] ? Number(hostPort[1].trim()) : 1433,
    database: process.env.SQL_DATABASE || opts.database || opts['initial catalog'],
    user: opts.uid || opts['user id'] || opts.user,
    password,
    options: {
      encrypt: opts.encrypt !== undefined ? opts.encrypt : true,
      trustServerCertificate: opts.trustservercertificate === true,
    },
    connectionTimeout: Number(opts['connection timeout'] || 30) * 1000,
    requestTimeout: 180000,
  };
  if (!config.server) throw new Error('No server found in the connection string');
  if (!config.database) throw new Error('No database found in the connection string');
  if (!config.user) throw new Error('No user found in the connection string');
  return config;
}

/**
 * Load rule definitions: one YAML file per table in dq_rules/.
 */
function loadRules(tableFilter) {
  const files = fs.readdirSync(RULES_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
    .map((f) => path.join(RULES_DIR, f));

  const tables = [];
  for (const file of files) {
    const doc = YAML.parse(fs.readFileSync(file, 'utf8'));
    if (!doc || !doc.table) continue;
    tables.push({ file, ...doc });
  }

  const filtered = tableFilter
    ? tables.filter((t) => t.table.name === tableFilter || t.table.source === tableFilter)
    : tables;
  if (!filtered.length) {
    throw new Error(
      `No rules found${tableFilter ? ` for table '${tableFilter}'` : ''} in ${RULES_DIR}`,
    );
  }
  return filtered;
}

module.exports = {
  loadEnv, buildConfig, loadRules, RULES_DIR,
};
