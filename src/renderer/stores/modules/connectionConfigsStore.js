import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {buildConnectionConfigsTree, getRecentConnections} from '../../utils/connectionConfigViewUtil.js'
import {mergeConnectionRuntimeSettings} from '../../utils/redisConnectionConfigUtil.js'

// 欢迎页最近连接展示数量。
const RECENT_CONNECTION_LIMIT = 3

// 页面实例序号：连接关闭后再次打开时生成新缓存 key，避免复用上一次页签状态。
let pageInstanceSequence = 0

/**
 * 比较跨层传递的连接 ID。
 * Element Plus Tabs 可能返回字符串 ID，而 IndexedDB 配置通常使用数字 ID，因此统一按字符串比较。
 *
 * @param {string|number} left - 左侧连接 ID。
 * @param {string|number} right - 右侧连接 ID。
 * @returns {boolean} 两个 ID 是否表示同一连接。
 */
const isSameConnectionId = (left, right) => String(left) === String(right)

/**
 * 复制连接配置，隔离持久化配置和已打开页签的运行时状态。
 *
 * @param {Object} connectionConfig - 持久化连接配置。
 * @returns {Object} 可安全写入已打开页签列表的浅层副本。
 */
const cloneConnectionConfig = (connectionConfig) => ({...connectionConfig})

/**
 * 生成连接页运行时实例标识。
 * 该标识只用于 renderer 的 KeepAlive 缓存，不写入 IndexedDB，也不传给 Redis。
 *
 * @param {string|number} connectionId - 连接配置 ID。
 * @returns {string} 当前打开周期内唯一的页面实例标识。
 */
const createPageInstanceKey = (connectionId) => {
    pageInstanceSequence += 1
    return `${connectionId}:${pageInstanceSequence}`
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

    /**
     * 查找已经打开的连接页签。
     *
     * @param {string|number} connectionId - 连接配置 ID。
     * @returns {Object|null} 已打开连接对象，未找到时返回 null。
     */
    const findOpenedConnection = (connectionId) => {
        return openedConnectionConfigs.value.find(
            connection => isSameConnectionId(connection.id, connectionId)
        ) || null
    }

    /**
     * 激活指定连接页签。
     *
     * @param {string|number} connectionId - 连接配置 ID。
     */
    const activateConnection = (connectionId) => {
        activeConnectionConfigId.value = findOpenedConnection(connectionId)?.id || 0
    }

    /**
     * 打开并激活连接页签。
     * 已经打开时只切换页签；首次打开时创建运行时快照并异步通知 main 建立 Redis 连接。
     *
     * @param {Object} connectionConfig - 待打开的持久化连接配置。
     * @param {Object} connectionSettings - 系统连接超时设置。
     * @returns {Object|null} 当前已打开连接对象。
     */
    const openConnection = (connectionConfig, connectionSettings = {}) => {
        if (!connectionConfig?.id) {
            activeConnectionConfigId.value = 0
            return null
        }

        let openedConnection = findOpenedConnection(connectionConfig.id)
        if (!openedConnection) {
            openedConnection = {
                ...cloneConnectionConfig(connectionConfig),
                pageInstanceKey: createPageInstanceKey(connectionConfig.id),
                status: 'connecting'
            }
            openedConnectionConfigs.value.push(openedConnection)

            const runtimeConnectionConfig = mergeConnectionRuntimeSettings(openedConnection, connectionSettings)
            window.api.redis.connect(openedConnection.id, runtimeConnectionConfig).catch((error) => {
                updateConnectionStatus({
                    connectionId: openedConnection.id,
                    status: 'error',
                    message: error.message || String(error)
                })
            })
        }

        activeConnectionConfigId.value = openedConnection.id
        return openedConnection
    }

    /**
     * 重新连接指定的已打开页签。
     * main 会先回收同 ID 的旧 ioredis 实例，再创建新连接，因此 renderer 无需先等待 disconnect。
     *
     * @param {string|number} connectionId - 连接配置 ID。
     * @param {Object} connectionSettings - 系统连接超时设置。
     * @returns {boolean} 是否已发起重连。
     */
    const reconnectConnection = (connectionId, connectionSettings = {}) => {
        const connection = findOpenedConnection(connectionId)
        if (!connection) {
            return false
        }

        connection.status = 'connecting'
        const runtimeConnectionConfig = mergeConnectionRuntimeSettings(
            connection,
            connectionSettings
        )

        window.api.redis.connect(connection.id, runtimeConnectionConfig).catch((error) => {
            updateConnectionStatus({
                connectionId: connection.id,
                status: 'error',
                message: error.message || String(error)
            })
        })
        return true
    }

    /**
     * 立即关闭 renderer 页签，并在后台释放 main 中的 Redis 连接。
     * UI 不等待 IPC 返回，适配批量关闭、删除已打开配置等需要即时反馈的操作。
     *
     * @param {string|number} connectionId - 待关闭连接 ID。
     * @returns {Object|null} 被移除的连接对象。
     */
    const closeConnection = (connectionId) => {
        const closingIndex = openedConnectionConfigs.value.findIndex(
            connection => isSameConnectionId(connection.id, connectionId)
        )
        if (closingIndex < 0) {
            return null
        }

        const closingConnection = openedConnectionConfigs.value[closingIndex]
        const isActiveConnection = isSameConnectionId(activeConnectionConfigId.value, closingConnection.id)
        const nextActiveConnection = openedConnectionConfigs.value[closingIndex - 1]
            || openedConnectionConfigs.value[closingIndex + 1]
            || null

        openedConnectionConfigs.value.splice(closingIndex, 1)
        if (isActiveConnection) {
            activeConnectionConfigId.value = nextActiveConnection?.id || 0
        }

        // 页签先从 renderer 移除，main 在后台回收 socket，不阻塞批量关闭和删除连接配置等界面操作。
        window.api.redis.disconnect(closingConnection.id).catch(() => {})
        return closingConnection
    }

    /**
     * 批量关闭连接页签。
     * renderer 一次完成列表变更和活动页签计算，main 中的 socket 仍分别在后台释放。
     *
     * @param {Array<string|number>} connectionIds - 待关闭的连接 ID 列表。
     * @returns {Array<Object>} 已从 renderer 移除的连接对象。
     */
    const closeConnections = (connectionIds = []) => {
        const closingIds = new Set(connectionIds.map(connectionId => String(connectionId)))
        if (closingIds.size === 0) {
            return []
        }

        const currentConnections = openedConnectionConfigs.value
        const activeIndex = currentConnections.findIndex(
            connection => isSameConnectionId(connection.id, activeConnectionConfigId.value)
        )
        const removedConnections = currentConnections.filter(
            connection => closingIds.has(String(connection.id))
        )

        if (removedConnections.length === 0) {
            return []
        }

        openedConnectionConfigs.value = currentConnections.filter(
            connection => !closingIds.has(String(connection.id))
        )

        if (closingIds.has(String(activeConnectionConfigId.value))) {
            const previousConnection = currentConnections
                .slice(0, activeIndex)
                .reverse()
                .find(connection => !closingIds.has(String(connection.id)))
            const nextConnection = currentConnections
                .slice(activeIndex + 1)
                .find(connection => !closingIds.has(String(connection.id)))

            activeConnectionConfigId.value = previousConnection?.id || nextConnection?.id || 0
        }

        for (const connection of removedConnections) {
            window.api.redis.disconnect(connection.id).catch(() => {})
        }

        return removedConnections
    }

    /**
     * 同步 main 推送的 Redis 连接状态。
     * 命令面板等非 page 类型连接不会存在于 openedConnectionConfigs，因此会自然忽略。
     *
     * @param {{connectionId:string|number,status:string,message?:string,error?:Object}} data - Redis 状态事件。
     */
    const updateConnectionStatus = (data) => {
        const connection = findOpenedConnection(data?.connectionId)
        if (!connection) {
            return
        }

        connection.status = data.status
    }

    /**
     * 同步单个已打开页签的分组名称。
     * 移动分组不会影响 Redis socket；连接完整编辑必须先关闭页签。
     *
     * @param {string|number} connectionId - 连接配置 ID。
     * @param {string} groupName - 保存后的分组名称。
     * @returns {boolean} 是否同步到已打开页签。
     */
    const updateOpenedConnectionGroup = (connectionId, groupName) => {
        const connection = findOpenedConnection(connectionId)
        if (!connection) {
            return false
        }

        connection.group_name = groupName
        return true
    }

    /**
     * 同步已打开页签中的分组重命名结果。
     * 分组名称属于持久化配置快照，不影响页签当前连接状态。
     *
     * @param {string} oldGroupName - 原分组名称。
     * @param {string} newGroupName - 新分组名称。
     * @returns {number} 已同步的打开页签数量。
     */
    const renameOpenedConnectionGroup = (oldGroupName, newGroupName) => {
        let updatedCount = 0

        for (const connection of openedConnectionConfigs.value) {
            if (connection.group_name !== oldGroupName) {
                continue
            }

            connection.group_name = newGroupName
            updatedCount += 1
        }

        return updatedCount
    }

    // 当前激活页签对应的连接配置。
    const currOpenedConnectionConfig = computed(() => {
        if (!activeConnectionConfigId.value) {
            return {}
        }

        return findOpenedConnection(activeConnectionConfigId.value) || {}
    })

    // 侧边栏菜单使用的分组树。
    const connectionConfigsTree = computed(() => buildConnectionConfigsTree(connectionConfigs.value))

    // 欢迎页展示的最近连接。
    const recentConnections = computed(() => getRecentConnections(
        connectionConfigs.value,
        RECENT_CONNECTION_LIMIT
    ))

    return {
        activeConnectionConfigId,
        selectedIds,
        openedConnectionConfigs,
        searchKeyword,
        connectionConfigs,
        isConnectionConfigsLoading,
        connectionConfigsTree,
        currOpenedConnectionConfig,
        recentConnections,
        findOpenedConnection,
        activateConnection,
        openConnection,
        reconnectConnection,
        closeConnection,
        closeConnections,
        updateConnectionStatus,
        updateOpenedConnectionGroup,
        renameOpenedConnectionGroup
    }
})
