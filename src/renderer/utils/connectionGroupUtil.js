/**
 * 连接分组工具。
 * 统一维护系统默认组常量，避免组件中散落默认组字面量。
 */

// 系统默认组常量：不随语言切换变化，所有存储和逻辑判断都使用该值。
export const DEFAULT_GROUP_NAME = 'Default Group'

/**
 * 归一化连接分组名称。
 *
 * @param {string} groupName - 外部传入或数据库读取到的分组名称。
 * @returns {string} 可用于存储和逻辑判断的分组名称。
 */
export const normalizeConnectionGroupName = (groupName) => {
    return String(groupName ?? '').trim()
}

/**
 * 解析连接配置应保存的分组名称。
 *
 * @param {string} groupName - 外部传入或数据库读取到的分组名称。
 * @returns {string} 可保存的分组名称。
 */
export const resolveConnectionGroupName = (groupName) => {
    const normalizedGroupName = normalizeConnectionGroupName(groupName)

    // 只有创建/保存连接配置需要兜底空分组，用户已有的非空分组名必须原样保留。
    return normalizedGroupName || DEFAULT_GROUP_NAME
}

/**
 * 归一化连接配置对象中的分组名称。
 *
 * @param {Object} config - 连接配置对象。
 * @returns {Object} 分组名称已归一化的新对象。
 */
export const normalizeConnectionConfigGroup = (config = {}) => {
    return {
        ...config,
        group_name: resolveConnectionGroupName(config.group_name)
    }
}
