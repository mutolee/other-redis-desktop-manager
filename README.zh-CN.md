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
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Supported-000000?logo=apple&logoColor=white" />
</p>

Other Redis Desktop Manager 关注日常 Redis 数据管理体验，提供连接管理、Key 浏览、Key 详情编辑、Value 多格式预览、命令行操作、Redis 服务信息查看、主题切换、中英文界面和版本检查等能力。

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
- Value 预览：支持将 Redis 原始字节以 Text/UTF-8、JSON、Hex、Binary、Java Serialization、PHP Serialize、Pickle、MessagePack、Gzip、Zlib/Deflate 和 Brotli 格式解析展示，不修改 Redis 中保存的数据。
- 数据操作：支持常见类型的查看、复制、添加、编辑、删除、重命名、TTL 修改和 Key 删除。
- 命令行面板：使用独立 Redis 连接执行命令，支持 DB 选择、命令历史、命令示例和执行结果展示。
- Redis 信息：支持查看服务器状态、内存、CPU、Keyspace 图表和完整 INFO 明细。
- 桌面体验：支持深色 / 浅色主题、主题色切换、系统托盘、窗口控制、中英文界面，以及基于 GitHub Releases 的自动和手动更新检查。

### Value 预览范围

- String Value、Hash Field Value、List 元素、Set Member 和 ZSet Member 均可在详情预览中解析；Key、Hash Field 名称、List 下标和 ZSet Score 不参与解析。
- Stream 会将所选格式应用于当前 Entry 的所有 Field Value，再组合成 JSON 展示；Field 名称和 Message ID 不参与解析。
- 解析只影响查看和复制，编辑与保存仍然使用 Redis 原始数据。

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

在 Mac 电脑上生成 macOS 安装包：

```bash
npm run dist:mac
```

分别生成 Apple Silicon 或 Intel 安装包：

```bash
npm run dist:mac:arm64
npm run dist:mac:x64
```

macOS 安装包通过 electron-builder 使用 ad-hoc 签名生成，不需要 Apple Developer 账号，但用户从 GitHub 下载后，macOS Gatekeeper 仍可能弹出安全提示。

产物会输出到：

```text
release
```

常见产物：

```text
release/Other Redis Desktop Manager-Setup-1.0.5-x64.exe
release/Other Redis Desktop Manager-Portable-1.0.5-x64.exe
```

- `Setup`：NSIS 安装包，需要安装后使用。
- `Portable`：便携版，可以直接运行。
- `.blockmap`：electron-builder 生成的增量更新元数据文件，不是给用户直接运行的程序。

macOS 分发建议：

- GitHub Release 中优先上传生成的 `.zip` 包，`.dmg` 可以作为备选一起上传。
- 如果 macOS 提示“无法验证开发者”，打开“系统设置 → 隐私与安全性”，点击“仍要打开”。
- 如果想完全无弹窗启动，需要 Apple Developer ID 签名并完成 notarization 公证。

## 仓库

- GitHub：[mutolee/other-redis-desktop-manager](https://github.com/mutolee/other-redis-desktop-manager)

## 许可证

请查看 [LICENSE](LICENSE)。
