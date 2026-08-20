/**
 * 解析发布版本号（build / release 两个 job 共用）。
 *
 * 版本号判定优先级：
 *  1. workflow_dispatch 手动输入的 INPUT_VERSION
 *  2. 推送的 v* tag（GITHUB_REF_NAME 去掉 v 前缀）
 *  3. push 到 main：`<package.json 主版本>-rc.<run_number>`（每次运行唯一）
 *  4. 缺省回退到 package.json 的 version
 *  （release job 无 INPUT_VERSION/tag/main 时，从 ARTIFACTS_DIR 下的产物文件名提取）
 *
 * 行为：
 *  - 若 GITHUB_OUTPUT 已设置，追加 `version=<v>` 供后续 step 使用
 *  - 若 SYNC_PKG_VERSION=1，则同步写入 package.json（build job 打包前调用）
 *
 * 用法（build job 内）：
 *   tsx scripts/release/version.ts
 *   VERSION=$(cat "$GITHUB_OUTPUT" | grep '^version=' | cut -d= -f2)
 */
import { execSync } from 'node:child_process';
import { appendFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const inputVersion = process.env.INPUT_VERSION ?? '';
const refName = process.env.GITHUB_REF_NAME ?? '';
const eventName = process.env.GITHUB_EVENT_NAME ?? '';
const runNumber = process.env.GITHUB_RUN_NUMBER ?? '';
const outputFile = process.env.GITHUB_OUTPUT ?? '';
const syncPkg = process.env.SYNC_PKG_VERSION === '1';
const artifactsDir = process.env.ARTIFACTS_DIR ?? '';

const pkgVersion: string = require('../../package.json').version;

function fromArtifacts(): string {
  const name = readdirSync(artifactsDir)
    .map((f) => f.match(/(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/)?.[1])
    .find(Boolean);
  return name ?? pkgVersion;
}

function resolve(): string {
  let ver = inputVersion;
  if (!ver && refName.startsWith('v')) ver = refName.slice(1);
  if (!ver && eventName === 'push' && refName === 'main') {
    ver = `${pkgVersion.split('-')[0]}-rc.${runNumber}`;
  }
  if (!ver && artifactsDir) ver = fromArtifacts();
  if (!ver) ver = pkgVersion;
  return ver.replace(/^v/, '');
}

const version = resolve();

if (outputFile) {
  appendFileSync(outputFile, `version=${version}\n`);
}

if (syncPkg) {
  execSync(`npm version "${version}" --no-git-tag-version`, { stdio: 'inherit' });
}

console.log(`version=${version}`);
