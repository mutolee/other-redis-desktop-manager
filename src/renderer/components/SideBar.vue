<!--
    SideBar.vue
    描述：左侧连接管理边栏。负责连接配置加载、搜索、导入导出、上下文菜单和命令面板入口。
 -->
<template>
    <div class="side-bar">
        <!-- 侧边栏品牌头部。 -->
        <SideBarHeader/>

        <!-- 连接菜单主体：包含搜索、导出、连接分组和连接项。 -->
        <SideBarMenu
            :is-loading="isConnectionConfigsLoading"
            :context-menu-visible="contextMenuVisible"
            :context-menu-type="contextMenuType"
            :context-menu-item="contextMenuItem"
            :context-menu-source="contextMenuSource"
        />

        <!-- 侧边栏底部开源入口。 -->
        <SideBarFooter/>

        <!-- 创建连接对话框。 -->
        <ConnectionConfigCreateDialog v-model:visible="connectCreateDialogVisible"
                                      :default-group-name="defaultGroupName"
                                      :copy-from-connection-config="copyFromConnection"
                                      @closed="() => {defaultGroupName = ''; copyFromConnection = null}"/>

        <!-- 编辑连接配置对话框。 -->
        <ConnectionConfigEditDialog
            v-model:visible="editDialogVisible"
            :connection-config="editConnectionConfig"
            @closed="() => editConnectionConfig = null"
        />

        <!-- 重命名分组对话框。 -->
        <ConnectionConfigRenameGroupDialog
            v-model:visible="connectionConfigRenameGroupDialogVisible"
            :group-name="connectionConfigRenameGroupName"
            @closed="() => connectionConfigRenameGroupName = ''"
        />

        <!-- 移动连接配置对话框。 -->
        <ConnectionConfigMoveDialog
            v-model:visible="connectionConfigMoveDialogVisible"
            :connection="connectionConfigMoveDialogConnection"
            @closed="() => connectionConfigMoveDialogConnection = null"
        />

        <!-- 共享上下文菜单：所有菜单项共用一个 Popover，减少大量菜单项下的组件数量。 -->
        <ConnectionConfigContextMenu
            v-model:visible="contextMenuVisible"
            :virtual-ref="virtualRef"
            :menu-type="contextMenuType"
            :menu-item="contextMenuItem"
        />

        <!-- 命令行抽屉：打开时基于目标连接创建独立命令会话。 -->
        <CommandDrawer
            v-model:visible="commandDrawerVisible"
            :connection="commandDrawerConnection"
            @closed="() => commandDrawerConnection = null"
        />
    </div>
</template>

<script setup>
import {storeToRefs} from 'pinia'
import {nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch} from 'vue'
import {ElMessage} from 'element-plus'
import {useI18n} from '../i18n/index.js'
import {eventBus} from '../utils/eventBus.js'
import {connectConfigRepository} from '../database/repositories/ConnectConfigRepository.js'
import {handleDeleteConnectionConfig, handleDeleteFolder} from '../utils/connectConfigDeleteUtil.js'
import {handleImportFileSelect} from '../utils/connectConfigImportUtil.js'
import {useBaseStateStore} from '../stores/modules/baseStateStore.js'
import {useConnectionConfigsStore} from '../stores/modules/connectionConfigsStore.js'
import {useUserSettingsStore} from '../stores/modules/userSettingsStore.js'
import SideBarHeader from './SideBarHeader.vue'
import SideBarFooter from './SideBarFooter.vue'
import SideBarMenu from './SideBarMenu.vue'
import ConnectionConfigContextMenu from './dialog/ConnectionConfigContextMenu.vue'
import ConnectionConfigCreateDialog from './dialog/ConnectionConfigCreateDialog.vue'
import ConnectionConfigEditDialog from './dialog/ConnectionConfigEditDialog.vue'
import ConnectionConfigMoveDialog from './dialog/ConnectionConfigMoveDialog.vue'
import ConnectionConfigRenameGroupDialog from './dialog/ConnectionConfigRenameGroupDialog.vue'
import CommandDrawer from './drawer/CommandDrawer.vue'

// 国际化文案读取函数：驱动侧边栏连接操作反馈消息。
const {t} = useI18n()

// 连接配置 store：驱动左侧菜单数据、当前激活连接、已打开连接和批量导出选中项。
const connectionConfigsStore = useConnectionConfigsStore()
const {
    connectionConfigs,
    searchKeyword,
    selectedIds,
    isConnectionConfigsLoading
} = storeToRefs(connectionConfigsStore)
// 基础状态 store：读取搜索模式和导出模式，控制菜单交互状态。
const {exportModeState, searchModeState} = storeToRefs(useBaseStateStore())
// 系统连接设置：为连接动作补充连接超时、命令超时等运行时参数。
const {connectionSettings} = storeToRefs(useUserSettingsStore())
const fileInputRef = ref(null) // 导入文件输入框引用
const connectCreateDialogVisible = ref(false)
const defaultGroupName = ref('') // 打开创建连接配置窗口时预填的分组名称，仅从具体分组入口创建时写入。
const copyFromConnection = ref(null) // 复制的连接配置对象
const editDialogVisible = ref(false) // 编辑连接配置对话框可见性
const editConnectionConfig = ref(null) // 当前正在编辑的连接配置项
const connectionConfigRenameGroupDialogVisible = ref(false) // 重命名分组对话框可见性
const connectionConfigRenameGroupName = ref('') // 当前正在重命名的分组名称
const connectionConfigMoveDialogVisible = ref(false) // 移动连接配置对话框可见性
const connectionConfigMoveDialogConnection = ref(null) // 当前正在移动的连接配置
const commandDrawerVisible = ref(false) // 命令行抽屉可见性
const commandDrawerConnection = ref(null) // 当前正在打开的命令行的连接配置
// 共享下拉菜单的状态（性能优化）
const contextMenuVisible = ref(false) // 上下文菜单可见性
const contextMenuType = ref('connection') // 'connection' 或 'group'
const contextMenuItem = ref(null) // 当前操作的项
const contextMenuSource = ref('') // 菜单触发入口：右键或更多按钮
const virtualRef = shallowRef(null) // 浅响应式, 用于popover引用菜单元素
// 侧边栏注册的全局事件集合：统一登记，卸载时逐项解绑，避免重复监听。
const sideBarEventBindings = []
// 连接列表请求序号：搜索和全量加载交错时只允许最后一次请求更新菜单与 loading。
let connectionListRequestId = 0


onMounted(async () => {
    // 侧边栏全局事件：集中注册连接列表刷新、菜单选择、上下文菜单和命令面板入口。
    sideBarEventBindings.push(
        ['load-connection', loadConnection],
        ['search-connection', searchConnection],
        ['create-new-connection', createNewConnection],
        ['import-connection', importConnections],
        ['click-connection', handleMenuSelect],
        ['click-context-menu', showContextMenu],
        ['delete-connection', removeConnection],
        ['edit-connection', editConnection],
        ['move-connection', moveConnection],
        ['rename-connection-group', renameConnectionGroup],
        ['delete-connection-group', deleteFolder],
        ['open-command', handleOpenCommand]
    )

    for (const [eventName, handler] of sideBarEventBindings) {
        eventBus.on(eventName, handler)
    }

    // 加载连接配置数据
    await loadConnection()
})

onBeforeUnmount(() => {
    // 释放侧边栏注册到事件总线的监听器，防止组件重建后重复执行连接相关动作。
    for (const [eventName, handler] of sideBarEventBindings) {
        eventBus.off(eventName, handler)
    }
    sideBarEventBindings.length = 0

    // 移除懒创建的文件选择器，避免隐藏 DOM 节点长期残留。
    fileInputRef.value?.remove()
    fileInputRef.value = null
})

// 监听搜索模式状态，如果关闭，则关闭搜索模式
watch(searchModeState, (newValue) => {
    if (!newValue) {
        searchKeyword.value = ''
        eventBus.emit('load-connection')
    }
})

// 监听导出模式状态，关闭时清空选中项
watch(exportModeState, (newValue) => {
    if (newValue) {
        contextMenuVisible.value = false
        return
    }

    if (!newValue) {
        selectedIds.value.clear()
    }
})

// 菜单关闭后清理目标项和定位引用，列表临时悬浮态随之恢复。
watch(contextMenuVisible, (visible) => {
    if (!visible) {
        contextMenuItem.value = null
        contextMenuSource.value = ''
        virtualRef.value = null
    }
})

/**
 * 加载连接配置数据
 */
const loadConnection = async () => {
    const requestId = ++connectionListRequestId

    // 拉取完整连接列表时显式标记加载中，避免初始阶段误显示“创建连接”空态按钮。
    isConnectionConfigsLoading.value = true
    try {
        const nextConnectionConfigs = await connectConfigRepository.getAll()
        if (requestId === connectionListRequestId) {
            connectionConfigs.value = nextConnectionConfigs
        }
    } catch (error) {
        if (requestId === connectionListRequestId) {
            ElMessage.error(`${t('sideBar.messages.loadConnectionFail')}: ${error.message || t('common.unknownError')}`)
        }
    } finally {
        if (requestId === connectionListRequestId) {
            isConnectionConfigsLoading.value = false
        }
    }
}

/**
 * 搜索连接配置
 */
const searchConnection = async () => {
    const requestId = ++connectionListRequestId
    const keyword = searchKeyword.value

    // 搜索时沿用同一套加载状态，便于菜单区域统一展示 loading 反馈。
    isConnectionConfigsLoading.value = true
    try {
        const nextConnectionConfigs = keyword.trim()
            ? await connectConfigRepository.search(keyword)
            : await connectConfigRepository.getAll()
        if (requestId === connectionListRequestId) {
            connectionConfigs.value = nextConnectionConfigs
        }
    } catch (error) {
        if (requestId === connectionListRequestId) {
            ElMessage.error(`${t('sideBar.messages.searchConnectionFail')}: ${error.message || t('common.unknownError')}`)
        }
    } finally {
        if (requestId === connectionListRequestId) {
            isConnectionConfigsLoading.value = false
        }
    }
}

/**
 * 创建新的连接配置
 * @param connectionConfig 连接配置对象
 */
const createNewConnection = (connectionConfig) => {
    // 检查是否是事件对象，如果不是事件对象，则表示传入了参数
    if (connectionConfig instanceof Event) {
        // 顶部创建入口不预填分组，让用户主动输入或选择已有分组。
        defaultGroupName.value = ''
        copyFromConnection.value = null
    } else {
        // 判断是否是字符串（分组名称）
        if (typeof connectionConfig === 'string') {
            // 如果传入的是字符串，则表示传入了分组名称
            defaultGroupName.value = connectionConfig
            copyFromConnection.value = null
        } else if (connectionConfig instanceof Object) {
            // 如果是对象，则表示传入了复制连接配置对象
            copyFromConnection.value = connectionConfig
        }
    }
    connectCreateDialogVisible.value = true
}

/**
 * 导入连接配置
 */
const importConnections = async () => {
    // 创建隐藏的文件输入框
    if (!fileInputRef.value) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json,application/json'
        input.style.display = 'none'
        // 使用箭头函数，在事件触发时调用处理函数
        input.addEventListener('change', async (event) => {
            await handleImportFileSelect(event, searchModeState.value)
            // 重置文件输入框的 value，确保下次选择相同文件时也能触发 change 事件
            if (fileInputRef.value) {
                fileInputRef.value.value = ''
            }
        })
        document.body.appendChild(input)
        fileInputRef.value = input
    }

    // 触发文件选择
    fileInputRef.value.click()
}

/**
 * 处理菜单项的点击
 * @param index
 */
const handleMenuSelect = (index) => {
    try {
        if (exportModeState.value) {
            ElMessage.info(t('sideBar.messages.exportModeSelectDisabled'))
            return false
        } else {
            // 获取激活的连接配置
            const connection = connectionConfigs.value.find(config => String(config.id) === index)
            if (connection) {
                const isFirstOpen = !connectionConfigsStore.findOpenedConnection(connection.id)
                connectionConfigsStore.openConnection(connection, connectionSettings.value)

                if (isFirstOpen) {
                    // 最近连接时间只在真正新开页签时更新，单纯切换已打开页签不重复写 IndexedDB。
                    connectConfigRepository.updateLastActiveTime(connection.id)
                        .then((lastActiveAt) => {
                            if (lastActiveAt) {
                                connection.last_active_at = lastActiveAt
                            }
                        })
                        .catch(() => {})
                }
            } else {
                connectionConfigsStore.activateConnection(0)
            }
        }
    } catch (error) {
        ElMessage.error(`${t('sideBar.messages.openConnectionFail')}: ${error.message || error}`)
    }
}

/**
 * 根据鼠标位置创建 Element Plus Popover 的虚拟触发对象。
 *
 * @param {MouseEvent} event - 列表项右键事件。
 * @returns {{getBoundingClientRect: Function}} 虚拟触发定位对象。
 */
const createContextMenuVirtualRef = (event) => {
    const {clientX, clientY} = event

    return {
        getBoundingClientRect: () => ({
            width: 0,
            height: 0,
            top: clientY,
            right: clientX,
            bottom: clientY,
            left: clientX,
            x: clientX,
            y: clientY
        })
    }
}

/**
 * 使用右键或更多按钮打开共享连接操作菜单。
 * 已显示的菜单先关闭一帧，使 Popover 能按新的目标重新计算位置。
 *
 * @param {Object} data - 菜单触发参数。
 * @param {MouseEvent} data.event - 鼠标事件。
 * @param {Object} data.connection - 分组或连接数据。
 * @param {'connection'|'group'} data.type - 菜单类型。
 * @param {'context'|'action'} data.source - 菜单触发入口。
 */
const showContextMenu = async ({event, connection, type, source = 'action'}) => {
    event.stopPropagation()
    if (exportModeState.value) {
        return
    }

    const isSameTarget = contextMenuType.value === type && (
        type === 'group'
            ? contextMenuItem.value?.group_name === connection.group_name
            : String(contextMenuItem.value?.id) === String(connection.id)
    )
    if (contextMenuVisible.value && contextMenuSource.value === source && source === 'action' && isSameTarget) {
        contextMenuVisible.value = false
        return
    }

    // currentTarget 只在原生事件派发期间有效，需要在等待 DOM 更新前保留按钮元素。
    const actionTrigger = event.currentTarget || event.target

    contextMenuVisible.value = false
    await nextTick()

    contextMenuItem.value = connection
    contextMenuType.value = type
    contextMenuSource.value = source
    virtualRef.value = source === 'context'
        ? createContextMenuVirtualRef(event)
        : actionTrigger
    contextMenuVisible.value = true
}

/**
 * 删除连接配置
 * @param connection
 * @returns {Promise<void>}
 */
const removeConnection = async (connection) => {
    try {
        let result = await handleDeleteConnectionConfig(connection)
        if (!result) return
        ElMessage.success(t('sideBar.messages.deleteConnectionSuccess'))

        // 关闭已经打开的连接配置
        if (connectionConfigsStore.findOpenedConnection(connection.id)) {
            connectionConfigsStore.closeConnection(connection.id)
        }

        // 如果是搜索模式，刷新搜索结果，否则重新加载连接配置列表
        if (searchModeState.value) {
            eventBus.emit('search-connection')
        } else {
            eventBus.emit('load-connection')
        }
    } catch (error) {
        ElMessage.error(`${t('sideBar.messages.deleteConnectionFail')}: ${error.message || t('sideBar.messages.unknownError')}`)
    }
}

/**
 * 编辑连接配置
 * @param connection
 * @returns {Promise<void>}
 */
const editConnection = async (connection) => {
    if (connectionConfigsStore.findOpenedConnection(connection?.id)) {
        ElMessage.warning(t('connectionDialog.messages.closeBeforeEdit'))
        return
    }

    editConnectionConfig.value = connection
    editDialogVisible.value = true
}

/**
 * 移动连接配置分组
 * @param connection
 * @returns {Promise<void>}
 */
const moveConnection = async (connection) => {
    connectionConfigMoveDialogVisible.value = true
    connectionConfigMoveDialogConnection.value = connection
}

/**
 * 重命名连接配置组
 * @param connection
 * @returns {Promise<void>}
 */
const renameConnectionGroup = async (connection) => {
    connectionConfigRenameGroupDialogVisible.value = true
    connectionConfigRenameGroupName.value = connection.group_name
}

/**
 * 删除分组
 * @param item
 * @returns {Promise<void>}
 */
const deleteFolder = async (item) => {
    try {
        let result = await handleDeleteFolder(item)
        if (!result) return
        ElMessage.success(t('sideBar.messages.deleteGroupSuccess'))

        // 关闭已经打开的连接配置
        if (item.children) {
            item.children.forEach(child => {
                if (connectionConfigsStore.findOpenedConnection(child.id)) {
                    connectionConfigsStore.closeConnection(child.id)
                }
            })
        }

        // 如果是搜索模式，刷新搜索结果，否则重新加载连接配置列表
        if (searchModeState.value) {
            eventBus.emit('search-connection')
        } else {
            eventBus.emit('load-connection')
        }
    } catch (error) {
        ElMessage.error(`${t('sideBar.messages.deleteGroupFail')}: ${error.message || t('sideBar.messages.unknownError')}`)
    }
}

/**
 * 打开命令行
 * @param connection
 * @returns {Promise<void>}
 */
const handleOpenCommand = async (connection) => {
    commandDrawerVisible.value = true
    commandDrawerConnection.value = connection
}
</script>

<style scoped>
.side-bar {
    height: 100%;
    display: flex;
    flex-direction: column;
}
</style>
