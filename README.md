# dsh-coding

基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的**社区编码发行版**：把 `dsh --profile web` 与工作区的 `cordis.patch.yml` 打包为独立桌面应用，开箱即用的本地编码助手。

本仓库是 [deepseek-harness-desktop](https://github.com/omdsh-dev/deepseek-harness-desktop) 的工作区（workspace），在官方 `dsh-base` + `dsh-web-app` 之上叠加了社区组件：

- `@morlay/session-persistence-rdb` —— RDB（SQLite / PostgreSQL）会话持久化，替换内置 JSONL 存储（发布在 GitHub Packages `@morlay` registry）；
- [dsh-message-edit](https://github.com/Moeblack/dsh-message-edit) —— 消息编辑、重生成、重试与 Timeline 版本分支导航；
- [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) —— 增强侧边栏：文件管理、编辑预览（CodeMirror）、内嵌浏览器、真实终端、Git 面板与后台任务页。

## 特性

- **独立桌面应用**：macOS（`.app`）、Linux（目录 + `tar.gz`）、Windows（目录 + `zip`）。后端用 SEA 内嵌 node，壳用 Wails 原生窗口，**用户无需安装 node**。
- **独立 DSH_HOME**：`dshHome: xdg` 将用户数据隔离在 `xdg.DataHome/<name>`（`name` 即 package.json 的 `name`，本发行版为 `dsh-coding`：macOS 为 `~/Library/Application Support/dsh-coding`，Linux 为 `~/.local/share/dsh-coding`），首次启动自动从应用种子补齐，**不污染 `~/.dsh`**。
- **RDB 会话持久化**：默认 SQLite（WAL 模式），可切换 PostgreSQL；会话数据可靠落盘，替代官方 JSONL 后端。
- **消息可编辑、可重来**：编辑已落定的用户消息与助手回复、从任意回合分支重生成、重试历史回合；Timeline 展示完整版本树，`←` / `→` 撤销与重施加，历史会话始终保留。
- **内置开发工作台**（dsh-better-sidebar）：资源管理器、CodeMirror 编辑与 Office/图片/PDF 内联预览、沙箱内嵌浏览器、xterm 真实终端（可注入 `terminal_*` 工具）、Git 面板（diff/暂存/提交），右侧栏 + 底部面板双工作台。
- **Web 前端**：完整 DSH Web GUI（会话、工具、Trajectory、Skill 等），由本地 HTTP 伺服。

## 快速开始

前置：[mise](https://mise.jdx.dev/)（仓库自带 [mise.toml](mise.toml)，含 `go` / `node` / `pnpm` 与 desktop 工具编译版）。

```sh
# 0. 安装工具链（mise 按 mise.toml 安装；desktop 工具取 GitHub Release 编译版，不本地编译）
mise install

# 1. 安装依赖（工作区闭包落在 node_modules，供 SEA 打包直接复制）
pnpm install

# 2. 本地运行：基于工作区起 dsh web 并打开浏览器（Ctrl+C 退出）
just dev

# 3. 打包当前平台应用（产物在仓库 target/ 下；需先设 DSH_DESKTOP_ROOT 指向 desktop 源码，见 docs）
just bundle
just bundle --install   # 打包并安装（macOS /Applications）
```

`just dev` 等价于 `deepseek-harness-desktop dev .`；`just bundle` 等价于 `deepseek-harness-desktop bundle .`。首次启动后，设置（`settings.yaml`）与会话数据由应用在自己的 DSH_HOME 中生成，不属于工作区。

> 先验证、再打包：工作区本身就是可安装、可验证的单元，可用官方 dsh 流程跑通后再 `bundle`，详见 [docs/development.md](docs/development.md#先验证再打包)。

## 命令一览

| 命令                           | 用途                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `just dev`                     | 基于工作区起 `dsh web` 并打开浏览器（端口由 OS 分配，不接受额外参数）                    |
| `just bundle [args]`           | 打包当前平台应用（基于工作区内容 hash 增量；`--force` 全新打包，`--install` 打包并安装） |
| `just plugin add <package...>` | 向工作区加插件（代理 `dsh plugin add`，自动 reconcile `dsh.profile.bundles`）            |
| `just dep`                     | `pnpm install`                                                                           |
| `just clean`                   | 删除 `node_modules`                                                                      |

`deepseek-harness-desktop` 的完整选项（`--platform`、`--force`、`--install`、`--workspace` 等）见其 [README](https://github.com/omdsh-dev/deepseek-harness-desktop)。

## 配置

运行时配置写在 DSH_HOME 的 `settings.yaml` 中。本发行版的核心配置是会话持久化后端：

```yaml
session-persistence-rdb:
  type: sqlite # 或 postgres
  # path 省略时回落 $DSH_HOME/sessions/sessions.sqlite
  journalMode: wal
  busyTimeout: 5000
```

```yaml
session-persistence-rdb:
  type: postgres
  connectionString: postgres://user:pass@localhost:5432/sessions
```

LLM 凭据沿用 DSH 惯例：`DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`（Unix 上启动前按 `$SHELL` source 用户 shell 配置继承）。

插件增删、patch 层、后端切换等定制方式见 [docs/configuration.md](docs/configuration.md)。

## 目录结构

```text
dsh-coding/
  package.json         工作区配置：dependencies、dsh.profile.bundles、dsh.desktop
  cordis.patch.yml     profile patch 层（禁用内置 JSONL 会话持久化）
  pnpm-workspace.yaml  安装工程（nodeLinker hoisted + autoInstallPeers + allowBuilds）
  .npmrc               registry 映射（@morlay → GitHub Packages）与本地 store
  assets/icon.svg      应用图标
  justfile             常用命令（dev / bundle / plugin / dep / clean）
  mise.toml            工具链声明（mise：go / node / pnpm + desktop 工具编译版）
  docs/                配置与开发文档
  target/              打包产物（bundle 输出到工作区 target/；.gitignore 已忽略）
```

### patch 合成

配置树按序叠加：`dsh.profile.bundles` 中每个 bundle 自带的 patch 层 → 工作区 `cordis.patch.yml` → 用户级 `$DSH_HOME/cordis.patch.yml` → `--patch` 覆盖层。`bundle` 只负责安装、打包与分发，不修改任何 patch 语义。

## 自动发布

仓库自带 GitHub Actions（[.github/workflows/release.yml](.github/workflows/release.yml)）多平台打包发布 pre-release：

- 推送到 `main` 分支自动发布 pre-release（版本 `<pkg-version>-rc.<run>`）；也可手动触发（Actions 页面 Run workflow，可填版本号）或推送 `v*` tag（如 `v0.1.0-rc.1`）；
- 四个构建并行 `bundle --force`（macOS x64 / macOS arm64 / Linux / Windows），产物 `dsh-coding-<version>-<os>-<arch>.tar.gz / .zip` 汇总发布为 GitHub Release；
- 需要配置 `GH_NPM_TOKEN` secret（`read:packages`，用于 `@morlay` GitHub Packages 认证），详见 [docs/development.md](docs/development.md#发布)。

## 文档

- [docs/configuration.md](docs/configuration.md) —— 配置与定制：会话持久化、插件管理、bundle 与 patch 层
- [docs/development.md](docs/development.md) —— 开发与发布：环境、验证、打包、产物、分发

## 相关项目

- [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) —— DeepSeek Harness 官方仓库（DSH 本体）
- [deepseek-harness-desktop](https://github.com/omdsh-dev/deepseek-harness-desktop) —— 把 dsh web profile 打包为桌面应用的 Go 工具
- [@morlay/session-persistence-rdb](https://github.com/morlay/session-persistence-rdb) —— RDB 会话持久化后端（GitHub Packages：`@morlay` scope，需在 `.npmrc` 配置 `//npm.pkg.github.com/:_authToken`）
- [dsh-message-edit](https://github.com/Moeblack/dsh-message-edit) —— 消息编辑与版本分支插件

## 许可

[MIT](LICENSE)
