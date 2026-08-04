const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const compose = ['compose', '--project-name', 'acoreai-e2e', '--file', 'docker-compose.test.yml'];
const result = spawnSync(
  'docker',
  [...compose, 'up', '--build', '--abort-on-container-exit', '--exit-code-from', 'e2e', 'e2e'],
  { cwd: rootDir, stdio: 'inherit' },
);

spawnSync('docker', [...compose, 'down'], { cwd: rootDir, stdio: 'inherit' });
process.exit(result.status ?? 1);
