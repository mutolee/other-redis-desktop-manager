/**
 * Electron 主进程生命周期编排模块。
 * 负责单实例控制、应用初始化、系统事件注册和退出前资源清理。
 */
import electron from 'electron'
import {registerAllIpcHandlers} from './ipcHandlers/ipcMain.js'
import {redisConnectionManager} from './managers/RedisConnectionManager.js'
import {destroyTrayManager} from './managers/TrayManager.js'
import {DEVTOOLS_SHORTCUT} from './utils/developerShortcut.js'
import {createLogger} from './utils/logger.js'
import {getMainWindow} from './windows/mainWindow.js'
import {createSplashWindow, getSplashWindow} from './windows/splashWindow.js'

const {app, globalShortcut} = electron
const log = createLogger('main')

// 应用资源退出清理状态：避免 before-quit 被多次触发时重复关闭连接或写入历史文件。
let isResourceCleanupRunning = false
let isResourceCleanupCompleted = false
let isAppQuitting = false
const RESOURCE_CLEANUP_TIMEOUT_MS = 3000

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
 * 唤回应用主窗口。
 * 用于 macOS Dock 激活、第二实例启动等系统入口，优先显示已有主窗口，不存在时再走启动窗口流程。
 */
const activateMainWindow = () => {
    if (isAppQuitting) {
        log.info('应用正在退出，忽略窗口唤回请求')
        return
    }

    const mainWindow = getMainWindow()

    if (mainWindow) {
        focusMainWindow()
        return
    }

    log.info('当前没有主窗口，重新创建启动屏幕')
    createSplashWindow()
}

/**
 * 给异步清理增加兜底超时，避免 quit 被 Redis socket 或文件写入长时间卡住。
 *
 * @param {Promise<void>} cleanupPromise - 应用资源清理 Promise
 * @returns {Promise<void>} 带超时保护的清理 Promise
 */
const runResourceCleanupWithTimeout = (cleanupPromise) => {
    return Promise.race([
        cleanupPromise,
        new Promise((resolve) => {
            setTimeout(() => {
                log.warn(`应用资源清理超过 ${RESOURCE_CLEANUP_TIMEOUT_MS}ms，继续退出应用`)
                resolve()
            }, RESOURCE_CLEANUP_TIMEOUT_MS)
        })
    ])
}

/**
 * 释放应用级资源。
 * app.exit() 不再二次触发 before-quit，因此这里主动完成托盘和快捷键清理。
 */
const releaseAppResourcesBeforeExit = () => {
    destroyTrayManager()
    globalShortcut.unregisterAll()
}

/**
 * 注册默认禁用的开发者工具快捷键。
 * 开发者模式开启后会由 developIpcHandler 重新接管该快捷键。
 */
const registerDefaultShortcutGuards = () => {
    globalShortcut.register(DEVTOOLS_SHORTCUT, () => {
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

    // 注册默认禁用的开发者工具快捷键
    registerDefaultShortcutGuards()
    log.info('默认禁用开发者工具快捷键')

    log.info('应用初始化完成')
}

/**
 * 关闭 Redis 长连接并完成命令记录落盘后继续退出应用。
 * before-quit 支持 preventDefault，这里用一次拦截保证 socket 和文件队列有机会完成清理。
 *
 * @param {Electron.Event} event - Electron before-quit 事件
 */
const cleanupAppResourcesBeforeQuit = (event) => {
    log.info('应用准备退出')
    isAppQuitting = true
    getMainWindow()?.prepareForQuit()

    if (isResourceCleanupCompleted) {
        return
    }

    event.preventDefault()

    if (isResourceCleanupRunning) {
        log.info('应用资源清理正在进行，等待清理完成后继续退出')
        return
    }

    isResourceCleanupRunning = true

    const splashWindow = getSplashWindow()
    splashWindow?.prepareForQuit()
    const splashClosePromise = splashWindow?.close() || Promise.resolve()
    const cleanupPromise = Promise.all([
        splashClosePromise,
        redisConnectionManager.closeAllRedisConnections(),
        redisConnectionManager.closeCommandHistory()
    ])

    runResourceCleanupWithTimeout(cleanupPromise)
        .then(() => {
            log.info('Redis 连接和命令记录已完成退出清理')
        })
        .catch((error) => {
            log.error('应用资源退出清理失败', error)
        })
        .finally(() => {
            // 不论清理是否完全成功，都释放主进程资源并直接退出，避免 app.quit() 二次触发导致 macOS Dock 状态异常。
            isResourceCleanupRunning = false
            isResourceCleanupCompleted = true
            releaseAppResourcesBeforeExit()
            app.exit(0)
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
        activateMainWindow()
    })

    // 所有窗口关闭后仍保持应用进程，允许用户从托盘重新唤醒或退出。
    app.on('window-all-closed', () => {
        log.info('所有窗口已关闭，应用保持托盘常驻')
    })

    // macOS Dock 激活时优先唤回隐藏主窗口；没有主窗口时再重新创建启动屏流程。
    app.on('activate', () => {
        log.info('应用被激活')
        activateMainWindow()
    })

    app.on('before-quit', cleanupAppResourcesBeforeQuit)

    // 应用即将退出时释放全局快捷键，避免主进程退出阶段仍残留注册状态。
    app.on('will-quit', () => {
        log.info('应用即将退出，释放全局快捷键')
        releaseAppResourcesBeforeExit()
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
