/**
 * 开发能力 IPC 模块。
 * 控制开发者工具快捷键的启用状态，供设置页的开发模式开关调用。
 */
import electron from 'electron'
import {createLogger} from '../../utils/logger.js'

const {globalShortcut, ipcMain} = electron
const log = createLogger('develop-ipc')

// Electron 默认打开开发者工具的快捷键。
const DEVTOOLS_SHORTCUT = 'CommandOrControl+Shift+I'

/**
 * 启用开发者工具快捷键。
 * 通过卸载拦截器恢复 Electron 对该快捷键的默认处理。
 */
const enableDevToolsShortcut = () => {
    globalShortcut.unregister(DEVTOOLS_SHORTCUT)
    log.info(`开发者工具快捷键已启用: ${DEVTOOLS_SHORTCUT}`)
}

/**
 * 禁用开发者工具快捷键。
 * 先卸载旧注册再注册空处理器，避免重复注册导致状态不可预期。
 */
const disableDevToolsShortcut = () => {
    globalShortcut.unregister(DEVTOOLS_SHORTCUT)

    const registered = globalShortcut.register(DEVTOOLS_SHORTCUT, () => {
    })

    if (!registered) {
        log.warn(`开发者工具快捷键禁用失败: ${DEVTOOLS_SHORTCUT}`)
        return
    }

    log.info(`开发者工具快捷键已禁用: ${DEVTOOLS_SHORTCUT}`)
}

// 开发相关 IPC 通道注册表：只负责开发模式能力，不承担业务逻辑。
const DEVELOP_IPC_HANDLERS = [
    {
        channel: 'develop:open-dev-mode',
        description: '打开开发者模式',
        handler: enableDevToolsShortcut
    },
    {
        channel: 'develop:close-dev-mode',
        description: '关闭开发者模式',
        handler: disableDevToolsShortcut
    }
]

/**
 * 注册开发相关 IPC 处理器。
 */
export default () => {
    for (const {channel, description, handler} of DEVELOP_IPC_HANDLERS) {
        ipcMain.handle(channel, handler)
        log.info(`开发 IPC 已注册: ${channel} - ${description}`)
    }
}
