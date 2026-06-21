import {app, Menu, nativeImage, Tray} from 'electron';
import path from 'path';
import {fileURLToPath} from 'url';
import {getMainWindow} from '../windows/mainWindow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 系统托盘管理器
 * 负责创建和管理系统托盘图标及菜单
 */
class TrayManager {
    constructor() {
        this.tray = null;
        this.init();
    }

    /**
     * 初始化系统托盘
     */
    init() {
        // 根据平台选择图标路径
        let iconPath;
        if (process.platform === 'win32') {
            iconPath = path.join(__dirname, '../../../assets/icons/logo.ico');
        } else if (process.platform === 'darwin') {
            iconPath = path.join(__dirname, '../../../assets/icons/logo.png');
        } else {
            iconPath = path.join(__dirname, '../../../assets/icons/logo.png');
        }

        // 创建托盘图标
        const icon = nativeImage.createFromPath(iconPath);
        // 调整图标大小以适应托盘
        if (process.platform === 'win32') {
            icon.setTemplateImage(false);
        }

        // 创建系统托盘
        this.tray = new Tray(icon.resize({width: 16, height: 16}));

        // 设置托盘提示
        this.tray.setToolTip('Other Redis Desktop Manager');

        // 更新托盘菜单
        this.updateMenu();

        // 点击托盘图标显示/隐藏窗口
        this.tray.on('click', () => {
            this.showWindow();
        });
    }

    /**
     * 更新托盘菜单
     */
    updateMenu() {
        const template = [
            {
                label: '显示窗口',
                click: () => {
                    this.showWindow();
                }
            },
            {
                label: '隐藏窗口',
                click: () => {
                    this.hideWindow();
                }
            },
            {type: 'separator'},
            {
                label: '退出',
                click: () => {
                    app.quit();
                }
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        this.tray.setContextMenu(menu);
    }

    /**
     * 显示窗口
     */
    showWindow() {
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.show();
        }
    }

    /**
     * 隐藏窗口（最小化到托盘）
     */
    hideWindow() {
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.hide();
        }
    }

    /**
     * 销毁托盘
     */
    destroy() {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
        }
    }
}

// 单例模式
let trayManagerInstance = null;

/**
 * 创建托盘管理器实例
 */
export const createTrayManager = () => {
    if (!trayManagerInstance) {
        trayManagerInstance = new TrayManager();
    }
    return trayManagerInstance;
};