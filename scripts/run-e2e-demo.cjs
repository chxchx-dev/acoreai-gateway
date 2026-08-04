const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir);
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

const pnpmCommand = 'pnpm';
const runningInDocker = process.argv.includes('--docker') || process.env.E2E_DOCKER === 'true';
const runAllTests = process.argv.includes('--all');

function run(command, args, env = process.env) {
  execFileSync(command, args, {
    cwd: rootDir,
    env,
    shell: command === pnpmCommand && process.platform === 'win32',
    stdio: 'inherit',
  });
}

function succeeds(command, args, env = process.env) {
  try {
    execFileSync(command, args, { cwd: rootDir, env, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function waitForCommand(label, command, args, env = process.env, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  process.stdout.write(`Waiting for ${label}`);

  while (Date.now() < deadline) {
    if (succeeds(command, args, env)) {
      process.stdout.write(' ready\n');
      return;
    }
    process.stdout.write('.');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
  }

  process.stdout.write('\n');
  throw new Error(`Timed out waiting for ${label}`);
}

function waitForService(label, args, timeoutMs = 90000) {
  waitForCommand(label, 'docker', ['compose', 'exec', '-T', ...args], process.env, timeoutMs);
}

function testDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be configured in .env');
  }

  const url = new URL(process.env.DATABASE_URL);
  url.hostname = runningInDocker ? 'postgres' : 'localhost';
  url.port = '5438';
  url.pathname = '/acoreai_ai_test';
  return url.toString();
}

function testMongoUrl() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured in .env');
  }

  const url = new URL(process.env.MONGODB_URI);
  url.hostname = runningInDocker ? 'mongodb' : 'localhost';
  url.port = runningInDocker ? '27017' : '27018';
  url.pathname = '/acoreai_ai_gateway_test';
  return url.toString();
}

function resetTestDatabase() {
  if (runningInDocker) {
    run('sh', [
      '-c',
      'dropdb --if-exists -h postgres -p 5438 -U "$POSTGRES_USER" acoreai_ai_test && createdb -h postgres -p 5438 -U "$POSTGRES_USER" acoreai_ai_test',
    ], { ...process.env, PGPASSWORD: process.env.POSTGRES_PASSWORD });
    return;
  }

  run('docker', [
    'compose',
    'exec',
    '-T',
    'postgres',
    'sh',
    '-c',
    'dropdb --if-exists -p 5438 -U "$POSTGRES_USER" acoreai_ai_test && createdb -p 5438 -U "$POSTGRES_USER" acoreai_ai_test',
  ]);
}

function applyLocalMigrations() {
  const migrationsDir = path.join(rootDir, 'prisma', 'migrations');
  const migrations = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migration of migrations) {
    const sqlPath = path.join(migrationsDir, migration, 'migration.sql');
    process.stdout.write(`Applying ${migration}\n`);
    const command = runningInDocker ? 'psql' : 'docker';
    const args = runningInDocker
      ? ['-v', 'ON_ERROR_STOP=1', '-h', 'postgres', '-U', process.env.POSTGRES_USER, '-p', '5438', '-d', 'acoreai_ai_test']
      : [
          'compose',
          'exec',
          '-T',
          'postgres',
          'sh',
          '-c',
          'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -p 5438 -d acoreai_ai_test',
        ];
    execFileSync(command, args,
      {
        cwd: rootDir,
        env: runningInDocker
          ? { ...process.env, PGPASSWORD: process.env.POSTGRES_PASSWORD }
          : process.env,
        input: fs.readFileSync(sqlPath),
        stdio: ['pipe', 'inherit', 'inherit'],
      },
    );
  }
}

if (runningInDocker) {
  waitForCommand('PostgreSQL', 'pg_isready', [
    '-h',
    'postgres',
    '-U',
    process.env.POSTGRES_USER,
    '-d',
    process.env.POSTGRES_DB,
    '-p',
    '5438',
  ]);
  waitForCommand(
    'MongoDB',
    'node',
    [
      '-e',
      "const { MongoClient } = require('mongodb'); const client = new MongoClient(process.env.MONGODB_URI); client.connect().then(() => client.close()).catch(() => process.exit(1));",
    ],
    { ...process.env, MONGODB_URI: testMongoUrl() },
  );
} else {
  run('docker', ['compose', 'up', '-d', 'postgres', 'mongodb']);
  waitForService('PostgreSQL', [
    'postgres',
    'sh',
    '-c',
    'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -p 5438',
  ]);
  waitForService('MongoDB', ['mongodb', 'mongosh', '--quiet', '--eval', "db.adminCommand('ping').ok"]);
}

resetTestDatabase();
applyLocalMigrations();

const testEnv = {
  ...process.env,
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DOTENV_CONFIG_QUIET: 'true',
  DATABASE_URL: testDatabaseUrl(),
  MONGODB_URI: testMongoUrl(),
  MONGODB_DB: 'acoreai_ai_gateway_test',
};

const testArgs = runAllTests
  ? ['exec', 'jest', '--runInBand']
  : ['exec', 'jest', '--runInBand', '--runTestsByPath', 'test/e2e/core-flow.e2e.spec.ts'];
run(pnpmCommand, testArgs, testEnv);
