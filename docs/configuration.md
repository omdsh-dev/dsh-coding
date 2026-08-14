# 配置与定制

本文档说明 dsh-coding 发行版的分层配置、会话持久化、插件管理与定制方式。桌面打包相关的安装工程见 [development.md](development.md)。

## 配置分层（patch 合成）

dsh 的 cordis 配置是分层 patch 合成，从空根按序叠加：

1. `dsh.profile.bundles` 中每个 bundle 包自带的 patch 层（顺序即 `package.json` 中的声明顺序）；
2. 工作区 `cordis.patch.yml`（本发行版的用户层）；
3. 用户级 `$DSH_HOME/cordis.patch.yml`（运行时 DSH_HOME 中）；
4. `--patch` 覆盖层。

`bundle` / `dev` / `plugin` 只负责安装、打包与分发，不修改任何 patch 语义。

本发行版 `package.json` 的 bundle 顺序：

```json
"dsh": {
  "profile": {
    "bundles": [
      "@deepseek-ai/dsh-base",
      "@deepseek-ai/dsh-web-app",
      "@morlay/session-persistence-rdb",
      "dsh-message-edit",
      "dsh-better-sidebar"
    ]
  }
}
```

- `@deepseek-ai/dsh-base`：共享 dsh 核心——插入基础插件行：模型适配器、`agent-default-model` 选择、工具、持久化、策略、settings / credentials、遥测与宿主级 subagent provider。
- `@deepseek-ai/dsh-web-app`：Web 表层（webserver、API 网关、workspace、投影缓存、存储、浏览器插件名录与 HMR 链）。
- `@morlay/session-persistence-rdb`：RDB 会话持久化后端。
- `dsh-message-edit`：消息编辑、重生成、重试与 Timeline 版本导航（浏览器插件注入）。
- `dsh-better-sidebar`：增强侧边栏工作台（浏览器插件注入）。

## 会话持久化（session-persistence-rdb）

本发行版**禁用**了内置的 JSONL 会话持久化（见 [cordis.patch.yml](../cordis.patch.yml)），改用 `@morlay/session-persistence-rdb` 的 RDB 后端（`ctx.sessionPersistence`，drizzle 实现，复用上游 `PersistenceCoordinator` 与契约测试套件）。

配置写在运行时 DSH_HOME 的 `settings.yaml`，namespace 为插件短名 `session-persistence-rdb`：

```yaml
# SQLite（默认）
session-persistence-rdb:
  type: sqlite
  # path 省略时回落 $DSH_HOME/sessions/sessions.sqlite（bundle patch 的 !!js 表达式求值）
  # 自定义路径请用绝对路径字符串
  path: /absolute/path/to/sessions.sqlite
  journalMode: wal          # wal（默认）/ delete / truncate / persist
  busyTimeout: 5000         # 写锁竞争等待毫秒数（默认 5000）
```

```yaml
# PostgreSQL
session-persistence-rdb:
  type: postgres
  connectionString: postgres://user:pass@localhost:5432/sessions
```

字段即 Config 判别联合；未写出的字段回落到 bundle patch / cordis.yml 的 config 默认值。

> **注意**：`settings.yaml` 是纯 YAML（`yaml` 库解析），**不支持 `!!js` JS 表达式**——`!!js dshHomePath(...)` 会被当作字面字符串。`!!js` 只在 `cordis.patch.yml`（bundle patch 层，loader 求值）有效。

## patch 层（cordis.patch.yml）

工作区的 `cordis.patch.yml` 是顶层 YAML 数组，每一项是 loader patch 条目：以 `id` 定位目标（配置覆盖、`disabled: true` 禁用、insert 列表），允许 `!!js` 表达式。

本发行版当前内容：

```yaml
# 禁用内置 JSONL 会话持久化（改用 session-persistence-rdb）
- id: session-persistence-jsonl
  disabled: true
```

修改后无需重新打包即可在 `dev` 模式生效；桌面产物需重新 `bundle`。

## 插件管理

`just plugin add <package...>`（等价 `deepseek-harness-desktop plugin add`，可加 `--workspace=<path>` 指定工作区）代理官方 `dsh plugin add`：

1. 在工作区跑 `pnpm add`；
2. 依赖中声明 `dsh.bundle`（自带 patch 层）的包自动 reconcile 进 `dsh.profile.bundles`；被移除 / 失去声明的包自动出层。

只改工作区，不安装到全局 `~/.dsh`。

```sh
just plugin add @foo/bar                      # 默认当前目录为工作区
deepseek-harness-desktop plugin add --workspace /path/to/dsh-coding @foo/bar
```

GitHub Packages 的包需要 registry 认证：本工作区 `.npmrc` 已把 `@morlay` scope 映射到 `https://npm.pkg.github.com/`，但你本地的 GitHub token 需自行提供（如 `//npm.pkg.github.com/:_authToken=<token>`），否则 `pnpm install` / `plugin add` 对 `@morlay/*` 包会认证失败（GitHub Packages 公开包同样要求认证）。

## 桌面配置（dsh.desktop）

`package.json` 的 `dsh.desktop` 字段：

| 字段 | 说明 |
|---|---|
| `id` | bundle 标识（macOS CFBundleIdentifier；缺省由 name 派生）。本发行版为 `ai.deepseek.dsh.coding` |
| `window` | 窗口几何（缺省 1280×800，最小 800×600） |
| `icon` | 相对工作区的图标源（SVG 或 PNG），本发行版为 `assets/icon.svg` |
| `dshHome` | 运行时 DSH_HOME 策略：`xdg`（缺省）— `xdg.DataHome/<name>`；`env` — 继承环境（`$DSH_HOME` 或 `~/.dsh`）；绝对路径 — 固定该路径 |

`dshHome: xdg` 时，应用内置 dsh-home 种子，首次启动把缺失部分拷贝进 `xdg.DataHome/<name>`（`name` 即 package.json 的 `name`，本发行版为 `dsh-coding`：macOS `~/Library/Application Support/dsh-coding`、Linux `~/.local/share/dsh-coding`），之后读写都在拷贝上，与 `dev` 的运行时 home 一致，完全独立、不污染 `~/.dsh`。

## 安装工程文件（pnpm-workspace.yaml）

```yaml
nodeLinker: hoisted        # 扁平闭包，供 SEA 打包直接复制
autoInstallPeers: true     # dsh-app-boot 等核心包把运行时必需依赖声明为 peerDependencies，
                           # 闭包缺它们时 SEA 打包会留下裸包名 import，启动即崩
allowBuilds: ...           # pnpm 11 默认不跑依赖构建脚本，原生模块在此显式放行
minimumReleaseAge: 0       # 关闭 pnpm 的发布年龄检查（社区发行版直接全局关闭，
                           # 不必维护 minimumReleaseAgeExclude 长列表）
```

`allowBuilds` 放行的原生模块：`@deepseek-ai/dsh-subprocess-local`、`@google/genai`、`esbuild`、`koffi`、`node-pty`、`protobufjs`。
