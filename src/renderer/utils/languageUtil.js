/**
 * languageUtil.js
 * 描述：提供渲染进程语言识别和语言值归一化能力。
 */

// 应用当前支持的语言列表：需要和 renderer i18n、Element Plus locale 映射保持一致。
const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US']

/**
 * 将浏览器或系统语言归一化为应用支持的语言。
 *
 * @param {string} locale - 系统或浏览器返回的语言值，例如 zh-CN、zh-Hans-CN、en-US。
 * @returns {'zh-CN'|'en-US'} 应用支持的语言值。
 */
export const normalizeAppLanguage = (locale) => {
    const normalizedLocale = String(locale || '').toLowerCase()

    // 当前只维护简体中文和英文资源；所有中文区域先统一落到 zh-CN。
    if (normalizedLocale.startsWith('zh')) {
        return 'zh-CN'
    }

    return 'en-US'
}

/**
 * 获取首次安装时的默认语言。
 *
 * @returns {'zh-CN'|'en-US'} 根据操作系统语言推导出的应用默认语言。
 */
export const getSystemDefaultLanguage = () => {
    // navigator.languages 优先级更高，能反映用户系统语言偏好列表。
    const systemLocales = Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language]

    const matchedLocale = systemLocales.find(Boolean)

    return normalizeAppLanguage(matchedLocale)
}

/**
 * 判断语言值是否属于应用支持范围。
 *
 * @param {string} language - 待判断语言值。
 * @returns {boolean} 是否为受支持语言。
 */
export const isSupportedLanguage = (language) => SUPPORTED_LANGUAGES.includes(language)
