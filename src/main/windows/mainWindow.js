/**
 * 主窗口
 */
import path from "path";
import {fileURLToPath} from "url";
import {app, BrowserWindow, screen, session} from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 主窗口管理类
 * 负责创建、管理和控制应用程序的主窗口
 */
class MainWindow {
    constructor() {
        this.win = null;
        this.createWindow();
    }

    /**
     * 创建主窗口
     * 设置无边框，根据屏幕尺寸自适应窗口大小
     */
    createWindow() {
        // 获取主显示器的工作区域尺寸（排除任务栏等系统UI占用的空间）
        const {width: screenWidth, height: screenHeight} = screen.getPrimaryDisplay().workAreaSize;

        // 计算窗口尺寸为屏幕可用区域的75%，确保良好的用户体验
        const windowWidth = Math.floor(screenWidth * 0.75);
        const windowHeight = Math.floor(screenHeight * 0.75);

        this.win = new BrowserWindow({
            width: windowWidth,
            height: windowHeight,
            minWidth: 1024,        // 设置最小宽度限制
            minHeight: 768,        // 设置最小高度限制
            autoHideMenuBar: true, // 自动隐藏菜单栏
            frame: false,          // 无边框
            center: true,          // 居中显示
            webPreferences: {
                contextIsolation: true,      // 启用上下文隔离，防止注入攻击，提高安全性
                nodeIntegration: false,      // 禁用 Node.js 集成，避免注入攻击，提高安全性
                webSecurity: true,           // 启用 Web 安全，防止跨域攻击，提高安全性
                allowRunningInsecureContent: false,  // 禁用运行不安全内容，避免注入攻击，提高安全性
                experimentalFeatures: false, // 禁用实验功能
                preload: path.join(__dirname, '../../preload/index.js')  // 预加载脚本
            }
        });

        this.loadContent();
    }

    /**
     * 加载内容
     * 根据开发环境或生产环境加载不同的内容
     */
    loadContent() {
        // 根据开发环境或生产环境加载不同的内容
        if (process.env.ELECTRON_DEV) {
            try {
                // 加载Vue DevTools
                session.defaultSession.loadExtension("C:\\Users\\Administrator\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Extensions\\nhdogjmejiglipccpnnnanhbledajbpd\\7.7.7_0")
                console.log("加载Vue DevTools成功")
            } catch (e) {
                console.log("加载Vue DevTools失败", e)
            }

            // 开发环境下连接到Vite开发服务器
            this.win.loadURL("http://localhost:5173/#/main");
        } else {
            // 生产环境：加载主页面并通过URL参数或hash指定main页面
            this.win.loadFile(path.join(__dirname, '../../../dist/index.html'), {
                hash: '#/main'  // 使用hash路由
            });
        }
    }

    /**
     * 显示窗口并使其获得焦点
     */
    show() {
        if (this.win) {
            // 如果窗口被最小化，则先恢复
            if (this.win.isMinimized()) {
                this.win.restore();
            }
            // 显示窗口并使其获得焦点
            this.win.show();
            this.win.focus();
        }
    }

    /**
     * 最小化窗口
     */
    minimize() {
        if (this.win) {
            this.win.minimize();
        }
    }

    /**
     * 切换窗口最大化状态
     */
    toggleMaximize() {
        if (this.win) {
            if (this.win.isMaximized()) {
                this.win.unmaximize();
            } else {
                this.win.maximize();
            }
        }
    }

    /**
     * 关闭窗口
     */
    close() {
        if (this.win) {
            this.win.close();
        }
    }

    /**
     * 隐藏窗口（最小化到托盘）
     */
    hide() {
        if (this.win) {
            this.win.hide();
        }
    }

    /**
     * 退出应用
     */
    quit() {
        if (this.win) {
            // 触发应用退出
            app.quit();
        }
    }

    /**
     * 重新加载当前页面
     */
    reload() {
        if (this.win) {
            this.win.reload();
        }
    }

    /**
     * 设置窗口标题
     * @param {string} title - 窗口标题文本
     */
    setTitle(title) {
        if (this.win) {
            this.win.setTitle(title || 'Other Redis Desktop Manager');
        }
    }
}

// 单例模式实现 - 确保整个应用只有一个主窗口实例
let mainWindowInstance = null;

/**
 * 创建主窗口实例（单例模式）
 */
export const createMainWindow = () => {
    if (!mainWindowInstance) {
        mainWindowInstance = new MainWindow();
    }
    return mainWindowInstance;
};

/**
 * 获取当前主窗口实例
 */
export const getMainWindow = () => {
    return mainWindowInstance;
};