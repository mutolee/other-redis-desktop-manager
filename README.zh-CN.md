# Other Redis Desktop Manager

<p align="center">
  <img src="assets/icons/logo.png" alt="Other Redis Desktop Manager" width="100" />
</p>

<p align="center">
  一款实用、现代的 Redis 桌面客户端，基于 Vue 3、Element Plus 和 Electron 构建。
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

Other Redis Desktop Manager 面向日常 Redis 开发、调试、数据查看和维护场景，将高性能 Key 浏览、类型化数据编辑、Value 多格式解析、内存分析、慢查询、数据导入导出和桌面连接管理整合在同一个应用中。

## 为什么好用

- **大数据量下依然可控：** Key 基于 `SCAN` 分批发现，“加载全部”会边加载边展示，并且支持停止、刷新或通过切换数据库打断旧任务。
- **数据导航清晰：** 支持列表和树形两种 Key 视图，树结构遵循每个连接配置的 Key 分隔符；同时提供精确查询、模糊搜索、有效搜索历史、DBSize 和动态数据库列表。
- **不同类型各司其职：** String、Hash、List、Set、ZSet、Stream 都有独立详情面板，分页、复制、TTL、重命名和增删改操作会根据数据类型呈现。
- **二进制数据也能直接看：** Redis 原始字节可以按 Text/UTF-8、JSON、Hex、Binary、Java Serialization、PHP Serialize、Pickle、MessagePack、Gzip、Zlib/Deflate 或 Brotli 解析预览。
- **运维工具就在工作区里：** 无需离开当前连接，即可进行 Key 内存分析、慢查询查看、Redis 命令执行、Key 导入导出和批量删除。
- **完整桌面体验：** 连接分组、页签、右键菜单、深浅主题、自定义主题色、系统托盘、中英文界面和 GitHub Release 更新检查均已整合。

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

## 功能介绍

### 连接与工作区

- 创建、编辑、测试、重命名、移动、分组、导入和导出连接配置。
- 支持普通 Redis 和哨兵连接配置，并支持独立填写哨兵主节点认证信息。
- Cluster 配置入口已经预留，但 v1.0.6 暂未实现集群运行时连接。
- 同时打开多个连接页签和多个 Key 详情页签，通过缓存上限和明确的关闭操作控制资源占用。
- 连接页签、连接分组、连接项、Key 目录和单个 Key 都提供一致的右键菜单操作。
- 窗口较窄时自动折叠侧边栏，宽屏下保留适合桌面操作的完整工作区。

### Key 浏览与搜索

- 动态发现可用数据库，并在 DB 选项中展示 Key 数量。
- 支持精确 Key 查询和模糊模式搜索，不必先把整个数据库加载到本地。
- 搜索失败或结果为空时不保存历史，只保留真正有效的搜索关键词。
- 支持列表和树形模式；树形层级根据连接的 `key_split` 配置生成，并明确展示空路径节点。
- 支持加载更多、加载全部、停止加载、刷新和切换 DB，旧的循环加载不会继续覆盖新页面状态。
- 对大结果集使用虚拟列表或手动分页，避免一次创建大量 DOM 节点。

### 数据编辑与预览

- 为 String、Hash、List、Set、ZSet、Stream 提供独立详情页面。
- 大型集合 Value 使用分批分页，“加载全部”期间可以随时停止。
- 表格非操作列支持鼠标选择复制，省略内容的完整 Tooltip 文本同样可以复制。
- 支持 Key 重命名、TTL 修改、Value 增删改、集合成员删除和完整 Key 删除。
- 解析预览和编辑保存相互独立，不会把解析后的内容静默写回 Redis。

### Value 解析格式

| 格式 | 预览能力 |
| --- | --- |
| Text / UTF-8 | 原始文本展示 |
| JSON | JSON 结构化格式展示 |
| Hex | 按原始字节输出十六进制 |
| Binary | 按原始字节输出二进制 |
| Java Serialization | Java 对象序列化流解析 |
| PHP Serialize | PHP 序列化数据解析 |
| Pickle | Python Pickle 数据解析 |
| MessagePack | MessagePack 数据解析 |
| Gzip | Gzip 解压并预览 |
| Zlib / Deflate | Zlib 或 Deflate 解压并预览 |
| Brotli | Brotli 解压并预览 |

String Value、Hash Field Value、List 元素、Set Member 和 ZSet Member 均可解析。Stream 会将所选格式应用于当前 Entry 的所有 Field Value，再组合为 JSON 展示。Key、Field 名称、下标、Score 和 Stream Message ID 不参与解析。

### 数据操作

- 按 Redis 类型导入和导出选中的 Key，并对大数据设置明确的安全上限。
- 单次最多导出 50,000 个 Key；超大 String 和集合 Value 会按照界面展示的规则截断。
- 导出和批量删除使用独立选择模式，列表和树形目录 Checkbox 支持完整、未选和半选状态。
- 支持删除单个 Key、删除选中的 Key、删除目录范围内的 Key，以及确认后删除当前 DB 的全部 Key。
- 可以直接从树形目录右键菜单执行目录搜索、内存分析、导出和删除。

### 分析与诊断

- **内存分析：** 最多扫描 200,000 个 Key，读取 `MEMORY USAGE`，按占用空间从大到小排序，并通过虚拟列表展示。
- **慢查询：** 查看和清空 Redis `SLOWLOG`，展示可读的耗时、客户端、命令和参数信息。
- **服务器信息：** 查看 Redis 状态、客户端、内存、CPU、Keyspace 图表、数据库摘要和可搜索的 `INFO ALL` 明细。
- **命令行面板：** 使用独立 Redis 连接执行命令、切换 DB、查看结果，并保留输入历史。
- **开发者命令记录：** 开启开发者模式后，记录 Redis 命令时间、连接、命令、参数、耗时、来源和状态。最近 10,000 条脱敏记录支持搜索、筛选、分页、清空，并持久化到 Electron `userData` 目录。

认证类敏感参数在进入内存或磁盘前会被脱敏；超长参数和 Pipeline 子命令会进行摘要截断，避免命令记录变成 Redis 数据的副本。

### 桌面体验

- 支持 Windows 安装包和便携版。
- 支持 macOS Apple Silicon 与 Intel 构建脚本，并通过 electron-builder 进行 ad-hoc 签名。
- 支持深色、浅色主题和自定义主题色。
- 首次启动根据系统语言选择默认语言，提供完整中英文界面和自适应表单宽度。
- 支持系统托盘、自定义标题栏、窗口恢复和 macOS 生命周期适配。
- 支持后台自动更新检查、更新小红点、手动检查和 GitHub Release 跳转。

## 技术栈

| 类型 | 技术 |
| --- | --- |
| 桌面容器 | Electron |
| 前端框架 | Vue 3 |
| UI 组件 | Element Plus |
| 状态管理 | Pinia |
| 本地存储 | Dexie / IndexedDB 与 main 进程 JSONL |
| Redis 客户端 | ioredis |
| 图表 | ECharts |
| 构建工具 | Vite |
| 图标库 | @icon-park/vue-next |
| 打包工具 | electron-builder |

## 项目结构

```text
src
├── main                 # Electron 主进程、IPC、Redis 服务和原生资源
├── preload              # 向 renderer 安全暴露的最小 API
└── renderer             # Vue 渲染进程
    ├── assets           # 全局样式和静态资源
    ├── components       # 页面、弹窗、抽屉、Key 列表和详情组件
    ├── composables      # 可复用的渲染进程业务流程
    ├── database         # IndexedDB 模型与仓储
    ├── i18n             # 中英文国际化文案
    ├── router           # Vue Router
    ├── stores           # Pinia 状态管理
    ├── utils            # 解析、格式化和视图工具
    └── views            # 顶层页面
```

Electron 三层边界保持清晰：main 负责 Redis 连接、本地文件、窗口、托盘和 IPC 实现；preload 只暴露最小桥接接口；renderer 负责界面状态和用户交互。

## 开发启动

安装依赖：

```bash
npm install
```

启动渲染进程开发服务：

```bash
npm run dev:renderer
```

在另一个终端启动 Electron 主进程：

```bash
npm run dev:main
```

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

产物会输出到 `release` 目录。

常见 Windows 产物：

```text
release/Other Redis Desktop Manager-Setup-1.0.6-x64.exe
release/Other Redis Desktop Manager-Portable-1.0.6-x64.exe
```

- `Setup`：NSIS 安装包，需要安装后使用。
- `Portable`：便携版，可以直接运行。
- `.blockmap`：electron-builder 生成的增量更新元数据，不是给用户直接运行的程序。

macOS 分发建议：

- GitHub Release 中优先上传生成的 `.zip` 包，`.dmg` 可以作为备选一起上传。
- 如果 macOS 提示“无法验证开发者”，打开“系统设置 -> 隐私与安全性”，点击“仍要打开”。
- 如果想完全无弹窗启动，需要 Apple Developer ID 签名并完成 notarization 公证。

## 仓库

- GitHub：[mutolee/other-redis-desktop-manager](https://github.com/mutolee/other-redis-desktop-manager)

## 许可证

请查看 [LICENSE](LICENSE)。
