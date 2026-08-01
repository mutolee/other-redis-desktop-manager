/**
 * Electron 启动窗口管理模块。
 * 负责展示启动页，并在短暂过渡后关闭启动窗口、创建主业务窗口。
 */
import electron from 'electron'
import {attachRendererDiagnostics, createSecureWebPreferences, loadRendererRoute} from '../managers/WindowsManager.js'
import {createTrayManager} from '../managers/TrayManager.js'
import {createMainWindow} from './mainWindow.js'
import {releaseSplashWindow, reserveSplashWindow} from './windowState.js'
import {createLogger} from '../utils/logger.js'

const {app, BrowserWindow} = electron
const log = createLogger('splash-window')

/**
 * 生成启动屏展示时长。
 * 保留随机延迟，让启动页过渡更自然，同时避免停留时间过短导致闪屏。
 *
 * @returns {number} 启动屏停留毫秒数
 */
const getSplashDelay = () => Math.floor(Math.random() * 3000) + 2000

/**
 * 启动窗口管理类。
 * 只负责启动页生命周期，不直接管理主窗口内部行为。
 */
class SplashWindow {
    constructor() {
        // 启动窗口 BrowserWindow 实例：创建主窗口后会主动关闭。
        this.win = null
        this.startupTimer = null
        this.startupCancelled = false
        this.isTransitioningToMain = false
        this.isAppQuitting = false
        this.createWindow()
    }

    /**
     * 创建启动窗口。
     * 使用透明、置顶、不可缩放窗口，配合渲染进程启动页形成独立启动画面。
     */
    createWindow() {
        this.win = new BrowserWindow({
            width: 500,
            height: 500,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            resizable: false,
            center: true,
            webPreferences: createSecureWebPreferences()
        })

        // 渲染诊断：启动屏白屏时输出加载失败和 renderer 控制台错误。
        attachRendererDiagnostics(this.win)

        // 启动窗口关闭后释放单例引用，避免后续 activate 时拿到已销毁实例。
        this.win.on('closed', () => {
            const shouldQuitApplication = !this.isTransitioningToMain && !this.isAppQuitting

            if (!this.isTransitioningToMain) {
                this.startupCancelled = true
            }

            if (this.startupTimer) {
                clearTimeout(this.startupTimer)
                this.startupTimer = null
            }

            this.win = null
            splashWindowInstance = null
            releaseSplashWindow()

            if (shouldQuitApplication) {
                app.quit()
            }
        })

        this.loadContent()
    }

    /**
     * 加载启动页，并在启动页展示结束后创建主窗口。
     */
    async loadContent() {
        await loadRendererRoute(this.win, '#/splash')

        if (this.startupCancelled || !this.win) {
            return
        }

        // 启动屏只承担视觉过渡；延迟结束后进入主窗口创建流程。
        this.startupTimer = setTimeout(async () => {
            this.startupTimer = null

            if (this.startupCancelled || !this.win) {
                return
            }

            this.isTransitioningToMain = true

            try {
                // 先等待 Splash 完全销毁，再创建 Main，保证两个 BrowserWindow 不会同时存在。
                await this.close(true)

                if (this.startupCancelled) {
                    return
                }

                const mainWindow = createMainWindow()

                if (!mainWindow) {
                    return
                }
                // 托盘必须等主窗口创建后再注册，避免 splash 期间点击托盘提前唤出主窗口。
                createTrayManager()
            } catch (error) {
                log.error('启动主窗口失败', error)
            } finally {
                this.isTransitioningToMain = false
            }
        }, getSplashDelay())
    }

    /**
     * 关闭启动窗口。
     */
    close(isTransition = false) {
        if (!isTransition) {
            this.startupCancelled = true
        }

        if (this.startupTimer) {
            clearTimeout(this.startupTimer)
            this.startupTimer = null
        }

        const window = this.win

        if (!window || window.isDestroyed()) {
            this.win = null
            splashWindowInstance = null
            releaseSplashWindow()
            return Promise.resolve()
        }

        return new Promise((resolve) => {
            let settled = false
            const finish = () => {
                if (settled) {
                    return
                }

                settled = true
                resolve()
            }

            window.once('closed', finish)
            window.close()

            if (window.isDestroyed()) {
                finish()
            }
        })
    }

    /**
     * 标记 Splash 正在随应用退出流程关闭，避免 closed 事件再次触发 app.quit。
     */
    prepareForQuit() {
        this.isAppQuitting = true
    }
}

// 启动窗口单例：避免重复创建多个启动页。
let splashWindowInstance = null

/**
 * 创建启动窗口实例。
 *
 * @returns {SplashWindow|null} 启动窗口管理实例，Main 存在时返回 null
 */
export const createSplashWindow = () => {
    if (splashWindowInstance) {
        return splashWindowInstance
    }

    if (!reserveSplashWindow()) {
        return null
    }

    try {
        splashWindowInstance = new SplashWindow()
    } catch (error) {
        releaseSplashWindow()
        throw error
    }

    return splashWindowInstance
}

/**
 * 获取当前 Splash 窗口管理实例。
 *
 * @returns {SplashWindow|null} 当前 Splash 窗口实例
 */
export const getSplashWindow = () => splashWindowInstance
