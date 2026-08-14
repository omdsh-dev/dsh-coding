# 开发与发布

本文档说明 dsh-coding 的本地开发、验证、打包与发布流程。配置与定制见 [configuration.md](configuration.md)。

## 环境要求

- [mise](https://mise.jdx.dev/)（管理全部工具版本，仓库自带 [mise.toml](../mise.toml)）
- `go`（构建 Wails 壳）
- `node`
- `pnpm`（安装依赖与 SEA 打包）

工具链安装（仓库根执行）：

```sh
mise install     # 安装 mise.toml 声明的全部工具
```

`deepseek-harness-desktop` 由 mise 通过 **ubi 后端安装 GitHub Release 编译版**（tag: `latest`），不在本地编译。两个已知要点：

- 不要用 `github:` 后端（`mise install github:omdsh-dev/deepseek-harness-desktop` 会失败）——该 release 的 tag 是 `latest` 非语义化版本，被 mise 的版本过滤拒绝；ubi 后端不受此限。
- 本地 `just dev` 可直接使用（不依赖源码）；`just bundle` 需要 desktop 工具源码树与 `DSH_DESKTOP_ROOT` 环境变量——bundle 内部用源码 `go build ./internal/shell` 编译 Wails 壳（CLI 是编译版，但壳必须在目标平台本机构建），见下文[打包](#打包)。

运行时的 LLM 凭据（`DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`）见下文[环境变量](#环境变量)。

## 安装依赖

```sh
pnpm install
```

`pnpm-workspace.yaml` 的 `nodeLinker: hoisted` 保证扁平闭包、`autoInstallPeers` 保证 dsh 核心 peer 依赖完整——这两点是 SEA 打包的前提（闭包缺 peer 依赖会在产物里留下裸包名 import，启动即崩）。原生模块的构建脚本在 `allowBuilds` 中显式放行（pnpm 11 默认不跑依赖构建脚本）。

## 本地运行

```sh
just dev                 # 等价 deepseek-harness-desktop dev .
```

`dev` 固定 DSH_HOME 为 `xdg.DataHome/<name>`（本发行版 `name` 为 `dsh-coding`，即 `~/Library/Application Support/dsh-coding` / `~/.local/share/dsh-coding`），`profiles/web` 符号链接指向工作区，再起 `dsh web` 并打开浏览器（Ctrl+C 退出）。后端端口由 OS 分配（`dsh web --port 0`），`dev` 不接受额外参数透传；需要固定端口时改用下方官方 dsh 流程（`dsh web --port 8080`）。

## 先验证，再打包

工作区本身就是可安装、可验证的单元，建议先用官方 dsh 流程跑通，再 `bundle`：

```sh
pnpm install
# bundles 已声明时无需再 add；以下仅为演示官方插件流程
./node_modules/.bin/dsh plugin --profile web add @morlay/session-persistence-rdb
# 用工作区 patch 跑官方 web（DSH_HOME 可用任意目录验证；下面用与桌面一致的 xdg home）
DSH_HOME=$XDG_DATA_HOME/dsh-coding ./node_modules/.bin/dsh web --patch ./cordis.patch.yml
```

patch 与插件组合确认可用后，`bundle` 只是把它包装为桌面应用（复用工作区已安装的闭包，不重复安装）。

## 打包

```sh
export DSH_DESKTOP_ROOT=/path/to/deepseek-harness-desktop   # 源码树（bundle 编译 Wails 壳需要）
just bundle                # 增量打包（基于工作区内容 hash，输入无变化时复用上次产物）
just bundle --force        # 忽略缓存，全新打包
just bundle --install      # 打包并安装到当前平台
```

> `DSH_DESKTOP_ROOT` 指向 desktop 工具源码 checkout：bundle 在源码树内 `go build ./internal/shell` 编译 Wails 壳（CLI 用 release 编译版，但壳必须在目标平台本机构建，这是 desktop 工具的设计）。产物输出到**工作区** `target/` 下。

> 产物目录（`target/`）与 pnpm store（`.store/`）已写入本仓库 [.gitignore](../.gitignore)：工具遵循工作区 `.gitignore` 排除被忽略内容（增量 hash 与 DSH_HOME 种子），不硬编码目录名。子目录 `.gitignore` 同样生效。

> 注意：`just` 会把 `bundle` 之后的参数原样传给 `deepseek-harness-desktop bundle`，不要加 `--` 分隔（`just bundle -- --force` 会把 `--` 当成工作区路径）。

`--platform=os/arch` 仅用于显式声明并校验目标平台；SEA 与 Wails 壳均**不支持交叉编译**，只能打包本机平台。

产物在工作区 `target/` 下：

| 平台 | 产物 |
|---|---|
| macOS | `target/<name>/<Name>.app`（Info.plist、icns） |
| Linux | `target/<name>/linux/<Name>/` + `tar.gz`（hicolor 图标集） |
| Windows | `target/<name>/windows/<Name>/` + `zip`（ico） |

`--install` 安装位置：macOS `/Applications`、Linux XDG data + `.desktop`、Windows `%LOCALAPPDATA%\Programs`。

图标渲染不依赖外部工具：SVG 源（本发行版 `assets/icon.svg`）用纯 Go 渲染为白底图，按平台尺寸缩放，macOS icns 用系统 `iconutil` 打包。

## 产物架构

桌面应用由三层组成（详见 [deepseek-harness-desktop 的架构文档](https://github.com/omdsh-dev/deepseek-harness-desktop/blob/main/docs/architecture.md)）：

| 层 | 产物 | 职责 |
|---|---|---|
| 壳 | `dsh-shell`（Wails v3，Go） | 原生窗口 + WebView；后端进程守护（启动/就绪/退避重启/退出清理） |
| 后端 | `dsh-server`（SEA，内嵌 node 的 `dsh --profile web`） | 跑 dsh 的 cordis 插件树，HTTP 伺服前端与 API |
| 前端 | dsh 内置 web 前端（`@deepseek-ai/dsh-web-app`） | 浏览器 UI，由后端经 HTTP 伺服，WebView 加载 |

关键约束：cordis 插件树只能在 node 上运行，因此用 SEA 内嵌 node（用户无需安装 node）；`dsh web` 以 HTTP 伺服前端与 API，壳的 WebView 加载 `http://127.0.0.1:<port>`（端口由 OS 分配）。

## 环境变量

- 构建期：`DSH_DESKTOP_ROOT`（desktop 工具仓库根；`go install` 到 PATH 后使用）
- 运行时（壳）：`DSH_APP_DSH_HOME`（显式覆盖 DSH_HOME，开发/测试用）、`DSH_APP_WORKSPACE`（工作目录，默认用户主目录）、`DSH_APP_PORT`（后端端口，默认 `0` 由 OS 分配）
- 透传给后端：`DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`（LLM 凭据，Unix 上启动前按 `$SHELL` source 用户 shell 配置继承）

## 发布

### GitHub Actions 自动发布（推荐）

[.github/workflows/release.yml](../.github/workflows/release.yml) 负责四平台（macOS x64 / arm64、Linux、Windows）打包并发布 GitHub Release（pre-release）：

- **触发**：
  - 推送到 `main` 分支：**自动**发布 pre-release，版本号 `<package.json version 主版本>-rc.<run>`（如 `0.1.0-rc.7`，每次运行唯一，不覆盖历史）；
  - 手动：Actions 页面 Run workflow，可选填版本号（如 `v0.1.0-rc.1`，缺省用 package.json 的 version）；
  - 推送 `v*` tag（`git tag v0.1.0-rc.1 && git push origin v0.1.0-rc.1`）。
- **行为**：四个构建（macOS x64 `macos-15-intel`、macOS arm64 `macos-latest`、Linux、Windows）各自执行 `bundle --force`（desktop 工具不支持交叉编译，必须本机平台打包）。CLI 直接下载 [deepseek-harness-desktop 的 latest release](https://github.com/omdsh-dev/deepseek-harness-desktop/releases/tag/latest) 编译版二进制（不编译 CLI），源码 checkout 仅用于 bundle 内部编译 Wails 壳。产物命名为 `dsh-coding-<version>-<os>-<arch>.tar.gz / .zip`（macOS 的 `.app` 由 ditto 打包为 zip），汇总发布为一个 Release。版本号含 `-` 段（如 `0.1.0-rc.1`）自动标记为 pre-release。
- **版本同步**：发布版本号会写入打包产物的 app 版本（bundle 读取 package.json 的 version，workflow 在打包前自动同步）。
- **前置**：仓库 Settings → Secrets and variables → Actions 配置 `GH_NPM_TOKEN`（PAT，`read:packages` 权限，用于 `@morlay` GitHub Packages 认证）。**必须配置**：`@morlay` 的包与仓库跨账号，workflow 未检测到该 secret 时会直接报错退出（不再回退 `GITHUB_TOKEN`——它对跨账号包必然 403）。
- **Linux 系统依赖**：workflow 已内置安装 Wails gtk4 路径所需的系统包（`libgtk-4-dev`、`libwebkitgtk-6.0-dev`、`libsoup-3.0-dev` 等），本地手动构建 Linux 需自行安装。

#### CI 报 403（ERR_PNPM_FETCH_403）

`pnpm install` 拉取 `@morlay/session-persistence-rdb` 时 `403 Forbidden`，日志里 `_authToken=ghs_...`：

- **为什么公开包也要认证**：GitHub Packages 的 npm registry 属于"拉取必须认证"的 registry——官方文档明确：`to pull a package, you must authenticate with a personal access token or GITHUB_TOKEN, regardless of whether the package is public or private`（只有 Container registry 的公开包允许匿名）。
- **为什么 GITHUB_TOKEN 会 403**：`ghs_` 前缀是 Actions 内置的 `GITHUB_TOKEN`。它只能访问**当前仓库所属账号**发布的包（官方文档：`To install packages associated with other ... repositories that GITHUB_TOKEN can't access, use a personal access token (classic)`）。`@morlay` 的包发布在 morlay 账号下，与 dsh-coding 仓库（omdsh-dev 组织）跨账号，因此即使包是 public 也返回 403。

修复步骤：

1. 生成 PAT：GitHub → Settings → Developer settings → Personal access tokens（Fine-grained 或 classic），勾选 `read:packages`；
2. 仓库 Settings → Secrets and variables → Actions → **New repository secret**，名称 `GH_NPM_TOKEN`，值粘贴该 PAT（`ghp_` 开头）；
3. Actions 页面 Re-run 该 workflow。若日志出现 `GH_NPM_TOKEN 未配置` 的 error，说明 secret 没生效——确认 secret 名称拼写（`GH_NPM_TOKEN`）、以及 workflow 已 push 到当前分支（CI 运行的是远程代码，本地 commit 不影响）。

> 若 `dsh-coding` 仓库与包同属一个账号（如都发布在 morlay 个人账号下），`GITHUB_TOKEN` 即可直接使用；workflow 注释里说明了改回 `secrets.GH_NPM_TOKEN || secrets.GITHUB_TOKEN` 的方法。

### 手动打包分发

1. 在目标平台机器上执行 `just bundle --install`（或 `deepseek-harness-desktop bundle --install .`）本地安装；
2. 分发 `target/` 下对应平台的产物（macOS `.app`、Linux `tar.gz`、Windows `zip`）给最终用户。

发布前建议：

- 按 [configuration.md](configuration.md) 核对 `dsh.desktop`（id / window / icon / dshHome）与 bundles 组合；
- 用 `just clean && just dep` 做一次干净安装，再 `just bundle --force` 全量打包，避免增量缓存掩盖缺失依赖。
