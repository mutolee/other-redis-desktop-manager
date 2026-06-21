import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { DEFAULT_GROUP_NAME, resolveConnectionGroupName } from '../../utils/connectionGroupUtil.js'

// 欢迎页最近连接展示数量。
const RECENT_CONNECTION_LIMIT = 3

/**
 * 构建连接配置树。
 * 按 group_name 将一维连接配置列表整理为侧边栏菜单需要的二级结构。
 *
 * @param {Array<Object>} configs - 连接配置列表
 * @param {string} defaultGroupName - 未设置分组时使用的系统默认组名称
 * @returns {Array<Object>} 分组后的连接配置树
 */
const buildConnectionConfigsTree = (configs, defaultGroupName) => {
    if (!configs || configs.length === 0) {
        return []
    }

    const groupMap = new Map()
    let groupIndex = 0

    for (const config of configs) {
        const groupName = resolveConnectionGroupName(config.group_name || defaultGroupName)

        if (!groupMap.has(groupName)) {
            groupIndex += 1

            // 分组节点使用稳定的 index 字段，供 Element Plus 菜单作为分组标识。
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
 * 获取最近连接列表。
 *
 * @param {Array<Object>} configs - 连接配置列表
 * @returns {Array<Object>} 最近活跃的连接配置列表
 */
const getRecentConnections = (configs) => {
    if (!configs || configs.length === 0) {
        return []
    }

    return [...configs]
        .filter((config) => config.last_active_at)
        .sort((a, b) => {
            // last_active_at 使用时间字符串存储，排序前统一转为毫秒时间戳。
            const timeA = new Date(a.last_active_at).getTime()
            const timeB = new Date(b.last_active_at).getTime()

            return timeB - timeA
        })
        .slice(0, RECENT_CONNECTION_LIMIT)
}

/**
 * 连接配置数据存储。
 * 管理连接配置列表、打开的连接页签、当前激活连接和侧边栏派生数据。
 */
export const useConnectionConfigsStore = defineStore('connectionConfigsStore', () => {

    // 连接配置原始列表：由 IndexedDB 查询结果写入，驱动侧边栏菜单和欢迎页最近连接。
    const connectionConfigs = ref([])

    // 连接配置列表加载状态：用于区分“正在加载”和“真实为空”。
    const isConnectionConfigsLoading = ref(false)

    // 当前激活的连接配置 ID：驱动 Page、PageHeader、PageNavbar 等区域展示。
    const activeConnectionConfigId = ref(0)

    // 侧边栏搜索关键词：由搜索输入框维护。
    const searchKeyword = ref('')

    // 导出模式下选中的连接配置 ID 集合。
    const selectedIds = ref(new Set())

    // 当前已经打开为页签的连接配置列表。
    const openedConnectionConfigs = ref([])

    // 当前激活页签对应的连接配置。
    const currOpenedConnectionConfig = computed(() => {
        if (!activeConnectionConfigId.value) {
            return {}
        }

        return openedConnectionConfigs.value.find((connect) => connect.id === activeConnectionConfigId.value) || {}
    })

    // 侧边栏菜单使用的分组树。
    const connectionConfigsTree = computed(() => buildConnectionConfigsTree(
        connectionConfigs.value,
        DEFAULT_GROUP_NAME
    ))

    // 欢迎页展示的最近连接。
    const recentConnections = computed(() => getRecentConnections(connectionConfigs.value))

    return {
        activeConnectionConfigId,
        selectedIds,
        openedConnectionConfigs,
        searchKeyword,
        connectionConfigs,
        isConnectionConfigsLoading,
        connectionConfigsTree,
        currOpenedConnectionConfig,
        recentConnections
    }
})
