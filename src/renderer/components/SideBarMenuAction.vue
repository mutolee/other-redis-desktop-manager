<!--
    SideBarMenuAction.vue
    描述：侧边栏菜单操作
 -->
<script setup>
import {Close, Download, Plus, Search, Upload} from "@icon-park/vue-next";
import {useBaseStateStore} from "../stores/modules/baseStateStore";
import {storeToRefs} from "pinia";
import {eventBus} from "../utils/eventBus.js";
import {useConnectionConfigsStore} from "../stores/modules/connectionConfigsStore.js";
import {useUserSettingsStore} from "../stores/modules/userSettingsStore.js";

// 响应式数据
const {searchModeState, exportModeState} = storeToRefs(useBaseStateStore())
const {sideCollapseState} = storeToRefs(useUserSettingsStore())
const {searchKeyword} = storeToRefs(useConnectionConfigsStore())
</script>

<template>
    <div class="sidebar-menu-action">
        <template v-if="!sideCollapseState">
            <div class="header-panel">
                <div class="left">
                    <el-tooltip content="新建连接" placement="bottom">
                        <el-button class="action-btn" :icon="Plus" :disabled="exportModeState"
                                   @click="(e) => eventBus.emit('create-new-connection', e)"/>
                    </el-tooltip>
                </div>
                <div class="right">
                    <el-tooltip content="搜索连接" placement="bottom">
                        <el-button class="action-btn" :class="{'search-active':searchModeState}" :icon="Search"
                                   @click="() => searchModeState = !searchModeState"/>
                    </el-tooltip>
                    <el-tooltip content="导入连接" placement="bottom">
                        <el-button class="action-btn" :icon="Upload" :disabled="exportModeState"
                                   @click="() => eventBus.emit('import-connection')"/>
                    </el-tooltip>
                    <el-tooltip :content="exportModeState ? '取消导出' : '导出连接'" placement="bottom">
                        <el-button class="action-btn" :icon="exportModeState ? Close : Download"
                                   :type="exportModeState ? 'danger' : ''" @click="() => exportModeState = !exportModeState"/>
                    </el-tooltip>
                </div>
            </div>
            <div v-if="searchModeState" class="search-panel">
                <el-input v-model="searchKeyword" class="search-input" @change="() => eventBus.emit('search-connection')" placeholder="搜索连接..." clearable/>
            </div>
        </template>
    </div>
</template>

<style scoped>
.sidebar-menu-action {
    background: var(--titlebar-bg-color);
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
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