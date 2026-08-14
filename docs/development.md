# 本地开发

本文档说明 dsh-coding 的本地开发与验证。打包与发布见 [packaging.md](packaging.md)，配置与定制见 [configuration.md](configuration.md)。

## 环境要求

- [mise](https://mise.jdx.dev/)（管理全部工具版本，仓库自带 [mise.toml](../mise.toml)）
- `go`（构建 Wails 壳）
- `node`
- `pnpm`（安装依赖与 SEA 打包）

工具链安装（仓库根执行）：

```sh
mise install     # 按 mise.toml 安装 go / node / pnpm 与 desktop 工具编译版
```

`deepseek-harness-desktop` 由 mise 经 **`github:` 后端安装语义化版本**（[mise.toml](../mise.toml) 指定，如 `v0.0.3`；`minimum_release_age = '0'` 关闭发布年龄过滤），不在本地编译。

- 本地 `just dev` 可直接使用（不依赖源码）；`just bundle` 需要 desktop 工具源码树与 `DSH_DESKTOP_ROOT` 环境变量（bundle 内部用源码 `go build ./internal/shell` 编译 Wails 壳），见 [packaging.md](packaging.md#打包)。

运行时的 LLM 凭据（`DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`）见下文[环境变量](#环境变量)。

## 安装依赖

```sh
pnpm install
```

`pnpm-workspace.yaml` 的 `nodeLinker: hoisted` 保证扁平闭包、`autoInstallPeers` 保证 dsh 核心 peer 依赖完整——这两点是 SEA 打包的前提（闭包缺 peer 依赖会在产物里留下裸包名 import，启动即崩）。原生模块的构建脚本在 `allowBuilds` 中显式放行（pnpm 11 默认不跑依赖构建脚本）。

## 常用命令

| 命令 | 用途 |
|---|---|
| `just dev` | 本地运行：起 `dsh web` 并打开浏览器（Ctrl+C 退出） |
| `just plugin add <package...>` | 向工作区加插件（代理 `dsh plugin add`，自动 reconcile `dsh.profile.bundles`） |
| `just dep` | `pnpm install` |
| `just clean` | 删除 `node_modules` |

打包命令（`just bundle`）见 [packaging.md](packaging.md#打包)。

## 本地运行

```sh
just dev                 # 等价 deepseek-harness-desktop dev .
```

`dev` 固定 DSH_HOME 为 `xdg.DataHome/<name>`（本发行版 `name` 为 `dsh-coding`，即 `~/Library/Application Support/dsh-coding` / `~/.local/share/dsh-coding`），`profiles/web` 符号链接指向工作区，再起 `dsh web` 并打开浏览器（Ctrl+C 退出）。后端端口由 OS 分配（`dsh web --port 0`），`dev` 不接受额外参数透传；需要固定端口时改用官方 dsh 流程（`dsh web --port 8080`）。

## 先验证，再打包

工作区本身就是可安装、可验证的单元，建议先用官方 dsh 流程跑通，再 `bundle`：

```sh
pnpm install
# bundles 已声明时无需再 add；以下仅为演示官方插件流程
./node_modules/.bin/dsh plugin --profile web add @morlay/session-persistence-rdb
# 用工作区 patch 跑官方 web（DSH_HOME 可用任意目录验证；下面用与桌面一致的 xdg home）
DSH_HOME=$XDG_DATA_HOME/dsh-coding ./node_modules/.bin/dsh web --patch ./cordis.patch.yml
```

patch 与插件组合确认可用后，`bundle` 只是把它包装为桌面应用（复用工作区已安装的闭包，不重复安装），见 [packaging.md](packaging.md)。

## 环境变量

- 构建期：`DSH_DESKTOP_ROOT`（desktop 工具仓库根，`bundle` 编译 Wails 壳需要）
- 运行时（壳）：`DSH_APP_DSH_HOME`（显式覆盖 DSH_HOME，开发/测试用）、`DSH_APP_WORKSPACE`（工作目录，默认用户主目录）、`DSH_APP_PORT`（后端端口，默认 `0` 由 OS 分配）
- 透传给后端：`DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`（LLM 凭据，Unix 上启动前按 `$SHELL` source 用户 shell 配置继承）
