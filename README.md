# dsh-coding

基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的**社区编码发行版**：把 `dsh --profile web` 与工作区的 `cordis.patch.yml` 打包为独立桌面应用，开箱即用的本地编码助手。

本仓库是 [deepseek-harness-desktop](https://github.com/omdsh-dev/deepseek-harness-desktop) 的工作区（workspace），在官方 `dsh-base` + `dsh-web-app` 之上叠加了社区组件：

- `@morlay/session-persistence-rdb` —— RDB（SQLite / PostgreSQL）会话持久化，替换内置 JSONL 存储（发布在 GitHub Packages `@morlay` registry）；
- [dsh-message-edit](https://github.com/Moeblack/dsh-message-edit) —— 消息编辑、重生成、重试与 Timeline 版本分支导航；
- [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) —— 增强侧边栏（文件管理 / 编辑预览 / 内嵌浏览器 / 终端 / Git 面板）。

## 特性

- **独立桌面应用**：macOS（`.app`）、Linux（目录 + `tar.gz`）、Windows（目录 + `zip`）。后端用 SEA 内嵌 node，壳用 Wails 原生窗口，**用户无需安装 node**。
- **独立 DSH_HOME**：`dshHome: xdg` 将用户数据隔离在 `xdg.DataHome/<name>`（`name` 即 package.json 的 `name`，本发行版为 `dsh-coding`），首次启动自动从应用种子补齐，**不污染 `~/.dsh`**。
- **RDB 会话持久化**：默认 SQLite（WAL 模式），可切换 PostgreSQL；会话数据可靠落盘，替代官方 JSONL 后端。
- **消息可编辑、可重来**：编辑已落定的消息与回复、从任意回合分支重生成、重试历史回合；Timeline 版本树，历史会话始终保留。
- **内置开发工作台**：侧边栏与底部面板的文件 / 编辑预览 / 浏览器 / 终端 / Git 工作台。
- **Web 前端**：完整 DSH Web GUI（会话、工具、Trajectory、Skill 等），由本地 HTTP 伺服。

LLM 凭据沿用 DSH 惯例：`DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`（Unix 上启动前按 `$SHELL` source 用户 shell 配置继承）。

插件增删、patch 层、后端切换等定制方式见 [docs/configuration.md](docs/configuration.md)。

## 相关项目

- [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) —— DeepSeek Harness 官方仓库（DSH 本体）
- [deepseek-harness-desktop](https://github.com/omdsh-dev/deepseek-harness-desktop) —— 把 dsh web profile 打包为桌面应用的 Go 工具
- [@morlay/session-persistence-rdb](https://github.com/morlay/session-persistence-rdb) —— RDB 会话持久化后端（GitHub Packages：`@morlay` scope，需在 `.npmrc` 配置 `//npm.pkg.github.com/:_authToken`）
- [dsh-message-edit](https://github.com/Moeblack/dsh-message-edit) —— 消息编辑与版本分支插件
- [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) —— 增强侧边栏工作台插件

## 文档

- [docs/configuration.md](docs/configuration.md) —— 配置与定制：会话持久化、插件管理、bundle 与 patch 层
- [docs/development.md](docs/development.md) —— 本地开发：环境、依赖、运行、验证
- [docs/packaging.md](docs/packaging.md) —— 打包与发布：bundle、产物、GitHub Actions、手动分发

## 许可

[MIT](LICENSE)
