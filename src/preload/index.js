const {contextBridge, ipcRenderer} = require('electron')

/**
 * 预加载脚本。
 * 作为 main 与 renderer 的安全边界，只暴露业务 API，不直接暴露 ipcRenderer。
 */
contextBridge.exposeInMainWorld('api', {

    /**
     * 应用信息模块。
     * 提供启动页展示所需的版本信息。
     */
    appInfo: {
        // 获取应用程序版本号
        getVersion: () => ipcRenderer.invoke('appInfo:get-version'),
        // 获取 Chromium 版本号
        getChromeVersion: () => ipcRenderer.invoke('appInfo:get-chrome-version'),
        // 检查 GitHub Release 最新版本，真实网络请求留在 main 进程执行
        checkUpdate: () => ipcRenderer.invoke('appInfo:check-update'),
        // 同步当前界面语言到 main 进程，用于托盘菜单等原生 UI
        setLanguage: (language) => ipcRenderer.invoke('appInfo:set-language', language)
    },

    /**
     * 开发者模式模块。
     * 控制开发者工具快捷键是否恢复默认行为。
     */
    develop: {
        // 打开开发者模式
        openDevelopMode: () => ipcRenderer.invoke('develop:open-dev-mode'),
        // 关闭开发者模式
        closeDevelopMode: () => ipcRenderer.invoke('develop:close-dev-mode')
    },

    /**
     * 主窗口控制模块。
     * 提供自定义标题栏和关闭确认弹窗需要的窗口操作能力。
     */
    mainWin: {
        minimize: () => ipcRenderer.invoke('mainWin:minimize'),
        toggleMaximize: () => ipcRenderer.invoke('mainWin:toggleMaximize'),
        close: () => ipcRenderer.invoke('mainWin:close'),
        hide: () => ipcRenderer.invoke('mainWin:hide'),
        quit: () => ipcRenderer.invoke('mainWin:quit'),
        reload: () => ipcRenderer.invoke('mainWin:reload'),
        setTitle: (title) => ipcRenderer.invoke('mainWin:setTitle', title),
        openExternal: (url) => ipcRenderer.invoke('mainWin:open-external', url)
    },

    /**
     * Redis 能力模块。
     * 这里只做 IPC 转发，真实 Redis 连接和命令执行都留在 main 进程。
     */
    redis: {
        // 测试 Redis 连接配置
        testConnection: (config) => ipcRenderer.invoke('redis:testConnection', config),
        // 创建 Redis 连接，连接状态变化通过 onConnectionStatusChanged 通知
        connect: (connectionId, config) => ipcRenderer.invoke('redis:connect', connectionId, config),
        // 关闭 Redis 连接
        disconnect: (connectionId) => ipcRenderer.invoke('redis:disconnect', connectionId),
        // 执行 Redis 命令
        executeCommand: (connectionId, command, args) => ipcRenderer.invoke('redis:execute-command', connectionId, command, args),
        // 获取 Redis 服务器实时信息
        getServerInfo: (connectionId) => ipcRenderer.invoke('redis:get-server-info', connectionId),
        // SCAN 扫描 Key 列表
        scanKeys: (connectionId, cursor, pattern, count) => ipcRenderer.invoke('redis:scan-keys', connectionId, cursor, pattern, count),
        // TYPE 按完整 Key 名精确查询
        findExactKey: (connectionId, key) => ipcRenderer.invoke('redis:find-exact-key', connectionId, key),
        // 按 pattern 预览 Key 列表
        scanKeysByPattern: (connectionId, pattern, options) => ipcRenderer.invoke('redis:scan-keys-by-pattern', connectionId, pattern, options),
        // 批量删除指定 Key
        deleteKeys: (connectionId, keys) => ipcRenderer.invoke('redis:delete-keys', connectionId, keys),
        // 批量导出指定 Key 的完整数据
        exportKeys: (connectionId, keys) => ipcRenderer.invoke('redis:export-keys', connectionId, keys),
        // 批量导入 Key 导出文件中的数据
        importKeys: (connectionId, importData, options) => ipcRenderer.invoke('redis:import-keys', connectionId, importData, options),
        // 分析当前 DB 中 Key 的内存占用排行
        analyzeKeyMemory: (connectionId, options) => ipcRenderer.invoke('redis:analyze-key-memory', connectionId, options),
        // 读取 Redis 实例级慢查询日志
        getSlowLog: (connectionId, options) => ipcRenderer.invoke('redis:get-slow-log', connectionId, options),
        // 清空 Redis 实例级慢查询日志
        resetSlowLog: (connectionId) => ipcRenderer.invoke('redis:reset-slow-log', connectionId),
        // 获取 Key 详细信息
        getKeyData: (connectionId, key) => ipcRenderer.invoke('redis:get-key-data', connectionId, key),
        // 分段获取 Hash 字段
        getHashRange: (connectionId, key, start, stop) => ipcRenderer.invoke('redis:get-hash-range', connectionId, key, start, stop),
        // 分段获取 List 元素
        getListRange: (connectionId, key, start, stop) => ipcRenderer.invoke('redis:get-list-range', connectionId, key, start, stop),
        // 分段扫描 Set 成员
        getSetRange: (connectionId, key, cursor, count) => ipcRenderer.invoke('redis:get-set-range', connectionId, key, cursor, count),
        // 分段获取 ZSet 元素
        getZSetRange: (connectionId, key, start, stop) => ipcRenderer.invoke('redis:get-zset-range', connectionId, key, start, stop),
        // 分段获取 Stream entries
        getStreamRange: (connectionId, key, maxId, minId, count) => ipcRenderer.invoke('redis:get-stream-range', connectionId, key, maxId, minId, count),
        // 获取 Stream 消费组列表
        getStreamGroups: (connectionId, key) => ipcRenderer.invoke('redis:get-stream-groups', connectionId, key),
        // 获取 Stream 指定消费组下的消费者列表
        getStreamConsumers: (connectionId, key, groupName) => ipcRenderer.invoke('redis:get-stream-consumers', connectionId, key, groupName),
        // 切换当前连接使用的 Redis 数据库
        selectDatabase: (connectionId, dbIndex) => ipcRenderer.invoke('redis:select-database', connectionId, dbIndex),
        // 监听 Redis 连接状态变化，并返回当前监听器的解绑函数
        onConnectionStatusChanged: (callback) => {
            if (typeof callback !== 'function') {
                return () => {
                }
            }

            // 为每次订阅创建独立监听器，避免解绑时影响其他页面或抽屉。
            const listener = (event, data) => {
                callback(data)
            }

            ipcRenderer.on('redis:connection-status-changed', listener)

            return () => {
                ipcRenderer.removeListener('redis:connection-status-changed', listener)
            }
        }
    }
})
