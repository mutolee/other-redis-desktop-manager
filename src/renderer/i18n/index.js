/**
 * 渲染进程轻量国际化入口。
 * 当前先覆盖系统设置页和 Element Plus 组件语言，后续业务页面可继续向 messages 中补充 key。
 */
import {computed} from 'vue'
import {storeToRefs} from 'pinia'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import {useUserSettingsStore} from '../stores/modules/userSettingsStore.js'

// Element Plus 语言包映射：通过 el-config-provider 动态切换内置组件文案。
const ELEMENT_PLUS_LOCALES = {
    'zh-CN': zhCn,
    'en-US': en
}

// 应用文案字典：按模块分组，避免组件里散落硬编码翻译。
import zhMessages from './messages/zh-CN.js'
import enMessages from './messages/en-US.js'

// 应用文案字典：具体语言包拆分到 messages 目录，index 只保留加载与格式化逻辑。
const MESSAGES = {
    'zh-CN': zhMessages,
    'en-US': enMessages
}

const readMessage = (source, key) => {
    return String(key).split('.').reduce((current, segment) => {
        return current && Object.prototype.hasOwnProperty.call(current, segment)
            ? current[segment]
            : undefined
    }, source)
}

/**
 * 替换文案中的命名占位符。
 * @param {string} message - 原始文案，如 "{value} items"
 * @param {Object} params - 占位符参数
 * @returns {string} 替换后的文案
 */
const formatMessage = (message, params = {}) => {
    if (!params || typeof params !== 'object') {
        return String(message)
    }

    return String(message).replace(/\{(\w+)}/g, (matched, name) => (
        Object.prototype.hasOwnProperty.call(params, name)
            ? String(params[name])
            : matched
    ))
}

/**
 * 使用国际化能力。
 * @returns {{language: import('vue').Ref<string>, elementLocale: import('vue').ComputedRef<Object>, t: Function}}
 */
export const useI18n = () => {
    const {language} = storeToRefs(useUserSettingsStore())

    // Element Plus 语言包：未知语言兜底为中文。
    const elementLocale = computed(() => ELEMENT_PLUS_LOCALES[language.value] || zhCn)

    /**
     * 读取当前语言文案，缺失时回退中文，再缺失时返回 fallback/key。
     * @param {string} key - 文案 key
     * @param {Object|string} [paramsOrFallback] - 插值参数，或旧用法中的兜底文案
     * @param {string} [fallback] - 兜底文案
     * @returns {string} 当前语言文案
     */
    const t = (key, paramsOrFallback = {}, fallback = '') => {
        const currentMessages = MESSAGES[language.value] || MESSAGES['zh-CN']
        const fallbackMessages = MESSAGES['zh-CN']
        const params = paramsOrFallback && typeof paramsOrFallback === 'object' ? paramsOrFallback : {}
        const fallbackText = typeof paramsOrFallback === 'string' ? paramsOrFallback : fallback

        const message = readMessage(currentMessages, key)
            ?? readMessage(fallbackMessages, key)
            ?? fallbackText
            ?? key

        return formatMessage(message, params)
    }

    return {
        language,
        elementLocale,
        t
    }
}
