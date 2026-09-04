import { accessSync, constants } from 'node:fs';
import { delimiter, isAbsolute, resolve } from 'node:path';

function resolvePnpmFromPath(env, cwd) {
  const pathValue = env.PATH ?? env.Path;
  if (!pathValue) return undefined;

  const executableNames = process.platform === 'win32'
    ? ['pnpm.cmd', 'pnpm.exe', 'pnpm']
    : ['pnpm'];

  for (const pathEntry of pathValue.split(delimiter)) {
    if (!pathEntry) continue;
    const directory = isAbsolute(pathEntry) ? pathEntry : resolve(cwd, pathEntry);
    for (const executableName of executableNames) {
      const candidate = resolve(directory, executableName);
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        // Keep searching the remaining PATH entries.
      }
    }
  }

  return undefined;
}

export function resolvePnpmCommand(args, env = process.env, cwd = process.cwd()) {
  const pnpmEntrypoint = env.npm_execpath?.trim();
  if (!pnpmEntrypoint) {
    return { command: resolvePnpmFromPath(env, cwd) ?? 'pnpm', args };
  }

  return {
    command: env.npm_node_execpath?.trim() || process.execPath,
    args: [pnpmEntrypoint, ...args],
  };
}
