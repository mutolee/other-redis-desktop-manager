/**
 * Electron 主进程开发启动脚本。
 * 负责统一启动 renderer dev server 与 main 进程，避免只运行 dev:main 时出现空白窗口。
 */
import http from 'http'
import { spawn } from 'child_process'

const RENDERER_DEV_SERVER_URL = 'http://127.0.0.1:5173'
const RENDERER_DEV_SERVER_HOST = '127.0.0.1'
const RENDERER_DEV_SERVER_PORT = 5173

// 主进程通过这些环境变量判断是否加载 Vite dev server，以及加载哪个地址。
const mainProcessEnv = {
    ...process.env,
    ELECTRON_DEV: 'true',
    RENDERER_DEV_SERVER_URL
}

let rendererProcess = null
let mainProcess = null

/**
 * 检查 Vite renderer dev server 是否已经可访问。
 *
 * @returns {Promise<boolean>} renderer dev server 是否在线
 */
const isRendererServerReady = () => new Promise((resolve) => {
    const request = http.get(RENDERER_DEV_SERVER_URL, (response) => {
        response.resume()
        resolve(response.statusCode >= 200 && response.statusCode < 500)
    })

    request.on('error', () => resolve(false))
    request.setTimeout(1000, () => {
        request.destroy()
        resolve(false)
    })
})

/**
 * 等待 renderer dev server 完成启动。
 *
 * @param {number} timeoutMs - 最长等待毫秒数
 * @returns {Promise<void>}
 */
const waitForRendererServer = async (timeoutMs = 30000) => {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
        if (await isRendererServerReady()) {
            return
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
    }

    throw new Error(`Renderer dev server 启动超时: ${RENDERER_DEV_SERVER_URL}`)
}

/**
 * 如果 renderer dev server 尚未启动，则由当前脚本主动启动。
 *
 * @returns {Promise<void>}
 */
const ensureRendererServer = async () => {
    if (await isRendererServerReady()) {
        console.log(`[dev-main] Renderer dev server 已就绪: ${RENDERER_DEV_SERVER_URL}`)
        return
    }

    console.log(`[dev-main] 启动 Renderer dev server: ${RENDERER_DEV_SERVER_URL}`)
    rendererProcess = spawn(`vite src/renderer --host ${RENDERER_DEV_SERVER_HOST} --port ${RENDERER_DEV_SERVER_PORT}`, {
        shell: true,
        stdio: 'inherit',
        env: process.env
    })

    await waitForRendererServer()
}

/**
 * 启动 Electron main 进程，并在 Windows 下先切换控制台到 UTF-8。
 *
 * @returns {void}
 */
const startMainProcess = () => {
    const command = process.platform === 'win32'
        ? 'chcp 65001 > nul && nodemon --watch src/main --exec electron .'
        : 'nodemon --watch src/main --exec electron .'

    mainProcess = spawn(command, {
        env: mainProcessEnv,
        shell: true,
        stdio: 'inherit'
    })

    mainProcess.on('exit', (code, signal) => {
        cleanup()

        if (signal) {
            process.kill(process.pid, signal)
            return
        }

        process.exit(code ?? 0)
    })
}

/**
 * 退出开发脚本时清理由脚本拉起的 renderer dev server。
 *
 * @returns {void}
 */
const cleanup = () => {
    if (rendererProcess && !rendererProcess.killed) {
        rendererProcess.kill()
    }
}

process.on('SIGINT', () => {
    cleanup()
    process.exit(0)
})

process.on('SIGTERM', () => {
    cleanup()
    process.exit(0)
})

try {
    await ensureRendererServer()
    startMainProcess()
} catch (error) {
    cleanup()
    console.error('[dev-main] 启动失败:', error)
    process.exit(1)
}
