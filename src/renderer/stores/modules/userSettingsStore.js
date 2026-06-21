import {defineStore} from "pinia";
import {ref} from "vue";

/**
 * 用户设置数据存储
 */
export const useUserSettingsStore = defineStore('userSettingsStore', () => {

    /**
     * 主题设置
     * 'light' | 'dark'
     */
    const theme = ref('light')

    /**
     * 颜色设置
     * 'default' | 'blue' | 'pink' | 'purple' | 'orange' | 'green' | 'business'  | 'cyan'
     */
    const color = ref('default')

    /**
     * 语言设置
     * 'zh-CN' | 'en-US'
     */
    const language = ref('zh-CN')

    /**
     * 页面菜单部分折叠状态
     */
    const sideCollapseState = ref(false)

    /**
     * 连接设置
     */
    const connectionSettings = ref({
        // 连接超时时间（毫秒）
        connectTimeout: 5000,
        // 命令超时时间（毫秒）
        commandTimeout: 3000,
        // Key Scan Count，默认500，如果设置的大，影响性能
        scanCount: 500
    })

    /**
     * 关闭管理
     */
    const closeManagement = ref({
        // 关闭时候是否提示
        prompt: true,
        // 关闭时候最小化到托盘, false时关闭程序，true时最小化到托盘，默认为true
        closeToTray: true
    })

    /**
     * 开发者模式
     */
    const developerMode = ref(true)

    /**
     * 设置主题
     */
    const setTheme = (newTheme) => {
        // 更新主题
        theme.value = newTheme

        const htmlElement = document.documentElement
        // 删除旧的 class
        htmlElement.classList.remove('dark', 'light')
        // 添加新的 class
        htmlElement.classList.add(newTheme)
    }

    /**
     * 设置颜色
     */
    const setColor = (newColor) => {
        // 更新颜色
        color.value = newColor

        const htmlElement = document.documentElement
        // 删除旧的 class
        htmlElement.classList.remove('blue', 'pink', 'purple', 'orange', 'green', 'business', 'cyan', 'brown')
        // 添加新的 class
        htmlElement.classList.add(newColor)
    }

    /**
     * 更新语言设置
     * @param {string} newLanguage - 新语言 ('zh-CN' | 'en-US')
     */
    const setLanguage = (newLanguage) => {
        if (['zh-CN', 'en-US'].includes(newLanguage)) {
            language.value = newLanguage
            // 这里可以添加国际化逻辑
        }
    }

    /**
     * 重置所有设置为默认值
     */
    const resetToDefaults = () => {
        theme.value = 'light'
        color.value = 'default'
        language.value = 'zh-CN'
        sideCollapseState.value = false
        connectionSettings.value = {
            connectTimeout: 5000,
            commandTimeout: 3000,
            scanCount: 500
        }
        closeManagement.value = {
            prompt: true,
            closeToTray: true
        }

        // 恢复默认主题和颜色
        setTheme('light')
        setColor('default')
    }

    return {
        // 状态
        theme,
        color,
        language,
        sideCollapseState,
        connectionSettings,
        closeManagement,
        developerMode,
        // 方法
        setTheme,
        setColor,
        setLanguage,
        resetToDefaults
    }
}, {
    // 启用持久化，所有设置都会保存到 localStorage
    persist: {
        key: 'user-settings',
        storage: localStorage
    }
})

