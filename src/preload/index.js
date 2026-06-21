const {contextBridge, ipcRenderer} = require('electron');

/**
 * 预加载脚本 - 用于在渲染进程和主进程之间安全通信
 * 通过 contextBridge 将安全的 API 暴露给渲染进程
 */
contextBridge.exposeInMainWorld('api', {

    /**
     * 应用信息模块
     * 提供应用基础信息相关功能
     */
    appInfo: {
        // 获取应用程序版本号
        getVersion: () => ipcRenderer.invoke('appInfo:get-version'),
        // 获取 Chrome 版本号
        getChromeVersion: () => ipcRenderer.invoke('appInfo:get-chrome-version'),
    },

    /**
     * 开发者工具模块
     * 提供开发相关的功能，如打开开发者模式、关闭开发者模式等功能
     */
    develop: {
        // 打开开发者模式
        openDevelopMode: () => ipcRenderer.invoke('develop:open-dev-mode'),
        // 关闭开发者模式
        closeDevelopMode: () => ipcRenderer.invoke('develop:close-dev-mode'),
    },

    /**
     * 主窗口控制
     * 提供主窗口的显示、隐藏、最小化、最大化、关闭、刷新、设置标题等功能
     */
    mainWin: {
        minimize: () => ipcRenderer.invoke('mainWin:minimize'),
        toggleMaximize: () => ipcRenderer.invoke('mainWin:toggleMaximize'),
        close: () => ipcRenderer.invoke('mainWin:close'),
        hide: () => ipcRenderer.invoke('mainWin:hide'),
        quit: () => ipcRenderer.invoke('mainWin:quit'),
        reload: () => ipcRenderer.invoke('mainWin:reload'),
        setTitle: (title) => ipcRenderer.invoke('mainWin:setTitle', title),
        openExternal: (url) => ipcRenderer.invoke('mainWin:open-external', url),
    },

    /**
     * Redis 连接管理模块
     * 提供 Redis 连接、命令执行等功能
     */
    redis: {
        // 测试连接
        testConnection: (config) => ipcRenderer.invoke('redis:testConnection', config),
        // 创建连接（如果连接已存在，会自动关闭旧连接并创建新连接）
        // 连接状态变化通过事件通知，不返回结果，需要监听 onConnectionStatusChanged 事件
        connect: (connectionId, config) => ipcRenderer.invoke('redis:connect', connectionId, config),
        // 关闭连接
        disconnect: (connectionId) => ipcRenderer.invoke('redis:disconnect', connectionId),
        // 执行 Redis 命令
        executeCommand: (connectionId, command, args) => ipcRenderer.invoke('redis:execute-command', connectionId, command, args),
        // 切换数据库
        selectDatabase: (connectionId, dbIndex) => ipcRenderer.invoke('redis:select-database', connectionId, dbIndex),
        // 监听连接状态变化事件
        onConnectionStatusChanged: (callback) => {
            ipcRenderer.on('redis:connection-status-changed', (event, data) => {
                callback(data);
            });
        },
        // 移除连接状态变化事件监听器
        removeConnectionStatusListener: () => {
            ipcRenderer.removeAllListeners('redis:connection-status-changed');
        },
    },

})