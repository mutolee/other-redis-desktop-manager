<!--
    SideBar.vue
    描述：菜单边栏
 -->
<script setup>
import SideBarHeader from "./SideBarHeader.vue";
import SideBarFooter from "./SideBarFooter.vue";
import SideBarMenu from "./SideBarMenu.vue";
import {onMounted, ref, shallowRef, watch} from "vue";
import {eventBus} from "../utils/eventBus.js";
import {ElMessage} from "element-plus";
import {useConnectionConfigsStore} from "../stores/modules/connectionConfigsStore.js";
import {storeToRefs} from "pinia";
import {useBaseStateStore} from "../stores/modules/baseStateStore.js";
import {connectConfigRepository} from "../database/repositories/ConnectConfigRepository.js";
import {handleImportFileSelect} from "../utils/connectConfigImportUtil.js";
import ConnectionConfigCreateDialog from "./dialog/ConnectionConfigCreateDialog.vue";
import ConnectionConfigEditDialog from "./dialog/ConnectionConfigEditDialog.vue";
import ConnectionConfigMoveDialog from "./dialog/ConnectionConfigMoveDialog.vue";
import ConnectionConfigRenameGroupDialog from "./dialog/ConnectionConfigRenameGroupDialog.vue";
import {handleDeleteConnectionConfig, handleDeleteFolder} from "../utils/connectConfigDeleteUtil.js";
import ConnectionConfigContextMenu from "./dialog/ConnectionConfigContextMenu.vue";
import CommandDrawer from "./drawer/CommandDrawer.vue";

// 响应式数据
const {activeConnectionConfigId, openedConnectionConfigs, connectionConfigs, searchKeyword, selectedIds} = storeToRefs(useConnectionConfigsStore())
const {exportModeState, searchModeState} = storeToRefs(useBaseStateStore())
const fileInputRef = ref(null) // 导入文件输入框引用
const connectCreateDialogVisible = ref(false)
const defaultGroupName = ref('默认分组') // 打开创建连接配置窗口的默认分组名称
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
const virtualRef = shallowRef(null) // 浅响应式, 用于popover引用菜单元素


onMounted(async () => {
    // 监听加载连接配置事件
    eventBus.on('load-connection', loadConnection)
    // 监听搜索配置事件
    eventBus.on('search-connection', searchConnection)
    // 监听创建连接事件
    eventBus.on('create-new-connection', createNewConnection)
    // 监听导入连接事件
    eventBus.on('import-connection', importConnections)
    // 监听菜单项点击事件
    eventBus.on('click-connection', handleMenuSelect)
    // 监听菜单上下文菜单点击事件
    eventBus.on('click-context-menu', showContextMenu)
    // 监听删除连接事件
    eventBus.on('delete-connection', removeConnection)
    // 监听编辑连接配置事件
    eventBus.on('edit-connection', editConnection)
    // 监听移动连接配置分组事件
    eventBus.on('move-connection', moveConnection)
    // 监听重命名连接分组事件
    eventBus.on('rename-connection-group', renameConnectionGroup)
    // 监听删除连接分组事件
    eventBus.on('delete-connection-group', deleteFolder)
    // 监听打开命令行事件
    eventBus.on('open-command', handleOpenCommand)

    // 加载连接配置数据
    await loadConnection()
})

// 监听搜索模式状态，如果关闭，则关闭搜索模式
watch(searchModeState, (newValue, oldValue) => {
    if (!newValue) {
        searchKeyword.value = ''
        eventBus.emit('search-connection')
    }
})

// 监听导出模式状态，关闭时清空选中项
watch(exportModeState, (newValue) => {
    if (!newValue) {
        selectedIds.value.clear()
    }
})

/**
 * 加载连接配置数据
 */
const loadConnection = async () => {
    connectionConfigs.value = await connectConfigRepository.getAll();
}

/**
 * 搜索连接配置
 */
const searchConnection = async () => {
    connectionConfigs.value = await connectConfigRepository.search(searchKeyword.value)
}

/**
 * 创建新的连接配置
 * @param connectionConfig 连接配置对象
 */
const createNewConnection = (connectionConfig) => {
    // 检查是否是事件对象，如果不是事件对象，则表示传入了参数
    if (connectionConfig instanceof Event) {
        // 如果是事件对象，使用默认分组，表示创建新的连接配置
        defaultGroupName.value = '默认分组'
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
            ElMessage.info('导出模式下无法选择连接')
            return false
        } else {
            // 获取激活的连接配置
            const connection = connectionConfigs.value.find(config => String(config.id) === index)
            if (connection) {
                // Copy 打开的连接配置，不然会改变原数据
                const openedConnection = Object.assign({}, connection)
                if (!openedConnectionConfigs.value.find(config => config.id === openedConnection.id)) {
                    // 缓存打开的连接配置
                    openedConnectionConfigs.value.push(openedConnection)
                    // 更新连接配置的最后激活时间
                    connectConfigRepository.updateLastActiveTime(openedConnection.id)
                    // 打开Redis连接
                    window.api.redis.connect(openedConnection.id, openedConnection)
                }
                activeConnectionConfigId.value = openedConnection.id
            } else {
                activeConnectionConfigId.value = 0
            }
        }
    } catch (error) {
        console.error('Error in handleMenuSelect:', error)
    }
}

/**
 * 显示上下文菜单
 */
const showContextMenu = async (data) => {
    // event - 点击事件
    // connection - 连接配置对象
    // type - 类型：'connection' 或 'group'
    const {event, connection, type} = data
    event.stopPropagation()

    // 等待 DOM 更新后继续执行
    setTimeout(async () => {
        // 先设置菜单项和类型
        contextMenuItem.value = connection
        contextMenuType.value = type
        virtualRef.value = event.target

        // 显示菜单
        contextMenuVisible.value = true
    }, 50)
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
        ElMessage.success('连接配置删除成功')

        // 关闭已经打开的连接配置
        if (openedConnectionConfigs.value.find(config => config.id === connection.id)) {
            eventBus.emit('close-opened-connection', connection)
        }

        // 如果是搜索模式，刷新搜索结果，否则重新加载连接配置列表
        if (searchModeState.value) {
            eventBus.emit('search-connection')
        } else {
            eventBus.emit('load-connection')
        }
    } catch (error) {
        ElMessage.error('删除连接配置失败: ' + (error.message || '未知错误'))
    }
}

/**
 * 编辑连接配置
 * @param connection
 * @returns {Promise<void>}
 */
const editConnection = async (connection) => {
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
        ElMessage.success('分组删除成功')

        // 关闭已经打开的连接配置
        if (item.children) {
            item.children.forEach(child => {
                if (openedConnectionConfigs.value.find(config => config.id === child.id)) {
                    eventBus.emit('close-opened-connection', child)
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
        ElMessage.error('删除分组失败: ' + (error.message || '未知错误'))
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

<template>
    <div class="side-bar">
        <!-- 菜单栏头部 -->
        <SideBarHeader/>
        <!-- 菜单栏 -->
        <SideBarMenu/>
        <!-- 菜单栏底部 -->
        <SideBarFooter/>

        <!-- 创建连接对话框 --->
        <ConnectionConfigCreateDialog v-model:visible="connectCreateDialogVisible"
                                      :default-group-name="defaultGroupName"
                                      :copy-from-connection-config="copyFromConnection"
                                      @closed="() => {defaultGroupName = '默认分组'; copyFromConnection = null}"/>

        <!-- 编辑连接配置对话框 --->
        <ConnectionConfigEditDialog
            v-model:visible="editDialogVisible"
            :connection-config="editConnectionConfig"
            @closed="() => editConnectionConfig = null"
        />

        <!-- 重命名分组对话框 --->
        <ConnectionConfigRenameGroupDialog
            v-model:visible="connectionConfigRenameGroupDialogVisible"
            :group-name="connectionConfigRenameGroupName"
            @closed="() => connectionConfigRenameGroupName = ''"
        />

        <!-- 移动连接配置对话框 --->
        <ConnectionConfigMoveDialog
            v-model:visible="connectionConfigMoveDialogVisible"
            :connection="connectionConfigMoveDialogConnection"
            @closed="() => connectionConfigMoveDialogConnection = null"
        />

        <!-- 共享的上下文菜单（性能优化：所有菜单项共用一个下拉菜单） --->
        <ConnectionConfigContextMenu
            v-model:visible="contextMenuVisible"
            :virtual-ref="virtualRef"
            :menu-type="contextMenuType"
            :menu-item="contextMenuItem"
        />

        <!-- 命令行 --->
        <CommandDrawer
            v-model:visible="commandDrawerVisible"
            :connection="commandDrawerConnection"
            @closed="() => commandDrawerConnection = null"
        />
    </div>
</template>

<style scoped>
.side-bar {
    height: 100%;
    display: flex;
    flex-direction: column;
}
</style>