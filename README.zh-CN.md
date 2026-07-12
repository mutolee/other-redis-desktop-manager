# Other Redis Desktop Manager

<p align="center">
  <img src="assets/icons/logo.png" alt="Other Redis Desktop Manager" width="100" />
</p>

<p align="center">
  一款基于 Vue 3、Element Plus 和 Electron 构建的 Redis 桌面客户端。
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white" />
  <img alt="Electron" src="https://img.shields.io/badge/Electron-Desktop-47848f?logo=electron&logoColor=white" />
  <img alt="Element Plus" src="https://img.shields.io/badge/Element%20Plus-UI-409eff" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-Client-dc382d?logo=redis&logoColor=white" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-Supported-0078d4?logo=windows&logoColor=white" />
</p>

Other Redis Desktop Manager 关注日常 Redis 数据管理体验，提供连接管理、Key 浏览、Key 详情编辑、命令行操作、Redis 服务信息查看、主题切换、基础国际化和版本检查等能力。

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
  <img src="docs/images/3.png" alt="主题色预览" width="900" />
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
  <img src="docs/images/6.png" alt="Key 列表与空详情状态" width="900" />
</p>

<p align="center">
  <img src="docs/images/7.png" alt="浅色模式 Hash 详情" width="900" />
</p>

<p align="center">
  <img src="docs/images/8.png" alt="深色模式 Hash 详情" width="900" />
</p>

## 功能亮点

- 连接管理：支持创建、编辑、删除、移动、分组、导入、导出和连接测试。
- Redis 模式：支持普通 Redis、哨兵配置和集群配置。
- Key 浏览：支持动态 DB 列表、DBSize 展示、SCAN 分页、加载更多、加载全部、列表视图、树形视图和虚拟列表渲染。
- Key 详情：按 String、Hash、List、Set、ZSet、Stream 拆分独立详情面板，便于不同类型独立维护。
- 数据操作：支持常见类型的查看、复制、添加、编辑、删除、重命名、TTL 修改和 Key 删除。
- 命令行面板：使用独立 Redis 连接执行命令，支持 DB 选择、命令历史、命令示例和执行结果展示。
- Redis 信息：支持查看服务器状态、内存、CPU、Keyspace 图表和完整 INFO 明细。
- 桌面体验：支持深色 / 浅色主题、主题色切换、系统托盘、窗口控制、国际化和版本检查。

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

构建渲染进程资源：

```bash
npm run build
```

快速验证 Electron 打包配置：

```bash
npm run pack
```

生成 Windows 安装包和便携版：

```bash
npm run dist:win
```

产物会输出到：

```text
release
```

常见产物：

```text
release/Other Redis Desktop Manager-Setup-1.0.2-x64.exe
release/Other Redis Desktop Manager-Portable-1.0.2-x64.exe
```

- `Setup`：NSIS 安装包，需要安装后使用。
- `Portable`：便携版，可以直接运行。
- `.blockmap`：electron-builder 生成的增量更新元数据文件，不是给用户直接运行的程序。

## 仓库

- GitHub：[mutolee/other-redis-desktop-manager](https://github.com/mutolee/other-redis-desktop-manager)

## 许可证

请查看 [LICENSE](LICENSE)。
