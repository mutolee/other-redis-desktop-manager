import {resolveConnectionGroupName} from './connectionGroupUtil.js'

/**
 * 连接配置展示数据工具。
 * 负责把持久化连接列表转换为侧边栏分组树和欢迎页最近连接，不维护任何响应式状态。
 */

/**
 * 构建侧边栏使用的连接配置树。
 *
 * @param {Array<Object>} configs - 连接配置列表。
 * @returns {Array<Object>} 按分组整理后的二级连接树。
 */
export const buildConnectionConfigsTree = (configs = []) => {
    if (configs.length === 0) {
        return []
    }

    const groupMap = new Map()
    let groupIndex = 0

    for (const config of configs) {
        const groupName = resolveConnectionGroupName(config.group_name)

        if (!groupMap.has(groupName)) {
            groupIndex += 1
            groupMap.set(groupName, {
                group_name: groupName,
                index: `group_name_${groupIndex}`,
                children: []
            })
        }

        groupMap.get(groupName).children.push(config)
    }

    return Array.from(groupMap.values())
}

/**
 * 获取最近使用的连接配置。
 *
 * @param {Array<Object>} configs - 连接配置列表。
 * @param {number} limit - 最大返回数量。
 * @returns {Array<Object>} 按最后活跃时间倒序排列的连接列表。
 */
export const getRecentConnections = (configs = [], limit = 3) => {
    return [...configs]
        .filter(config => config.last_active_at)
        .sort((left, right) => {
            const leftTime = new Date(left.last_active_at).getTime()
            const rightTime = new Date(right.last_active_at).getTime()

            return rightTime - leftTime
        })
        .slice(0, limit)
}
