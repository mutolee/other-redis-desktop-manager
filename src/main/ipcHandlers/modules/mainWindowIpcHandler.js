import {ipcMain, shell} from "electron";
import {getMainWindow} from "../../windows/mainWindow.js";

/**
 * 注册主窗口控制的 IPC 处理函数
 * 提供主窗口控制功能，如最小化、最大化、关闭、重新加载、设置标题等
 */
export default () => {

    /**
     * 最小化窗口处理
     * @returns {void}
     */
    ipcMain.handle('mainWin:minimize', () => {
        let mainWin = getMainWindow();
        if (mainWin) {
            mainWin.minimize();
        }
    });

    /**
     * 切换最大化状态处理
     * @returns {void}
     */
    ipcMain.handle('mainWin:toggleMaximize', () => {
        let mainWin = getMainWindow();
        if (mainWin) {
            mainWin.toggleMaximize();
        }
    });

    /**
     * 关闭窗口处理
     * @returns {void}
     */
    ipcMain.handle('mainWin:close', () => {
        let mainWin = getMainWindow();
        if (mainWin) {
            mainWin.close();
        }
    });

    /**
     * 隐藏窗口到托盘处理
     * @returns {void}
     */
    ipcMain.handle('mainWin:hide', () => {
        let mainWin = getMainWindow();
        if (mainWin) {
            mainWin.hide();
        }
    });

    /**
     * 退出应用处理
     * @returns {void}
     */
    ipcMain.handle('mainWin:quit', () => {
        let mainWin = getMainWindow();
        if (mainWin) {
            mainWin.quit();
        }
    });

    /**
     * 重新加载页面处理
     * @returns {void}
     */
    ipcMain.handle('mainWin:reload', () => {
        let mainWin = getMainWindow();
        if (mainWin) {
            mainWin.reload();
        }
    });

    /**
     * 设置窗口标题处理
     * @param {string} title - 新的标题
     * @returns {void}
     */
    ipcMain.handle('mainWin:setTitle', (event, title) => {
        let mainWin = getMainWindow();
        if (mainWin) {
            mainWin.setTitle(title);
        }
    });

    /**
     * 打开外部链接处理
     * @param {string} url - 要打开的 URL
     * @returns {Promise<void>}
     */
    ipcMain.handle('mainWin:open-external', async (event, url) => {
        await shell.openExternal(url);
    });
}