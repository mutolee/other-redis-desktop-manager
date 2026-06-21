import {defineStore} from "pinia";
import {computed, ref} from "vue";

/**
 * 连接配置数据存储
 */
export const useConnectionConfigsStore = defineStore('connectionConfigsStore', () => {

    /**
     * 连接配置数据
     */
    const connectionConfigs = ref([])

    /**
     * 当前激活的连接配置ID
     */
    const activeConnectionConfigId = ref(0)

    /**
     * 搜索关键词
     */
    const searchKeyword = ref('')

    /**
     * 选中的连接配置ID集合
     */
    const selectedIds = ref(new Set())

    /**
     * 打开的连接配置集合
     */
    const openedConnectionConfigs = ref([])

    /**
     * 当前打开的连接配置
     */
    const currOpenedConnectionConfig = computed(() => {
        // 如果 activeConnectionConfigId 为 0 或 null，返回 null
        if (!activeConnectionConfigId.value) {
            return {}
        }
        // 查找匹配的连接配置，如果找不到则返回 null
        return openedConnectionConfigs.value.find(connect => connect.id === activeConnectionConfigId.value) || {}
    })

    /**
     * 将一维连接配置数据转换为树形结构
     * 按 group_name 分组，生成二级树结构
     */
    const connectionConfigsTree = computed(() => {
        if (!connectionConfigs.value || connectionConfigs.value.length === 0) {
            return []
        }

        // 使用 Map 按 group_name 分组
        const groupMap = new Map()
        let groupIndex = 0

        connectionConfigs.value.forEach((config) => {
            const groupName = config.group_name || '未分组'

            if (!groupMap.has(groupName)) {
                groupIndex++
                // 创建分组节点
                groupMap.set(groupName, {
                    group_name: groupName,
                    index: `group_name_${groupIndex}`,
                    children: []
                })
            }

            // 将配置添加到对应分组的 children 中
            groupMap.get(groupName).children.push(config)
        })

        // 将 Map 转换为数组
        return Array.from(groupMap.values())
    })

    /**
     * 最近3个连接配置
     * 根据最后的激活时间排序，最近活跃的排在前面
     */
    const recentConnections = computed(() => {
        if (!connectionConfigs.value || connectionConfigs.value.length === 0) {
            return []
        }

        // 复制数组并排序（避免修改原数组）
        return [...connectionConfigs.value]
            .filter(config => config.last_active_at) // 过滤掉从未连接过的记录
            .sort((a, b) => {
                // 将 ISO 8601 字符串转换为 Date 对象进行比较
                const timeA = new Date(a.last_active_at).getTime()
                const timeB = new Date(b.last_active_at).getTime()
                // 降序排序：时间越新（越大）越靠前
                return timeB - timeA
            })
            .slice(0, 3)
    })

    return {
        // 属性
        activeConnectionConfigId,
        selectedIds,
        openedConnectionConfigs,
        searchKeyword,
        connectionConfigs,
        connectionConfigsTree,
        currOpenedConnectionConfig,
        recentConnections,
    }
})