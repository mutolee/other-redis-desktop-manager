# Other Redis Desktop Manager

Other Redis Desktop Manager 是一个基于 Vue 3、Element Plus 和 Electron 构建的 Redis 桌面客户端。项目目标是提供连接管理、Key 浏览、Key 详情编辑、命令行操作和基础服务器信息查看等能力，让日常 Redis 数据查看和维护可以在桌面端完成。

## 技术栈

- Electron：负责桌面窗口、主进程能力、托盘、窗口控制和 IPC。
- Vue 3：负责渲染进程页面和组件化 UI。
- Element Plus：负责主要 UI 组件、弹窗、抽屉、表单和加载状态。
- Pinia：负责前端状态管理。
- Dexie：负责浏览器 IndexedDB 本地数据存储。
- ioredis：负责 Redis 连接、命令执行、哨兵连接和数据读取。
- Vite：负责渲染进程开发构建。
- @icon-park/vue-next：项目统一图标库。

## 当前功能

### 连接管理

- 支持创建、编辑、删除、移动、重命名分组等连接配置操作。
- 支持单机 Redis 连接。
- 已接入哨兵连接测试和连接逻辑。
- 支持连接超时、命令超时、SCAN 数量等系统设置。
- 支持应用退出时统一关闭 Redis 连接。

### Key 浏览

- 支持按当前连接和 DB 浏览 Key。
- 支持 SCAN 分页加载、加载更多、加载全部。
- 支持树形视图和列表视图切换。
- 支持树形视图最大层级限制。
- 支持虚拟列表渲染，降低大量 Key 时的 DOM 压力。
- 支持添加基础类型 Key。

### Key 详情

- 已按 Redis 类型拆分独立详情组件：
  - String
  - Hash
  - List
  - Set
  - ZSet
  - Stream
  - Unsupported
- 支持公共 Header 信息：Key 类型、Key 名称、Size、TTL、刷新、复制命令、删除、关闭。
- 支持 Key 重命名、TTL 修改、Key 删除。
- 支持 Key 不存在或已过期时的空状态提示。
- Hash、List、Set、ZSet、Stream 已逐步接入分页、虚拟表格、查看、复制、添加、编辑或删除等能力。

### 命令行

- 支持打开独立命令行抽屉。
- 命令行面板使用独立 Redis 连接，不复用当前页面连接。
- 支持 DB 切换、命令执行、执行结果展示、执行中 loading。
- 支持命令历史和基础命令提示。
- 支持关闭命令行时释放独立连接。

### 系统设置和主题

- 支持浅色/深色主题切换。
- 支持主题色切换。
- 支持 View Transitions API 圆形主题切换动画。
- 支持连接超时、命令超时、Key 扫描数量配置。
- 支持开发者模式开关。

## 项目结构

```text
src
├─ main                    # Electron 主进程
│  ├─ index.js             # 应用入口、生命周期、托盘和窗口初始化
│  ├─ ipcHandlers          # IPC 注册入口和各业务 IPC handler
│  ├─ utils                # 主进程工具
│  └─ windows              # 主窗口和启动窗口创建逻辑
├─ preload
│  └─ index.js             # 暴露给渲染进程的安全 API
└─ renderer                # Vue 渲染进程
   ├─ assets               # 全局样式和静态资源
   ├─ components           # 页面组件、弹窗、抽屉、Key 详情组件
   ├─ database             # IndexedDB 模型和仓库
   ├─ router               # Vue Router
   ├─ stores               # Pinia store
   ├─ utils                # 渲染进程工具函数
   └─ views                # 顶层视图
```

## 开发启动

安装依赖：

```bash
npm install
```

启动渲染进程开发服务：

```bash
npm run dev:renderer
```

启动 Electron 主进程：

```bash
npm run dev:main
```

## 构建与打包

打包前先确认依赖已经安装：

```bash
npm install
```

只构建渲染进程资源：

```bash
npm run build
```

快速验证 Electron 打包配置，不生成安装包：

```bash
npm run pack
```

该命令会先执行 Vite 构建，然后通过 Electron Builder 生成未安装版目录：

```text
release/win-unpacked
```

生成 Windows 安装包和便携版：

```bash
npm run dist:win
```

产物会输出到：

```text
release
```

Windows 正式打包后会生成两类 `.exe`：

```text
release/Other Redis Desktop Manager-Setup-1.0.0-x64.exe
release/Other Redis Desktop Manager-Portable-1.0.0-x64.exe
```

- `Setup`：NSIS 安装包，需要安装后使用。
- `Portable`：便携版，可以直接运行。

当前打包配置使用 `electron-builder`，主要配置在 `package.json` 的 `build` 字段中。Windows 目标包含 `nsis` 安装包和 `portable` 便携版；图标使用：

```text
assets/icons/logo.ico
assets/icons/logo.icns
assets/icons/logo.png
```

如果打包时 Electron 下载失败，或者出现 `AppData\Local\electron\Cache` 缓存目录权限错误，可以尝试：

1. 关闭正在运行的 Electron 应用和占用 `node_modules/electron` 的进程。
2. 使用管理员权限打开终端后重新执行 `npm run pack` 或 `npm run dist:win`。
3. 网络不稳定时，先配置 Electron 下载镜像或重试打包命令。

正式发布前建议先执行：

```bash
npm run pack
```

确认 `release/win-unpacked/Other Redis Desktop Manager.exe` 可以正常启动，再执行：

```bash
npm run dist:win
```

## 已知待办

- 修复项目中历史遗留的中文注释和文案乱码。
- 梳理 `redisConnectionIpcHandler.js`，拆分连接管理、Key 数据读取、服务器信息、Stream 能力等职责。
- 统一跨层 `connectionId` 的类型和解析方式。
- 明确 SSL、SSH、Cluster 等连接字段是隐藏、移除还是继续实现。
- 为敏感连接信息增加加密存储或系统钥匙串方案。
- 补充命令行危险命令确认、命令历史持久化和结果复制能力。
- 补充 Redis 服务器更多信息展示和监控图表。
- 增加关键工具函数和核心流程测试。

## 开发约定

- Vue 组件优先使用 Composition API。
- 纯数据转换、树结构、过滤、排序、格式化等逻辑优先放到 `utils`。
- 新增或修改 Vue 组件时，需要补充组件职责、关键布局、关键状态和关键方法注释。
- JS、Electron main/preload、工具类文件也需要补充关键注释。
- 使用 `const` 和 `let`，不要使用 `var`。
- 图标统一使用 `@icon-park/vue-next`。
- 不自动提交代码，提交前需要用户确认。
