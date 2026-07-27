/**
 * 开发者工具快捷键配置。
 * macOS 遵循系统常用的 Option + Command + I，其他平台使用 Ctrl + Shift + I。
 */

const MACOS_DEVTOOLS_SHORTCUT = 'Command+Alt+I'
const DEFAULT_DEVTOOLS_SHORTCUT = 'CommandOrControl+Shift+I'

// main 进程中的快捷键拦截和恢复必须共用同一个平台值，避免开发者模式开关失效。
export const DEVTOOLS_SHORTCUT = process.platform === 'darwin'
    ? MACOS_DEVTOOLS_SHORTCUT
    : DEFAULT_DEVTOOLS_SHORTCUT
