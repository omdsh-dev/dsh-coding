/**
 * 整理 build job 的 bundle 产物（压缩 / 重命名），统一到 `<target>/<name>/` 根目录。
 *
 * bundle 产物（desktop 工具 v0.2+ 输出到工作区 target/）：
 *  - macOS：`target/<name>/<Name>.app`，需 ditto 打包为 zip（保留资源叉与符号链接）
 *  - Linux：`target/<name>/linux/<Name>.tar.gz`，重命名后移到根
 *  - Windows：`target/<name>/windows/<Name>.zip`，重命名后移到根
 *
 * 命名规范：`<name>-<version>-<os>-<arch>.zip / .tar.gz`
 *
 * 环境变量：PLATFORM（macos|linux|windows）、VERSION、RUNNER_ARCH（X64|ARM64）、WORKSPACE
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const platform = process.env.PLATFORM ?? '';
const version = process.env.VERSION ?? '';
const runnerArch = (process.env.RUNNER_ARCH ?? 'x64').toLowerCase();
const workspace = process.env.WORKSPACE ?? '';

if (!platform || !version || !workspace) {
  throw new Error(`缺少环境变量 platform/version/workspace：platform=${platform} version=${version} workspace=${workspace}`);
}

const targetDir = join(workspace, 'target', 'dsh-coding');
const outName = `dsh-coding-${version}-${platform}-${runnerArch}`;

function run(cmd: string, args: string[]) {
  execFileSync(cmd, args, { cwd: targetDir, stdio: 'inherit' });
}

if (platform === 'macos') {
  // .app 在 target/<name>/ 根；ditto 打包为 zip
  const appDir = join(targetDir, 'dsh-coding.app');
  if (!existsSync(appDir)) throw new Error(`缺少产物：${appDir}`);
  run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', 'dsh-coding.app', `${outName}.zip`]);
} else {
  // linux / windows：产物在 <os>/ 子目录，重命名后移到根
  const sub = join(targetDir, platform);
  const ext = platform === 'linux' ? 'tar.gz' : 'zip';
  const src = join(sub, `dsh-coding.${ext}`);
  if (!existsSync(src)) throw new Error(`缺少产物：${src}`);
  renameSync(src, join(targetDir, `${outName}.${ext}`));
}

const produced = readdirSync(targetDir).filter((f) => f.startsWith(`dsh-coding-${version}-`));
console.log(`产物：\n${produced.join('\n')}`);
