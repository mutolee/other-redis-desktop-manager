<!--
    KeyListPanel.vue
    描述：Key 列表面板。负责当前连接页签的 Key 扫描、搜索、树形/列表切换、分页加载和新增 Key 入口。
 -->
<template>
    <!-- Key 列表面板：承载模式切换、搜索、扫描结果列表和分页加载操作 -->
    <div class="key-list-panel">
        <KeyListToolbar
            v-model:search-text="searchText"
            v-model:is-exact-search="isExactSearch"
            :view-mode="viewMode"
            :view-mode-tooltip="viewModeTooltip"
            :view-mode-icon="viewModeIcon"
            :is-refreshing="isRefreshing"
            :export-selection-mode="exportSelectionMode"
            :batch-delete-selection-mode="batchDeleteSelectionMode"
            @toggle-view-mode="toggleViewMode"
            @submit-search="handleSubmitSearch"
            @add-key="handleAddKey"
            @refresh="handleRefreshList"
            @operation-command="handleOperationCommand"
        />

        <!-- 列表主体区：根据加载结果展示空态或 Key 列表 -->
        <!-- 搜索结果提示：仅在提交搜索后展示，明确当前列表处于过滤结果态。 -->
        <div v-if="isSearchResultMode" class="search-result-tip">
            {{ t('keyList.searchResultLabel') }}
        </div>

        <KeySelectionBar
            v-if="exportSelectionMode"
            mode="export"
            :selected-count="selectedExportCount"
            :all-selected="isAllExportKeysSelected"
            :loading="isExportingKeys"
            @select-all="handleSelectAllExportKeys"
            @clear="handleClearExportSelection"
            @close="exitExportSelectionMode"
            @submit="handleExportSelectedKeys"
        />

        <KeySelectionBar
            v-if="batchDeleteSelectionMode"
            mode="batch-delete"
            :selected-count="selectedBatchDeleteCount"
            :all-selected="isAllBatchDeleteKeysSelected"
            :loading="isBatchDeletingKeys"
            @select-all="handleSelectAllBatchDeleteKeys"
            @clear="handleClearBatchDeleteSelection"
            @close="exitBatchDeleteSelectionMode"
            @submit="handleBatchDeleteSelectedKeys"
        />

        <KeyListBody
            :loading="isKeyListBodyLoading"
            :loading-text="keyListLoadingText"
            :empty-visible="isEmptyStateVisible"
            :empty-description="emptyDescription"
            :rows="visibleRows"
            :row-height="ROW_HEIGHT"
            :active-key="activeKey"
            :selection-mode="isSelectionMode"
            :is-ancestor-of-active-key="isAncestorOfActiveKey"
            :is-context-menu-active="isContextMenuActive"
            :get-row-style="getRowStyle"
            :is-row-selection-checked="isRowSelectionChecked"
            :is-row-selection-indeterminate="isRowSelectionIndeterminate"
            :is-row-selection-disabled="isRowSelectionDisabled"
            :is-expanded="isExpanded"
            :get-tag-type="getTagType"
            @row-click="handleRowClick"
            @row-context-menu="handleRowContextMenu"
            @toggle-selection="toggleSelectionRow"
            @toggle-expand="toggleExpand"
        />

        <!-- 底部分页操作：支持继续扫描或一次性拉取全部 -->
        <div class="load-footer">
            <el-button
                type="warning"
                plain
                class="load-btn"
                :loading="isLoadingAll"
                :disabled="!hasMore || isLoadingMore || isInitialLoading || isKeyListBusy"
                @click="loadAll"
            >
                {{ t('keyList.loadAll') }}
            </el-button>

            <el-button
                type="primary"
                plain
                class="load-btn"
                :loading="isLoadingMore"
                :disabled="!hasMore || isLoadingAll || isInitialLoading || isKeyListBusy"
                @click="loadKeys(false)"
            >
                {{ t('keyList.loadMore') }}
            </el-button>
        </div>

        <!-- 新增 Key 弹窗：创建成功后在当前已加载列表中局部插入并选中。 -->
        <AddKeyDialog
            v-model:visible="addKeyDialogVisible"
            :tab-id="tabId"
            @created="handleKeyCreated"
        />

        <!-- Key 行右键菜单：根据目录节点或真实 Key 节点展示不同操作入口。 -->
        <KeyListContextMenu
            v-model:visible="contextMenuVisible"
            :row="contextMenuRow"
            :virtual-ref="contextMenuVirtualRef"
            @command="handleContextMenuCommand"
        />

        <!-- 内存分析抽屉：从顶部操作菜单打开，展示当前 DB 的 Key 内存占用排行。 -->
        <MemoryAnalysisDrawer
            v-model:visible="memoryAnalysisDrawerVisible"
            :connection-id="tabId"
            :connection-name="currentConnectionName"
            :scope-label="memoryAnalysisScopeLabel"
            :match-pattern="memoryAnalysisMatchPattern"
        />

        <!-- 慢查询抽屉：展示当前 Redis 实例级 SLOWLOG，不区分具体 DB。 -->
        <SlowQueryDrawer
            v-model:visible="slowQueryDrawerVisible"
            :connection-id="tabId"
            :connection-name="currentConnectionName"
        />

        <!-- 删除目录 Key 抽屉：右键目录打开，先预览目录下 Key，再二次确认删除。 -->
        <DeleteDirectoryKeysDrawer
            v-model:visible="deleteDirectoryDrawerVisible"
            :connection-id="tabId"
            :connection-name="currentConnectionName"
            :directory-key="deleteDirectoryTarget?.key || ''"
            :match-pattern="deleteDirectoryMatchPattern"
            @deleted="handleDirectoryKeysDeleted"
        />
    </div>
</template>

<script setup>
/**
 * Key 列表面板组件。
 * 负责加载当前连接与当前 db 下的 Key 列表，并支持树形/列表视图切换、搜索、分页扫描与选择 Key。
 */
import {computed, onBeforeUnmount, ref, shallowRef, watch} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import {ListTwo, TreeList} from '@icon-park/vue-next'
import {storeToRefs} from 'pinia'
import {useI18n} from '../i18n/index.js'
import {buildKeyTreeMap, flattenExpandedTreeNodes, isAncestorDirectoryKey, normalizeKeySeparator} from '../utils/keyListTreeUtil.js'
import {getSelectedKeyRows} from '../utils/keyExportSelectionUtil.js'
import {saveKeyExportData} from '../utils/keyExportUtil.js'
import {readKeyImportFile} from '../utils/keyImportUtil.js'
import {eventBus} from '../utils/eventBus.js'
import {addKeySearchHistory} from '../utils/keySearchHistoryUtil.js'
import {useKeyListDrawers} from '../composables/useKeyListDrawers.js'
import {useKeyListSelection} from '../composables/useKeyListSelection.js'
import {useConnectionConfigsStore} from '../stores/modules/connectionConfigsStore.js'
import {useUserSettingsStore} from '../stores/modules/userSettingsStore.js'
import MemoryAnalysisDrawer from './drawer/MemoryAnalysisDrawer.vue'
import SlowQueryDrawer from './drawer/SlowQueryDrawer.vue'
import DeleteDirectoryKeysDrawer from './drawer/DeleteDirectoryKeysDrawer.vue'
import AddKeyDialog from './dialog/AddKeyDialog.vue'
import KeyListContextMenu from './dialog/KeyListContextMenu.vue'
import KeyListBody from './keyList/KeyListBody.vue'
import KeyListToolbar from './keyList/KeyListToolbar.vue'
import KeySelectionBar from './keyList/KeySelectionBar.vue'

// 国际化文案读取函数：驱动 Key 列表工具栏、空态和错误反馈文案。
const {t} = useI18n()

// 组件入参：tabId 用于标识当前连接页签，activeKey 用于高亮当前选中项，dbIndex 用于切库后刷新列表。
const props = defineProps({
    tabId: {
        type: String,
        default: ''
    },
    activeKey: {
        type: String,
        default: ''
    },
    dbIndex: {
        type: Number,
        default: 0
    },
    renamedKeyPatch: {
        type: Object,
        default: null
    },
    deletedKeyPatch: {
        type: Object,
        default: null
    },
    resetVersion: {
        type: Number,
        default: 0
    }
})

// 组件事件：当用户点击具体 Key 时，向父组件同步当前选中项。
const emit = defineEmits(['select', 'close-all-opened-keys'])

// 从系统设置 store 中提取连接设置，用于读取用户配置的 Key 扫描数量。
const {connectionSettings} = storeToRefs(useUserSettingsStore())

// 从连接配置 store 中提取已打开连接列表，用于顶部菜单关闭当前连接页签。
const {openedConnectionConfigs} = storeToRefs(useConnectionConfigsStore())

// 已扫描到的原始 Key 列表，作为树形和列表模式的共同数据源。
const allScannedKeys = ref([])

// Redis SCAN 返回的游标，用于继续加载下一批结果。
const cursor = ref('0')

// 当前是否还有更多 Key 可以继续扫描。
const hasMore = ref(false)

// 扫描版本号：刷新、搜索、切库或卸载后递增，用于丢弃已经过期的类型补充结果。
const scanGeneration = ref(0)

// 类型补充队列保持串行，避免“加载全部”时向远程 Redis 并发发送大量 TYPE pipeline。
let keyTypeHydrationQueue = Promise.resolve()

// 首次加载或重置加载的状态，用于控制整体刷新与空态显示。
const isInitialLoading = ref(false)

// 点击“加载更多”时的局部加载状态。
const isLoadingMore = ref(false)

// 点击“加载全部”时的批量扫描状态。
const isLoadingAll = ref(false)

// 删除所有 Key 的危险操作状态，用于避免重复触发 FLUSHDB。
const isDeletingAllKeys = ref(false)

// 右键删除单个 Key 的状态：避免同一个危险操作被重复触发。
const isDeletingContextKey = ref(false)

// 当前是否正在导出 Key 数据：导出期间禁用重复提交并展示按钮 loading。
const isExportingKeys = ref(false)

// 当前是否正在导入 Key 数据：避免重复选择文件或重复提交导入。
const isImportingKeys = ref(false)

// 当前是否正在批量删除 Key：删除期间遮罩列表，避免选择状态和 Redis 写操作同时变化。
const isBatchDeletingKeys = ref(false)

// 当前是否由回车搜索触发列表加载：用于在保留旧结果时给列表主体显示轻量遮罩。
const isSearchingKeys = ref(false)

// 搜索输入内容：仅用于输入框展示，不会随着输入变化立即触发搜索。
const searchText = ref('')

// 搜索模式开关：仅记录当前勾选状态，真正生效要等用户按回车提交。
const isExactSearch = ref(false)

// 当前生效的服务端搜索模式：只在按下回车后更新，用于后续分页继续沿用同一套搜索条件。
const activeSearchPattern = ref('*')

// 当前生效的搜索类型：区分普通列表、SCAN 模糊搜索和 TYPE 精确搜索。
const activeSearchMode = ref('all')

// 当前视图模式：支持树形视图和扁平列表视图。
const viewMode = ref('tree')

// 当前展开的目录集合，用于驱动树形节点的显隐。
const expandedKeys = ref(new Set())

// 新增 Key 弹窗显示状态：由顶部加号按钮打开。
const addKeyDialogVisible = ref(false)

// 行右键菜单显示状态：由 Key 行 contextmenu 事件打开。
const contextMenuVisible = ref(false)

// 当前右键选中的 Key 行：用于区分目录节点和真实 Key 节点。
const contextMenuRow = ref(null)

// 行右键菜单虚拟触发位置：让菜单定位到鼠标右键点击处。
const contextMenuVirtualRef = shallowRef(null)

// Key 类型到标签主题色的映射，用于保持不同数据结构的视觉区分。
const typeTagType = {
    string: '',
    hash: 'success',
    list: 'info',
    set: 'warning',
    zset: 'danger',
    stream: 'warning'
}

// 树形模式最大展示层级：超过 4 段的 Key 会折叠到最后一层节点中。
const MAX_TREE_DEPTH = 4

// 虚拟列表单行高度：与当前行内边距和字体大小匹配，保证滚动定位稳定。
const ROW_HEIGHT = 40

// 首次模糊搜索使用更大的 SCAN 建议量，降低第一批没有任何命中结果的概率。
const FIRST_FUZZY_SEARCH_SCAN_COUNT = 10000

// 视图切换按钮的提示文案，随着当前模式动态变化。
const viewModeTooltip = computed(() =>
    viewMode.value === 'tree' ? t('keyList.listView') : t('keyList.treeView')
)

// 视图切换按钮图标：当前列表模式显示列表图标，树形模式显示树形图标。
const viewModeIcon = computed(() => viewMode.value === 'tree' ? TreeList : ListTwo)

// 当前是否处于服务端搜索结果模式：只要生效模式不是全量扫描，就说明列表展示的是某次搜索结果。
const isSearchResultMode = computed(() => activeSearchMode.value !== 'all')

// 当前打开连接配置：树形分隔符、抽屉标题和关闭连接操作都依赖同一份连接上下文。
const currentConnectionConfig = computed(() =>
    openedConnectionConfigs.value.find(
        (item) => String(item.id) === String(props.tabId)
    )
)

// 当前连接名称：用于内存分析抽屉顶部展示，帮助用户确认正在分析的连接。
const currentConnectionName = computed(() => {
    if (!currentConnectionConfig.value) {
        return ''
    }

    return `${currentConnectionConfig.value.name || ''} (${currentConnectionConfig.value.host || '-'}:${currentConnectionConfig.value.port || '-'})`
})

// 当前 Key 层级分隔符：优先使用连接配置 key_split，无效时回退为冒号。
const currentKeySeparator = computed(() => normalizeKeySeparator(currentConnectionConfig.value?.key_split))

// Key 列表选择状态：导出和批量删除共用目录半选、全选、清空和模式切换逻辑。
const {
    exportSelectionMode,
    selectedExportKeys,
    batchDeleteSelectionMode,
    selectedBatchDeleteKeys,
    selectedExportCount,
    selectedBatchDeleteCount,
    isAllExportKeysSelected,
    isAllBatchDeleteKeysSelected,
    isSelectionMode,
    isRowSelectionChecked,
    isRowSelectionIndeterminate,
    isRowSelectionDisabled,
    toggleSelectionRow,
    enterExportSelectionMode,
    enterBatchDeleteSelectionMode,
    handleSelectAllExportKeys,
    handleSelectAllBatchDeleteKeys,
    handleClearExportSelection,
    handleClearBatchDeleteSelection,
    exitExportSelectionMode,
    exitBatchDeleteSelectionMode,
    resetSelections,
    removeSelectedKeys,
    pruneSelectionsByLoadedKeys
} = useKeyListSelection({
    allScannedKeys,
    currentKeySeparator,
    connectionId: computed(() => props.tabId),
    t
})

// Key 列表 Drawer 状态：内存分析、慢查询和目录删除抽屉统一收拢在组合函数中。
const {
    memoryAnalysisDrawerVisible,
    memoryAnalysisMatchPattern,
    memoryAnalysisScopeLabel,
    slowQueryDrawerVisible,
    deleteDirectoryDrawerVisible,
    deleteDirectoryTarget,
    deleteDirectoryMatchPattern,
    buildDirectoryMatchPattern,
    openMemoryAnalysisDrawer,
    openSlowQueryDrawer,
    openDeleteDirectoryDrawer
} = useKeyListDrawers({
    connectionId: computed(() => props.tabId),
    currentKeySeparator,
    t
})

// 当前 Key 扫描数量：优先使用系统设置中的 scanCount，无效时回退到默认值。
const currentScanCount = computed(() => {
    const scanCount = Number(connectionSettings.value?.scanCount)
    return Number.isFinite(scanCount) && scanCount > 0 ? scanCount : 100
})

// 空态说明文案：区分“没有任何数据”和“没有匹配结果”。
const emptyDescription = computed(() =>
    isSearchResultMode.value ? t('keyList.noMatchedKeys') : t('keyList.noData')
)

// 列表空态显示条件：仅在非初始加载且没有任何可见数据时展示。
const isEmptyStateVisible = computed(() => !isInitialLoading.value && visibleRows.value.length === 0)

// 刷新按钮加载态：仅在重置加载时展示主刷新状态。
const isRefreshing = computed(() => isInitialLoading.value)

// 导入、导出、批量删除属于重操作，列表主体需要显示遮罩避免继续误操作。
const isKeyListBusy = computed(() => isExportingKeys.value || isImportingKeys.value || isBatchDeletingKeys.value)

// 列表遮罩状态：重操作和回车搜索都会覆盖列表主体，但只有重操作会拦截刷新等行为。
const isKeyListOverlayLoading = computed(() => isKeyListBusy.value || isSearchingKeys.value)

// 首次扫描也显示明确 loading，避免远程 Redis 尚未返回 Key 名称时列表区域白屏。
const isKeyListBodyLoading = computed(() => isInitialLoading.value || isKeyListOverlayLoading.value)

// 列表遮罩文案：区分首次加载、搜索、导入、导出和批量删除，避免用户误判当前动作。
const keyListLoadingText = computed(() => {
    if (isSearchingKeys.value) {
        return t('keyList.searchLoading')
    }

    if (isInitialLoading.value) {
        return t('keyList.initialLoading')
    }

    if (isImportingKeys.value) {
        return t('keyList.import.loading')
    }

    if (isBatchDeletingKeys.value) {
        return t('keyList.batchDeleteSelection.loading')
    }

    return t('keyList.exportSelection.loading')
})

// 树形节点映射：作为树形渲染和目录展开判断的基础数据结构。
const treeMap = computed(() => buildKeyTreeMap(allScannedKeys.value, MAX_TREE_DEPTH, currentKeySeparator.value))

// 树形模式下的完整节点列表，保留父子关系与层级深度。
const treeNodes = computed(() => Array.from(treeMap.value.values()))

// 列表模式下的扁平数据，将所有 Key 直接映射成可渲染行。
const listRows = computed(() =>
    allScannedKeys.value.map((item) => ({
        nodeId: `key:${item.key}`,
        key: item.key,
        parentKey: null,
        depth: 0,
        displayKey: item.key,
        isDirectory: false,
        type: item.type,
        typeLoading: Boolean(item.typeLoading)
    }))
)

/**
 * 判断某个目录节点是否处于展开状态。
 * @param {string} nodeId 目录节点唯一 ID
 * @returns {boolean} 是否展开
 */
const isExpanded = (nodeId) => expandedKeys.value.has(nodeId)

// 当前模式下的基础可见行：树形模式走目录展开逻辑，列表模式直接展示完整 Key。
const baseRows = computed(() => {
    if (viewMode.value === 'list') {
        return listRows.value
    }

    return flattenExpandedTreeNodes(treeNodes.value, isExpanded)
})

// 树形搜索结果行：搜索后仍按当前展开状态展示，不主动展开所有目录。
const searchResultTreeRows = computed(() => flattenExpandedTreeNodes(treeNodes.value, isExpanded))

// 最终渲染行：树形视图始终尊重目录展开状态，列表视图直接展示扁平结果。
const visibleRows = computed(() => {
    if (!isSearchResultMode.value) {
        return baseRows.value
    }

    if (viewMode.value === 'tree') {
        return searchResultTreeRows.value
    }

    return listRows.value
})

/**
 * 重置扫描状态。
 * 切换连接、切换 db 或重新搜索时，需要把游标、结果与展开状态恢复初始值。
 */
const resetScanState = () => {
    allScannedKeys.value = []
    cursor.value = '0'
    hasMore.value = false
    expandedKeys.value = new Set()
    resetSelections()
}

/**
 * 切换树形/列表视图。
 */
const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'tree' ? 'list' : 'tree'
}

/**
 * 切换目录展开状态。
 * @param {{ key: string }} row 当前目录行
 */
const toggleExpand = (row) => {
    const nextExpandedKeys = new Set(expandedKeys.value)
    const expandId = row.nodeId || row.key

    if (nextExpandedKeys.has(expandId)) {
        nextExpandedKeys.delete(expandId)
    } else {
        nextExpandedKeys.add(expandId)
    }

    expandedKeys.value = nextExpandedKeys
}

/**
 * 生成虚拟列表行样式。
 * 需要把虚拟列表提供的定位样式和当前层级缩进一起合并到同一行上。
 * @param {Object} row 当前渲染行
 * @param {Object} virtualStyle 虚拟列表提供的绝对定位样式
 * @returns {Array<Object>} 合并后的样式数组
 */
const getRowStyle = (row, virtualStyle) => [
    virtualStyle,
    {
        paddingLeft: `${16 + row.depth * 20}px`
    }
]

/**
 * 获取 Element Plus Tag 的合法类型值。
 * 字符串类型不传主题色时，需要返回 `undefined`，避免把空字符串传给 ElTag 触发校验警告。
 * @param {string} keyType Redis Key 类型
 * @returns {string|undefined} 可用于 ElTag 的类型值
 */
const getTagType = (keyType) => typeTagType[keyType] || undefined

// 判断当前目录节点是否为已选中 Key 的祖先节点，用于高亮父级路径。
const isAncestorOfActiveKey = (row) => isAncestorDirectoryKey(row, props.activeKey, currentKeySeparator.value)

/**
 * 导出当前选中的完整 Key 数据。
 * 选择集合仍由 renderer 管理，真实 Redis 数据读取集中交给 main 进程处理。
 */
const handleExportSelectedKeys = async () => {
    const selectedKeyRows = getSelectedKeyRows(allScannedKeys.value, selectedExportKeys.value)

    if (selectedKeyRows.length === 0) {
        ElMessage.warning(t('keyList.exportSelection.messages.empty'))
        return
    }

    if (isExportingKeys.value) {
        return
    }

    try {
        isExportingKeys.value = true
        const response = await window.api.redis.exportKeys(
            props.tabId,
            selectedKeyRows.map((item) => item.key)
        )

        if (!response.success) {
            ElMessage.error(`${t('keyList.exportSelection.messages.fail')}: ${response.error || t('common.unknownError')}`)
            return
        }

        const saveResult = await saveKeyExportData({
            connectionName: currentConnectionName.value,
            dbIndex: props.dbIndex,
            exportResult: response.data
        }, t)

        if (saveResult === 'cancelled') {
            return
        }

        const exportedCount = Number(response.data?.exportedCount ?? response.data?.keys?.length ?? 0)
        const failedCount = Number(response.data?.failedCount ?? response.data?.failedKeys?.length ?? 0)
        const truncatedCount = (response.data?.keys ?? []).filter((item) => item.truncated).length
        if (failedCount > 0 || truncatedCount > 0) {
            ElMessage.warning(t('keyList.exportSelection.messages.successWithIssues', {
                value: exportedCount,
                failed: failedCount,
                truncated: truncatedCount
            }))
        } else {
            ElMessage.success(t('keyList.exportSelection.messages.success', {value: exportedCount}))
        }
        exitExportSelectionMode()
    } catch (error) {
        ElMessage.error(`${t('keyList.exportSelection.messages.fail')}: ${error.message || error}`)
    } finally {
        isExportingKeys.value = false
    }
}

/**
 * 批量删除当前选中的 Key。
 * 删除成功后只移除当前已加载列表中的命中项，并重置右侧详情，避免保留已删除 Key 的内容页。
 */
const handleBatchDeleteSelectedKeys = async () => {
    const selectedKeys = [...selectedBatchDeleteKeys.value]

    if (selectedKeys.length === 0) {
        ElMessage.warning(t('keyList.batchDeleteSelection.messages.empty'))
        return
    }

    if (!props.tabId || isBatchDeletingKeys.value) {
        return
    }

    try {
        await ElMessageBox.confirm(
            t('keyList.batchDeleteSelection.confirm.message', {value: selectedKeys.length}),
            t('keyList.batchDeleteSelection.confirm.title'),
            {
                confirmButtonText: t('keyList.batchDeleteSelection.confirm.confirmButton'),
                cancelButtonText: t('common.cancel'),
                type: 'warning',
                confirmButtonClass: 'el-button--danger'
            }
        )

        isBatchDeletingKeys.value = true
        const response = await window.api.redis.deleteKeys(props.tabId, selectedKeys)

        if (!response.success) {
            ElMessage.error(`${t('keyList.batchDeleteSelection.messages.fail')}: ${response.error || t('common.unknownError')}`)
            return
        }

        const deletedKeySet = new Set(selectedKeys)
        const deletedCount = Number(response.data?.deletedCount ?? 0)

        allScannedKeys.value = allScannedKeys.value.filter((item) => !deletedKeySet.has(item.key))
        removeSelectedKeys(deletedKeySet)
        eventBus.emit('reset-page-info', {tabId: props.tabId})
        ElMessage.success(t('keyList.batchDeleteSelection.messages.success', {value: deletedCount}))
        exitBatchDeleteSelectionMode()
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(`${t('keyList.batchDeleteSelection.messages.fail')}: ${error.message || error}`)
        }
    } finally {
        isBatchDeletingKeys.value = false
    }
}

/**
 * 导入 Key 导出文件。
 * 第一版采用同名覆盖策略，导入成功后刷新当前 PageInfo，避免列表与详情展示旧数据。
 */
const handleImportKeys = async () => {
    if (!props.tabId) {
        ElMessage.warning(t('keyList.messages.connectFirst'))
        return
    }

    if (isImportingKeys.value) {
        return
    }

    try {
        const importData = await readKeyImportFile()

        if (!importData) {
            return
        }

        if (importData?.format !== 'other-redis-desktop-manager.key-export' || !Array.isArray(importData.keys)) {
            ElMessage.error(t('keyList.import.messages.invalidFile'))
            return
        }

        const truncatedSourceCount = importData.keys.filter((item) => item.truncated).length
        await ElMessageBox.confirm(
            t('keyList.import.confirm.message', {
                value: importData.keys.length,
                truncated: truncatedSourceCount
            }),
            t('keyList.import.confirm.title'),
            {
                confirmButtonText: t('keyList.import.confirm.confirmButton'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
            }
        )

        isImportingKeys.value = true
        const response = await window.api.redis.importKeys(props.tabId, importData, {replace: true})

        if (!response.success) {
            ElMessage.error(`${t('keyList.import.messages.fail')}: ${response.error || t('common.unknownError')}`)
            return
        }

        const importedCount = Number(response.data?.importedCount ?? 0)
        const skippedCount = Number(response.data?.skippedCount ?? 0)
        const failedCount = Number(response.data?.failedCount ?? 0)
        ElMessage.success(t('keyList.import.messages.success', {
            imported: importedCount,
            skipped: skippedCount,
            failed: failedCount
        }))
        isImportingKeys.value = false
        eventBus.emit('reset-page-info', {tabId: props.tabId})
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(`${t('keyList.import.messages.fail')}: ${error.message || error}`)
        }
    } finally {
        isImportingKeys.value = false
    }
}

/**
 * 判断当前行是否需要展示右键菜单临时背景。
 * 已打开的 Key 本身已有选中态，右键它时不额外叠加背景色。
 * @param {Object} row 当前渲染行
 * @returns {boolean} 是否展示右键菜单背景
 */
const isContextMenuActive = (row) => {
    if (!contextMenuVisible.value || !row || !contextMenuRow.value) {
        return false
    }

    if (!row.isDirectory && props.activeKey === row.key) {
        return false
    }

    return (row.nodeId || row.key) === (contextMenuRow.value.nodeId || contextMenuRow.value.key)
}

/**
 * 目录 Key 删除成功后同步当前已加载列表，并重置右侧详情。
 * @param {string[]} deletedKeys 已删除 Key 列表
 */
const handleDirectoryKeysDeleted = (deletedKeys = []) => {
    const deletedKeySet = new Set(deletedKeys)

    allScannedKeys.value = allScannedKeys.value.filter((item) => !deletedKeySet.has(item.key))
    removeSelectedKeys(deletedKeySet)
    eventBus.emit('reset-page-info', {tabId: props.tabId})
}

/**
 * 删除右键选中的单个 Key。
 * 删除成功后只更新当前已加载列表，并通知右侧关闭对应详情 tab，避免刷新破坏当前分页状态。
 * @param {Object} row 当前右键选中的 Key 行
 */
const handleDeleteContextKey = async (row) => {
    if (!props.tabId || !row?.key || isDeletingContextKey.value) {
        return
    }

    try {
        await ElMessageBox.confirm(
            t('keyList.contextMenu.confirm.deleteKeyMessage', {value: row.key}),
            t('keyList.contextMenu.confirm.deleteKeyTitle'),
            {
                confirmButtonText: t('keyList.contextMenu.confirm.deleteKeyConfirm'),
                cancelButtonText: t('common.cancel'),
                type: 'warning',
                confirmButtonClass: 'el-button--danger'
            }
        )

        isDeletingContextKey.value = true
        const response = await window.api.redis.executeCommand(props.tabId, 'DEL', [row.key])

        if (!response.success) {
            ElMessage.error(`${t('keyList.contextMenu.messages.deleteFail')}: ${response.error || t('common.unknownError')}`)
            return
        }

        allScannedKeys.value = allScannedKeys.value.filter((item) => item.key !== row.key)
        removeSelectedKeys([row.key])
        eventBus.emit('key-list-key-deleted', {tabId: props.tabId, key: row.key})
        ElMessage.success(t('keyList.contextMenu.messages.deleteSuccess'))
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(`${t('keyList.contextMenu.messages.deleteFail')}: ${error.message || error}`)
        }
    } finally {
        isDeletingContextKey.value = false
    }
}

/**
 * 处理列表项点击。
 * 目录节点点击时执行展开/收起，普通 Key 点击时向外同步选中结果。
 * @param {Object} row 当前点击行
 */
const handleRowClick = (row) => {
    if (isKeyListBusy.value) {
        return
    }

    if (isSelectionMode.value) {
        toggleSelectionRow(row)
        return
    }

    if (row.isDirectory) {
        toggleExpand(row)
        return
    }

    emit('select', row)
}

/**
 * 根据鼠标事件创建右键菜单虚拟触发对象。
 * @param {MouseEvent} event 鼠标右键事件
 * @returns {{getBoundingClientRect: Function}} Element Plus Popover 虚拟触发对象
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
 * 打开 Key 行右键菜单。
 * @param {MouseEvent} event 鼠标右键事件
 * @param {Object} row 当前右键点击的行数据
 */
const handleRowContextMenu = (event, row) => {
    if (!row || isSelectionMode.value || isKeyListBusy.value) {
        return
    }

    contextMenuRow.value = row
    contextMenuVirtualRef.value = createContextMenuVirtualRef(event)
    contextMenuVisible.value = true
}

/**
 * 处理 Key 行右键菜单命令。
 * @param {{command:string,row:Object}} payload 菜单命令和目标行
 */
const handleContextMenuCommand = async ({command, row}) => {
    if (!command || !row) {
        return
    }

    if (command === 'copy-key') {
        try {
            await navigator.clipboard.writeText(row.key)
            ElMessage.success(t('keyList.contextMenu.messages.copySuccess'))
        } catch (error) {
            ElMessage.error(`${t('keyList.contextMenu.messages.copyFail')}: ${error.message || error}`)
        }
        return
    }

    if (command === 'export-key' && !row.isDirectory) {
        enterExportSelectionMode(row)
        return
    }

    if (command === 'export-directory-keys' && row.isDirectory) {
        enterExportSelectionMode(row)
        return
    }

    if (command === 'batch-delete-keys') {
        enterBatchDeleteSelectionMode(row)
        return
    }

    if (command === 'load-directory-keys' && row.isDirectory) {
        // 目录过滤复用顶部搜索框：把目录 key 写入输入框，并强制按模糊搜索重新扫描。
        searchText.value = row.key
        isExactSearch.value = false
        handleSubmitSearch()
        return
    }

    if (command === 'delete-key' && !row.isDirectory) {
        await handleDeleteContextKey(row)
        return
    }

    if (command === 'directory-memory-analysis' && row.isDirectory) {
        openMemoryAnalysisDrawer({
            matchPattern: buildDirectoryMatchPattern(row.key),
            scopeLabel: row.key
        })
        return
    }

    if (command === 'delete-directory-keys' && row.isDirectory) {
        openDeleteDirectoryDrawer(row)
        return
    }

    ElMessage.info(t('keyList.contextMenu.messages.pending'))
}

/**
 * 处理添加 Key 按钮点击。
 */
const handleAddKey = () => {
    if (!props.tabId) {
        ElMessage.warning(t('keyList.messages.connectFirst'))
        return
    }

    addKeyDialogVisible.value = true
}

/**
 * 展开新增 Key 的父级目录路径。
 * 树形模式下新 Key 可能带有冒号分层，需要展开父级目录才能立刻看到新增项。
 * @param {string} key 新增 Key 名称
 */
const expandCreatedKeyPath = (key) => {
    const separator = currentKeySeparator.value
    const rawParts = String(key || '').split(separator)
    const parts = rawParts.length > MAX_TREE_DEPTH
        ? [
            ...rawParts.slice(0, MAX_TREE_DEPTH - 1),
            rawParts.slice(MAX_TREE_DEPTH - 1).join(separator)
        ]
        : rawParts
    const nextExpandedKeys = new Set(expandedKeys.value)

    for (let index = 0; index < parts.length - 1; index += 1) {
        nextExpandedKeys.add(`dir:${parts.slice(0, index + 1).join(separator)}`)
    }

    expandedKeys.value = nextExpandedKeys
}

/**
 * 处理新增 Key 创建成功。
 * 不重新扫描全量列表，只把新 Key 插入当前已加载结果并通知右侧打开详情。
 * @param {{key:string,type:string}} createdKey 新增 Key 信息
 */
const handleKeyCreated = (createdKey) => {
    if (!createdKey?.key || !createdKey?.type) {
        return
    }

    const nextKey = {
        key: createdKey.key,
        type: createdKey.type,
        typeLoading: false
    }

    allScannedKeys.value = [
        nextKey,
        ...allScannedKeys.value.filter((item) => item.key !== createdKey.key)
    ]
    expandCreatedKeyPath(createdKey.key)
    emit('select', nextKey)
}

/**
 * 重置当前 Key 列表。
 * 清空搜索框、关闭精准搜索，并恢复为全量 SCAN。
 */
const resetKeyList = () => {
    searchText.value = ''
    isExactSearch.value = false
    activeSearchPattern.value = '*'
    activeSearchMode.value = 'all'
    loadKeys(true)
}

/**
 * 手动刷新当前 Key 列表。
 * 刷新等同于重置列表：清空搜索框、关闭精准搜索，并恢复为全量 SCAN。
 */
const handleRefreshList = () => {
    if (isKeyListBusy.value) {
        ElMessage.warning(t('keyList.messages.busy'))
        return
    }

    resetKeyList()
}

/**
 * 处理 Key 列表操作菜单命令。
 * 当前阶段只搭建菜单入口，具体功能后续逐个实现时再替换为真实逻辑。
 * @param {string} command 操作菜单命令
 */
const handleOperationCommand = async (command) => {
    if (!command) {
        return
    }

    if (command === 'closeConnection') {
        // 关闭连接必须复用主视图的页签关闭流程，确保页签状态和 Redis 连接释放同步完成。
        const openedConnectionConfig = openedConnectionConfigs.value.find(
            (connectionConfig) => String(connectionConfig.id) === String(props.tabId)
        )

        if (!openedConnectionConfig) {
            ElMessage.warning(t('keyList.messages.connectFirst'))
            return
        }

        eventBus.emit('close-opened-connection', openedConnectionConfig)
        return
    }

    if (command === 'closeAllOpenedKeys') {
        emit('close-all-opened-keys')
        return
    }

    if (command === 'memoryAnalysis') {
        openMemoryAnalysisDrawer()
        return
    }

    if (command === 'slowQuery') {
        openSlowQueryDrawer()
        return
    }

    if (command === 'exportKeys') {
        if (batchDeleteSelectionMode.value) {
            return
        }

        enterExportSelectionMode()
        return
    }

    if (command === 'importKeys') {
        if (batchDeleteSelectionMode.value) {
            return
        }

        await handleImportKeys()
        return
    }

    if (command === 'selectDeleteKeys') {
        if (exportSelectionMode.value) {
            ElMessage.warning(t('keyList.operations.messages.batchDeleteDisabledInExport'))
            return
        }

        if (batchDeleteSelectionMode.value) {
            return
        }

        enterBatchDeleteSelectionMode()
        return
    }

    if (command === 'deleteAllKeys') {
        if (!props.tabId) {
            ElMessage.warning(t('keyList.messages.connectFirst'))
            return
        }

        if (isDeletingAllKeys.value) {
            return
        }

        try {
            await ElMessageBox.confirm(
                t('keyList.operations.confirm.deleteAllMessage', {value: props.dbIndex}),
                t('keyList.operations.confirm.deleteAllTitle'),
                {
                    confirmButtonText: t('keyList.operations.confirm.deleteAllConfirm'),
                    cancelButtonText: t('common.cancel'),
                    type: 'warning',
                    confirmButtonClass: 'el-button--danger'
                }
            )

            isDeletingAllKeys.value = true
            // FLUSHDB 只清空当前连接已选择的 DB，成功后重置列表，避免展示已被删除的旧 Key。
            const response = await window.api.redis.executeCommand(props.tabId, 'FLUSHDB', [])

            if (!response.success) {
                ElMessage.error(`${t('keyList.operations.messages.deleteAllFail')}: ${response.error || t('common.unknownError')}`)
                return
            }

            ElMessage.success(t('keyList.operations.messages.deleteAllSuccess'))
            eventBus.emit('reset-page-info', {tabId: props.tabId})
        } catch (error) {
            if (error !== 'cancel' && error !== 'close') {
                ElMessage.error(`${t('keyList.operations.messages.deleteAllFail')}: ${error.message || error}`)
            }
        } finally {
            isDeletingAllKeys.value = false
        }
        return
    }

    ElMessage.info(t('keyList.operations.messages.pending'))
}

/**
 * 提交当前搜索条件。
 * 只有用户按下回车时，才会把输入框内容和精准搜索状态同步到当前生效搜索模式中。
 */
const handleSubmitSearch = async () => {
    if (isKeyListBusy.value || isSearchingKeys.value) {
        return
    }

    const keyword = searchText.value.trim()

    // 只记录真实提交的非空关键词；重复关键词会移动到历史最前方，最多保留30条。
    if (keyword) {
        addKeySearchHistory(keyword)
    }

    activeSearchMode.value = keyword
        ? (isExactSearch.value ? 'exact' : 'fuzzy')
        : 'all'
    activeSearchPattern.value = activeSearchMode.value === 'fuzzy'
        ? `*${keyword}*`
        : (keyword || '*')

    try {
        isSearchingKeys.value = true
        await loadKeys(true, {preserveList: true})
    } finally {
        isSearchingKeys.value = false
    }
}

/**
 * 将 SCAN 或精确查询结果转换为列表统一数据结构。
 * SCAN 只返回 Key 名称，先用类型加载态渲染；精确查询已经包含 TYPE 结果，可直接展示。
 * @param {Array<string|{key:string,type?:string}>} keys IPC 返回的 Key 数据
 * @returns {Array<{key:string,type:string|null,typeLoading:boolean}>} 可写入列表的数据
 */
const normalizeLoadedKeyRows = (keys = []) => {
    return (Array.isArray(keys) ? keys : [])
        .map((item) => {
            if (typeof item === 'string') {
                return {
                    key: item,
                    type: null,
                    typeLoading: true
                }
            }

            const key = String(item?.key ?? '')
            const type = item?.type ? String(item.type) : null
            return {
                ...item,
                key,
                type,
                typeLoading: !type
            }
        })
        // Redis 允许空字符串作为 Key，因此这里只过滤无效行，不按 key 的真值过滤。
        .filter(Boolean)
}

/**
 * 异步补充一批已显示 Key 的类型。
 * 类型失败时保留 Key 名称并回退为 unknown，不让次要信息加载失败阻塞列表浏览。
 * @param {string[]} keys 待补充类型的 Key 名称
 * @param {number} generation 发起任务时的扫描版本号
 * @param {string} connectionId 发起任务时的连接 ID
 */
const hydrateKeyTypes = async (keys, generation, connectionId) => {
    if (generation !== scanGeneration.value || String(connectionId) !== String(props.tabId)) {
        return
    }

    let response = null
    try {
        response = await window.api.redis.getKeyTypes(connectionId, keys)
    } catch {
        response = null
    }

    // 刷新、搜索、切库或切换连接后，旧请求结果不允许覆盖新列表。
    if (generation !== scanGeneration.value || String(connectionId) !== String(props.tabId)) {
        return
    }

    const typeMap = response?.success
        ? new Map((response.data ?? []).map((item) => [item.key, item.type || 'unknown']))
        : new Map(keys.map((key) => [key, 'unknown']))

    // 按 Key 局部合并类型；已被删除或重命名的行不会重新插入列表。
    allScannedKeys.value = allScannedKeys.value.map((item) => {
        if (!typeMap.has(item.key)) {
            return item
        }

        return {
            ...item,
            type: typeMap.get(item.key),
            typeLoading: false
        }
    })
}

/**
 * 将类型补充任务加入串行队列。
 * 加载全部可能连续扫描多批 Key，串行 pipeline 能控制远程 Redis 的瞬时请求压力。
 * @param {string[]} keys 待补充类型的 Key 名称
 * @param {number} generation 当前扫描版本号
 * @param {string} connectionId 当前连接 ID
 */
const enqueueKeyTypeHydration = (keys, generation, connectionId) => {
    const uniqueKeys = Array.from(new Set(
        (keys ?? []).filter((key) => key !== null && key !== undefined)
    ))
    if (uniqueKeys.length === 0) {
        return
    }

    keyTypeHydrationQueue = keyTypeHydrationQueue
        .catch(() => {
            // 上一批类型查询失败不应阻断后续批次。
        })
        .then(() => hydrateKeyTypes(uniqueKeys, generation, connectionId))
}

/**
 * 扫描当前连接下的 Key 列表。
 * @param {boolean} reset 是否重置扫描状态并从头开始
 * @param {{ preserveList?: boolean }} options 额外控制项
 */
const loadKeys = async (reset = false, options = {}) => {
    const {preserveList = false} = options

    if (!props.tabId || isInitialLoading.value || isLoadingMore.value || isLoadingAll.value || isKeyListBusy.value) {
        return
    }

    const requestGeneration = reset
        ? scanGeneration.value + 1
        : scanGeneration.value
    const requestConnectionId = props.tabId

    if (reset) {
        scanGeneration.value = requestGeneration
        isInitialLoading.value = true
        // 手动刷新时保留当前列表，避免刷新按钮点击后先清空页面造成闪动。
        if (!preserveList) {
            resetScanState()
        }
    } else {
        isLoadingMore.value = true
    }

    try {
        const isExactSearchRequest = activeSearchMode.value === 'exact'
        // 精确搜索使用 TYPE；普通列表和模糊搜索先按游标执行单轮 SCAN，类型随后异步补充。
        const response = isExactSearchRequest
            ? await window.api.redis.findExactKey(props.tabId, activeSearchPattern.value)
            : await window.api.redis.scanKeys(
                props.tabId,
                reset ? '0' : cursor.value,
                activeSearchPattern.value,
                reset && activeSearchMode.value === 'fuzzy'
                    ? FIRST_FUZZY_SEARCH_SCAN_COUNT
                    : currentScanCount.value
            )

        if (requestGeneration !== scanGeneration.value || String(requestConnectionId) !== String(props.tabId)) {
            return
        }

        if (!response.success) {
            ElMessage.error(`${t('keyList.messages.loadFail')}: ${response.error || t('common.unknownError')}`)
            return
        }

        const nextKeys = normalizeLoadedKeyRows(response.data?.keys ?? [])

        // 重置加载直接覆盖，继续加载则拼接到现有结果后面。
        allScannedKeys.value = reset
            ? nextKeys
            : [...allScannedKeys.value, ...nextKeys]

        cursor.value = String(response.data?.cursor ?? '0')
        hasMore.value = Boolean(response.data?.hasMore)

        if (!isExactSearchRequest) {
            enqueueKeyTypeHydration(
                nextKeys.filter((item) => item.typeLoading).map((item) => item.key),
                requestGeneration,
                requestConnectionId
            )
        }
    } catch (error) {
        ElMessage.error(`${t('keyList.messages.loadFail')}: ${error.message || error}`)
    } finally {
        if (reset) {
            isInitialLoading.value = false
        } else {
            isLoadingMore.value = false
        }
    }
}

/**
 * 一次性加载当前搜索条件下的全部 Key。
 */
const loadAll = async () => {
    if (!props.tabId || !hasMore.value || isInitialLoading.value || isLoadingMore.value || isLoadingAll.value || isKeyListBusy.value) {
        return
    }

    isLoadingAll.value = true
    const requestGeneration = scanGeneration.value
    const requestConnectionId = props.tabId

    try {
        while (hasMore.value && requestGeneration === scanGeneration.value) {
            // 按当前搜索模式持续向后扫描，直到游标归零。
            const response = await window.api.redis.scanKeys(
                props.tabId,
                cursor.value,
                activeSearchPattern.value,
                currentScanCount.value
            )

            if (requestGeneration !== scanGeneration.value || String(requestConnectionId) !== String(props.tabId)) {
                break
            }

            if (!response.success) {
                ElMessage.error(`${t('keyList.messages.loadAllFail')}: ${response.error || t('common.unknownError')}`)
                break
            }

            const nextKeys = normalizeLoadedKeyRows(response.data?.keys ?? [])
            allScannedKeys.value = [...allScannedKeys.value, ...nextKeys]
            cursor.value = String(response.data?.cursor ?? '0')
            hasMore.value = Boolean(response.data?.hasMore)
            enqueueKeyTypeHydration(
                nextKeys.filter((item) => item.typeLoading).map((item) => item.key),
                requestGeneration,
                requestConnectionId
            )
        }
    } catch (error) {
        ElMessage.error(`${t('keyList.messages.loadAllFail')}: ${error.message || error}`)
    } finally {
        isLoadingAll.value = false
    }
}

/**
 * 原地更新已加载 Key 列表中的 Key 名称。
 * 重命名操作不重新 SCAN，避免破坏当前分页加载状态和右侧已打开详情之间的对应关系。
 * @param {{oldKey: string, newKey: string}|null} patch 重命名前后的 Key 名称
 */
const applyRenamedKeyPatch = (patch) => {
    if (!patch?.oldKey || !patch?.newKey) {
        return
    }

    const targetIndex = allScannedKeys.value.findIndex((item) => item.key === patch.oldKey)

    if (targetIndex === -1) {
        return
    }

    // 只替换命中的 Key 名称，type 等元信息保持不变；树结构会由 computed 基于新 key 自动重建。
    allScannedKeys.value.splice(targetIndex, 1, {
        ...allScannedKeys.value[targetIndex],
        key: patch.newKey
    })
}

/**
 * 原地移除已加载 Key 列表中的 Key。
 * 删除操作不重新 SCAN，避免破坏当前分页加载状态。
 * @param {{key: string}|null} patch 被删除的 Key 信息
 */
const applyDeletedKeyPatch = (patch) => {
    if (!patch?.key) {
        return
    }

    const targetIndex = allScannedKeys.value.findIndex((item) => item.key === patch.key)

    if (targetIndex === -1) {
        return
    }

    allScannedKeys.value.splice(targetIndex, 1)
    removeSelectedKeys([patch.key])
}

// 监听当前连接页签变化：切换到新的连接时，从头重新扫描对应 db 的 Key。
watch(
    () => props.tabId,
    (nextTabId) => {
        if (nextTabId) {
            loadKeys(true)
        } else {
            scanGeneration.value += 1
            resetScanState()
        }
    },
    {immediate: true}
)

// 监听当前 db 变化：切换库等同刷新列表，需要清空搜索条件并重新拉取新库中的 Key。
watch(
    () => props.dbIndex,
    () => {
        if (props.tabId) {
            resetKeyList()
        }
    }
)

// 监听父级重命名补丁：详情侧 RENAME 成功后，仅替换当前已加载列表中的旧 Key 名称。
watch(
    () => props.renamedKeyPatch,
    (patch) => applyRenamedKeyPatch(patch)
)

// 监听父级删除补丁：详情侧 DEL 成功后，仅移除当前已加载列表中的目标 Key。
watch(
    () => props.deletedKeyPatch,
    (patch) => applyDeletedKeyPatch(patch)
)

// 监听已加载 Key 变化：搜索、刷新或删除后，剔除不再存在于当前列表中的选择项。
watch(
    allScannedKeys,
    () => pruneSelectionsByLoadedKeys()
)

// 监听父级重置版本号：顶部刷新当前 PageInfo 时，Key 列表需要回到未搜索的全量扫描状态。
watch(
    () => props.resetVersion,
    () => resetKeyList()
)

// 组件卸载后使排队中或执行中的类型任务失效，避免关闭连接页签后继续回写状态。
onBeforeUnmount(() => {
    scanGeneration.value += 1
})
</script>

<style scoped>
/* Key 列表面板：作为左侧导航区域，整体采用纵向布局。 */
.key-list-panel {
    --detail-header-bg-color: color-mix(in srgb, var(--el-color-primary) 6%, var(--el-bg-color));

    display: flex;
    height: 100%;
    flex-direction: column;
}

/* 暗黑模式头部背景：和 Key 详情头部保持一致，避免浅色混合色在 dark 下发亮。 */
html.dark .key-list-panel {
    --detail-header-bg-color: var(--el-fill-color-light);
}

/* 搜索结果提示：固定在列表顶部，用轻量文案提示当前列表是搜索后的结果。 */
.search-result-tip {
    flex-shrink: 0;
    padding: 7px 12px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    line-height: 18px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-extra-light);
}

/* 底部分页操作区：固定在底部，和主列表视觉分层。 */
.load-footer {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    flex-shrink: 0;
    align-items: center;
    box-sizing: border-box;
    border-top: 1px solid var(--el-border-color-light);
}

/* 底部操作按钮：均分宽度，保持视觉平衡。 */
.load-btn {
    flex: 1;
    height: 30px;
}
</style>
