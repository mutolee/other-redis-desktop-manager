/**
 * Key 搜索历史工具。
 * 负责在 renderer 本地持久化最近搜索关键词，并生成搜索框自动联想数据。
 */

// 搜索历史存储键：所有连接共享最近使用的 Key 搜索关键词。
const KEY_SEARCH_HISTORY_STORAGE_KEY = 'redis-key-search-history'

// 最多保留30条，避免长期使用后 localStorage 和联想列表无限增长。
const KEY_SEARCH_HISTORY_LIMIT = 30

/**
 * 读取已保存的 Key 搜索历史。
 * 无效、损坏或不可访问的本地数据统一按空历史处理。
 *
 * @returns {string[]} 按最近使用时间倒序排列的关键词
 */
export const readKeySearchHistory = () => {
    try {
        const storedValue = window.localStorage.getItem(KEY_SEARCH_HISTORY_STORAGE_KEY)
        const parsedValue = storedValue ? JSON.parse(storedValue) : []

        if (!Array.isArray(parsedValue)) {
            return []
        }

        return Array.from(new Set(
            parsedValue
                .filter((item) => typeof item === 'string')
                .map((item) => item.trim())
                .filter(Boolean)
        )).slice(0, KEY_SEARCH_HISTORY_LIMIT)
    } catch {
        return []
    }
}

/**
 * 记录一次非空 Key 搜索关键词。
 * 已存在的关键词会移动到最前方，最终只保留最近30条。
 *
 * @param {string} keyword 本次提交的搜索关键词
 * @returns {string[]} 更新后的搜索历史
 */
export const addKeySearchHistory = (keyword) => {
    const normalizedKeyword = String(keyword ?? '').trim()
    const currentHistory = readKeySearchHistory()

    if (!normalizedKeyword) {
        return currentHistory
    }

    const nextHistory = [
        normalizedKeyword,
        ...currentHistory.filter((item) => item !== normalizedKeyword)
    ].slice(0, KEY_SEARCH_HISTORY_LIMIT)

    try {
        window.localStorage.setItem(
            KEY_SEARCH_HISTORY_STORAGE_KEY,
            JSON.stringify(nextHistory)
        )
    } catch {
        // 本地存储不可用时不影响正常搜索流程。
    }

    return nextHistory
}

/**
 * 根据当前输入内容生成搜索历史联想项。
 * 空输入或没有匹配记录时返回空数组，让自动补全组件保持收起。
 *
 * @param {string} query 当前搜索框输入内容
 * @returns {Array<{value:string}>} Element Plus Autocomplete 联想项
 */
export const getKeySearchSuggestions = (query) => {
    const normalizedQuery = String(query ?? '').trim().toLocaleLowerCase()

    if (!normalizedQuery) {
        return []
    }

    return readKeySearchHistory()
        .filter((keyword) => keyword.toLocaleLowerCase().includes(normalizedQuery))
        .map((keyword) => ({value: keyword}))
}
