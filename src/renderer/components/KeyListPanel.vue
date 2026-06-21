<!--
    KeyListPanel.vue
    描述：Key 列表面板。负责当前连接页签的 Key 扫描、搜索、树形/列表切换、分页加载和新增 Key 入口。
 -->
<template>
    <!-- Key 列表面板：承载模式切换、搜索、扫描结果列表和分页加载操作 -->
    <div class="key-list-panel">
        <!-- 顶部工具栏：负责切换树形/列表视图、搜索 Key 和手动刷新 -->
        <div class="toolbar">
            <el-tooltip :content="viewModeTooltip" placement="bottom">
                <el-button
                    class="view-mode-btn"
                    :type="viewMode === 'tree' ? '' : 'primary'"
                    @click="toggleViewMode"
                    :icon="viewModeIcon"
                />
            </el-tooltip>

            <el-input
                v-model="searchText"
                :placeholder="t('keyList.searchPlaceholder')"
                clearable
                size="default"
                class="search-input"
                @keyup.enter="handleSubmitSearch"
            >
                <template #suffix>
                    <!-- 搜索模式切换：勾选后按完整 Key 精准匹配，不勾选时按包含关系模糊匹配。 -->
                    <el-tooltip :content="t('keyList.exactSearch')" placement="bottom" :show-after="200">
                        <el-checkbox
                            v-model="isExactSearch"
                            class="exact-search-checkbox"
                        />
                    </el-tooltip>
                </template>
            </el-input>

            <!-- 添加 Key 按钮：放在搜索框后方，作为后续创建流程的入口。 -->
            <el-tooltip :content="t('keyList.addKey')" placement="bottom">
                <el-button
                    class="add-key-btn"
                    :icon="Plus"
                    @click="handleAddKey"
                    type="primary"
                />
            </el-tooltip>

            <!-- 刷新按钮：固定停留在工具栏最右侧。 -->
            <el-button class="refresh-btn" :icon="Refresh" circle :loading="isRefreshing" @click="handleRefreshList" />
        </div>

        <!-- 列表主体区：根据加载结果展示空态或 Key 列表 -->
        <div class="keys-body">
            <div v-if="isEmptyStateVisible" class="empty-state">
                <el-empty :description="emptyDescription" />
            </div>

            <!-- 虚拟列表区域：仅渲染可视区内的行，降低大数据量下的 DOM 压力 -->
            <AutoResizer v-else class="keys-auto-resizer">
                <template #default="{ height, width }">
                    <FixedSizeList
                        class-name="keys-virtual-list"
                        :data="visibleRows"
                        :total="visibleRows.length"
                        :height="height"
                        :width="width"
                        :item-size="ROW_HEIGHT"
                        :cache="8"
                    >
                        <template #default="{ data, index, style }">
                            <!-- Key 行：目录节点支持展开，普通 Key 支持选中 -->
                            <div
                                v-if="data[index]"
                                :key="data[index].nodeId || data[index].key"
                                class="key-row"
                                :class="{
                                    'is-active': !data[index].isDirectory && activeKey === data[index].key,
                                    'is-directory': data[index].isDirectory,
                                    'is-ancestor-active': isAncestorOfActiveKey(data[index])
                                }"
                                :style="getRowStyle(data[index], style)"
                                @click="handleRowClick(data[index])"
                            >
                                <!-- 树形目录展开按钮 -->
                                <span
                                    v-if="data[index].isDirectory"
                                    class="expand-icon"
                                    @click.stop="toggleExpand(data[index])"
                                >
                                    <el-icon>
                                        <ArrowRight v-if="!isExpanded(data[index].nodeId || data[index].key)" />
                                        <ArrowDown v-else />
                                    </el-icon>
                                </span>

                                <!-- Key 类型标签：仅真实 Key 展示数据类型，目录节点保留占位宽度。 -->
                                <el-tag
                                    v-if="!data[index].isDirectory"
                                    :type="getTagType(data[index].type)"
                                    size="small"
                                    class="key-type-tag"
                                >
                                    {{ String(data[index].type || '').toUpperCase() }}
                                </el-tag>

                                <!-- Key 名称：树形模式显示当前层级名称，列表模式显示完整 Key -->
                                <span class="key-name">{{ data[index].displayKey }}</span>

                                <!-- 父节点 Key 数量：仅树形目录展示当前子树下包含的真实 Key 总数。 -->
                                <span v-if="data[index].isDirectory" class="key-count">
                                    ({{ data[index].keyCount ?? 0 }})
                                </span>
                            </div>
                        </template>
                    </FixedSizeList>
                </template>
            </AutoResizer>
        </div>

        <!-- 底部分页操作：支持继续扫描或一次性拉取全部 -->
        <div class="load-footer">
            <el-button
                type="primary"
                plain
                class="load-btn"
                :loading="isLoadingMore"
                :disabled="!hasMore || isLoadingAll || isInitialLoading"
                @click="loadKeys(false)"
            >
                {{ t('keyList.loadMore') }}
            </el-button>

            <el-button
                type="warning"
                plain
                class="load-btn"
                :loading="isLoadingAll"
                :disabled="!hasMore || isLoadingMore || isInitialLoading"
                @click="loadAll"
            >
                {{ t('keyList.loadAll') }}
            </el-button>
        </div>

        <!-- 新增 Key 弹窗：创建成功后在当前已加载列表中局部插入并选中。 -->
        <AddKeyDialog
            v-model:visible="addKeyDialogVisible"
            :tab-id="tabId"
            @created="handleKeyCreated"
        />
    </div>
</template>

<script setup>
/**
 * Key 列表面板组件。
 * 负责加载当前连接与当前 db 下的 Key 列表，并支持树形/列表视图切换、搜索、分页扫描与选择 Key。
 */
import { computed, ref, watch } from 'vue'
import { ElAutoResizer as AutoResizer, ElMessage, FixedSizeList } from 'element-plus'
import { Down as ArrowDown, ListTwo, Plus, Refresh, Right as ArrowRight, TreeList } from '@icon-park/vue-next'
import { storeToRefs } from 'pinia'
import { useI18n } from '../i18n/index.js'
import { buildKeyTreeMap, flattenExpandedTreeNodes, isAncestorDirectoryKey } from '../utils/keyListTreeUtil.js'
import { useUserSettingsStore } from '../stores/modules/userSettingsStore.js'
import AddKeyDialog from './dialog/AddKeyDialog.vue'

// 国际化文案读取函数：驱动 Key 列表工具栏、空态和错误反馈文案。
const { t } = useI18n()

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
    }
})

// 组件事件：当用户点击具体 Key 时，向父组件同步当前选中项。
const emit = defineEmits(['select'])

// 从系统设置 store 中提取连接设置，用于读取用户配置的 Key 扫描数量。
const { connectionSettings } = storeToRefs(useUserSettingsStore())

// 已扫描到的原始 Key 列表，作为树形和列表模式的共同数据源。
const allScannedKeys = ref([])

// Redis SCAN 返回的游标，用于继续加载下一批结果。
const cursor = ref('0')

// 当前是否还有更多 Key 可以继续扫描。
const hasMore = ref(false)

// 首次加载或重置加载的状态，用于控制整体刷新与空态显示。
const isInitialLoading = ref(false)

// 点击“加载更多”时的局部加载状态。
const isLoadingMore = ref(false)

// 点击“加载全部”时的批量扫描状态。
const isLoadingAll = ref(false)

// 搜索输入内容：仅用于输入框展示，不会随着输入变化立即触发搜索。
const searchText = ref('')

// 搜索模式开关：仅记录当前勾选状态，真正生效要等用户按回车提交。
const isExactSearch = ref(false)

// 当前生效的服务端搜索模式：只在按下回车后更新，用于后续分页继续沿用同一套搜索条件。
const activeSearchPattern = ref('*')

// 当前视图模式：支持树形视图和扁平列表视图。
const viewMode = ref('tree')

// 当前展开的目录集合，用于驱动树形节点的显隐。
const expandedKeys = ref(new Set())

// 新增 Key 弹窗显示状态：由顶部加号按钮打开。
const addKeyDialogVisible = ref(false)

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

// 视图切换按钮的提示文案，随着当前模式动态变化。
const viewModeTooltip = computed(() =>
    viewMode.value === 'tree' ? t('keyList.listView') : t('keyList.treeView')
)

// 视图切换按钮图标：当前列表模式显示列表图标，树形模式显示树形图标。
const viewModeIcon = computed(() => viewMode.value === 'tree' ? TreeList : ListTwo)

// 当前是否处于服务端搜索结果模式：只要生效模式不是全量扫描，就说明列表展示的是某次搜索结果。
const isSearchResultMode = computed(() => activeSearchPattern.value !== '*')

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

// 树形节点映射：作为树形渲染和目录展开判断的基础数据结构。
const treeMap = computed(() => buildKeyTreeMap(allScannedKeys.value, MAX_TREE_DEPTH))

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
        type: item.type
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

// 树形搜索结果行：搜索结果模式下强制展开整棵结果树，确保祖先路径和命中叶子一并可见。
const searchResultTreeRows = computed(() => flattenExpandedTreeNodes(treeNodes.value, () => true))

// 最终渲染行：平时按当前展开状态展示；进入搜索结果模式后，树形视图直接展示完整命中路径。
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
const isAncestorOfActiveKey = (row) => isAncestorDirectoryKey(row, props.activeKey)

/**
 * 处理列表项点击。
 * 目录节点点击时执行展开/收起，普通 Key 点击时向外同步选中结果。
 * @param {Object} row 当前点击行
 */
const handleRowClick = (row) => {
    if (row.isDirectory) {
        toggleExpand(row)
        return
    }

    emit('select', row)
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
    const rawParts = String(key || '').split(':')
    const parts = rawParts.length > MAX_TREE_DEPTH
        ? [
            ...rawParts.slice(0, MAX_TREE_DEPTH - 1),
            rawParts.slice(MAX_TREE_DEPTH - 1).join(':')
        ]
        : rawParts
    const nextExpandedKeys = new Set(expandedKeys.value)

    for (let index = 0; index < parts.length - 1; index += 1) {
        nextExpandedKeys.add(`dir:${parts.slice(0, index + 1).join(':')}`)
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
        type: createdKey.type
    }

    allScannedKeys.value = [
        nextKey,
        ...allScannedKeys.value.filter((item) => item.key !== createdKey.key)
    ]
    expandCreatedKeyPath(createdKey.key)
    emit('select', nextKey)
}

/**
 * 手动刷新当前 Key 列表。
 * 与切库、切页签不同，这里保留当前列表骨架，只在后台更新结果，减少界面抖动。
 */
const handleRefreshList = () => {
    loadKeys(true, { preserveList: true })
}

/**
 * 提交当前搜索条件。
 * 只有用户按下回车时，才会把输入框内容和精准搜索状态同步到当前生效搜索模式中。
 */
const handleSubmitSearch = () => {
    const keyword = searchText.value.trim()
    activeSearchPattern.value = keyword
        ? (isExactSearch.value ? keyword : `*${keyword}*`)
        : '*'
    loadKeys(true, { preserveList: true })
}

/**
 * 扫描当前连接下的 Key 列表。
 * @param {boolean} reset 是否重置扫描状态并从头开始
 * @param {{ preserveList?: boolean }} options 额外控制项
 */
const loadKeys = async (reset = false, options = {}) => {
    const { preserveList = false } = options

    if (!props.tabId || isInitialLoading.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    if (reset) {
        isInitialLoading.value = true
        // 手动刷新时保留当前列表，避免刷新按钮点击后先清空页面造成闪动。
        if (!preserveList) {
            resetScanState()
        }
    } else {
        isLoadingMore.value = true
    }

    try {
        // 调用后端 SCAN 能力，按当前搜索条件与游标继续获取 Key 列表。
        const response = await window.api.redis.scanKeys(
            props.tabId,
            reset ? '0' : cursor.value,
            activeSearchPattern.value,
            currentScanCount.value
        )

        if (!response.success) {
            return
        }

        const nextKeys = response.data?.keys ?? []

        // 重置加载直接覆盖，继续加载则拼接到现有结果后面。
        allScannedKeys.value = reset
            ? nextKeys
            : [...allScannedKeys.value, ...nextKeys]

        cursor.value = String(response.data?.cursor ?? '0')
        hasMore.value = Boolean(response.data?.hasMore)
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
    if (!props.tabId || !hasMore.value || isInitialLoading.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingAll.value = true

    try {
        while (hasMore.value) {
            // 按当前搜索模式持续向后扫描，直到游标归零。
            const response = await window.api.redis.scanKeys(
                props.tabId,
                cursor.value,
                activeSearchPattern.value,
                currentScanCount.value
            )

            if (!response.success) {
                break
            }

            allScannedKeys.value = [...allScannedKeys.value, ...(response.data?.keys ?? [])]
            cursor.value = String(response.data?.cursor ?? '0')
            hasMore.value = Boolean(response.data?.hasMore)
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
}

// 监听当前连接页签变化：切换到新的连接时，从头重新扫描对应 db 的 Key。
watch(
    () => props.tabId,
    (nextTabId) => {
        if (nextTabId) {
            loadKeys(true)
        } else {
            resetScanState()
        }
    },
    { immediate: true }
)

// 监听当前 db 变化：切换库后需要清空现有列表并重新拉取新库中的 Key。
watch(
    () => props.dbIndex,
    () => {
        if (props.tabId) {
            loadKeys(true)
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

/* 搜索框：占据主要可用宽度，同时限制最大宽度避免工具栏失衡。 */
.toolbar .search-input {
    flex: 1;
    max-width: 260px;
}

/* 视图切换按钮：图标跟随按钮文字色，尺寸与工具栏内其他图标保持一致。 */
.view-mode-btn {
    width: 32px;
    padding: 0;
}

/* 添加 Key 按钮：保持普通图标按钮形态，不使用圆形外观。 */
.add-key-btn {
    width: 32px;
    padding: 0;
}

/* 刷新按钮：通过自动左边距推到工具栏最右端。 */
.refresh-btn {
    margin-left: auto;
}

/* 精准搜索复选框：嵌入输入框右侧，提供轻量模式切换，不额外挤占工具栏宽度。 */
.exact-search-checkbox {
    display: inline-flex;
    margin-left: 6px;
    align-items: center;
}

/* 列表主体区：让滚动区域正确继承剩余高度。 */
.keys-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

/* 虚拟列表自适应容器：承接剩余高度，让虚拟滚动区域正确铺满主体区。 */
.keys-auto-resizer {
    width: 100%;
    height: 100%;
}

/* 单行 Key 项：统一行高、悬浮反馈和边界线，便于高频浏览。 */
.key-row {
    display: flex;
    gap: 6px;
    padding: 7px 12px;
    height: 40px;
    cursor: pointer;
    font-size: 13px;
    box-sizing: border-box;
    align-items: center;
    transition: background 0.15s ease;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

/* 行悬浮态：轻量高亮当前鼠标所在项。 */
.key-row:hover {
    background: var(--el-table-row-hover-bg-color, var(--el-color-primary-light-9));
}

/* 当前选中项：使用主题色浅色背景强化焦点。 */
.key-row.is-active {
    background: var(--el-color-primary-light-8) !important;
    color: var(--el-color-primary);
}

/* 目录节点：仅通过稍大的字号区分，默认不加粗，避免未选中时视觉过重。 */
.key-row.is-directory {
    font-weight: 400;
    font-size: 15px;
}

/* 祖先目录高亮：当子节点被选中时，用主题色和更高字重标识当前路径上的父节点。 */
.key-row.is-ancestor-active {
    color: var(--el-color-primary);
    font-weight: 600;
}

/* 祖先目录下的展开图标同步使用主题色，保持整条路径视觉一致。 */
.key-row.is-ancestor-active .expand-icon {
    color: var(--el-color-primary);
}

/* 展开图标区域：提供稳定点击热区，避免文本抖动。 */
.expand-icon {
    display: flex;
    width: 16px;
    cursor: pointer;
    flex-shrink: 0;
    align-items: center;
    color: var(--el-text-color-secondary);
}

/* 类型标签：固定最小宽度，避免不同类型导致列对齐不齐。 */
.key-type-tag {
    min-width: 40px;
    padding: 2px 6px;
    font-size: 11px;
    flex-shrink: 0;
    text-align: center;
}


/* Key 名称区域：在有限宽度下省略超长内容。 */
.key-name {
    flex: 1;
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 父节点数量：固定贴在行尾，用较轻的颜色提示目录下的真实 Key 数量。 */
.key-count {
    flex-shrink: 0;
    margin-left: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

/* 空态容器：保证无数据时仍然维持居中展示。 */
.empty-state {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
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
