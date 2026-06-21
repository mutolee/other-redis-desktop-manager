/**
 * Electron 主进程入口文件。
 * 入口只负责启动主进程编排逻辑，具体生命周期、窗口和退出清理放在 appLifecycle.js 中维护。
 */
import { bootstrapMainProcess } from './appLifecycle.js'

bootstrapMainProcess()
