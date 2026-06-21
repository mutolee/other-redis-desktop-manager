/**
 * 格式化时间显示
 * @param {string|Date} dateTime - ISO 8601 格式的时间字符串或 Date 对象
 * @returns {string} 格式化后的时间字符串
 */
export const formatDateTime = (dateTime) => {
    if (!dateTime) {
        return '从未连接'
    }

    try {
        const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
        if (isNaN(date.getTime())) {
            return '无效时间'
        }

        const now = new Date()
        const diff = now - date // 时间差（毫秒）

        // 计算时间差
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        // 相对时间显示
        if (seconds < 60) {
            return '刚刚'
        } else if (minutes < 60) {
            return `${minutes}分钟前`
        } else if (hours < 24) {
            return `${hours}小时前`
        } else if (days === 1) {
            return '昨天'
        } else if (days < 7) {
            return `${days}天前`
        } else if (days < 30) {
            const weeks = Math.floor(days / 7)
            return `${weeks}周前`
        } else if (days < 365) {
            const months = Math.floor(days / 30)
            return `${months}个月前`
        } else {
            // 超过一年，显示具体日期
            return formatAbsoluteDateTime(date)
        }
    } catch (error) {
        console.error('格式化时间失败:', error)
        return '无效时间'
    }
}

/**
 * 格式化绝对时间显示
 * @param {Date} date - Date 对象
 * @returns {string} 格式化后的时间字符串，格式：YYYY-MM-DD HH:mm
 */
export const formatAbsoluteDateTime = (date) => {
    if (!date || isNaN(date.getTime())) {
        return '无效时间'
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 格式化日期显示（仅日期部分）
 * @param {string|Date} dateTime - ISO 8601 格式的时间字符串或 Date 对象
 * @returns {string} 格式化后的日期字符串，格式：YYYY-MM-DD
 */
export const formatDate = (dateTime) => {
    if (!dateTime) {
        return ''
    }

    try {
        const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
        if (isNaN(date.getTime())) {
            return ''
        }

        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')

        return `${year}-${month}-${day}`
    } catch (error) {
        console.error('格式化日期失败:', error)
        return ''
    }
}