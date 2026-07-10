# Other Redis Desktop Manager

<p align="center">
  <img src="src/renderer/assets/logo.png" alt="Other Redis Desktop Manager" width="92" />
</p>

<p align="center">
  一款基于 Vue 3、Element Plus 和 Electron 构建的 Redis 桌面客户端。
</p>

<p align="center">
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white" />
  <img alt="Electron" src="https://img.shields.io/badge/Electron-Desktop-47848f?logo=electron&logoColor=white" />
  <img alt="Element Plus" src="https://img.shields.io/badge/Element%20Plus-UI-409eff" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-Client-dc382d?logo=redis&logoColor=white" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-Supported-0078d4?logo=windows&logoColor=white" />
</p>

Other Redis Desktop Manager 关注日常 Redis 数据管理体验，提供连接管理、Key 浏览、Key 详情编辑、命令行操作、Redis 服务信息查看、主题切换和基础国际化等能力，让常见的数据查看与维护工作可以在桌面端完成。

## 界面预览

### 欢迎页与连接入口

<p align="center">
  <img src="docs/images/1.png" alt="深色模式欢迎页" width="900" />
</p>

<p align="center">
  <img src="docs/images/2.png" alt="浅色模式欢迎页" width="900" />
</p>

### 主题色切换

<p align="center">
  <img src="docs/images/3.png" alt="粉色主题欢迎页" width="900" />
</p>

### Key 浏览与命令行

<p align="center">
  <img src="docs/images/4.png" alt="Key 浏览与命令行面板" width="900" />
</p>

### Redis 服务信息

<p align="center">
  <img src="docs/images/5.png" alt="Redis 服务信息抽屉" width="900" />
</p>

### Key 列表与详情

<p align="center">
  <img src="docs/images/6.png" alt="Key 列表空详情状态" width="900" />
</p>

<p align="center">
  <img src="docs/images/7.png" alt="浅色模式 Hash 详情" width="900" />
</p>

<p align="center">
  <img src="docs/images/8.png" alt="深色模式 Hash 详情" width="900" />
</p>

## 功能亮点

- 连接管理：支持创建、编辑、删除、移动、分组、导入、导出和连接测试。
- Key 浏览：支持 DB 切换、SCAN 分页、加载更多、加载全部、列表视图、树形视图和虚拟列表渲染。
- Key 详情：按 String、Hash、List、Set、ZSet、Stream 拆分独立详情面板，便于不同类型独立维护。
- 数据操作：支持基础类型的查看、复制、添加、编辑、删除、重命名、TTL 修改和 Key 删除。
- 命令行面板：使用独立 Redis 连接执行命令，支持 DB 选择、命令历史、命令提示和执行结果展示。
- Redis 信息：支持查看服务器状态、内存、CPU、Keyspace 图表和完整 INFO 明细。
- 桌面体验：支持深色/浅色主题、主题色切换、系统托盘、窗口控制、国际化和版本检查。
- 工程化：基于 main / preload / renderer 分层，使用 Pinia、Dexie、ioredis、ECharts 和 electron-builder。

## 技术栈

| 类型 | 技术 |
| --- | --- |
| 桌面容器 | Electron |
| 前端框架 | Vue 3 |
| UI 组件 | Element Plus |
| 状态管理 | Pinia |
| 本地存储 | Dexie / IndexedDB |
| Redis 客户端 | ioredis |
| 图表 | ECharts |
| 构建工具 | Vite |
| 图标库 | @icon-park/vue-next |
| 打包工具 | electron-builder |

## 项目结构

```text
src
├─ main                 # Electron 主进程：窗口、托盘、IPC、Redis 连接管理
├─ preload              # 安全暴露给渲染进程的 API
└─ renderer             # Vue 渲染进程
   ├─ assets            # 全局样式与静态资源
   ├─ components        # 页面组件、弹窗、抽屉、Key 详情组件
   ├─ database          # IndexedDB 模型与仓库
   ├─ i18n              # 国际化文案
   ├─ router            # Vue Router
   ├─ stores            # Pinia Store
   ├─ utils             # 渲染进程工具函数
   └─ views             # 顶层视图
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

开发时通常需要打开两个终端窗口，分别运行 `dev:renderer` 和 `dev:main`。

## 构建与打包

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

正式打包后会生成两类 `.exe`：

```text
release/Other Redis Desktop Manager-Setup-1.0.1-x64.exe
release/Other Redis Desktop Manager-Portable-1.0.1-x64.exe
```

- `Setup`：NSIS 安装包，需要安装后使用。
- `Portable`：便携版，可以直接运行。
- `.blockmap`：Electron Builder 用于增量更新的差异文件，不是用户直接运行的程序。

如果 Electron 下载失败，或出现 `node_modules/electron` 文件被占用的问题，可以先确认：

1. 已关闭正在运行的 Electron 应用。
2. 没有终端、杀毒软件或资源管理器占用 `node_modules/electron` 下的文件。
3. 网络不稳定时，可以配置 Electron 下载镜像后重试。

## 开发约定

- Vue 组件优先使用 Composition API。
- 纯数据转换、树结构、过滤、排序、格式化等逻辑优先放到 `utils`。
- 新增或修改 Vue 组件时，需要补充组件职责、关键布局、关键状态和关键方法注释。
- JS、Electron main/preload、工具类文件同样需要补充关键注释。
- 使用 `const` 和 `let`，不要使用 `var`。
- 图标统一使用 `@icon-park/vue-next`。
- 不自动提交代码，提交前需要开发者确认。
