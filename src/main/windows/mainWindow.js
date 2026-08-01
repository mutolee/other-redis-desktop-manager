/**
 * Electron 主窗口管理模块。
 * 负责创建主业务窗口，并提供最小化、最大化、隐藏、重载、标题设置等窗口控制能力。
 */
import electron from 'electron'
import {attachRendererDiagnostics, createSecureWebPreferences, loadRendererRoute, loadVueDevToolsInDevelopment} from '../managers/WindowsManager.js'
import {releaseMainWindow, reserveMainWindow} from './windowState.js'

const {app, BrowserWindow, screen} = electron

const DEFAULT_WINDOW_RATIO = 0.75
const DEFAULT_MIN_WINDOW_SIZE = {
    width: 1024,
    height: 768
}

/**
 * 根据主屏幕工作区计算主窗口初始尺寸。
 * 这里使用可用工作区的 75%，避免窗口首次打开时压住系统任务栏或过度占满屏幕。
 *
 * @returns {{ width: number, height: number }} 主窗口初始宽高
 */
const getInitialWindowSize = () => {
    const {width: screenWidth, height: screenHeight} = screen.getPrimaryDisplay().workAreaSize

    return {
        width: Math.max(DEFAULT_MIN_WINDOW_SIZE.width, Math.floor(screenWidth * DEFAULT_WINDOW_RATIO)),
        height: Math.max(DEFAULT_MIN_WINDOW_SIZE.height, Math.floor(screenHeight * DEFAULT_WINDOW_RATIO))
    }
}

/**
 * 主窗口管理类。
 * 对外暴露的是窗口控制方法，而不是直接让其他模块操作 BrowserWindow 细节。
 */
class MainWindow {
    constructor() {
        // 主窗口 BrowserWindow 实例，IPC 和托盘模块会通过 getMainWindow() 间接访问。
        this.win = null
        // 原生关闭请求统一转交 renderer 关闭流程，真正退出应用时才允许 BrowserWindow 销毁。
        this.allowClose = false
        this.createWindow()
    }

    /**
     * 创建主窗口。
     * 使用无边框窗口承载自定义标题栏，并启用安全的 preload 边界配置。
     */
    createWindow() {
        const {width, height} = getInitialWindowSize()

        this.win = new BrowserWindow({
            width,
            height,
            minWidth: DEFAULT_MIN_WINDOW_SIZE.width,
            minHeight: DEFAULT_MIN_WINDOW_SIZE.height,
            autoHideMenuBar: true,
            frame: false,
            center: true,
            webPreferences: createSecureWebPreferences()
        })

        // 渲染诊断：生产环境白屏时输出 loadFile 和 renderer 控制台错误，便于 macOS 打包排查。
        attachRendererDiagnostics(this.win)

        if (process.platform === 'darwin') {
            // macOS Retina 屏幕下整体视觉密度偏大，轻量缩放渲染页面以保持桌面工具的紧凑感。
            this.win.webContents.setZoomFactor(0.9)
        }

        this.win.on('closed', () => {
            this.win = null
            mainWindowInstance = null
            releaseMainWindow()
        })

        // Command+W 等原生关闭动作与自定义标题栏使用同一套关闭行为。
        this.win.on('close', (event) => {
            if (this.allowClose || this.win?.webContents.isDestroyed()) {
                return
            }

            event.preventDefault()
            this.win?.webContents.send('mainWin:close-requested')
        })

        this.loadContent()
    }

    /**
     * 加载主页面内容。
     * 开发期会尝试加载 Vue DevTools，但扩展缺失不会影响主窗口启动。
     */
    async loadContent() {
        await loadVueDevToolsInDevelopment()

        // 主页面统一走 renderer hash 路由，生产和开发地址由窗口配置工具处理。
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

        // macOS 被 app.hide() 隐藏后，仅 BrowserWindow.show() 可能无法重新激活应用，需要先唤回应用本身。
        if (process.platform === 'darwin') {
            app.show()
        }

        if (this.win.isMinimized()) {
            this.win.restore()
        }

        this.win.show()
        this.win.focus()

        // macOS 从托盘或 Dock 唤回时，显式置顶一次可以避免窗口仍停留在其他应用后方。
        if (process.platform === 'darwin' && typeof this.win.moveTop === 'function') {
            this.win.moveTop()
        }
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
     * 标记主窗口允许随应用退出流程销毁。
     */
    prepareForQuit() {
        this.allowClose = true
    }

    /**
     * 隐藏主窗口。
     * 当前应用使用托盘常驻模式，隐藏后可从托盘重新显示。
     */
    hide() {
        if (!this.win) {
            return
        }

        this.win.hide()
    }

    /**
     * 退出应用。
     * app.quit() 会触发主进程统一退出清理逻辑。
     */
    quit() {
        this.prepareForQuit()
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
 * @returns {MainWindow|null} 主窗口管理实例，Splash 存在时返回 null
 */
export const createMainWindow = () => {
    if (mainWindowInstance) {
        return mainWindowInstance
    }

    if (!reserveMainWindow()) {
        return null
    }

    try {
        mainWindowInstance = new MainWindow()
    } catch (error) {
        releaseMainWindow()
        throw error
    }

    return mainWindowInstance
}

/**
 * 获取当前主窗口实例。
 *
 * @returns {MainWindow | null} 当前主窗口管理实例
 */
export const getMainWindow = () => mainWindowInstance
