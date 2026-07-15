<!--
    SideBarMenuAction.vue
    描述：侧边栏连接菜单操作区。提供新建、搜索、导入、导出模式切换等入口。
 -->
<template>
    <!-- 顶部操作区：折叠状态下不占高度；展开时展示连接管理快捷入口。 -->
    <div :class="['sidebar-menu-action', { 'is-collapsed': sideCollapseState }]">
        <template v-if="!sideCollapseState">
            <!-- 操作按钮行：左侧新建，右侧搜索、导入和导出模式切换。 -->
            <div class="header-panel">
                <div class="left">
                    <el-tooltip :content="t('sideBarAction.create')" placement="bottom">
                        <el-button class="action-btn" :icon="Plus" :disabled="exportModeState"
                                   @click="(e) => eventBus.emit('create-new-connection', e)"/>
                    </el-tooltip>
                </div>
                <div class="right">
                    <el-tooltip :content="t('sideBarAction.search')" placement="bottom">
                        <el-button class="action-btn" :class="{'search-active':searchModeState}" :icon="Search"
                                   @click="() => searchModeState = !searchModeState"/>
                    </el-tooltip>
                    <el-tooltip :content="t('sideBarAction.import')" placement="bottom">
                        <el-button class="action-btn" :icon="Download" :disabled="exportModeState"
                                   @click="() => eventBus.emit('import-connection')"/>
                    </el-tooltip>
                    <el-tooltip :content="exportModeState ? t('sideBarAction.cancelExport') : t('sideBarAction.export')" placement="bottom">
                        <el-button class="action-btn" :icon="exportModeState ? Close : Upload"
                                   :type="exportModeState ? 'danger' : ''" @click="() => exportModeState = !exportModeState"/>
                    </el-tooltip>
                </div>
            </div>
            <!-- 搜索输入区：仅搜索模式开启时展示，内容变化后通知侧边栏重新查询。 -->
            <div v-if="searchModeState" class="search-panel">
                <el-input v-model="searchKeyword" class="search-input" @change="() => eventBus.emit('search-connection')" :placeholder="t('sideBarAction.searchPlaceholder')" clearable/>
            </div>
        </template>
    </div>
</template>

<script setup>
import {Close, Download, Plus, Search, Upload} from '@icon-park/vue-next'
import {storeToRefs} from 'pinia'
import {eventBus} from '../utils/eventBus.js'
import {useBaseStateStore} from '../stores/modules/baseStateStore.js'
import {useConnectionConfigsStore} from '../stores/modules/connectionConfigsStore.js'
import {useUserSettingsStore} from '../stores/modules/userSettingsStore.js'
import {useI18n} from '../i18n/index.js'

// 基础状态 store：搜索模式和导出模式会影响顶部按钮可用性与展示状态。
const {searchModeState, exportModeState} = storeToRefs(useBaseStateStore())
// 用户设置 store：折叠时隐藏整个操作区，避免占用高度。
const {sideCollapseState} = storeToRefs(useUserSettingsStore())
// 连接配置 store：搜索框内容用于触发连接配置本地查询。
const {searchKeyword} = storeToRefs(useConnectionConfigsStore())
// 国际化文案读取函数：驱动侧边栏连接操作区 tooltip 和搜索占位文案。
const {t} = useI18n()
</script>

<style scoped>
.sidebar-menu-action {
    background: var(--titlebar-bg-color);
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
}

.sidebar-menu-action.is-collapsed {
    border-bottom: none;
    height: 0;
    overflow: hidden;
    padding: 0;
    margin: 0;
}

.header-panel {
    padding: 8px 8px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
}

.search-panel {
    padding: 8px 16px 12px 16px;
}

.header-panel .left, .header-panel .right {
    display: flex;
    flex-direction: row;
    gap: 2px;
}

.header-panel .left .action-btn {
    font-size: 24px;
}

.header-panel .right .action-btn {
    font-size: 20px;
}

.header-panel .action-btn {
    width: 40px;
    height: 32px;
    border-radius: 6px;
    background: transparent !important;
    border: none !important;
    color: var(--el-color-white) !important;
    transition: all 0.2s ease;
    margin: 0 !important;
    padding: 0 !important;
}

.header-panel .action-btn:hover {
    background: rgba(255, 255, 255, 0.2) !important;
}

.header-panel .action-btn:active {
    background: rgba(255, 255, 255, 0.1) !important;
}

.header-panel .action-btn:disabled {
    background: transparent !important;
    color: rgba(255, 255, 255, 0.5) !important;
    cursor: not-allowed;
}

.header-panel .action-btn.search-active {
    background: rgba(255, 255, 255, 0.1) !important;
    color: var(--el-color-primary) !important;
}

.header-panel .action-btn.search-active:hover {
    background: rgba(255, 255, 255, 0.2) !important;
}

.header-panel .action-btn.search-active:active {
    background: rgba(255, 255, 255, 0.1) !important;
}

.header-panel .action-btn.el-button--danger {
    color: var(--el-color-danger) !important;
}

.header-panel .action-btn.el-button--danger:hover {
    background: rgba(255, 87, 87, 0.3) !important;
    color: var(--el-color-danger) !important;
}

.search-panel .search-input :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: none !important;
}

.search-panel .search-input :deep(.el-input__inner) {
    color: var(--el-color-white);
}

.search-panel .search-input :deep(.el-input__inner::placeholder) {
    color: rgba(255, 255, 255, 0.6);
}

.search-panel .search-input :deep(.el-input__wrapper:hover) {
    border-color: color-mix(in srgb, var(--el-color-white) 20%, transparent);
}

.search-panel .search-input :deep(.el-input__wrapper.is-focus) {
    border-color: var(--el-color-primary);
}
</style>
