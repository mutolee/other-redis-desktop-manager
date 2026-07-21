<!--
    SideBarMenu.vue
    描述：侧边栏连接菜单。展示连接分组、连接项、导出选择状态、加载中和空态。
 -->
<template>
    <div class="sidebar-menu">
        <!-- 顶部操作区：初始加载阶段先隐藏，避免在数据未返回时误显示“创建连接”相关操作。 -->
        <SideBarMenuAction v-if="!showLoadingState"/>
        <!-- 菜单主体区：列表加载中时显示 loading，真正空数据时再显示空态。 -->
        <div
            class="sidebar-menu-panel"
            v-loading="props.isLoading && !showLoadingState"
            :element-loading-text="t('sideBarMenu.loadingConnections')"
        >
            <!-- 导出操作面板：批量选择连接并导出。 -->
            <div v-show="!sideCollapseState && exportModeState" class="export-action-panel">
                <div class="export-left">
                    <el-button size="small" :type="selectionToggleButtonType" @click="handleToggleConnectionSelection">
                        {{ selectionToggleText }}
                    </el-button>
                </div>
                <el-button class="export-selected-button" size="small" type="primary" :disabled="selectedIds.size === 0" @click="handleExportSelected(connectionConfigs, selectedIds, t)">{{
                        t('sideBarMenu.exportSelected').replace('{value}', selectedIds.size)
                    }}
                </el-button>
            </div>
            <!-- 初始加载占位：连接尚未加载完成前，避免误显示空态按钮。 -->
            <div v-if="showLoadingState" class="menu-panel-loading">
                <el-icon class="loading-icon">
                    <Loading/>
                </el-icon>
                <span class="loading-text">{{ t('sideBarMenu.loadingConnections') }}</span>
            </div>
            <!-- 连接菜单为空的占位组件。 -->
            <div v-else-if="showEmptyState" class="menu-panel-empty">
                <SideBarMenuEmpty v-show="!sideCollapseState"/>
            </div>
            <!-- 连接菜单列表：分组展示连接，支持上下文菜单和导出选择。 -->
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
                                        <span class="menu-sub-text">{{ sub.group_name }}</span>
                                        <el-icon
                                            v-show="showMoreDropdown"
                                            class="menu-more-icon"
                                            @click.stop="(e) => eventBus.emit('click-context-menu', {event: e, connection: sub, type: 'group'})">
                                            <More size="16" fill="#aaa"/>
                                        </el-icon>
                                    </template>
                                </div>
                            </template>
                            <el-scrollbar :maxHeight="sideCollapseState ? '500px' : undefined">
                                <el-menu-item :class="{'no-click': exportModeState}" v-for="item in sub.children" :key="item.id" :index="String(item.id)">
                                    <template #title>
                                        <div class="menu-item-panel">
                                            <el-checkbox
                                                v-if="showExportCheckbox"
                                                :model-value="selectedIds.has(item.id)"
                                                @change="() => toggleItemSelection(selectedIds, item.id)"
                                                @click.stop
                                                class="export-select"/>
                                            <el-icon>
                                                <LinkThree/>
                                            </el-icon>
                                            <span class="menu-item-text">{{ item.name }}</span>
                                            <el-icon
                                                v-if="showMoreDropdown"
                                                class="menu-more-icon"
                                                @click.stop="(e) => eventBus.emit('click-context-menu',{event: e, connection: item, type: 'connection'})">
                                                <More theme="outline" size="16" fill="#aaa"/>
                                            </el-icon>
                                        </div>
                                    </template>
                                </el-menu-item>
                            </el-scrollbar>
                        </el-sub-menu>
                    </el-menu>
                </el-scrollbar>
            </div>
        </div>
    </div>
</template>

<script setup>
import {FolderOpen, LinkThree, Loading, More} from '@icon-park/vue-next'
import {storeToRefs} from 'pinia'
import {computed, ref} from 'vue'
import {useI18n} from '../i18n/index.js'
import {eventBus} from '../utils/eventBus.js'
import {handleExportSelected, handleSelectAll, handleSelectNone, isGroupIndeterminate, isGroupSelected, toggleGroupSelection, toggleItemSelection} from '../utils/connectConfigExportUtil.js'
import {useBaseStateStore} from '../stores/modules/baseStateStore.js'
import {useConnectionConfigsStore} from '../stores/modules/connectionConfigsStore.js'
import {useUserSettingsStore} from '../stores/modules/userSettingsStore.js'
import SideBarMenuAction from './SideBarMenuAction.vue'
import SideBarMenuEmpty from './SideBarMenuEmpty.vue'

// 国际化文案读取函数：驱动侧边栏连接列表加载态和导出操作文案。
const {t} = useI18n()

// 组件入参：接收侧边栏外层传入的加载状态，用来区分“连接还在加载中”和“连接列表真实为空”。
const props = defineProps({
    isLoading: {
        type: Boolean,
        default: false
    }
})

// 基础状态 store：导出模式决定是否显示复选框和导出操作栏。
const {exportModeState} = storeToRefs(useBaseStateStore())
// 用户设置 store：侧边栏折叠状态影响菜单文本、更多按钮和空态展示。
const {sideCollapseState} = storeToRefs(useUserSettingsStore())
// 连接配置 store：菜单树、当前激活连接和导出选中项都由这里驱动。
const {activeConnectionConfigId, selectedIds, connectionConfigs, connectionConfigsTree} = storeToRefs(useConnectionConfigsStore())
const defaultOpened = ref(['group_name_1'])

// 计算属性：是否显示下拉菜单（优化性能）
const showMoreDropdown = computed(() => !sideCollapseState.value && !exportModeState.value)
const showExportCheckbox = computed(() => !sideCollapseState.value && exportModeState.value)
const isAllConnectionSelected = computed(() =>
    connectionConfigs.value.length > 0 && connectionConfigs.value.every((config) => selectedIds.value.has(config.id))
)
const selectionToggleText = computed(() => isAllConnectionSelected.value ? t('sideBarMenu.selectNone') : t('sideBarMenu.selectAll'))
const selectionToggleButtonType = computed(() => isAllConnectionSelected.value ? 'warning' : 'success')
// 初始加载占位：当连接列表还没回来且当前确实没有任何数据时，显示 loading 而不是空态创建按钮。
const showLoadingState = computed(() => props.isLoading && connectionConfigs.value.length === 0)
// 空态占位：只有加载结束后依然没有任何连接配置时，才展示创建/导入按钮。
const showEmptyState = computed(() => !props.isLoading && connectionConfigs.value.length === 0)

const handleToggleConnectionSelection = () => {
    if (isAllConnectionSelected.value) {
        handleSelectNone(selectedIds.value, t)
        return
    }

    handleSelectAll(connectionConfigs.value, selectedIds.value, t)
}

</script>

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
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: var(--titlebar-bg-color);
    flex-shrink: 0;
}

/* 导出左侧按钮组：保留“选择操作在左、导出操作在右”的布局语义，空间不足时左侧按钮组内部自动换行。 */
.export-left {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    max-width: 100%;
}

.export-action-panel .el-button {
    margin-left: 0;
    white-space: nowrap;
}

.export-action-panel > .el-button {
    margin-left: auto;
}

.export-selected-button {
    --el-button-bg-color: #409eff;
    --el-button-border-color: #409eff;
    --el-button-text-color: #ffffff;
    --el-button-hover-bg-color: #66b1ff;
    --el-button-hover-border-color: #66b1ff;
    --el-button-hover-text-color: #ffffff;
    --el-button-active-bg-color: #337ecc;
    --el-button-active-border-color: #337ecc;
    --el-button-active-text-color: #ffffff;
    --el-button-disabled-bg-color: #5f9fd6;
    --el-button-disabled-border-color: #5f9fd6;
    --el-button-disabled-text-color: rgba(255, 255, 255, 0.72);
}

.menu-panel-empty {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

/* 初始加载占位：在连接列表还未完成首轮加载时，给出稳定的居中 loading 反馈。 */
.menu-panel-loading {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 12px;
    color: var(--el-text-color-secondary);
}

/* Loading 图标：复用 Element Plus 图标旋转动效，保持和应用其余加载态一致。 */
.menu-panel-loading .loading-icon {
    font-size: 22px;
    color: var(--el-color-primary);
    animation: rotating 2s linear infinite;
}

.menu-panel-loading .loading-text {
    font-size: 13px;
}

.menu-panel {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.menu-panel :deep(.el-menu) {
    border-right: none;
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

@keyframes rotating {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}
</style>
