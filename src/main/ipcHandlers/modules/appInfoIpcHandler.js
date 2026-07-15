/**
 * 应用信息 IPC 模块。
 * 向渲染进程提供应用版本、Chromium 版本等只读基础信息。
 */
import electron from 'electron'
import fs from 'fs'
import path from 'path'
import {createLogger} from '../../utils/logger.js'
import {setMainLanguage, tMain} from '../../utils/mainI18n.js'
import {compareVersions, normalizeVersion} from '../../utils/versionUtil.js'
import {refreshTrayMenuLanguage} from '../../managers/TrayManager.js'

const {ipcMain} = electron
const log = createLogger('app-info-ipc')

// 版本读取失败时的兜底值，避免启动页因为 package.json 读取异常而中断。
const FALLBACK_APP_VERSION = '1.0.0'

// GitHub Release 更新源：第一版只读取 latest release，不做自动下载和安装。
const GITHUB_LATEST_RELEASE_URL = 'https://api.github.com/repos/mutolee/other-redis-desktop-manager/releases/latest'

// 更新检查超时时间：避免 GitHub 网络异常时设置页按钮长时间无响应。
const UPDATE_CHECK_TIMEOUT_MS = 10000

/**
 * 获取当前运行环境下 package.json 的路径。
 * 开发环境读取项目根目录，生产环境读取 asar 包内的 package.json。
 *
 * @returns {string} package.json 绝对路径
 */
const getPackageJsonPath = () => {
    if (process.env.ELECTRON_DEV) {
        return path.join(process.cwd(), 'package.json')
    }

    return path.join(process.resourcesPath, 'app.asar', 'package.json')
}

/**
 * 读取应用版本号。
 *
 * @returns {string} 应用版本号
 */
const readAppVersion = () => {
    try {
        const packageJsonPath = getPackageJsonPath()
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

        return packageData.version || FALLBACK_APP_VERSION
    } catch (error) {
        log.error('获取应用版本失败', error)
        return FALLBACK_APP_VERSION
    }
}

/**
 * 从 GitHub Release assets 中选择当前 Windows 第一版可用的安装包。
 *
 * @param {Array<Object>} assets - GitHub Release 附件列表
 * @returns {Object|null} 安装包附件
 */
const pickWindowsReleaseAsset = (assets) => {
    if (!Array.isArray(assets)) {
        return null
    }

    return assets.find((asset) => String(asset?.name || '').toLowerCase().endsWith('.exe')) || null
}

/**
 * 检查 GitHub Release 最新版本。
 * 只返回结构化结果，不直接弹窗、不直接打开链接，界面交互留给 renderer。
 *
 * @returns {Promise<{success:boolean, data?:Object, error?:string}>} 更新检查结果
 */
const checkForUpdates = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPDATE_CHECK_TIMEOUT_MS)
    const currentVersion = readAppVersion()

    try {
        const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
            headers: {
                Accept: 'application/vnd.github+json',
                'User-Agent': 'OtherRedisDesktopManager'
            },
            signal: controller.signal
        })

        if (!response.ok) {
            throw new Error(tMain('appInfo.updateRequestFail', {value: response.status}))
        }

        const release = await response.json()
        const latestVersion = normalizeVersion(release?.tag_name)

        if (!latestVersion) {
            throw new Error(tMain('appInfo.updateVersionMissing'))
        }

        const releaseAsset = pickWindowsReleaseAsset(release.assets)
        const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

        return {
            success: true,
            data: {
                hasUpdate,
                currentVersion,
                latestVersion,
                releaseName: release.name || release.tag_name || latestVersion,
                releaseNotes: release.body || '',
                releaseDate: release.published_at || release.created_at || '',
                releasePageUrl: release.html_url || '',
                downloadUrl: releaseAsset?.browser_download_url || '',
                assetName: releaseAsset?.name || '',
                prerelease: Boolean(release.prerelease)
            }
        }
    } catch (error) {
        const message = error.name === 'AbortError'
            ? tMain('appInfo.updateCheckTimeout')
            : (error.message || tMain('appInfo.updateCheckFail'))

        log.warn(message)
        return {success: false, error: message}
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * 同步 renderer 当前语言到 main 进程。
 *
 * @param {Electron.IpcMainInvokeEvent} event - IPC 事件对象
 * @param {string} language - renderer 当前语言
 * @returns {{success:boolean, language:string}} 同步结果
 */
const syncMainLanguage = (event, language) => {
    const nextLanguage = setMainLanguage(language)

    // 托盘菜单属于 main 进程原生菜单，语言变化后需要主动重建菜单。
    refreshTrayMenuLanguage()

    return {success: true, language: nextLanguage}
}

// 应用信息 IPC 通道注册表：集中维护通道名，避免分散的 ipcMain.handle 难以核对。
const APP_INFO_IPC_HANDLERS = [
    {
        channel: 'appInfo:get-version',
        description: '获取应用版本号',
        handler: readAppVersion
    },
    {
        channel: 'appInfo:get-chrome-version',
        description: '获取 Chromium 版本号',
        handler: () => process.versions.chrome
    },
    {
        channel: 'appInfo:check-update',
        description: '检查 GitHub Release 最新版本',
        handler: checkForUpdates
    },
    {
        channel: 'appInfo:set-language',
        description: '同步主进程语言',
        handler: syncMainLanguage
    }
]

/**
 * 注册应用信息相关 IPC 处理器。
 */
export default () => {
    for (const {channel, description, handler} of APP_INFO_IPC_HANDLERS) {
        ipcMain.handle(channel, handler)
        log.info(`应用信息 IPC 已注册: ${channel} - ${description}`)
    }
}
