import { spawn } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outputRoot = resolve(root, '.artifacts/frameworks');
const galleryOutput = resolve(root, 'dist');
const frameworks = ['ts', 'react', 'vue', 'angular'];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const framework of frameworks) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      'pnpm',
      ['exec', 'vite', 'build', '--mode', framework, '--outDir', `.artifacts/frameworks/${framework}`],
      { cwd: root, stdio: 'inherit' },
    );
    child.once('error', rejectRun);
    child.once('exit', (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`${framework} build failed with ${code}`)));
  });
}

await rm(galleryOutput, { recursive: true, force: true });
await cp(resolve(outputRoot, 'ts'), galleryOutput, { recursive: true });
