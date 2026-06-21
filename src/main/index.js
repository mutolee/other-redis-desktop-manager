/**
 * Electron 主进程入口文件
 * 负责应用生命周期管理、窗口创建和 IPC 通信
 */
import {app, BrowserWindow, globalShortcut} from 'electron'
import {getMainWindow} from "./windows/mainWindow.js";
import {registerAllIpcHandlers} from "./ipcHandlers/ipcMain.js";
import {createSplashWindow} from "./windows/splashWindow.js";
import {createTrayManager} from "./utils/TrayManager.js";

/**
 * 防止应用多开 - 确保同时只有一个实例运行
 * requestSingleInstanceLock() 返回布尔值表示是否成功获取锁
 */
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    // 如果获取锁失败，说明已经有一个实例在运行了
    console.log('应用已在运行，退出新实例')
    app.quit()
    process.exit(0) // 明确退出进程
}

/**
 * 处理第二个实例启动事件
 * 当已运行的实例收到启动命令时触发（用户再次点击应用图标）
 */
app.on('second-instance', () => {
    console.log('第二个实例尝试启动，聚焦到现有窗口')
    focusMainWindow()
})

/**
 * 应用准备就绪事件处理
 * whenReady() 是比 ready 更安全的异步等待方法
 * 确保所有必要的资源都已加载完成
 */
app.whenReady().then(async () => {
    try {
        console.log('应用初始化开始...')

        // 注册所有 IPC 处理器 - 建立主进程与渲染进程通信桥梁
        await registerAllIpcHandlers()
        console.log('✅ IPC处理器注册完成')

        // 创建启动屏幕 - 提供更好的用户体验
        await createSplashWindow()
        console.log('✅ 启动屏幕创建完成')

        // 创建系统托盘
        createTrayManager()
        console.log('✅ 系统托盘创建完成')

        // 默认禁用开发者工具快捷键，如需打开，通过前端开启开发者模式
        globalShortcut.register('CommandOrControl+Shift+I', () => {
            // 当按下 CommandOrControl+Shift+I 快捷键时，什么也不做
        })
        console.log('✅ 默认禁用开发者工具快捷键')

        console.log('✅ 应用初始化完成')
    } catch (error) {
        console.error('❌ 应用初始化失败:', error)
        app.quit()
    }
}).catch(error => {
    console.error('❌ 应用初始化异常:', error)
    app.quit()
})

/**
 * 所有窗口关闭事件处理
 * 不同平台有不同的行为模式
 */
app.on('window-all-closed', () => {
    console.log('所有窗口已关闭')

    // 不自动退出，允许窗口最小化到托盘
    // 用户可以通过托盘菜单退出应用
    // if (process.platform !== 'darwin') {
    //     console.log('非 macOS 平台，退出应用')
    //     app.quit()
    // } else {
    //     console.log('macOS 平台，保持应用激活状态')
    // }
})

/**
 * 激活事件处理（macOS 特有）
 * 当用户点击 dock 中的应用图标且没有窗口打开时触发
 */
app.on('activate', () => {
    console.log('应用被激活')

    // 重新创建窗口（适用于 macOS 用户点击 dock 图标的情况）
    if (BrowserWindow.getAllWindows().length === 0) {
        console.log('没有窗口打开，重新创建启动屏幕')
        createSplashWindow()
    }
})

/**
 * 应用准备退出前事件
 * 可在此进行数据保存和资源清理工作
 * 这是阻止应用退出的最后机会
 */
app.on('before-quit', (event) => {
    console.log('应用准备退出')

    // 可以在这里保存数据或进行清理工作
    // 如需阻止退出可使用: event.preventDefault()
})

/**
 * 应用即将退出事件
 * 此时所有窗口已关闭，无法阻止退出过程
 * 主要用于最后的资源清理工作
 */
app.on('will-quit', (event) => {
    console.log('应用即将退出')
})

/**
 * 聚焦到主窗口工具函数
 * 确保已有实例窗口获得焦点并显示
 * 用于处理多实例启动时的窗口管理
 */
let focusMainWindow = () => {
    const mainWindow = getMainWindow()
    if (mainWindow) {
        console.log('聚焦到现有主窗口')
        mainWindow.show() // show 包含了 focus 功能
    } else {
        console.warn('未找到主窗口实例')
    }
}