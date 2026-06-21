import {globalShortcut, ipcMain} from "electron";

/**
 * 注册开发相关的 IPC 处理器
 * 提供开发者工具、调试等功能
 */
export default () => {

    /**
     * 打开开发者模式
     */
    ipcMain.handle('develop:open-dev-mode', () => {
        // 卸载`开发者工具快捷键`事件，恢复默认行为，
        // 因为Electron默认支持快捷键打开开发者工具
        globalShortcut.unregister('CommandOrControl+Shift+I')
    })

    /**
     * 关闭开发者模式
     */
    ipcMain.handle('develop:close-dev-mode', () => {
        // 禁用开发者工具快捷键
        globalShortcut.register('CommandOrControl+Shift+I', () => {
            // 当按下 CommandOrControl+Shift+I 快捷键时，什么也不做
        })
    })
}