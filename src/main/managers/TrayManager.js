/**
 * 系统托盘管理模块。
 * 负责创建托盘图标、托盘右键菜单，以及托盘入口对主窗口的显示/隐藏控制。
 */
import electron from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createLogger } from '../utils/logger.js'
import { getMainWindow } from '../windows/mainWindow.js'
import { tMain } from '../utils/mainI18n.js'

const { app, Menu, nativeImage, Tray } = electron
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const log = createLogger('tray')

// 托盘显示文本：Windows 鼠标悬浮提示和部分系统菜单会使用这个名称。
const TRAY_TOOLTIP = 'Other Redis Desktop Manager'

// 托盘图标尺寸：Windows 托盘区域更适合 16px 图标，避免图标被系统缩放得发虚。
const TRAY_ICON_SIZE = 16

/**
 * 获取开发环境下的图标目录。
 *
 * @returns {string} 项目内图标目录绝对路径
 */
const getDevelopmentIconDir = () => {
    return path.join(__dirname, '../../../assets/icons')
}

/**
 * 获取打包环境下的图标目录。
 * electron-builder 会通过 extraResources 把 assets/icons 复制到 process.resourcesPath 下。
 *
 * @returns {string} 打包产物中的图标目录绝对路径
 */
const getPackagedIconDir = () => {
    return path.join(process.resourcesPath, 'assets/icons')
}

/**
 * 获取当前平台对应的托盘图标路径。
 *
 * @returns {string} 托盘图标绝对路径
 */
const getTrayIconPath = () => {
    const iconFileName = process.platform === 'win32' ? 'logo.ico' : 'logo.png'
    const candidatePaths = app.isPackaged
        ? [
            path.join(getPackagedIconDir(), iconFileName),
            path.join(getDevelopmentIconDir(), iconFileName)
        ]
        : [
            path.join(getDevelopmentIconDir(), iconFileName),
            path.join(getPackagedIconDir(), iconFileName)
        ]

    const iconPath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath))

    if (!iconPath) {
        log.warn('未找到托盘图标文件', {
            iconFileName,
            candidatePaths
        })

        return candidatePaths[0]
    }

    return iconPath
}

/**
 * 创建托盘图标。
 *
 * @returns {Electron.NativeImage} 托盘图标对象
 */
const createTrayIcon = () => {
    const iconPath = getTrayIconPath()
    const icon = nativeImage.createFromPath(iconPath)

    if (icon.isEmpty()) {
        log.warn(`托盘图标加载失败: ${iconPath}`)
    }

    log.info('加载托盘图标', {
        iconPath,
        isPackaged: app.isPackaged,
        platform: process.platform
    })

    // Windows 下明确关闭模板图模式，避免图标颜色被系统当成单色模板处理。
    if (process.platform === 'win32') {
        icon.setTemplateImage(false)
    }

    return icon.resize({
        width: TRAY_ICON_SIZE,
        height: TRAY_ICON_SIZE
    })
}

/**
 * 系统托盘管理器。
 * 内部持有 Electron Tray 实例，对外只暴露创建、销毁和窗口控制能力。
 */
class TrayManager {
    constructor() {
        // Electron Tray 实例：应用退出前需要主动 destroy，避免托盘图标残留。
        this.tray = null
        this.init()
    }

    /**
     * 初始化系统托盘。
     * 创建托盘图标、绑定左键点击行为，并挂载右键菜单。
     */
    init() {
        if (this.tray) {
            return
        }

        this.tray = new Tray(createTrayIcon())
        this.tray.setToolTip(TRAY_TOOLTIP)

        // 左键点击托盘时唤醒主窗口，和右键菜单里的“显示窗口”保持一致。
        this.tray.on('click', () => {
            this.showWindow()
        })

        this.updateMenu()
        log.info('系统托盘创建完成')
    }

    /**
     * 构建托盘菜单模板。
     *
     * @returns {Electron.MenuItemConstructorOptions[]} 托盘菜单配置
     */
    buildMenuTemplate() {
        return [
            {
                label: tMain('tray.showWindow'),
                click: () => this.showWindow()
            },
            {
                label: tMain('tray.hideWindow'),
                click: () => this.hideWindow()
            },
            {
                type: 'separator'
            },
            {
                label: tMain('tray.quit'),
                click: () => app.quit()
            }
        ]
    }

    /**
     * 更新托盘右键菜单。
     * 后续如果菜单需要随连接状态变化，可以复用这个入口重新生成菜单。
     */
    updateMenu() {
        if (!this.tray) {
            log.warn('托盘尚未创建，无法更新菜单')
            return
        }

        this.tray.setContextMenu(Menu.buildFromTemplate(this.buildMenuTemplate()))
    }

    /**
     * 显示并聚焦主窗口。
     */
    showWindow() {
        const mainWindow = getMainWindow()

        if (!mainWindow) {
            log.warn('未找到主窗口实例，无法从托盘显示窗口')
            return
        }

        mainWindow.show()
    }

    /**
     * 隐藏主窗口到托盘。
     */
    hideWindow() {
        const mainWindow = getMainWindow()

        if (!mainWindow) {
            log.warn('未找到主窗口实例，无法从托盘隐藏窗口')
            return
        }

        mainWindow.hide()
    }

    /**
     * 销毁托盘实例。
     * Electron 退出前调用，避免 Windows 托盘区域短暂残留旧图标。
     */
    destroy() {
        if (!this.tray) {
            return
        }

        this.tray.destroy()
        this.tray = null
        log.info('系统托盘已销毁')
    }
}

// 托盘管理器单例：整个主进程生命周期内只创建一个托盘入口。
let trayManagerInstance = null

/**
 * 创建或获取托盘管理器实例。
 *
 * @returns {TrayManager} 托盘管理器实例
 */
export const createTrayManager = () => {
    if (!trayManagerInstance) {
        trayManagerInstance = new TrayManager()
    }

    return trayManagerInstance
}

/**
 * 销毁当前托盘管理器实例。
 */
export const destroyTrayManager = () => {
    if (!trayManagerInstance) {
        return
    }

    trayManagerInstance.destroy()
    trayManagerInstance = null
}

/**
 * 刷新托盘菜单语言。
 * renderer 同步语言变化后调用，保证系统托盘右键菜单跟随应用语言。
 */
export const refreshTrayMenuLanguage = () => {
    if (!trayManagerInstance) {
        return
    }

    trayManagerInstance.updateMenu()
}
