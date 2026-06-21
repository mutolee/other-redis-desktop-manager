<!--
    PageNavbar.vue
    描述：连接页签导航栏。展示已打开连接、连接状态图标和批量关闭页签操作。
 -->
<script setup>
import {
    Close,
    CloseOne as CircleClose,
    Down as ArrowDown,
    Left as ArrowLeft,
    LinkInterrupt,
    LinkThree,
    Loading,
    Right as ArrowRight
} from '@icon-park/vue-next'
import { storeToRefs } from 'pinia'
import { useI18n } from '../i18n/index.js'
import { eventBus } from '../utils/eventBus.js'
import { useConnectionConfigsStore } from '../stores/modules/connectionConfigsStore.js'

// 国际化文案读取函数：驱动页签批量关闭菜单文案。
const { t } = useI18n()

// 连接配置 store：读取活动连接 ID 和已打开连接列表，驱动页签选中和关闭逻辑。
const { activeConnectionConfigId, openedConnectionConfigs } = storeToRefs(useConnectionConfigsStore())

/**
 * tab 点击事件
 * @param tab
 */
function tabClick(tab) {
    // Element Plus 的 tab-click 事件传递的是 TabsPaneContext 对象
    // 应该使用 tab.paneName 来获取被点击的 tab 的 name 值
    if (tab.paneName !== activeConnectionConfigId.value) {
        activeConnectionConfigId.value = tab.paneName
    }
}

/**
 * tab 关闭事件
 * @param tabId 被关闭的 tab 的 id
 */
function tabClose(tabId) {
    // 删除打开的 openedConnectionConfigs 中对应的连接配置
    const deletedConnection = openedConnectionConfigs.value.find(connect => connect.id === tabId)
    if (deletedConnection) {
        eventBus.emit('close-opened-connection', deletedConnection)
    }
}

/**
 * 批量关闭连接页签。
 * @param {Array} connections 需要关闭的连接配置列表
 */
function closeConnections(connections) {
    connections.forEach((connect) => {
        eventBus.emit('close-opened-connection', connect)
    })
}

/**
 * dropdown 点击事件
 * @param command
 */
function dropdownEvent(command) {
    switch (command) {
        case 'closeOther':
            // 查找openedConnectionConfigs中除了activeConnectionConfigId之外的连接配置
            closeConnections(openedConnectionConfigs.value.filter(connect => connect.id !== activeConnectionConfigId.value))
            break;
        case 'closeLeft':
            // 查找openedConnectionConfigs中activeConnectionConfigId索引以左的连接配置
            closeConnections(openedConnectionConfigs.value.slice(0, openedConnectionConfigs.value.findIndex(connect => connect.id === activeConnectionConfigId.value)))
            break;
        case 'closeRight':
            // 查找openedConnectionConfigs中activeConnectionConfigId索引以右的连接配置
            closeConnections(openedConnectionConfigs.value.slice(openedConnectionConfigs.value.findIndex(connect => connect.id === activeConnectionConfigId.value) + 1))
            break;
        case 'closeAll':
            closeConnections(openedConnectionConfigs.value)
            break;
    }
}
</script>

<template>
    <div class="page-navbar-panel">
        <div class="navbar">
            <el-tabs
                v-model="activeConnectionConfigId"
                @tab-click="tabClick"
                @tab-remove="tabClose"
                class="el-tabs-override">
                <el-tab-pane
                    v-for="tab in openedConnectionConfigs"
                    :closable="true"
                    :name="tab.id"
                    :key="tab.id">
                    <template #label>
                        <div class="nav-label">
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
            <el-dropdown popper-class="page-navbar-dropdown" @command="dropdownEvent">
                <span>
                  <el-icon class="navbar-operation-icon"><ArrowDown/></el-icon>
                </span>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item command="closeOther">
                            <el-icon>
                                <Close/>
                            </el-icon>
                            <span class="dropdown-item-text">{{ t('pageNavbar.closeOther') }}</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="closeLeft">
                            <el-icon>
                                <ArrowLeft/>
                            </el-icon>
                            <span class="dropdown-item-text">{{ t('pageNavbar.closeLeft') }}</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="closeRight">
                            <el-icon>
                                <ArrowRight/>
                            </el-icon>
                            <span class="dropdown-item-text">{{ t('pageNavbar.closeRight') }}</span>
                        </el-dropdown-item>
                        <el-dropdown-item command="closeAll">
                            <el-icon>
                                <CircleClose/>
                            </el-icon>
                            <span class="dropdown-item-text">{{ t('pageNavbar.closeAll') }}</span>
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>
    </div>
</template>

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

.nav-label{
    display: flex;
    align-items: center;
    height: 40px;
    gap: 5px;
}

.nav-label .i-icon-link-interrupt, .nav-label .i-icon-loading, .nav-label .i-icon-link-three{
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

.navbar-operation .navbar-operation-icon {
    width: 40px;
    height: 40px;
}

/* 页签关闭菜单：下拉层会挂载到 body，需要使用全局选择器对齐 icon-park 图标和文本。 */
:global(.page-navbar-dropdown .el-dropdown-menu__item) {
    display: flex;
    align-items: center;
    gap: 8px;
}

:global(.page-navbar-dropdown .el-dropdown-menu__item .el-icon) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    line-height: 0;
    margin-right: 0;
    flex-shrink: 0;
}

/* icon-park 的 SVG 视觉中心略偏上，这里只在页签菜单里轻微下移图形本身。 */
:global(.page-navbar-dropdown .el-dropdown-menu__item .el-icon .i-icon) {
    display: inline-flex;
    transform: translateY(1px);
}

:global(.page-navbar-dropdown .dropdown-item-text) {
    line-height: 1;
}
</style>
