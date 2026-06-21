/**
 * Electron 主窗口管理模块。
 * 负责创建主业务窗口，并提供最小化、最大化、隐藏、重载、标题设置等窗口控制能力。
 */
import electron from 'electron'
import {
    createSecureWebPreferences,
    loadRendererRoute,
    loadVueDevToolsInDevelopment
} from '../managers/WindowsManager.js'

const { app, BrowserWindow, screen } = electron

/**
 * 根据主屏幕工作区计算主窗口初始尺寸。
 * 这里使用可用工作区的 75%，避免窗口首次打开时压住系统任务栏或过度占满屏幕。
 *
 * @returns {{ width: number, height: number }} 主窗口初始宽高
 */
const getInitialWindowSize = () => {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

    return {
        width: Math.floor(screenWidth * 0.75),
        height: Math.floor(screenHeight * 0.75)
    }
}

/**
 * 主窗口管理类。
 * 对外暴露的是窗口控制方法，而不是直接让其他模块操作 BrowserWindow 细节。
 */
class MainWindow {
    constructor() {
        // 主窗口 BrowserWindow 实例：IPC 和托盘模块会通过 getMainWindow() 间接访问。
        this.win = null
        this.createWindow()
    }

    /**
     * 创建主窗口。
     * 使用无边框窗口承载自定义标题栏，并启用安全的 preload 边界配置。
     */
    createWindow() {
        const { width, height } = getInitialWindowSize()

        this.win = new BrowserWindow({
            width,
            height,
            minWidth: 1024,
            minHeight: 768,
            autoHideMenuBar: true,
            frame: false,
            center: true,
            webPreferences: createSecureWebPreferences()
        })

        // 主窗口关闭后释放单例引用，方便后续需要时重新创建窗口。
        this.win.on('closed', () => {
            this.win = null
            mainWindowInstance = null
        })

        this.loadContent()
    }

    /**
     * 加载主页面内容。
     * 开发期会尝试加载 Vue DevTools，但扩展缺失不会影响主窗口启动。
     */
    async loadContent() {
        await loadVueDevToolsInDevelopment()

        // 主页面统一走 renderer hash 路由，生产/开发地址由窗口配置工具处理。
        await loadRendererRoute(this.win, '#/main')
    }

    /**
     * 显示窗口并使其获得焦点。
     * 如果窗口已经最小化，先恢复再显示，保证二次启动或托盘唤醒时可见。
     */
    show() {
        if (!this.win) {
            return
        }

        if (this.win.isMinimized()) {
            this.win.restore()
        }

        this.win.show()
        this.win.focus()
    }

    /**
     * 最小化主窗口。
     */
    minimize() {
        this.win?.minimize()
    }

    /**
     * 在最大化和还原之间切换。
     */
    toggleMaximize() {
        if (!this.win) {
            return
        }

        if (this.win.isMaximized()) {
            this.win.unmaximize()
            return
        }

        this.win.maximize()
    }

    /**
     * 关闭主窗口。
     */
    close() {
        this.win?.close()
    }

    /**
     * 隐藏主窗口。
     * 当前应用使用托盘常驻模式，隐藏后可从托盘重新显示。
     */
    hide() {
        this.win?.hide()
    }

    /**
     * 退出应用。
     * app.quit() 会触发主进程统一退出清理逻辑。
     */
    quit() {
        app.quit()
    }

    /**
     * 重新加载当前页面。
     */
    reload() {
        this.win?.reload()
    }

    /**
     * 设置窗口标题。
     *
     * @param {string} title - 窗口标题文本
     */
    setTitle(title) {
        this.win?.setTitle(title || 'Other Redis Desktop Manager')
    }
}

// 主窗口单例：整个应用生命周期内只保留一个主窗口管理实例。
let mainWindowInstance = null

/**
 * 创建主窗口实例。
 *
 * @returns {MainWindow} 主窗口管理实例
 */
export const createMainWindow = () => {
    if (!mainWindowInstance) {
        mainWindowInstance = new MainWindow()
    }

    return mainWindowInstance
}

/**
 * 获取当前主窗口实例。
 *
 * @returns {MainWindow | null} 当前主窗口管理实例
 */
export const getMainWindow = () => mainWindowInstance
