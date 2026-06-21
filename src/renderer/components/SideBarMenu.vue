<!--
    SideBarMenu.vue
    描述：侧边栏菜单
 -->
<script setup>
import {FolderOpen, LinkThree, More} from "@icon-park/vue-next";
import SideBarMenuAction from "./SideBarMenuAction.vue";
import {useBaseStateStore} from "../stores/modules/baseStateStore.js";
import {useConnectionConfigsStore} from "../stores/modules/connectionConfigsStore.js";
import {storeToRefs} from "pinia";
import SideBarMenuEmpty from "./SideBarMenuEmpty.vue";
import {computed, ref,} from "vue";
import {eventBus} from "../utils/eventBus.js";
import {handleExportSelected, handleSelectAll, handleSelectNone, isGroupIndeterminate, isGroupSelected, toggleGroupSelection, toggleItemSelection} from "../utils/connectConfigExportUtil.js";
import {useUserSettingsStore} from "../stores/modules/userSettingsStore.js";

// 响应式数据
const {exportModeState} = storeToRefs(useBaseStateStore())
const {sideCollapseState} = storeToRefs(useUserSettingsStore())
const {activeConnectionConfigId, selectedIds, connectionConfigs, connectionConfigsTree} = storeToRefs(useConnectionConfigsStore())
const defaultOpened = ref(['group_name_1'])

// 计算属性：是否显示下拉菜单（优化性能）
const showMoreDropdown = computed(() => !sideCollapseState.value && !exportModeState.value)
const showExportCheckbox = computed(() => !sideCollapseState.value && exportModeState.value)

</script>

<template>
    <div class="sidebar-menu">
        <SideBarMenuAction/>
        <div class="sidebar-menu-panel">
            <!-- 导出操作面板 --->
            <div v-show="!sideCollapseState && exportModeState" class="export-action-panel">
                <div class="export-left">
                    <el-button size="small" type="success" @click="handleSelectAll(connectionConfigs, selectedIds)">全选</el-button>
                    <el-button size="small" type="warning" @click="handleSelectNone(selectedIds)">取消全选</el-button>
                </div>
                <el-button size="small" type="primary" @click="handleExportSelected(connectionConfigs, selectedIds)">导出选中 ({{ selectedIds.size }})</el-button>
            </div>
            <!-- 连接菜单为空的占位组件 --->
            <div v-if="connectionConfigs.length === 0" class="menu-panel-empty">
                <SideBarMenuEmpty v-show="!sideCollapseState"/>
            </div>
            <!-- 连接菜单列表 --->
            <div v-else class="menu-panel">
                <el-scrollbar>
                    <el-menu @select="(index) => eventBus.emit('click-connection', index)" :collapse="sideCollapseState" :collapse-transition="false" :default-active="String(activeConnectionConfigId)"
                             :default-openeds="defaultOpened"
                             :unique-opened="true">
                        <el-sub-menu v-for="sub in connectionConfigsTree" :key="sub.index" :index="sub.index">
                            <template #title>
                                <div class="menu-sub-panel">
                                    <el-checkbox
                                        v-if="showExportCheckbox"
                                        :model-value="isGroupSelected(selectedIds,sub)"
                                        :indeterminate="isGroupIndeterminate(selectedIds,sub)"
                                        @change="() => toggleGroupSelection(selectedIds,sub)"
                                        @click.stop
                                        class="export-select"/>
                                    <el-icon>
                                        <FolderOpen/>
                                    </el-icon>
                                    <template v-if="!sideCollapseState">
                                        <span v-show="!sideCollapseState" class="menu-sub-text">{{ sub.group_name }}</span>
                                        <el-icon
                                            v-show="showMoreDropdown"
                                            class="menu-more-icon"
                                            @click.stop="(e) => eventBus.emit('click-context-menu', {event: e, connection: sub, type: 'group'})">
                                            <More size="16" fill="#aaa"/>
                                        </el-icon>
                                    </template>
                                </div>
                            </template>
                            <component :is="sideCollapseState ? 'el-scrollbar' : 'div'" :maxHeight="sideCollapseState ? '500px' : undefined">
                                <el-menu-item :class="{'no-click': exportModeState}" v-for="item in sub.children" :key="item.id" :index="String(item.id)">
                                    <template #title>
                                        <div class="menu-item-panel">
                                            <el-checkbox
                                                v-show="showExportCheckbox"
                                                :model-value="selectedIds.has(item.id)"
                                                @change="() => toggleItemSelection(selectedIds, item.id)"
                                                @click.stop
                                                class="export-select"/>
                                            <el-icon>
                                                <LinkThree/>
                                            </el-icon>
                                            <span class="menu-item-text">{{ item.name }}</span>
                                            <el-icon
                                                v-show="showMoreDropdown"
                                                class="menu-more-icon"
                                                @click.stop="(e) => eventBus.emit('click-context-menu',{event: e, connection: item, type: 'connection'})">
                                                <More theme="outline" size="16" fill="#aaa"/>
                                            </el-icon>
                                        </div>
                                    </template>
                                </el-menu-item>
                            </component>
                        </el-sub-menu>
                    </el-menu>
                </el-scrollbar>
            </div>
        </div>
    </div>
</template>

<style scoped>
.sidebar-menu {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

/* 加载中遮罩层，不区分light/dark */
.sidebar-menu :deep(.el-loading-mask) {
    background: rgba(0, 0, 0, 0.7)
}

.sidebar-menu-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--el-menu-bg-color) !important;
}

.export-action-panel {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: var(--titlebar-bg-color);
    flex-shrink: 0;
}

.menu-panel-empty {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

.menu-panel {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.menu-panel :deep(.el-menu) {
    border-right: 1px solid var(--el-menu-bg-color);
}

.menu-panel :deep(.el-menu:not(.el-menu--collapse) .el-sub-menu__title) {
    padding-right: 30px;
}

.menu-panel :deep(.el-sub-menu.is-active) .el-sub-menu__title .menu-sub-panel {
    color: var(--el-color-primary);
}

.menu-panel :deep(.el-menu-item) {
    padding-right: 8px;
}

.menu-sub-panel, .menu-item-panel {
    flex: 1;
    display: flex;
    align-items: center;
    overflow: hidden;
}

.export-select {
    margin-right: 8px;
    pointer-events: auto; /* 允许点击 */
    flex-shrink: 0;
}

.menu-sub-text, .menu-item-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    padding-right: 20px;
}

.no-click {
    pointer-events: none; /* 禁止点击 */
}
</style>