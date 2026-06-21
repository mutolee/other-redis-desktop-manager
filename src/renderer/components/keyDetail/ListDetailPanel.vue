<!--
    ListDetailPanel.vue
    描述：Redis List 类型 Key 的详情展示面板。
    职责：按 Index/Value 展示 List 元素，并预留新增、编辑、复制、查看、删除和加载更多入口。
-->
<template>
    <!-- List 主体区域：顶部工具栏、表格内容和底部加载操作分区排列。 -->
    <div class="list-detail-panel">
        <!-- List 工具栏：左侧预留新增入口，右侧提供本地 Value 搜索。 -->
        <div class="list-toolbar">
            <el-button type="primary" :icon="Plus" @click="handleAddItem">
                {{ t('keyDetailPanels.common.add') }}
            </el-button>

            <el-input
                v-model="searchKeyword"
                class="value-search-input"
                clearable
                :placeholder="t('keyDetailPanels.list.searchPlaceholder')"
            >
                <template #prefix>
                    <el-icon><Search /></el-icon>
                </template>
            </el-input>
        </div>

        <!-- List 表格区域：展示元素位置、Value 内容和预留操作按钮。 -->
        <div class="list-table-wrap">
            <!-- 虚拟表格：表头固定，内容区只渲染可视行，避免加载全部后产生大量 DOM。 -->
            <div class="list-table virtual-detail-table">
                <div class="virtual-table-header">
                    <div class="virtual-table-cell index-cell">{{ t('keyDetailPanels.common.labels.index') }}</div>
                    <div class="virtual-table-cell value-cell">{{ t('keyDetailPanels.common.labels.value') }} ({{ rows.length }})</div>
                    <div class="virtual-table-cell action-cell">{{ t('keyDetailPanels.common.action') }}</div>
                </div>

                <div class="virtual-table-body">
                    <AutoResizer>
                        <template #default="{ height, width }">
                            <FixedSizeList
                                class-name="virtual-table-list"
                                :data="filteredRows"
                                :total="filteredRows.length"
                                :height="height"
                                :width="width"
                                :item-size="ROW_HEIGHT"
                                :cache="8"
                            >
                                <template #default="{ data, index, style }">
                                    <div v-if="data[index]" class="virtual-table-row" :style="style">
                                        <div class="virtual-table-cell index-cell">{{ data[index].displayIndex }}</div>
                                        <div class="virtual-table-cell value-cell">
                                            <OverflowTooltip :content="data[index].value">
                                                <span class="value-text" data-overflow-target>{{ data[index].value }}</span>
                                            </OverflowTooltip>
                                        </div>
                                        <div class="virtual-table-cell action-cell">
                                            <div class="row-actions">
                                                <el-tooltip :content="t('keyDetailPanels.common.edit')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="success" plain :icon="Edit" @click="handleEditItem(data[index])" />
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.copyCommand')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="primary" plain :icon="DocumentCopy" @click="handleCopyItemCommand(data[index])" />
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.view')" placement="top" :show-after="200">
                                                    <el-button circle size="small" plain :icon="View" @click="handleViewItem(data[index])" />
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.delete')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="danger" :icon="Delete" :loading="deletingIndex === data[index].index" @click="handleDeleteItem(data[index])" />
                                                </el-tooltip>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </FixedSizeList>
                        </template>
                    </AutoResizer>
                </div>
            </div>
        </div>

        <!-- 底部加载区：沿用左侧 Key 列表底部样式，后续接入 List 分段拉取能力。 -->
        <div class="load-footer">
            <el-button
                type="primary"
                plain
                class="load-btn"
                :loading="isLoadingMore"
                :disabled="!hasMore || isLoadingAll"
                @click="handleLoadMore"
            >
                {{ t('keyDetailPanels.common.loadMore') }}
            </el-button>

            <el-button
                type="warning"
                plain
                class="load-btn"
                :loading="isLoadingAll"
                :disabled="!hasMore || isLoadingMore"
                @click="handleLoadAll"
            >
                {{ t('keyDetailPanels.common.loadAll') }}
            </el-button>
        </div>

        <!-- List 元素编辑弹窗：新增和编辑共用同一套 Value 表单。 -->
        <el-dialog
            v-model="itemEditorVisible"
            width="620px"
            destroy-on-close
            :close-on-click-modal="false"
        >
            <template #header>
                <!-- 弹窗标题：List 元素新增和编辑共用表单，使用编辑图标表达内容变更。 -->
                <DialogTitle :icon="Edit" :title="itemEditorTitle" />
            </template>

            <el-form label-width="72px" class="item-editor-form" @submit.prevent>
                <el-form-item v-if="!isEditMode" :label="t('keyDetailPanels.list.direction')" required>
                    <el-radio-group v-model="itemForm.direction">
                        <el-radio-button label="left">{{ t('keyDetailPanels.list.leftPush') }}</el-radio-button>
                        <el-radio-button label="right">{{ t('keyDetailPanels.list.rightPush') }}</el-radio-button>
                    </el-radio-group>
                </el-form-item>

                <el-form-item v-else :label="t('keyDetailPanels.common.labels.index')">
                    <el-input :model-value="itemForm.displayIndex" disabled />
                </el-form-item>

                <el-form-item :label="t('keyDetailPanels.common.labels.value')" required>
                    <el-input
                        v-model="itemForm.value"
                        type="textarea"
                        class="item-value-textarea"
                        :disabled="savingItem"
                        :placeholder="t('keyDetailPanels.common.valuePlaceholder')"
                    />
                </el-form-item>
            </el-form>

            <template #footer>
                <div class="dialog-footer">
                    <el-button :disabled="savingItem" @click="itemEditorVisible = false">
                        {{ t('common.cancel') }}
                    </el-button>
                    <el-button
                        type="primary"
                        :loading="savingItem"
                        :disabled="!canSubmitItem"
                        @click="handleSaveItem"
                    >
                        {{ t('common.confirm') }}
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- List 元素查看弹窗：用于完整查看表格里被省略的长 Value。 -->
        <el-dialog
            v-model="itemViewerVisible"
            width="620px"
            destroy-on-close
        >
            <template #header>
                <!-- 弹窗标题：查看完整 List 元素内容，使用预览图标和编辑弹窗区分。 -->
                <DialogTitle :icon="View" :title="t('keyDetailPanels.list.viewTitle')" />
            </template>

            <div class="item-viewer">
                <div class="viewer-index">
                    <span class="viewer-label">{{ t('keyDetailPanels.common.labels.index') }}:</span>
                    <span class="viewer-index-value">{{ viewingItem?.displayIndex }}</span>
                </div>

                <ViewerTextarea :model-value="viewingItem?.value || ''" :height="180" />
            </div>

            <template #footer>
                <!-- 查看弹窗底部操作区：复制当前完整 Value 内容。 -->
                <div class="dialog-footer">
                    <el-button type="primary" @click="handleCopyViewingItem">
                        {{ t('keyDetailPanels.common.copy') }}
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElAutoResizer as AutoResizer, ElMessage, ElMessageBox, FixedSizeList } from 'element-plus'
import { Copy as DocumentCopy, Delete, Edit, Plus, PreviewOpen as View, Search } from '@icon-park/vue-next'
import DialogTitle from '../common/DialogTitle.vue'
import OverflowTooltip from '../common/OverflowTooltip.vue'
import ViewerTextarea from '../common/ViewerTextarea.vue'
import { useI18n } from '../../i18n/index.js'

// 国际化文案读取函数：驱动 List 表格、弹窗和操作反馈文案。
const { t } = useI18n()

// 组件入参：接收 KeyDetailPanel 加载后的 List Key 详情数据。
const props = defineProps({
    tabId: {
        type: String,
        required: true
    },
    keyData: {
        type: Object,
        required: true
    }
})

// 搜索关键词：只过滤当前已加载的 List 元素，不触发 Redis 查询。
const searchKeyword = ref('')

// 已加载的 List 元素：首段来自 keyData.value，后续通过加载更多/加载全部追加。
const loadedItems = ref([])

// 加载更多状态：控制底部“加载更多”按钮 loading 和重复点击保护。
const isLoadingMore = ref(false)

// 加载全部状态：控制底部“加载全部”按钮 loading 和重复点击保护。
const isLoadingAll = ref(false)

// 元素编辑弹窗显示状态：新增和编辑共用，具体模式由 itemEditorMode 控制。
const itemEditorVisible = ref(false)

// 元素查看弹窗显示状态：用于查看完整 Value。
const itemViewerVisible = ref(false)

// 元素编辑模式：add 表示新增元素，edit 表示按 index 修改已有元素。
const itemEditorMode = ref('add')

// 元素编辑表单：保存新增方向、编辑下标和 Value 草稿。
const itemForm = reactive({
    direction: 'right',
    index: -1,
    displayIndex: '',
    value: ''
})

// 当前查看中的 List 行：用于查看弹窗展示完整内容。
const viewingItem = ref(null)

// 保存元素状态：控制新增/编辑确认按钮 loading 和重复提交保护。
const savingItem = ref(false)

// 正在删除的元素下标：用于给对应行删除按钮展示 loading。
const deletingIndex = ref(-1)

// 当前 List 总长度：初始来自 keyData.size，后续每次分页请求后用后端 LLEN 结果校正。
const listTotalSize = ref(0)

// 每次“加载更多”的分页大小：和主进程首屏 List 加载数量保持一致。
const LIST_PAGE_SIZE = 100

// 虚拟表格固定行高：和当前行内按钮尺寸、文本行高保持一致，保证滚动定位稳定。
const ROW_HEIGHT = 41

// 当前是否仍有未加载元素：驱动底部按钮禁用状态。
const hasMore = computed(() => loadedItems.value.length < listTotalSize.value)

// 当前是否处于编辑已有元素模式：编辑时按已有 index 执行 LSET。
const isEditMode = computed(() => itemEditorMode.value === 'edit')

// 元素编辑弹窗标题：根据新增/编辑模式显示不同文案。
const itemEditorTitle = computed(() => (
    isEditMode.value ? t('keyDetailPanels.list.editTitle') : t('keyDetailPanels.list.addTitle')
))

// 是否允许提交元素表单：Value 不能为空，且当前没有提交中的写操作。
const canSubmitItem = computed(() => Boolean(itemForm.value.trim()) && !savingItem.value)

// List 表格数据：把 Redis 返回数组转换为带真实下标和展示序号的行结构。
const rows = computed(() => {
    return loadedItems.value.map((item, index) => ({
        index,
        displayIndex: index + 1,
        value: String(item)
    }))
})

// 过滤后的表格数据：搜索框为空时展示全部，输入后按 Value 做不区分大小写匹配。
const filteredRows = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()

    if (!keyword) {
        return rows.value
    }

    return rows.value.filter((row) => row.value.toLowerCase().includes(keyword))
})

/**
 * 将 Redis 命令参数格式化为 redis-cli 可识别的字符串参数。
 * @param {unknown} value 参数原始值
 * @returns {string} 转义后的命令参数
 */
const formatCommandArg = (value) => JSON.stringify(String(value ?? ''))

/**
 * 构造当前 List 元素的 LSET 命令。
 * @param {Object} row 当前 List 行数据
 * @returns {string} 可复制到命令行执行的 LSET 命令
 */
const buildItemSetCommand = (row) => {
    return `LSET ${formatCommandArg(props.keyData.key)} ${row.index} ${formatCommandArg(row.value)}`
}

// 按下标删除 List 元素的 Lua 脚本：避免 LREM 按值删除时误删重复 Value。
const DELETE_LIST_ITEM_BY_INDEX_SCRIPT = `
local key = KEYS[1]
local index = tonumber(ARGV[1])
local marker = ARGV[2]
local length = redis.call('LLEN', key)

if index == nil or index < 0 or index >= length then
    return 0
end

redis.call('LSET', key, index, marker)
return redis.call('LREM', key, 1, marker)
`

/**
 * 执行 Redis 命令并校验返回。
 * @param {string} command Redis 命令
 * @param {Array<string>} args 命令参数
 * @returns {Promise<unknown>} Redis 原始返回结果
 */
const runRedisCommand = async (command, args) => {
    const response = await window.api.redis.executeCommand(props.tabId, command, args)

    if (!response.success) {
        throw new Error(response.error || t('keyDetailPanels.common.messages.commandFail', { value: command }))
    }

    return response.data?.result
}

/**
 * 打开新增 List 元素弹窗。
 */
const handleAddItem = () => {
    itemEditorMode.value = 'add'
    itemForm.direction = 'right'
    itemForm.index = -1
    itemForm.displayIndex = ''
    itemForm.value = ''
    itemEditorVisible.value = true
}

/**
 * 打开编辑 List 元素弹窗。
 * @param {Object} row 当前 List 行数据
 */
const handleEditItem = (row) => {
    itemEditorMode.value = 'edit'
    itemForm.direction = 'right'
    itemForm.index = row.index
    itemForm.displayIndex = String(row.displayIndex)
    itemForm.value = row.value
    itemEditorVisible.value = true
}

/**
 * 保存 List 元素。
 * 新增时根据方向执行 LPUSH/RPUSH；编辑时按 index 执行 LSET。
 */
const handleSaveItem = async () => {
    if (!canSubmitItem.value) {
        return
    }

    savingItem.value = true

    try {
        const value = itemForm.value

        if (isEditMode.value) {
            await runRedisCommand('LSET', [props.keyData.key, String(itemForm.index), value])
            const nextItems = [...loadedItems.value]

            // LSET 成功后只替换当前已加载区间内对应下标的值，避免重拉列表造成滚动位置跳动。
            if (itemForm.index >= 0 && itemForm.index < nextItems.length) {
                nextItems[itemForm.index] = value
                loadedItems.value = nextItems
            }

            ElMessage.success(t('keyDetailPanels.list.messages.itemUpdated'))
        } else {
            const command = itemForm.direction === 'left' ? 'LPUSH' : 'RPUSH'
            const wasFullyLoaded = !hasMore.value
            await runRedisCommand(command, [props.keyData.key, value])

            // 左侧插入会影响首屏内容，直接插入当前已加载列表头部；右侧插入只在已加载全部时追加展示。
            if (itemForm.direction === 'left') {
                loadedItems.value = [value, ...loadedItems.value]
            } else if (wasFullyLoaded) {
                loadedItems.value = [...loadedItems.value, value]
            }

            listTotalSize.value += 1
            ElMessage.success(t('keyDetailPanels.list.messages.itemAdded'))
        }

        itemEditorVisible.value = false
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.list.messages.saveFail'))
    } finally {
        savingItem.value = false
    }
}

/**
 * 复制当前 List 元素的 LSET 命令。
 * @param {Object} row 当前 List 行数据
 */
const handleCopyItemCommand = async (row) => {
    try {
        await navigator.clipboard.writeText(buildItemSetCommand(row))
        ElMessage.success(t('keyDetailPanels.common.messages.commandCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.copyCommandFail'))
    }
}

/**
 * 复制查看弹窗中的完整 List Value。
 */
const handleCopyViewingItem = async () => {
    try {
        // 查看弹窗复制的是当前展示内容，不是表格里的 LSET 命令。
        await navigator.clipboard.writeText(viewingItem.value?.value || '')
        ElMessage.success(t('keyDetailPanels.common.messages.contentCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.copyContentFail'))
    }
}

/**
 * 打开元素完整内容查看弹窗。
 * @param {Object} row 当前 List 行数据
 */
const handleViewItem = (row) => {
    viewingItem.value = row
    itemViewerVisible.value = true
}

/**
 * 删除 List 元素。
 * List 没有按 index 删除命令，这里通过 Lua 原子执行 LSET 临时标记 + LREM 标记删除。
 * @param {Object} row 当前 List 行数据
 */
const handleDeleteItem = async (row) => {
    try {
        await ElMessageBox.confirm(
            t('keyDetailPanels.list.confirmDelete', { value: row.displayIndex }),
            t('keyDetailPanels.list.deleteTitle'),
            {
                confirmButtonText: t('keyDetail.actions.delete'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
            }
        )

        deletingIndex.value = row.index
        const marker = `__other_redis_client_delete_${Date.now()}_${Math.random().toString(16).slice(2)}__`
        const deleteResult = await runRedisCommand('EVAL', [
            DELETE_LIST_ITEM_BY_INDEX_SCRIPT,
            '1',
            props.keyData.key,
            String(row.index),
            marker
        ])

        if (Number(deleteResult) <= 0) {
            ElMessage.warning(t('keyDetailPanels.list.messages.itemMissing'))
            return
        }

        loadedItems.value = loadedItems.value.filter((item, index) => index !== row.index)
        listTotalSize.value = Math.max(0, listTotalSize.value - 1)
        ElMessage.success(t('keyDetailPanels.list.messages.itemDeleted'))
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(error.message || t('keyDetailPanels.list.messages.deleteFail'))
        }
    } finally {
        deletingIndex.value = -1
    }
}

/**
 * 拉取指定范围内的 List 元素。
 * @param {number} start LRANGE 起始下标
 * @param {number} stop LRANGE 结束下标
 * @returns {Promise<{items:Array, size:number}>} 后端返回的 List 元素和最新总长度
 */
const fetchListRange = async (start, stop) => {
    // 通过 preload 暴露的 IPC 调用主进程，让 Redis 命令仍然留在 main 边界内执行。
    const response = await window.api.redis.getListRange(props.tabId, props.keyData.key, start, stop)

    if (!response.success) {
        throw new Error(response.error || t('keyDetailPanels.list.messages.loadFail'))
    }

    return {
        items: Array.isArray(response.data?.items) ? response.data.items : [],
        size: Number(response.data?.size) || 0
    }
}

/**
 * 追加加载下一页 List 元素。
 * 根据当前已加载数量计算 LRANGE 范围，成功后追加到 loadedItems。
 */
const handleLoadMore = async () => {
    if (!hasMore.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingMore.value = true

    try {
        const start = loadedItems.value.length
        const stop = Math.min(start + LIST_PAGE_SIZE - 1, listTotalSize.value - 1)
        const { items, size } = await fetchListRange(start, stop)

        // 每次分页返回都会带最新 LLEN，用它校正底部按钮是否还需要可点击。
        listTotalSize.value = size
        loadedItems.value = [...loadedItems.value, ...items]
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.loadMoreFail'))
    } finally {
        isLoadingMore.value = false
    }
}

/**
 * 一次性加载剩余全部 List 元素。
 * 仅拉取当前未加载的范围，避免重复覆盖已经展示的首段数据。
 */
const handleLoadAll = async () => {
    if (!hasMore.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingAll.value = true

    try {
        const start = loadedItems.value.length
        const stop = Math.max(start, listTotalSize.value - 1)
        const { items, size } = await fetchListRange(start, stop)

        // 加载剩余全部时同样校正总长度，兼容后台 List 在查看期间发生变化。
        listTotalSize.value = size
        loadedItems.value = [...loadedItems.value, ...items]
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.loadAllFail'))
    } finally {
        isLoadingAll.value = false
    }
}

// 监听父级重新加载的 Key 详情：切换 Key 或刷新详情时重置已加载元素与按钮状态。
watch(
    () => props.keyData,
    (nextKeyData) => {
        loadedItems.value = Array.isArray(nextKeyData?.value) ? [...nextKeyData.value] : []
        listTotalSize.value = Number(nextKeyData?.size) || loadedItems.value.length
        isLoadingMore.value = false
        isLoadingAll.value = false
    },
    { immediate: true }
)
</script>

<style scoped>
/* List 面板根容器：三段式纵向布局，表格区吃满中间剩余空间。 */
.list-detail-panel {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    background: var(--el-bg-color);
}

/* 工具栏：左右分布，和 Set 面板保持一致的新增/搜索入口位置。 */
.list-toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
}

/* 新增按钮：固定普通主按钮高度，避免和搜索框高度不一致。 */
.list-toolbar :deep(.el-button) {
    height: 32px;
    padding: 0 14px;
    border-radius: 4px;
}

/* 搜索框：固定宽度，贴近参考图右侧搜索入口。 */
.value-search-input {
    width: 250px;
}

/* 搜索框内层：维持 32px 高度，和新增按钮视觉对齐。 */
.value-search-input :deep(.el-input__wrapper) {
    min-height: 32px;
    border-radius: 4px;
}

/* 表格外层：控制中间内容区滚动和底部按钮互不挤压。 */
.list-table-wrap {
    min-height: 0;
    flex: 1;
}

/* 表格主体：去掉默认圆角感，贴近参考图中的平整数据表。 */
.list-table {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    font-size: 14px;
    border: 1px solid var(--el-border-color-light);
    box-sizing: border-box;
}

/* 虚拟表格表头：固定在内容区顶部，仅滚动表格行区域。 */
.virtual-table-header {
    display: flex;
    height: 40px;
    flex-shrink: 0;
    color: var(--el-text-color-regular);
    font-weight: 600;
    background: var(--el-fill-color-lighter);
    border-bottom: 1px solid var(--el-border-color-light);
}

/* 虚拟表格主体：承载 FixedSizeList，高数据量下只渲染可视行。 */
.virtual-table-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

/* 自动测量容器：显式撑满主体区，保证虚拟列表拿到正确高度。 */
.virtual-table-body :deep(.el-auto-resizer) {
    width: 100%;
    height: 100%;
}

/* 虚拟表格行：固定高度，和 ROW_HEIGHT 保持一致。 */
.virtual-table-row {
    display: flex;
    height: 41px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
}

/* 虚拟表格单元格：统一处理对齐、边框和长文本裁剪。 */
.virtual-table-cell {
    display: flex;
    min-width: 0;
    padding: 0 12px;
    overflow: hidden;
    align-items: center;
    border-right: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.index-cell {
    width: 80px;
    flex: 0 0 80px;
    justify-content: center;
}

.value-cell {
    flex: 1;
}

.action-cell {
    width: 180px;
    flex: 0 0 180px;
    justify-content: center;
    border-right: 0;
}

/* Value 文本：单行省略展示，完整内容通过 Element Plus Tooltip 提示。 */
.value-text {
    display: block;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    color: var(--el-text-color-primary);
    line-height: 40px;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
}

/* 行操作按钮组：紧凑排列，按钮间距由 gap 统一控制。 */
.row-actions {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

/* 行操作按钮：固定 24px 圆形尺寸，贴近参考图中的小图标操作。 */
.row-actions :deep(.el-button) {
    width: 24px;
    height: 24px;
    padding: 0;
    margin-left: 0;
}

/* 底部加载操作区：和左侧 Key 列表底部保持一致的边线、内边距和按钮排列。 */
.load-footer {
    display: flex;
    gap: 8px;
    padding: 8px 0 0 0;
    flex-shrink: 0;
    align-items: center;
    box-sizing: border-box;
}

/* 底部加载按钮：等宽、固定高度，沿用左侧列表的紧凑操作栏视觉。 */
.load-btn {
    flex: 1;
    height: 30px;
    margin-left: 0;
}

/* 元素编辑表单：给弹窗内容留出稳定间距，避免 textarea 贴边。 */
.item-editor-form {
    padding: 4px 4px 0 0;
}

/* List 元素 Value 文本域：固定高度，长文本通过内部滚动查看。 */
.item-value-textarea :deep(.el-textarea__inner) {
    height: 180px;
    min-height: 180px !important;
    max-height: 180px;
    resize: none;
    line-height: 1.7;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 弹窗底部操作：右对齐并清除 Element Plus 按钮默认相邻 margin 干扰。 */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.dialog-footer :deep(.el-button) {
    margin-left: 0;
}

/* 查看弹窗主体：Index 和 Value 上下排列，给长内容留出呼吸感。 */
.item-viewer {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* 查看弹窗 Index 行：展示当前元素所在位置。 */
.viewer-index {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--el-text-color-regular);
}

.viewer-label {
    flex-shrink: 0;
    color: var(--el-text-color-secondary);
}

.viewer-index-value {
    color: var(--el-text-color-primary);
    font-weight: 600;
}

</style>
