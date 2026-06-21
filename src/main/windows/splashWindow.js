/**
 * Electron 启动窗口管理模块。
 * 负责展示启动页，并在短暂过渡后关闭启动窗口、创建主业务窗口。
 */
import electron from 'electron'
import { createSecureWebPreferences, loadRendererRoute } from '../managers/WindowsManager.js'
import { createMainWindow } from './mainWindow.js'
import { createLogger } from '../utils/logger.js'

const { BrowserWindow } = electron
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

        // 启动窗口关闭后释放单例引用，避免后续 activate 时拿到已销毁实例。
        this.win.on('closed', () => {
            this.win = null
            splashWindowInstance = null
        })

        this.loadContent()
    }

    /**
     * 加载启动页，并在启动页展示结束后创建主窗口。
     */
    async loadContent() {
        await loadRendererRoute(this.win, '#/splash')

        // 启动屏只承担视觉过渡；延迟结束后进入主窗口创建流程。
        setTimeout(() => {
            try {
                createMainWindow()
            } catch (error) {
                log.error('启动主窗口失败', error)
            } finally {
                // 无论主窗口是否创建成功，都关闭启动屏，避免透明窗口残留。
                this.close()
            }
        }, getSplashDelay())
    }

    /**
     * 关闭启动窗口。
     */
    close() {
        this.win?.close()
    }
}

// 启动窗口单例：避免重复创建多个启动页。
let splashWindowInstance = null

/**
 * 创建启动窗口实例。
 *
 * @returns {SplashWindow} 启动窗口管理实例
 */
export const createSplashWindow = () => {
    if (!splashWindowInstance) {
        splashWindowInstance = new SplashWindow()
    }

    return splashWindowInstance
}
