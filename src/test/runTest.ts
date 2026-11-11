import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runTests } from '@vscode/test-electron';

// VS Code creates its IPC socket (e.g. `1.14-main.sock`) inside the user data
// dir, and Unix socket paths are capped at 103 chars on macOS. Deep checkouts
// such as git worktrees overflow that with test-electron's default
// `.vscode-test/user-data`, so fall back to a short, per-run temp dir there.
const MAX_SOCKET_PATH_LENGTH = 103;

function shortUserDataDirIfNeeded(): string | undefined {
  if (process.platform === 'win32') {
    return undefined;
  }
  const defaultSocketPath = path.resolve(process.cwd(), '.vscode-test', 'user-data', '1.xx-main.sock');
  if (defaultSocketPath.length <= MAX_SOCKET_PATH_LENGTH) {
    return undefined;
  }
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cm-vscode-'));
}

async function main(): Promise<void> {
  const userDataDir = shortUserDataDirIfNeeded();
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../..');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');
    const testWorkspace = path.resolve(__dirname, '../../test-fixtures');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      extensionTestsEnv: {
        VISUAL_REGRESSION: process.env.VISUAL_REGRESSION ?? '',
      },
      launchArgs: [
        testWorkspace,
        '--disable-extensions',
        ...(userDataDir ? [`--user-data-dir=${userDataDir}`] : []),
      ],
    });
  } catch (error) {
    console.error('Failed to run tests');
    throw error;
  } finally {
    if (userDataDir) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  }
}

void main();
