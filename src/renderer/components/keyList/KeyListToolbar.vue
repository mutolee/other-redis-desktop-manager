<!--
    KeyListToolbar.vue
    描述：Key 列表顶部工具栏。负责视图切换、搜索输入、新增/刷新入口和列表级操作菜单展示。
 -->
<template>
    <!-- 顶部工具栏：负责切换树形/列表视图、搜索 Key 和手动刷新 -->
    <div class="toolbar">
        <el-tooltip :content="viewModeTooltip" placement="bottom">
            <el-button
                class="view-mode-btn"
                :type="viewMode === 'tree' ? '' : 'primary'"
                :icon="viewModeIcon"
                @click="$emit('toggle-view-mode')"
            />
        </el-tooltip>

        <!-- 原生容器控制搜索框自适应范围，避免 el-autocomplete 默认 width: 100% 挤压工具按钮。 -->
        <div class="search-input-container">
            <el-autocomplete
                :model-value="searchText"
                :placeholder="t('keyList.searchPlaceholder')"
                :fetch-suggestions="querySearchHistory"
                :trigger-on-focus="false"
                :debounce="0"
                hide-loading
                popper-class="key-search-history-popper"
                clearable
                size="default"
                class="search-input"
                @update:model-value="$emit('update:searchText', $event)"
                @keyup.enter="$emit('submit-search')"
            >
                <template #suffix>
                    <!-- 搜索模式切换：勾选后按完整 Key 精准匹配，不勾选时按包含关系模糊匹配。 -->
                    <el-tooltip :content="t('keyList.exactSearch')" placement="bottom" :show-after="200">
                        <el-checkbox
                            :model-value="isExactSearch"
                            class="exact-search-checkbox"
                            @update:model-value="$emit('update:isExactSearch', $event)"
                        />
                    </el-tooltip>
                </template>
            </el-autocomplete>
        </div>

        <!-- 添加 Key 按钮：放在搜索框后方，作为创建流程的入口。 -->
        <el-tooltip :content="t('keyList.addKey')" placement="bottom">
            <el-button
                class="add-key-btn"
                :icon="Plus"
                type="primary"
                @click="$emit('add-key')"
            />
        </el-tooltip>

        <!-- 刷新按钮：固定停留在工具栏最右侧。 -->
        <el-tooltip :content="t('keyList.refreshKeyList')" placement="bottom" :show-after="200">
            <el-button
                class="refresh-btn"
                :icon="Refresh"
                circle
                :loading="isRefreshing"
                @click="$emit('refresh')"
            />
        </el-tooltip>

        <!-- Key 列表操作菜单：按连接、导入导出、分析、删除能力分组。 -->
        <el-dropdown
            trigger="hover"
            placement="bottom-end"
            popper-class="key-list-operation-dropdown"
            @command="$emit('operation-command', $event)"
        >
            <el-button class="operation-menu-btn" :icon="AllApplication" circle/>

            <template #dropdown>
                <el-dropdown-menu>
                    <el-dropdown-item command="closeAllOpenedKeys">
                        <el-icon>
                            <CloseOne/>
                        </el-icon>
                        <span class="dropdown-item-text">{{ t('keyList.operations.closeAllOpenedKeys') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="closeConnection">
                        <el-icon>
                            <LinkBreak/>
                        </el-icon>
                        <span class="dropdown-item-text">{{ t('keyList.operations.closeConnection') }}</span>
                    </el-dropdown-item>

                    <el-dropdown-item command="exportKeys" divided :disabled="batchDeleteSelectionMode">
                        <el-icon>
                            <Upload/>
                        </el-icon>
                        <span class="dropdown-item-text">{{ t('keyList.operations.exportKeys') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="importKeys" :disabled="batchDeleteSelectionMode">
                        <el-icon>
                            <Download/>
                        </el-icon>
                        <span class="dropdown-item-text">{{ t('keyList.operations.importKeys') }}</span>
                    </el-dropdown-item>

                    <el-dropdown-item command="memoryAnalysis" divided>
                        <el-icon>
                            <Memory/>
                        </el-icon>
                        <span class="dropdown-item-text">{{ t('keyList.operations.memoryAnalysis') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="slowQuery">
                        <el-icon>
                            <HistoryQuery/>
                        </el-icon>
                        <span class="dropdown-item-text">{{ t('keyList.operations.slowQuery') }}</span>
                    </el-dropdown-item>

                    <el-dropdown-item
                        command="selectDeleteKeys"
                        divided
                        :disabled="exportSelectionMode || batchDeleteSelectionMode"
                    >
                        <el-icon>
                            <DeleteKey/>
                        </el-icon>
                        <span class="dropdown-item-text">{{ t('keyList.operations.selectDeleteKeys') }}</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="deleteAllKeys" class="danger-operation">
                        <el-icon>
                            <Delete/>
                        </el-icon>
                        <span class="dropdown-item-text">{{ t('keyList.operations.deleteAllKeys') }}</span>
                    </el-dropdown-item>
                </el-dropdown-menu>
            </template>
        </el-dropdown>
    </div>
</template>

<script setup>
/**
 * KeyListToolbar 是 KeyListPanel 的顶部工具条子组件。
 * 组件只负责展示和派发事件，搜索条件、视图模式和具体操作逻辑仍由父组件统一管理。
 */
import {
    AllApplication,
    CloseOne,
    Delete,
    DeleteKey,
    Download,
    HistoryQuery,
    LinkBreak,
    Memory,
    Plus,
    Refresh,
    Upload
} from '@icon-park/vue-next'
import {useI18n} from '../../i18n/index.js'
import {getKeySearchSuggestions} from '../../utils/keySearchHistoryUtil.js'

const {t} = useI18n()

/**
 * 根据输入内容返回本地搜索历史联想。
 * callback 收到空数组时 Element Plus 不会展示下拉列表。
 *
 * @param {string} queryString 当前输入内容
 * @param {(suggestions:Array<{value:string}>) => void} callback 自动补全结果回调
 */
const querySearchHistory = (queryString, callback) => {
    callback(getKeySearchSuggestions(queryString))
}

defineProps({
    viewMode: {
        type: String,
        default: 'tree'
    },
    viewModeTooltip: {
        type: String,
        default: ''
    },
    viewModeIcon: {
        type: [Object, Function],
        default: null
    },
    searchText: {
        type: String,
        default: ''
    },
    isExactSearch: {
        type: Boolean,
        default: false
    },
    isRefreshing: {
        type: Boolean,
        default: false
    },
    exportSelectionMode: {
        type: Boolean,
        default: false
    },
    batchDeleteSelectionMode: {
        type: Boolean,
        default: false
    }
})

defineEmits([
    'update:searchText',
    'update:isExactSearch',
    'toggle-view-mode',
    'submit-search',
    'add-key',
    'refresh',
    'operation-command'
])
</script>

<style scoped>
/* 顶部工具栏：承载模式切换、搜索和刷新，保持固定高度避免主体区跳动。 */
.toolbar {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    flex-shrink: 0;
    align-items: center;
    border-bottom: 1px solid var(--el-border-color-light);
    background: var(--detail-header-bg-color);
}

/* 搜索框原生容器：根据工具栏剩余空间伸缩，最大260px，同时保留最小可用宽度。 */
.search-input-container {
    width: auto;
    min-width: 120px;
    max-width: 260px;
    flex: 1 1 180px;
}

/* 自动补全只铺满固定容器，不再直接参与工具栏 flex 尺寸计算。 */
.toolbar .search-input {
    --el-input-width: 100%;

    display: block;
    width: 100%;
    min-width: 0;
    max-width: none;
}

.toolbar .search-input :deep(.el-input) {
    width: 100%;
}

/* 搜索历史悬浮层挂载到 body，可宽于180px输入框，长 Key 具有更多可读空间。 */
:global(.key-search-history-popper) {
    width: 320px !important;
    max-width: calc(100vw - 24px);
}

/* 视图切换按钮：图标跟随按钮文字色，尺寸与工具栏内其他图标保持一致。 */
.view-mode-btn {
    width: 32px;
    padding: 0;
    flex-shrink: 0;
}

/* 添加 Key 按钮：保持普通图标按钮形态，不使用圆形外观。 */
.add-key-btn {
    width: 32px;
    padding: 0;
    flex-shrink: 0;
}

/* 刷新按钮：通过自动左边距推到工具栏最右端。 */
.refresh-btn {
    width: 32px;
    height: 32px;
    margin-left: auto;
    flex-shrink: 0;
}

/* 操作菜单按钮：跟随刷新按钮尺寸，作为列表级批量能力的统一入口。 */
.operation-menu-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    flex-shrink: 0;
}

.operation-menu-btn:hover,
.operation-menu-btn:focus,
.operation-menu-btn:focus-visible,
.operation-menu-btn.is-focus {
    outline: none;
    border-color: var(--el-border-color);
    box-shadow: none;
}

/* 操作菜单面板：下拉层挂载到 body，风格跟页签操作菜单保持一致。 */
:global(.key-list-operation-dropdown .el-dropdown-menu) {
    min-width: 168px;
    padding: 4px 0;
    background: var(--el-bg-color-overlay);
}

:global(.key-list-operation-dropdown .el-dropdown-menu__item) {
    display: flex;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    align-items: center;
    border-radius: 0;
    color: var(--el-text-color-regular);
    line-height: 36px;
}

:global(.key-list-operation-dropdown .el-dropdown-menu__item:hover) {
    color: var(--el-color-primary);
}

:global(.key-list-operation-dropdown .el-dropdown-menu__item.is-disabled) {
    cursor: not-allowed;
    color: var(--el-text-color-disabled) !important;
    background: transparent !important;
}

:global(.key-list-operation-dropdown .el-dropdown-menu__item.is-disabled:hover) {
    color: var(--el-text-color-disabled) !important;
    background: transparent !important;
}

:global(.key-list-operation-dropdown .el-dropdown-menu__item .el-icon) {
    display: inline-flex;
    width: 18px;
    height: 18px;
    margin-right: 0;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

/* icon-park 图形在菜单项内跟随图标容器居中，不再额外做位移。 */
:global(.key-list-operation-dropdown .el-dropdown-menu__item .el-icon .i-icon) {
    display: inline-flex;
    font-size: 18px;
    align-items: center;
    justify-content: center;
}

:global(.key-list-operation-dropdown .danger-operation) {
    color: var(--el-color-danger);
}

:global(.key-list-operation-dropdown .danger-operation:hover) {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
}

:global(.key-list-operation-dropdown .dropdown-item-text) {
    display: inline-flex;
    align-items: center;
    line-height: 18px;
}

/* 精准搜索复选框：嵌入输入框右侧，提供轻量模式切换，不额外挤占工具栏宽度。 */
.exact-search-checkbox {
    display: inline-flex;
    margin-left: 6px;
    align-items: center;
}
</style>
