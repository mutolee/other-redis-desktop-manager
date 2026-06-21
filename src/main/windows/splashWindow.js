/**
 * 启动窗口
 */
import {BrowserWindow} from "electron";
import path from "path";
import {fileURLToPath} from "url";
import {createMainWindow} from "./mainWindow.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 启动窗口管理类
 * 负责显示应用启动画面，在加载完成后自动关闭并启动主窗口
 */
class SplashWindow {
    constructor() {
        this.win = null;
        this.createWindow();
    }

    /**
     * 创建启动窗口
     * 设置无边框、透明背景的模态窗口样式
     */
    createWindow() {
        this.win = new BrowserWindow({
            width: 500,
            height: 500,
            frame: false,          // 无边框
            transparent: true,     // 透明背景
            alwaysOnTop: true,     // 窗体层级置顶
            resizable: false,      // 不可调整大小
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
     * 加载启动窗口内容并模拟加载过程
     * 在延迟后自动关闭启动屏并创建主窗口
     */
    loadContent() {
        // 根据开发环境或生产环境加载不同的启动屏幕文件
        if (process.env.ELECTRON_DEV) {
            // 开发环境下连接到Vite开发服务器
            this.win.loadURL("http://localhost:5173/#/splash");
        } else {
            // 生产环境：加载主页面并通过URL参数或hash指定splash页面
            this.win.loadFile(path.join(__dirname, '../../../dist/index.html'), {
                hash: '#/splash'  // 使用hash路由
            });
        }

        // 模拟应用初始化加载过程，随机延迟1-3秒后关闭启动屏幕并创建主窗口
        const delay = Math.floor(Math.random() * 3000) + 2000; // 1000-4000ms随机延迟
        setTimeout(() => {
            try {
                // 创建主应用窗口
                createMainWindow();
                // 关闭启动屏幕
                this.close();
            } catch (error) {
                console.error('启动主窗口失败:', error);
                // 即使出错也要关闭启动屏避免卡死
                this.close();
            }
        }, delay);
    }

    /**
     * 关闭启动窗口
     */
    close() {
        if (this.win) {
            this.win.close();
        }
    }
}

// 单例模式实现 - 确保整个应用只有一个启动窗口实例
let splashWindowInstance = null;

/**
 * 创建启动窗口实例
 */
export const createSplashWindow = () => {
    if (!splashWindowInstance) {
        splashWindowInstance = new SplashWindow();
    }
    return splashWindowInstance;
};