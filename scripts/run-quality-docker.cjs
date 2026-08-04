const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const compose = ['compose', '--project-name', 'acoreai-qa', '--file', 'docker-compose.test.yml'];
const result = spawnSync(
  'docker',
  [...compose, 'up', '--build', '--abort-on-container-exit', '--exit-code-from', 'qa', 'qa'],
  { cwd: rootDir, stdio: 'inherit' },
);

spawnSync('docker', [...compose, 'down'], { cwd: rootDir, stdio: 'inherit' });
process.exit(result.status ?? 1);
