<!--
    PageNavbar.vue
    描述：连接页签导航栏。展示已打开连接、连接状态图标和批量关闭页签操作。
 -->
<template>
    <div class="page-navbar-panel">
        <div class="navbar">
            <el-tabs
                v-model="activeConnectionConfigId"
                @tab-click="tabClick"
                @tab-remove="tabClose"
                @contextmenu.prevent.stop="handleTabsContextMenu"
                class="el-tabs-override">
                <el-tab-pane
                    v-for="tab in openedConnectionConfigs"
                    :closable="true"
                    :name="tab.id"
                    :key="tab.id">
                    <template #label>
                        <div
                            class="nav-label"
                            :class="{'is-context-menu-active': isContextMenuTarget(tab.id)}"
                        >
                            <el-icon size="18">
                                <Loading class="loading-icon" v-if="tab.status === 'reconnecting' || tab.status === 'connecting'"/>
                                <LinkInterrupt v-if="tab.status === 'disconnected' || tab.status === 'error'"/>
                                <LinkThree v-if="tab.status === 'connected'"/>
                            </el-icon>
                            <span class="no-select">{{ tab.name }}</span>
                        </div>
                    </template>
                </el-tab-pane>
            </el-tabs>
        </div>
        <div class="navbar-operation">
            <button
                ref="operationTriggerRef"
                class="navbar-operation-trigger"
                type="button"
                @click.stop="handleOperationMenuClick"
            >
                <el-icon class="navbar-operation-icon"><Down/></el-icon>
            </button>
        </div>

        <!-- 共用页签关闭菜单：操作按钮以激活页签为目标，右键入口以被右击页签为目标。 -->
        <PageNavbarCloseMenu
            v-model:visible="closeMenuVisible"
            :virtual-ref="closeMenuVirtualRef"
            :placement="closeMenuPlacement"
            :can-close-other="canCloseOther"
            :can-close-left="canCloseLeft"
            :can-close-right="canCloseRight"
            @command="handleCloseMenuCommand"
        />
    </div>
</template>

<script setup>
import {Down, LinkInterrupt, LinkThree, Loading} from '@icon-park/vue-next'
import {storeToRefs} from 'pinia'
import {computed, nextTick, ref, watch} from 'vue'
import {useConnectionConfigsStore} from '../stores/modules/connectionConfigsStore.js'
import PageNavbarCloseMenu from './dialog/PageNavbarCloseMenu.vue'

// 连接配置 store：读取活动连接 ID 和已打开连接列表，并统一执行页签激活与关闭动作。
const connectionConfigsStore = useConnectionConfigsStore()
const {activeConnectionConfigId, openedConnectionConfigs} = storeToRefs(connectionConfigsStore)

// 共用关闭菜单状态：记录触发入口、定位对象和作为关闭边界的连接 ID。
const closeMenuVisible = ref(false)
const closeMenuVirtualRef = ref(null)
const closeMenuConnectionId = ref(null)
const closeMenuPlacement = ref('bottom-start')
const closeMenuSource = ref('')
const operationTriggerRef = ref(null)

// 菜单目标页签索引：关闭左侧、右侧和其他操作都以该页签为基准。
const closeMenuConnectionIndex = computed(() => openedConnectionConfigs.value.findIndex(
    connection => String(connection.id) === String(closeMenuConnectionId.value)
))

// 目标页签两侧可关闭状态：没有对应页签时禁用菜单项。
const canCloseOther = computed(() => (
    closeMenuConnectionIndex.value >= 0 && openedConnectionConfigs.value.length > 1
))
const canCloseLeft = computed(() => closeMenuConnectionIndex.value > 0)
const canCloseRight = computed(() => (
    closeMenuConnectionIndex.value >= 0
    && closeMenuConnectionIndex.value < openedConnectionConfigs.value.length - 1
))

/**
 * 判断连接页签是否为当前右键菜单目标。
 * 只有页签右键入口需要保留悬浮样式，右侧箭头打开菜单时不改变页签外观。
 *
 * @param {string|number} connectionId - 连接页签 ID。
 * @returns {boolean} 是否应用右键悬浮保留样式。
 */
function isContextMenuTarget(connectionId) {
    return closeMenuVisible.value
        && closeMenuSource.value === 'context'
        && String(connectionId) === String(closeMenuConnectionId.value)
}

// 菜单收起后清理触发上下文，避免下一次打开前残留旧页签和定位对象。
watch(closeMenuVisible, (visible) => {
    if (!visible) {
        closeMenuConnectionId.value = null
        closeMenuVirtualRef.value = null
        closeMenuSource.value = ''
    }
})

/**
 * tab 点击事件
 * @param tab
 */
function tabClick(tab) {
    // Element Plus 的 tab-click 事件传递的是 TabsPaneContext 对象
    // 应该使用 tab.paneName 来获取被点击的 tab 的 name 值
    if (String(tab.paneName) !== String(activeConnectionConfigId.value)) {
        connectionConfigsStore.activateConnection(tab.paneName)
    }
}

/**
 * tab 关闭事件
 * @param tabId 被关闭的 tab 的 id
 */
function tabClose(tabId) {
    connectionConfigsStore.closeConnection(tabId)
}

/**
 * 批量关闭连接页签。
 * @param {Array} connections 需要关闭的连接配置列表
 */
function closeConnections(connections) {
    connectionConfigsStore.closeConnections(connections.map(connection => connection.id))
}

/**
 * 执行以指定连接页签为基准的批量关闭命令。
 *
 * @param {string} command - 关闭命令。
 * @param {string|number} targetConnectionId - 作为左右边界的连接 ID。
 */
function executeCloseCommand(command, targetConnectionId) {
    const targetIndex = openedConnectionConfigs.value.findIndex(
        connection => String(connection.id) === String(targetConnectionId)
    )

    if (targetIndex < 0) {
        return
    }

    switch (command) {
        case 'closeOther':
            closeConnections(openedConnectionConfigs.value.filter(
                connection => String(connection.id) !== String(targetConnectionId)
            ))
            break
        case 'closeLeft':
            closeConnections(openedConnectionConfigs.value.slice(0, targetIndex))
            break
        case 'closeRight':
            closeConnections(openedConnectionConfigs.value.slice(targetIndex + 1))
            break
        case 'closeAll':
            closeConnections(openedConnectionConfigs.value)
            break
    }
}

/**
 * 根据鼠标位置创建 Element Plus Popover 的虚拟触发对象。
 *
 * @param {MouseEvent} event - 页签区域右键事件。
 * @returns {{getBoundingClientRect: Function}} 虚拟触发定位对象。
 */
function createContextMenuVirtualRef(event) {
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
 * 使用指定入口打开共用关闭菜单。
 * 已显示的菜单需要先收起并等待 DOM 更新，确保 Popover 能重新计算目标位置。
 *
 * @param {Object} options - 菜单目标和定位参数。
 * @param {string|number} options.connectionId - 作为关闭边界的连接 ID。
 * @param {Object|HTMLElement} options.virtualRef - Popover 定位对象。
 * @param {string} options.placement - 菜单弹出方向。
 * @param {'operation'|'context'} options.source - 菜单触发入口。
 */
async function openCloseMenu({connectionId, virtualRef, placement, source}) {
    closeMenuVisible.value = false
    await nextTick()

    closeMenuConnectionId.value = connectionId
    closeMenuVirtualRef.value = virtualRef
    closeMenuPlacement.value = placement
    closeMenuSource.value = source
    closeMenuVisible.value = true
}

/**
 * 点击右侧操作按钮时，以当前激活页签为目标打开共用关闭菜单。
 */
function handleOperationMenuClick() {
    if (closeMenuVisible.value && closeMenuSource.value === 'operation') {
        closeMenuVisible.value = false
        return
    }

    openCloseMenu({
        connectionId: activeConnectionConfigId.value,
        virtualRef: operationTriggerRef.value,
        placement: 'bottom-end',
        source: 'operation'
    })
}

/**
 * 打开连接页签右键菜单。
 * 通过实际 tab DOM 顺序定位连接，确保状态图标、标题、关闭按钮区域都能触发。
 *
 * @param {MouseEvent} event - 页签区域右键事件。
 */
function handleTabsContextMenu(event) {
    const tabElement = event.target.closest('.el-tabs__item')
    if (!tabElement) {
        return
    }

    const tabElements = Array.from(tabElement.parentElement?.querySelectorAll('.el-tabs__item') || [])
    const tabIndex = tabElements.indexOf(tabElement)
    const targetConnection = openedConnectionConfigs.value[tabIndex]
    if (!targetConnection) {
        return
    }

    openCloseMenu({
        connectionId: targetConnection.id,
        virtualRef: createContextMenuVirtualRef(event),
        placement: 'bottom-start',
        source: 'context'
    })
}

/**
 * 执行右键菜单命令。
 *
 * @param {string} command - 当前选择的关闭命令。
 */
function handleCloseMenuCommand(command) {
    executeCloseCommand(command, closeMenuConnectionId.value)
}
</script>

<style scoped>
.page-navbar-panel {
    background-color: var(--el-bg-color-overlay);
    height: 40px;
    flex-shrink: 0; /* 该项目不会缩小 */
    position: relative;
    display: flex;
    width: 100%;
    overflow: hidden;
    box-shadow: 0 1px 4px rgb(0 21 41 / 8%);
}

.dark .page-navbar-panel {
    box-shadow: 20px 1px 4px 0 rgb(0 0 0) !important;
}

.page-navbar-panel .navbar {
    flex: 1;
    min-width: 0; /* 重要：允许 flex 子元素缩小 */
    overflow: hidden; /* 防止内容溢出 */
    position: relative;
    width: 0; /* Flexbox 技巧：配合 min-width: 0 确保正确收缩 */
    padding-right: 40px;
}

/* ==================== El-tabs 样式重写 ==================== */
:deep(.el-tabs-override) .el-tabs__header {
    margin: 0;
}

:deep(.el-tabs-override) .el-tabs__nav-wrap.is-scrollable {
    padding: 0 40px;
}

:deep(.el-tabs-override) .el-tabs__nav-wrap:after {
    height: 0;
}

:deep(.el-tabs-override) .el-tabs__nav-prev, :deep(.el-tabs-override) .el-tabs__nav-next {
    width: 40px;
    height: 40px;
    text-align: center;
}

:deep(.el-tabs-override) .el-tabs__nav-prev {
    border-right: 1px solid var(--el-border-color-lighter);
    transition: background-color .2s;
}

:deep(.el-tabs-override) .el-tabs__nav-next {
    border-left: 1px solid var(--el-border-color-lighter);
    transition: background-color .2s;
}

:deep(.el-tabs-override) .el-tabs__nav-prev:hover, :deep(.el-tabs-override) .el-tabs__nav-next:hover {
    background-color: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
}

:deep(.el-tabs-override) .el-tabs__active-bar {
    display: none;
}

:deep(.el-tabs-override) .el-tabs__item {
    color: var(--el-text-color-regular);
    transition: background-color .3s, color .3s;
    border-right: 1px solid var(--el-border-color-lighter);
    font-weight: normal;
}

:deep(.el-tabs-override) .el-tabs__item .is-icon-close {
    margin-left: 8px;
    color: var(--el-text-color-regular);
}

:deep(.el-tabs-override) .el-tabs__item .is-icon-close:hover {
    color: #ffffff;
    background-color: #ff0000;
}

:deep(.el-tabs-override) .el-tabs__item:not(.is-active):hover {
    background-color: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
    color: var(--el-text-color-secondary);
}

:deep(.el-tabs-override) .el-tabs__item.is-top:nth-child(2) {
    padding-left: 20px;
}

:deep(.el-tabs-override) .el-tabs__item.is-top:last-child {
    padding-right: 20px;
}

:deep(.el-tabs-override) .el-tabs__item.is-active {
    border-bottom: 2px solid var(--el-color-primary);
    color: var(--el-color-primary);
    background-color: color-mix(in srgb, var(--el-color-primary) 20%, transparent);
}

/* 被右击页签临时保留悬浮样式；菜单关闭后目标状态清空并自动恢复。 */
:deep(.el-tabs-override) .el-tabs__item:has(.nav-label.is-context-menu-active) {
    color: var(--el-text-color-secondary);
    background-color: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
}

.nav-label {
    display: flex;
    align-items: center;
    height: 40px;
    gap: 5px;
}

.nav-label .i-icon-link-interrupt, .nav-label .i-icon-loading, .nav-label .i-icon-link-three {
    width: 18px;
    height: 18px;
}

/* Loading 图标旋转动画 */
.nav-label .loading-icon {
    animation: rotate 1.25s linear infinite;
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.navbar-operation {
    position: absolute;
    top: 0;
    right: 0;
    border-left: 1px solid var(--el-border-color-lighter);
    transition: background-color .2s;
    background-color: var(--el-bg-color-overlay);
}

.navbar-operation:hover {
    background-color: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
}

.navbar-operation-trigger {
    display: flex;
    width: 40px;
    height: 40px;
    padding: 0;
    align-items: center;
    justify-content: center;
    border: none;
    outline: none;
    color: inherit;
    background: transparent;
    cursor: pointer;
}

.navbar-operation .navbar-operation-icon {
    width: 40px;
    height: 40px;
}

/* 右侧操作入口图标：icon-park 在 el-icon 中视觉略偏上，单独下移一点保持居中。 */
.navbar-operation .navbar-operation-icon :deep(.i-icon) {
    transform: translateY(1px);
}

</style>
