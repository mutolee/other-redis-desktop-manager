import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSystemDefaultLanguage, isSupportedLanguage } from '../../utils/languageUtil.js'

// 主题枚举：当前只支持浅色和暗色两种根 class。
const THEME_CLASS_NAMES = ['dark', 'light']

// 主题色枚举：对应全局主题 class。
const COLOR_CLASS_NAMES = ['blue', 'pink', 'purple', 'orange', 'green', 'business', 'cyan', 'brown']

// 默认连接设置：连接、命令和 Key 扫描都会读取这些配置。
const DEFAULT_CONNECTION_SETTINGS = {
    connectTimeout: 10000,
    commandTimeout: 8000,
    scanCount: 100
}

// 默认关闭行为：关闭窗口前提示，并默认最小化到托盘。
const DEFAULT_CLOSE_MANAGEMENT = {
    prompt: true,
    closeToTray: true
}

/**
 * 克隆普通配置对象。
 * 避免多个 ref 共享同一份默认对象引用，导致重置时被历史修改污染。
 *
 * @param {Object} value - 默认配置对象
 * @returns {Object} 新配置对象
 */
const cloneDefaults = (value) => ({ ...value })

/**
 * 替换 documentElement 上的一组 class。
 *
 * @param {string[]} classNames - 需要互斥移除的 class 列表
 * @param {string} nextClassName - 需要添加的新 class
 */
const replaceRootClass = (classNames, nextClassName) => {
    const htmlElement = document.documentElement

    htmlElement.classList.remove(...classNames)
    htmlElement.classList.add(nextClassName)
}

/**
 * 用户设置数据存储。
 * 管理主题、主题色、语言、侧边栏状态、连接设置和窗口关闭行为。
 */
export const useUserSettingsStore = defineStore('userSettingsStore', () => {

    // 当前主题：'light' | 'dark'。
    const theme = ref('light')

    // 当前主题色：由全局 CSS class 控制。
    const color = ref('default')

    // 当前语言：首次安装跟随系统语言；已有持久化设置时会被 localStorage 恢复值覆盖。
    const language = ref(getSystemDefaultLanguage())

    // 左侧菜单折叠状态：主界面布局、侧边栏头部和底部都依赖该状态。
    const sideCollapseState = ref(false)

    // Redis 连接相关设置：创建连接、命令面板和 Key 扫描会读取该配置。
    const connectionSettings = ref(cloneDefaults(DEFAULT_CONNECTION_SETTINGS))

    // 窗口关闭行为设置：标题栏和关闭确认弹窗会读取该配置。
    const closeManagement = ref(cloneDefaults(DEFAULT_CLOSE_MANAGEMENT))

    // 开发者模式：控制 DevTools 快捷键是否恢复默认行为。
    const developerMode = ref(true)

    /**
     * 设置主题。
     *
     * @param {'light'|'dark'} newTheme - 新主题名称
     */
    const setTheme = (newTheme) => {
        theme.value = newTheme

        // 主题最终通过 html 根节点 class 驱动全局样式。
        replaceRootClass(THEME_CLASS_NAMES, newTheme)
    }

    /**
     * 设置主题色。
     *
     * @param {string} newColor - 新主题色 class
     */
    const setColor = (newColor) => {
        color.value = newColor

        // default 不在 COLOR_CLASS_NAMES 中，添加 default class 不会影响现有主题色清理逻辑。
        replaceRootClass(COLOR_CLASS_NAMES, newColor)
    }

    /**
     * 更新语言设置。
     *
     * @param {string} newLanguage - 新语言，当前支持 zh-CN / en-US
     */
    const setLanguage = (newLanguage) => {
        if (isSupportedLanguage(newLanguage)) {
            language.value = newLanguage
        }
    }

    /**
     * 重置所有设置为默认值。
     */
    const resetToDefaults = () => {
        language.value = getSystemDefaultLanguage()
        sideCollapseState.value = false
        connectionSettings.value = cloneDefaults(DEFAULT_CONNECTION_SETTINGS)
        closeManagement.value = cloneDefaults(DEFAULT_CLOSE_MANAGEMENT)

        // 复用 setter，确保状态和 html 根节点 class 同步恢复默认值。
        setTheme('light')
        setColor('default')
    }

    return {
        theme,
        color,
        language,
        sideCollapseState,
        connectionSettings,
        closeManagement,
        developerMode,
        setTheme,
        setColor,
        setLanguage,
        resetToDefaults
    }
}, {
    // 用户设置需要跨应用重启保留，因此开启 localStorage 持久化。
    persist: {
        key: 'user-settings',
        storage: localStorage
    }
})
