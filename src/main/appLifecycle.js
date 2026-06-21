/**
 * Electron 主进程生命周期编排模块。
 * 负责单实例控制、应用初始化、系统事件注册和退出前资源清理。
 */
import electron from 'electron'
import { registerAllIpcHandlers } from './ipcHandlers/ipcMain.js'
import { redisConnectionManager } from './managers/RedisConnectionManager.js'
import { createTrayManager, destroyTrayManager } from './managers/TrayManager.js'
import { createLogger } from './utils/logger.js'
import { getMainWindow } from './windows/mainWindow.js'
import { createSplashWindow } from './windows/splashWindow.js'

const { app, BrowserWindow, globalShortcut } = electron
const log = createLogger('main')

// Redis 连接退出清理状态：避免 before-quit 被多次触发时重复关闭连接。
let isRedisCleanupRunning = false
let isRedisCleanupCompleted = false

/**
 * 聚焦当前已有主窗口。
 * 用于处理应用二次启动、托盘唤醒等需要回到现有窗口的场景。
 */
const focusMainWindow = () => {
    const mainWindow = getMainWindow()

    if (!mainWindow) {
        log.warn('未找到主窗口实例，无法聚焦')
        return
    }

    log.info('聚焦到现有主窗口')
    mainWindow.show()
}

/**
 * 注册默认禁用的开发者工具快捷键。
 * 开发者模式开启后会由 developIpcHandler 重新接管该快捷键。
 */
const registerDefaultShortcutGuards = () => {
    globalShortcut.register('CommandOrControl+Shift+I', () => {
        // 默认拦截开发者工具快捷键，避免生产模式下误打开 DevTools。
    })
}

/**
 * 初始化应用基础能力。
 * 顺序上先注册 IPC，再创建窗口，保证渲染进程加载后可以立即调用 preload 暴露的 API。
 */
const initializeApp = async () => {
    log.info('应用初始化开始')

    // IPC 处理器必须先于窗口创建完成，避免页面首屏加载时出现 handler 未注册。
    await registerAllIpcHandlers()
    log.info('IPC 处理器注册完成')

    // 启动屏负责过渡到主窗口，避免主页面初始化期间出现空白窗口。
    await createSplashWindow()
    log.info('启动屏幕创建完成')

    // 托盘负责窗口隐藏后的唤醒和应用退出入口。
    createTrayManager()
    log.info('系统托盘创建完成')

    // 注册默认禁用的开发者工具快捷键
    registerDefaultShortcutGuards()
    log.info('默认禁用开发者工具快捷键')

    log.info('应用初始化完成')
}

/**
 * 关闭 Redis 长连接后继续退出应用。
 * before-quit 支持 preventDefault，这里用一次拦截保证 socket 有机会释放。
 *
 * @param {Electron.Event} event - Electron before-quit 事件
 */
const cleanupRedisConnectionsBeforeQuit = (event) => {
    log.info('应用准备退出')

    if (isRedisCleanupCompleted || isRedisCleanupRunning) {
        return
    }

    event.preventDefault()
    isRedisCleanupRunning = true

    redisConnectionManager.closeAllRedisConnections()
        .then(() => {
            log.info('Redis 连接已全部关闭')
        })
        .catch((error) => {
            log.error('关闭全部 Redis 连接失败', error)
        })
        .finally(() => {
            // 不论清理是否完全成功，都放行退出流程，避免应用卡死在退出阶段。
            isRedisCleanupRunning = false
            isRedisCleanupCompleted = true
            app.quit()
        })
}

/**
 * 注册 Electron 应用级事件。
 * 这里集中管理生命周期事件，避免入口文件被大量 app.on(...) 打散。
 */
const registerAppEventHandlers = () => {
    // 第二个实例启动时，把用户带回已经存在的主窗口。
    app.on('second-instance', () => {
        log.info('检测到第二个实例启动，尝试聚焦现有窗口')
        focusMainWindow()
    })

    // 所有窗口关闭后仍保持应用进程，允许用户从托盘重新唤醒或退出。
    app.on('window-all-closed', () => {
        log.info('所有窗口已关闭，应用保持托盘常驻')
    })

    // macOS dock 激活时，如果没有窗口则重新创建启动屏流程。
    app.on('activate', () => {
        log.info('应用被激活')

        if (BrowserWindow.getAllWindows().length === 0) {
            log.info('当前没有窗口，重新创建启动屏幕')
            createSplashWindow()
        }
    })

    app.on('before-quit', cleanupRedisConnectionsBeforeQuit)

    // 应用即将退出时释放全局快捷键，避免主进程退出阶段仍残留注册状态。
    app.on('will-quit', () => {
        log.info('应用即将退出，释放全局快捷键')
        destroyTrayManager()
        globalShortcut.unregisterAll()
    })
}

/**
 * 获取单实例锁。
 * 如果已有实例运行，当前进程会立即退出。
 *
 * @returns {boolean} 是否成功获得单实例锁
 */
const ensureSingleInstance = () => {
    const gotTheLock = app.requestSingleInstanceLock()

    if (gotTheLock) {
        return true
    }

    log.warn('应用已在运行，退出新实例')
    app.quit()
    process.exit(0)
}

/**
 * 启动主进程应用。
 * index.js 只调用该方法，让入口文件保持简洁。
 */
export const bootstrapMainProcess = () => {
    if (!ensureSingleInstance()) {
        return
    }

    registerAppEventHandlers()

    // Electron 准备完成后初始化 IPC、窗口、托盘和全局快捷键。
    app.whenReady()
        .then(initializeApp)
        .catch((error) => {
            log.error('应用初始化异常', error)
            app.quit()
        })
}
