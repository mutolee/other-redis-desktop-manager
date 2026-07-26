# Other Redis Desktop Manager

<p align="center">
  <img src="assets/icons/logo.png" alt="Other Redis Desktop Manager" width="100" />
</p>

<p align="center">
  A practical, modern Redis desktop client built with Vue 3, Element Plus, and Electron.
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

Other Redis Desktop Manager is designed for daily Redis development, debugging, data inspection, and maintenance. It combines a responsive Key browser, type-specific editors, multi-format Value decoding, memory and slow-query tools, import/export workflows, and desktop-friendly connection management in one application.

## Why It Works Well

- **Fast on large datasets:** Key discovery is based on incremental `SCAN` requests. Load-all operations render each batch as it arrives and can be stopped, refreshed, or interrupted by switching databases.
- **Clear data navigation:** Browse Keys as a flat list or a tree built from each connection's configurable Key separator. Exact lookup, fuzzy search, successful-search history, DB size, and dynamic database discovery are built in.
- **Focused type editors:** String, Hash, List, Set, ZSet, and Stream each have a dedicated detail panel with pagination, copy, TTL, rename, add, edit, and delete operations appropriate to that type.
- **Read binary data without rewriting it:** Preview raw Redis bytes as Text/UTF-8, JSON, Hex, Binary, Java Serialization, PHP Serialize, Pickle, MessagePack, Gzip, Zlib/Deflate, or Brotli.
- **Useful operational tooling:** Analyze Key memory usage, inspect slow queries, run Redis commands, import or export Keys, and perform scoped or batch deletion without leaving the current connection workspace.
- **Desktop workflow:** Connection groups, tabs, context menus, dark and light themes, custom theme colors, system tray behavior, Chinese and English interfaces, and GitHub Release update checks are integrated into the application.

## Preview

### Welcome and Connections

<p align="center">
  <img src="docs/images/1.png" alt="Welcome page in dark mode" width="900" />
</p>

<p align="center">
  <img src="docs/images/2.png" alt="Welcome page in light mode" width="900" />
</p>

### Theme Colors

<p align="center">
  <img src="docs/images/3.png" alt="Theme color preview" width="900" />
</p>

### Key Browser and Command Drawer

<p align="center">
  <img src="docs/images/4.png" alt="Key browser and command drawer" width="900" />
</p>

### Redis Server Information

<p align="center">
  <img src="docs/images/5.png" alt="Redis server information drawer" width="900" />
</p>

### Key List and Details

<p align="center">
  <img src="docs/images/6.png" alt="Key list and empty detail area" width="900" />
</p>

<p align="center">
  <img src="docs/images/7.png" alt="Hash detail in light mode" width="900" />
</p>

<p align="center">
  <img src="docs/images/8.png" alt="Hash detail in dark mode" width="900" />
</p>

## Features

### Connections and Workspaces

- Create, edit, test, rename, move, group, import, and export connection configurations.
- Configure standalone Redis and Sentinel connections, including independent Sentinel master authentication.
- The Cluster configuration entry is reserved, but runtime Cluster connections are not implemented in v1.0.6.
- Open multiple connection tabs and multiple Key detail tabs with bounded caches and predictable close actions.
- Use shared context menus from tabs, connection groups, connection items, Key directories, and individual Keys.
- Automatically collapse the sidebar on narrow windows while preserving a desktop-oriented workspace on larger screens.

### Key Browsing and Search

- Discover available databases dynamically and show each database's Key count.
- Search by exact Key or fuzzy pattern without requiring the full database to be loaded first.
- Save only successful, non-empty searches to search history.
- Use list or tree mode; tree hierarchy follows the connection's `key_split` setting and represents empty path segments explicitly.
- Load more, load all, stop loading, refresh, or switch DB without waiting for an obsolete background loop to finish.
- Use virtualized lists where large result sets would otherwise create excessive renderer overhead.

### Data Editing and Preview

- Dedicated detail views for String, Hash, List, Set, ZSet, and Stream.
- Incremental pagination for large collection Values, with a stop action for load-all operations.
- Copy selectable table content, including complete overflow tooltip content.
- Rename Keys, update TTL, add or edit values, delete individual entries, and delete entire Keys.
- Keep preview parsing separate from editing so decoded content never silently changes the original Redis bytes.

### Value Decoders

| Format | Preview support |
| --- | --- |
| Text / UTF-8 | Raw text display |
| JSON | Structured JSON formatting |
| Hex | Byte-accurate hexadecimal output |
| Binary | Byte-accurate binary output |
| Java Serialization | Java object stream decoding |
| PHP Serialize | PHP serialized value decoding |
| Pickle | Python Pickle decoding |
| MessagePack | MessagePack decoding |
| Gzip | Gzip decompression and preview |
| Zlib / Deflate | Zlib or Deflate decompression and preview |
| Brotli | Brotli decompression and preview |

String Values, Hash field Values, List items, Set members, and ZSet members can be decoded. Stream preview applies the selected format to all Field Values in an Entry and then displays the combined result as JSON. Keys, field names, indexes, scores, and Stream Message IDs are not decoded.

### Data Operations

- Import and export selected Keys with type-aware serialization and explicit safety limits.
- Export up to 50,000 Keys per operation; oversized String and collection Values are truncated according to the displayed export rules.
- Enter selection mode for export or batch deletion with list and tree checkbox states.
- Delete individual Keys, selected Keys, all Keys in a directory scope, or all Keys in the current database with confirmation.
- Run directory-scoped search, memory analysis, export, and deletion directly from the Key tree context menu.

### Analysis and Diagnostics

- **Memory analysis:** scan up to 200,000 Keys, calculate `MEMORY USAGE`, sort from largest to smallest, and render the results with a virtual list.
- **Slow queries:** inspect and clear Redis `SLOWLOG` records with readable duration, client, command, and argument information.
- **Server information:** view Redis status, clients, memory, CPU, Keyspace charts, database summaries, and searchable `INFO ALL` details.
- **Command drawer:** execute commands through an independent Redis connection, switch DB, inspect results, and retain command input history.
- **Developer command history:** when developer mode is enabled, record Redis command time, connection, command, arguments, duration, source, and status. The latest 10,000 sanitized records are searchable, pageable, clearable, and persisted in Electron's `userData` directory.

Sensitive authentication arguments are redacted before command records reach memory or disk. Large arguments and Pipeline details are truncated to keep diagnostics useful without turning the history into a copy of Redis data.

### Desktop Experience

- Windows installer and portable builds.
- macOS Apple Silicon and Intel build scripts with electron-builder ad-hoc signing support.
- Dark and light themes with selectable theme colors.
- System-language initialization, Chinese and English interfaces, and responsive label widths.
- System tray, custom title bar, window restore behavior, and macOS-specific lifecycle handling.
- Automatic background update checks, update indicators, manual checks, and GitHub Release links.

## Tech Stack

| Area | Technology |
| --- | --- |
| Desktop shell | Electron |
| Frontend framework | Vue 3 |
| UI components | Element Plus |
| State management | Pinia |
| Local storage | Dexie / IndexedDB and main-process JSONL |
| Redis client | ioredis |
| Charts | ECharts |
| Build tool | Vite |
| Icons | @icon-park/vue-next |
| Packaging | electron-builder |

## Project Structure

```text
src
├── main                 # Electron main process, IPC, Redis services, native resources
├── preload              # Minimal APIs exposed safely to the renderer process
└── renderer             # Vue renderer process
    ├── assets           # Global styles and static assets
    ├── components       # Pages, dialogs, drawers, Key lists, and detail panels
    ├── composables      # Reusable renderer-side workflows
    ├── database         # IndexedDB models and repositories
    ├── i18n             # Chinese and English messages
    ├── router           # Vue Router
    ├── stores           # Pinia stores
    ├── utils            # Parsing, formatting, and view utilities
    └── views            # Top-level views
```

The Electron boundaries stay explicit: the main process owns Redis connections, local files, windows, tray behavior, and IPC implementation; preload exposes a minimal bridge; the renderer owns UI state and user interaction.

## Development

Install dependencies:

```bash
npm install
```

Start the renderer development server:

```bash
npm run dev:renderer
```

Start the Electron main process in another terminal:

```bash
npm run dev:main
```

## Build and Package

Build renderer assets:

```bash
npm run build
```

Verify Electron packaging without producing an installer:

```bash
npm run pack
```

Build the Windows installer and portable executable:

```bash
npm run dist:win
```

Build macOS packages on a Mac:

```bash
npm run dist:mac
```

Build Apple Silicon or Intel packages separately:

```bash
npm run dist:mac:arm64
npm run dist:mac:x64
```

The macOS package uses electron-builder ad-hoc signing. It does not require an Apple Developer account, but Gatekeeper may still show a security prompt after the package is downloaded from GitHub.

Artifacts are generated in `release`.

Typical Windows outputs:

```text
release/Other Redis Desktop Manager-Setup-1.0.6-x64.exe
release/Other Redis Desktop Manager-Portable-1.0.6-x64.exe
```

- `Setup`: NSIS installer. Install it before use.
- `Portable`: portable executable. Run it directly.
- `.blockmap`: differential update metadata generated by electron-builder. It is not an executable for end users.

Recommended macOS distribution:

- Upload the generated `.zip` package to GitHub Releases first. The `.dmg` package can be provided as an alternative.
- If macOS cannot verify the developer, open System Settings -> Privacy & Security and click Open Anyway.
- Fully silent launch requires Apple Developer ID signing and notarization.

## Repository

- GitHub: [mutolee/other-redis-desktop-manager](https://github.com/mutolee/other-redis-desktop-manager)

## License

See [LICENSE](LICENSE).
