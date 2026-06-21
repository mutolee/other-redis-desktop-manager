import fs from 'fs'
import path from 'path'
import {fileURLToPath, pathToFileURL} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 注册所有 IPC 处理器
 * 自动扫描并加载同目录下的所有 IPC 处理模块
 */
export const registerAllIpcHandlers = async () => {

    // 定义模块目录路径，专门存放 IPC 处理模块
    const modulesDir = path.join(__dirname, 'modules')
    // 读取模块目录下的所有文件
    const files = fs.readdirSync(modulesDir)

    // 遍历所有文件，动态加载 IPC 处理模块
    for (const file of files) {
        // 只处理 JavaScript 文件，跳过其他类型文件
        if (!file.endsWith('IpcHandler.js')) continue

        // 构建模块的完整路径
        const fullPath = path.join(modulesDir, file)
        // 将文件路径转换为 URL 格式用于 ES6 模块导入
        const moduleUrl = pathToFileURL(fullPath).href

        try {
            // 动态导入模块
            const module = await import(moduleUrl)
            // 检查模块是否导出默认函数并执行
            if (typeof module.default === 'function') {
                module.default()
            } else {
                console.warn(`⚠️ Skipped ${file}: no default export function`)
            }
        } catch (err) {
            // 捕获并记录模块加载错误
            console.error(`❌ Failed to load ${file}:`, err)
        }
    }
}