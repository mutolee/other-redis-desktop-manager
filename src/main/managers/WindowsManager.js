/**
 * Electron 窗口公共管理工具。
 * 负责集中管理窗口加载地址、preload 路径、安全 webPreferences 和开发期扩展加载。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import electron from 'electron'
import { createLogger } from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { session } = electron
const log = createLogger('windows-manager')

// 渲染进程开发服务器地址：主窗口和启动窗口通过 hash 区分页面。
const RENDERER_DEV_SERVER_URL = process.env.RENDERER_DEV_SERVER_URL || 'http://127.0.0.1:5173'

// 打包后的渲染进程入口：生产环境下由 BrowserWindow.loadFile 加载。
const RENDERER_DIST_INDEX = path.join(__dirname, '../../../dist/index.html')

// preload 入口：所有窗口共享同一份安全 API 暴露层。
const PRELOAD_ENTRY = path.join(__dirname, '../../preload/index.js')

// Vue DevTools 扩展目录：可通过环境变量配置，避免把本机浏览器扩展路径写死到代码里。
const VUE_DEVTOOLS_EXTENSION_PATH = process.env.VUE_DEVTOOLS_EXTENSION_PATH

/**
 * 给窗口补充渲染加载诊断日志。
 * macOS 打包后如果出现白屏，通常需要从 loadFile 失败或 renderer 控制台错误定位原因。
 *
 * @param {Electron.BrowserWindow} browserWindow - 需要绑定诊断事件的窗口实例
 */
export const attachRendererDiagnostics = (browserWindow) => {
    browserWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        log.error('渲染页面加载失败', {
            errorCode,
            errorDescription,
            validatedURL
        })
    })

    browserWindow.webContents.on('render-process-gone', (event, details) => {
        log.error('渲染进程异常退出', details)
    })

    browserWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        if (level < 2) {
            return
        }

        log.warn('渲染进程控制台消息', {
            level,
            message,
            line,
            sourceId
        })
    })
}

/**
 * 构建窗口通用 webPreferences。
 * 默认启用上下文隔离并禁用 Node 集成，保证 renderer 只能通过 preload 访问主进程能力。
 *
 * @returns {Electron.WebPreferences} 安全的窗口 webPreferences 配置
 */
export const createSecureWebPreferences = () => ({
    contextIsolation: true,
    nodeIntegration: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    preload: PRELOAD_ENTRY
})

/**
 * 按页面 hash 加载渲染进程页面。
 * 开发环境加载 Vite 服务，生产环境加载 dist/index.html。
 *
 * @param {Electron.BrowserWindow} browserWindow - 需要加载页面的窗口实例
 * @param {string} routeHash - Vue Router hash 路由，例如 '#/main'
 * @returns {Promise<void>} 页面加载 Promise
 */
export const loadRendererRoute = (browserWindow, routeHash) => {
    if (process.env.ELECTRON_DEV) {
        log.info('加载开发环境渲染地址', `${RENDERER_DEV_SERVER_URL}/${routeHash}`)
        return browserWindow.loadURL(`${RENDERER_DEV_SERVER_URL}/${routeHash}`)
    }

    log.info('加载生产环境渲染文件', {
        indexPath: RENDERER_DIST_INDEX,
        routeHash
    })

    return browserWindow.loadFile(RENDERER_DIST_INDEX, {
        hash: routeHash
    })
}

/**
 * 尝试加载 Vue DevTools。
 * 只在开发环境执行；扩展路径不存在时给出提示但不中断窗口创建。
 *
 * @returns {Promise<void>} 扩展加载流程 Promise
 */
export const loadVueDevToolsInDevelopment = async () => {
    if (!process.env.ELECTRON_DEV) {
        return
    }

    if (!VUE_DEVTOOLS_EXTENSION_PATH) {
        log.info('未配置 VUE_DEVTOOLS_EXTENSION_PATH，跳过 Vue DevTools 加载')
        return
    }

    if (!fs.existsSync(VUE_DEVTOOLS_EXTENSION_PATH)) {
        log.warn('Vue DevTools 扩展目录不存在，已跳过加载', VUE_DEVTOOLS_EXTENSION_PATH)
        return
    }

    try {
        // loadExtension 返回 Promise，必须 await/catch，避免扩展缺失时产生未处理拒绝。
        await session.defaultSession.loadExtension(VUE_DEVTOOLS_EXTENSION_PATH)
        log.info('加载 Vue DevTools 成功')
    } catch (error) {
        log.warn('加载 Vue DevTools 失败', error)
    }
}
