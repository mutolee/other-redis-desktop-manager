/**
 * IPC 处理器注册入口。
 * 负责扫描 modules 目录下的业务 IPC 模块，并在主进程启动阶段统一完成注册。
 */
import fs from 'fs'
import path from 'path'
import {fileURLToPath, pathToFileURL} from 'url'
import {createLogger} from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const log = createLogger('ipc')

// IPC 模块目录：约定所有业务 IPC 文件都放在 modules 下。
const IPC_MODULES_DIR = path.join(__dirname, 'modules')

// IPC 模块命名后缀：只有符合该后缀的 JS 文件会被自动注册。
const IPC_HANDLER_FILE_SUFFIX = 'IpcHandler.js'

/**
 * 获取所有待注册的 IPC 模块文件名。
 * 文件名排序后再注册，保证启动日志和注册顺序稳定可读。
 *
 * @returns {string[]} IPC 模块文件名列表
 */
const getIpcHandlerFiles = () => {
    if (!fs.existsSync(IPC_MODULES_DIR)) {
        throw new Error(`IPC 模块目录不存在: ${IPC_MODULES_DIR}`)
    }

    return fs
        .readdirSync(IPC_MODULES_DIR)
        .filter((file) => file.endsWith(IPC_HANDLER_FILE_SUFFIX))
        .sort()
}

/**
 * 动态导入指定 IPC 模块。
 *
 * @param {string} file - IPC 模块文件名
 * @returns {Promise<Function>} 模块默认导出的注册函数
 */
const loadIpcHandlerRegister = async (file) => {
    const fullPath = path.join(IPC_MODULES_DIR, file)
    const moduleUrl = pathToFileURL(fullPath).href
    const module = await import(moduleUrl)

    if (typeof module.default !== 'function') {
        throw new Error(`${file} 缺少默认导出的注册函数`)
    }

    return module.default
}

/**
 * 注册单个 IPC 模块。
 *
 * @param {string} file - IPC 模块文件名
 * @returns {Promise<string>} 注册成功的模块文件名
 */
const registerIpcHandlerFile = async (file) => {
    const registerHandler = await loadIpcHandlerRegister(file)

    // 各业务模块内部负责调用 ipcMain.handle(...) 注册具体通道。
    registerHandler()

    return file
}

/**
 * 注册所有 IPC 处理器。
 * 任一模块加载或注册失败都会抛出错误，阻止应用带着缺失 IPC 的状态继续启动。
 *
 * @returns {Promise<string[]>} 注册成功的 IPC 模块文件名列表
 */
export const registerAllIpcHandlers = async () => {
    const files = getIpcHandlerFiles()

    if (files.length === 0) {
        throw new Error(`未找到 IPC 模块文件，目录: ${IPC_MODULES_DIR}`)
    }

    log.info(`开始注册 IPC 模块，共 ${files.length} 个`)

    const registeredFiles = []

    for (const file of files) {
        try {
            const registeredFile = await registerIpcHandlerFile(file)
            registeredFiles.push(registeredFile)
            log.info(`IPC 模块注册成功: ${registeredFile}`)
        } catch (error) {
            log.error(`IPC 模块注册失败: ${file}`, error)
            throw error
        }
    }

    log.info(`IPC 模块注册完成: ${registeredFiles.join(', ')}`)

    return registeredFiles
}
