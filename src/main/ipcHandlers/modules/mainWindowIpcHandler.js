/**
 * 主窗口 IPC 模块。
 * 向渲染进程暴露最小化、最大化、关闭、隐藏、重载、标题设置和外部链接打开能力。
 */
import electron from 'electron'
import {getMainWindow} from '../../windows/mainWindow.js'
import {createLogger} from '../../utils/logger.js'
import {tMain} from '../../utils/mainI18n.js'

const {ipcMain, shell} = electron
const log = createLogger('main-window-ipc')

// 允许从应用内打开的外部链接协议，避免 renderer 传入 file/javascript 等危险协议。
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * 执行依赖主窗口实例的操作。
 *
 * @param {string} actionName - 操作名称，用于日志排查
 * @param {(mainWindow: ReturnType<typeof getMainWindow>) => void} action - 主窗口操作函数
 * @returns {{ success: boolean, error?: string }} 操作结果
 */
const withMainWindow = (actionName, action) => {
    const mainWindow = getMainWindow()

    if (!mainWindow) {
        const error = tMain('mainWindow.missing')
        log.warn(`${actionName} 失败: ${error}`)
        return {success: false, error}
    }

    action(mainWindow)
    return {success: true}
}

/**
 * 规范化窗口标题。
 *
 * @param {unknown} title - renderer 传入的标题
 * @returns {string} 可安全传给窗口管理器的标题文本
 */
const normalizeWindowTitle = (title) => {
    if (typeof title !== 'string') {
        return ''
    }

    return title.trim()
}

/**
 * 校验并打开外部链接。
 *
 * @param {unknown} url - renderer 传入的外部链接
 * @returns {Promise<{ success: boolean, error?: string }>} 打开结果
 */
const openExternalUrl = async (url) => {
    try {
        if (typeof url !== 'string' || !url.trim()) {
            throw new Error(tMain('mainWindow.externalUrlRequired'))
        }

        // 使用 URL 标准解析，统一拦截非法链接和不允许的协议。
        const parsedUrl = new URL(url.trim())

        if (!ALLOWED_EXTERNAL_PROTOCOLS.has(parsedUrl.protocol)) {
            throw new Error(tMain('mainWindow.unsupportedProtocol', {value: parsedUrl.protocol}))
        }

        await shell.openExternal(parsedUrl.toString())
        return {success: true}
    } catch (error) {
        const message = error.message || tMain('mainWindow.openExternalFail')
        log.warn(message, {url})
        return {success: false, error: message}
    }
}

// 主窗口 IPC 通道注册表：窗口操作统一走 withMainWindow，降低重复空判断。
const MAIN_WINDOW_IPC_HANDLERS = [
    {
        channel: 'mainWin:minimize',
        description: '最小化主窗口',
        handler: () => withMainWindow('最小化主窗口', (mainWindow) => mainWindow.minimize())
    },
    {
        channel: 'mainWin:toggleMaximize',
        description: '切换主窗口最大化状态',
        handler: () => withMainWindow('切换主窗口最大化状态', (mainWindow) => mainWindow.toggleMaximize())
    },
    {
        channel: 'mainWin:close',
        description: '关闭主窗口',
        handler: () => withMainWindow('关闭主窗口', (mainWindow) => mainWindow.close())
    },
    {
        channel: 'mainWin:hide',
        description: '隐藏主窗口到托盘',
        handler: () => withMainWindow('隐藏主窗口到托盘', (mainWindow) => mainWindow.hide())
    },
    {
        channel: 'mainWin:quit',
        description: '退出应用',
        handler: () => withMainWindow('退出应用', (mainWindow) => mainWindow.quit())
    },
    {
        channel: 'mainWin:reload',
        description: '重新加载主窗口',
        handler: () => withMainWindow('重新加载主窗口', (mainWindow) => mainWindow.reload())
    },
    {
        channel: 'mainWin:setTitle',
        description: '设置主窗口标题',
        handler: (event, title) => withMainWindow('设置主窗口标题', (mainWindow) => {
            mainWindow.setTitle(normalizeWindowTitle(title))
        })
    },
    {
        channel: 'mainWin:open-external',
        description: '打开外部链接',
        handler: (event, url) => openExternalUrl(url)
    }
]

/**
 * 注册主窗口控制相关 IPC 处理器。
 */
export default () => {
    for (const {channel, description, handler} of MAIN_WINDOW_IPC_HANDLERS) {
        ipcMain.handle(channel, handler)
        log.info(`主窗口 IPC 已注册: ${channel} - ${description}`)
    }
}
