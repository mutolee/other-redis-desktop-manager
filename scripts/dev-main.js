/**
 * Electron 主进程开发启动脚本。
 * 负责统一设置开发环境变量，并在 Windows 下切换控制台到 UTF-8，避免中文日志乱码。
 */
import { spawn } from 'child_process'

// 主进程通过该环境变量判断是否加载 Vite dev server。
const env = {
    ...process.env,
    ELECTRON_DEV: 'true'
}

// Windows 控制台默认代码页可能不是 UTF-8，先切换代码页再启动 nodemon。
const command = process.platform === 'win32'
    ? 'chcp 65001 > nul && nodemon --watch src/main --exec electron .'
    : 'nodemon --watch src/main --exec electron .'

const child = spawn(command, {
    env,
    shell: true,
    stdio: 'inherit'
})

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal)
        return
    }

    process.exit(code ?? 0)
})
