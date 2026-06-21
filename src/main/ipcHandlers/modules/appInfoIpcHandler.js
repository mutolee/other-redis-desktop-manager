import {ipcMain} from 'electron'
import path from "path";
import fs from "fs";

/**
 * 注册应用信息相关的 IPC 处理器
 * 提供获取应用版本号等基本信息的功能
 */
export default () => {

    /**
     * 获取应用版本号
     * @returns {string} 应用版本号
     */
    ipcMain.handle('appInfo:get-version', () => {
        try {
            // 在开发环境中，从项目根目录读取 package.json
            // 在构建后的应用中，从应用资源目录读取
            let packagePath;

            if (process.env.ELECTRON_DEV) {
                // 开发环境：从项目根目录读取
                packagePath = path.join(process.cwd(), 'package.json');
            } else {
                // 生产环境：从应用资源目录读取
                packagePath = path.join(process.resourcesPath, 'app.asar', 'package.json');
            }

            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
            return packageData.version;
        } catch (error) {
            console.error('获取应用版本失败:', error);
            // 如果无法读取 package.json，返回默认版本
            return '1.0.0';
        }
    })

    /**
     * 获取 Chrome 版本号
     * @returns {string} Chrome 版本号
     */
    ipcMain.handle('appInfo:get-chrome-version', () => {
        return process.versions.chrome;
    })
}