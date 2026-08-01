/**
 * Main/Splash 窗口互斥状态。
 * 两个窗口模块相互依赖启动流程，使用独立状态模块避免循环引用。
 */
let mainWindowReserved = false
let splashWindowReserved = false

/**
 * 预留 Main 窗口槽位。
 *
 * @returns {boolean} 是否成功预留
 */
export const reserveMainWindow = () => {
    if (mainWindowReserved || splashWindowReserved) {
        return false
    }

    mainWindowReserved = true
    return true
}

/**
 * 释放 Main 窗口槽位。
 */
export const releaseMainWindow = () => {
    mainWindowReserved = false
}

/**
 * 预留 Splash 窗口槽位。
 *
 * @returns {boolean} 是否成功预留
 */
export const reserveSplashWindow = () => {
    if (mainWindowReserved || splashWindowReserved) {
        return false
    }

    splashWindowReserved = true
    return true
}

/**
 * 释放 Splash 窗口槽位。
 */
export const releaseSplashWindow = () => {
    splashWindowReserved = false
}
