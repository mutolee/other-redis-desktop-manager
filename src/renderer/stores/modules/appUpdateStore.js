import {computed, ref} from 'vue'
import {defineStore} from 'pinia'
import {compareVersions, normalizeVersion} from '../../utils/versionUtil.js'

// 应用更新状态 Store：保存后台版本检查结果，并驱动标题栏红点、设置页红点和版本信息 new 标记。
const APP_UPDATE_STORE_ID = 'appUpdateStore'
const APP_UPDATE_STATE_STORAGE_KEY = 'app-update-state'
const FALLBACK_APP_VERSION = '1.0.0'
const CHECKING_ERROR_CODE = 'checking'

export const useAppUpdateStore = defineStore(APP_UPDATE_STORE_ID, () => {
    // 当前应用版本：从 main 进程读取；持久化后仍会在初始化时重新校准，避免升级后展示旧版本。
    const currentVersion = ref('')

    // 可用更新信息：仅在 GitHub Release 版本大于当前版本时保留，用于跨启动保持红点提示。
    const availableUpdateInfo = ref(null)

    // 初始化状态：防止标题栏和设置页重复执行本地状态校准。
    const initialized = ref(false)

    // 检查状态：统一驱动手动检查按钮 loading，并避免后台检查与手动检查并发。
    const checking = ref(false)

    // 派生状态：页面只关心是否存在有效更新，不直接判断更新对象结构。
    const hasAvailableUpdate = computed(() => Boolean(availableUpdateInfo.value?.hasUpdate))

    // 派生状态：设置页展示最新版本号时使用，保持模板中的取值简单。
    const latestVersion = computed(() => availableUpdateInfo.value?.latestVersion || '')

    /**
     * 从 main 进程读取当前应用版本。
     * 即使 Pinia 中已有持久化版本，也要重新读取一次，避免应用升级后仍显示旧版本状态。
     */
    const loadCurrentVersion = async () => {
        try {
            currentVersion.value = normalizeVersion(await window.api.appInfo.getVersion())
        } catch {
            currentVersion.value = currentVersion.value || FALLBACK_APP_VERSION
        }
    }

    /**
     * 校正持久化的更新提示状态。
     * 当用户已经升级到最新版本后，清除历史保存的可用更新信息和红点提示。
     */
    const refreshAvailableUpdateState = () => {
        const latestAvailableVersion = availableUpdateInfo.value?.latestVersion

        if (!latestAvailableVersion || !currentVersion.value) {
            availableUpdateInfo.value = null
            return
        }

        if (compareVersions(latestAvailableVersion, currentVersion.value) <= 0) {
            availableUpdateInfo.value = null
        }
    }

    /**
     * 初始化版本检查状态。
     * 只在当前 renderer 生命周期中初始化一次，并复用 Pinia 持久化的最新更新信息。
     */
    const initializeUpdateState = async () => {
        if (initialized.value) {
            return
        }

        initialized.value = true
        await loadCurrentVersion()

        refreshAvailableUpdateState()
    }

    /**
     * 应用一次更新检查结果。
     * 有新版本时持久化最新版本信息，没有新版本时清除所有更新提示。
     *
     * @param {Object} updateInfo - main 进程返回的更新检查数据。
     */
    const applyUpdateCheckResult = (updateInfo) => {
        if (!updateInfo) {
            return
        }

        currentVersion.value = normalizeVersion(updateInfo.currentVersion) || currentVersion.value

        if (updateInfo.hasUpdate) {
            availableUpdateInfo.value = {
                ...updateInfo,
                currentVersion: normalizeVersion(updateInfo.currentVersion),
                latestVersion: normalizeVersion(updateInfo.latestVersion)
            }
            return
        }

        availableUpdateInfo.value = null
    }

    /**
     * 请求 main 进程检查 GitHub Release 最新版本。
     * 检查失败时只返回失败结果，不修改已有的可用更新提示。
     *
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>} 更新检查结果。
     */
    const checkForUpdates = async () => {
        if (checking.value) {
            return {success: false, error: CHECKING_ERROR_CODE}
        }

        checking.value = true

        try {
            const updateResult = await window.api.appInfo.checkUpdate()

            if (updateResult.success) {
                applyUpdateCheckResult(updateResult.data)
            }

            return updateResult
        } finally {
            checking.value = false
        }
    }

    return {
        currentVersion,
        availableUpdateInfo,
        hasAvailableUpdate,
        latestVersion,
        checking,
        initializeUpdateState,
        checkForUpdates
    }
}, {
    persist: {
        key: APP_UPDATE_STATE_STORAGE_KEY,
        storage: localStorage,
        pick: ['currentVersion', 'availableUpdateInfo']
    }
})
