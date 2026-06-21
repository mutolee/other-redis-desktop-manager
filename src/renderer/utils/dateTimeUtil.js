// 时间单位常量：统一相对时间计算，避免魔法数字散落。
const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * 读取国际化时间文案。
 *
 * @param {Function} translate - 可选的国际化读取函数
 * @param {string} key - 时间文案 key
 * @param {string} fallback - 默认中文文案
 * @param {number} [value] - 需要注入文案的数量值
 * @returns {string} 格式化后的时间文案
 */
const getTimeText = (translate, key, fallback, value) => {
    const message = typeof translate === 'function'
        ? translate(`time.${key}`, fallback)
        : fallback

    return typeof value === 'number'
        ? message.replace('{value}', value)
        : message
}

/**
 * 安全转换 Date。
 *
 * @param {string|Date} dateTime - 时间字符串或 Date 对象
 * @returns {Date|null} 有效 Date，转换失败返回 null
 */
const toValidDate = (dateTime) => {
    if (!dateTime) {
        return null
    }

    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime

    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
}

/**
 * 格式化时间显示。
 *
 * @param {string|Date} dateTime - ISO 8601 时间字符串或 Date 对象
 * @param {Function} [translate] - 可选的国际化读取函数
 * @returns {string} 相对时间或绝对时间文本
 */
export const formatDateTime = (dateTime, translate) => {
    const date = toValidDate(dateTime)

    if (!date) {
        return dateTime
            ? getTimeText(translate, 'invalid', '无效时间')
            : getTimeText(translate, 'neverConnected', '从未连接')
    }

    const diff = Date.now() - date.getTime()
    const seconds = Math.floor(diff / SECOND)
    const minutes = Math.floor(diff / MINUTE)
    const hours = Math.floor(diff / HOUR)
    const days = Math.floor(diff / DAY)

    if (seconds < 60) {
        return getTimeText(translate, 'justNow', '刚刚')
    }

    if (minutes < 60) {
        return getTimeText(translate, 'minutesAgo', '{value}分钟前', minutes)
    }

    if (hours < 24) {
        return getTimeText(translate, 'hoursAgo', '{value}小时前', hours)
    }

    if (days === 1) {
        return getTimeText(translate, 'yesterday', '昨天')
    }

    if (days < 7) {
        return getTimeText(translate, 'daysAgo', '{value}天前', days)
    }

    if (days < 30) {
        return getTimeText(translate, 'weeksAgo', '{value}周前', Math.floor(days / 7))
    }

    if (days < 365) {
        return getTimeText(translate, 'monthsAgo', '{value}个月前', Math.floor(days / 30))
    }

    return formatAbsoluteDateTime(date, translate)
}

/**
 * 格式化绝对时间显示。
 *
 * @param {Date} date - Date 对象
 * @param {Function} [translate] - 可选的国际化读取函数
 * @returns {string} YYYY-MM-DD HH:mm 格式时间
 */
export const formatAbsoluteDateTime = (date, translate) => {
    const validDate = toValidDate(date)

    if (!validDate) {
        return getTimeText(translate, 'invalid', '无效时间')
    }

    const year = validDate.getFullYear()
    const month = String(validDate.getMonth() + 1).padStart(2, '0')
    const day = String(validDate.getDate()).padStart(2, '0')
    const hours = String(validDate.getHours()).padStart(2, '0')
    const minutes = String(validDate.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 格式化日期显示。
 *
 * @param {string|Date} dateTime - ISO 8601 时间字符串或 Date 对象
 * @returns {string} YYYY-MM-DD 格式日期
 */
export const formatDate = (dateTime) => {
    const date = toValidDate(dateTime)

    if (!date) {
        return ''
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}
