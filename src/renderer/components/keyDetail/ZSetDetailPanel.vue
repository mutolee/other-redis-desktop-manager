<!--
    ZSetDetailPanel.vue
    描述：Redis ZSet 类型 Key 的详情展示面板。
    职责：按 Rank/Member/Score 展示有序集合成员，并预留新增、编辑、复制、查看、删除和分段加载入口。
-->
<template>
    <!-- ZSet 主体区域：顶部工具栏、排行榜表格和底部加载操作分区排列。 -->
    <div class="zset-detail-panel">
        <!-- ZSet 工具栏：左侧预留新增入口，右侧提供本地 Score/Member 搜索。 -->
        <div class="zset-toolbar">
            <el-button type="primary" :icon="Plus" @click="handleAddItem">
                {{ t('keyDetailPanels.common.add') }}
            </el-button>

            <el-input
                v-model="searchKeyword"
                class="value-search-input"
                clearable
                :placeholder="t('keyDetailPanels.zset.searchPlaceholder')"
            >
                <template #prefix>
                    <el-icon>
                        <Search/>
                    </el-icon>
                </template>
            </el-input>
        </div>

        <!-- ZSet 表格区域：按分数倒序展示排名、成员、分数和预留操作按钮。 -->
        <div class="zset-table-wrap">
            <!-- 虚拟表格：表头固定，内容区只渲染可视行，避免大量 ZSet 成员拖慢页面。 -->
            <div class="zset-table virtual-detail-table">
                <div class="virtual-table-header">
                    <div class="virtual-table-cell rank-cell">{{ t('keyDetailPanels.common.labels.rank') }}</div>
                    <div class="virtual-table-cell member-cell">{{ t('keyDetailPanels.common.labels.member') }} ({{ rows.length }})</div>
                    <div class="virtual-table-cell score-cell">
                        <button class="score-sort-button" type="button" @click="toggleScoreSort">
                            <span>{{ t('keyDetailPanels.common.labels.score') }}</span>
                            <span class="sort-indicator" :class="`is-${scoreSortDirection}`"></span>
                        </button>
                    </div>
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
                                        <div class="virtual-table-cell rank-cell">{{ data[index].rank }}</div>
                                        <div class="virtual-table-cell member-cell">
                                            <OverflowTooltip :content="data[index].member">
                                                <span class="member-text" data-overflow-target>{{ data[index].member }}</span>
                                            </OverflowTooltip>
                                        </div>
                                        <div class="virtual-table-cell score-cell">
                                            <OverflowTooltip :content="data[index].scoreText">
                                                <span class="score-text" data-overflow-target>{{ data[index].scoreText }}</span>
                                            </OverflowTooltip>
                                        </div>
                                        <div class="virtual-table-cell action-cell">
                                            <div class="row-actions">
                                                <el-tooltip :content="t('keyDetailPanels.common.edit')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="success" plain :icon="Edit" @click="handleEditItem(data[index])"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.copyCommand')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="primary" plain :icon="DocumentCopy" @click="handleCopyItemCommand(data[index])"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.view')" placement="top" :show-after="200">
                                                    <el-button circle size="small" plain :icon="View" @click="handleViewItem(data[index])"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.delete')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="danger" :icon="Delete" :loading="deletingMember === data[index].member"
                                                               @click="handleDeleteItem(data[index])"/>
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

        <DetailLoadFooter
            :has-more="hasMore"
            :loading-more="isLoadingMore"
            :loading-all="isLoadingAll"
            @load-all="handleLoadAll"
            @load-more="handleLoadMore"
        />
        <!-- ZSet 成员编辑弹窗：新增和编辑共用 Score + Member 表单。 -->
        <el-dialog
            v-model="itemEditorVisible"
            width="620px"
            destroy-on-close
            :close-on-click-modal="false"
        >
            <template #header>
                <!-- 弹窗标题：ZSet 成员新增和编辑共用表单，使用编辑图标表达成员变更。 -->
                <DialogTitle :icon="Edit" :title="itemEditorTitle"/>
            </template>

            <el-form label-width="82px" class="item-editor-form" @submit.prevent>
                <el-form-item :label="t('keyDetailPanels.common.labels.score')" required>
                    <el-input-number
                        v-model="itemForm.score"
                        class="score-input"
                        :disabled="savingItem"
                        controls-position="right"
                    />
                </el-form-item>

                <el-form-item :label="t('keyDetailPanels.common.labels.member')" required>
                    <el-input
                        v-model="itemForm.member"
                        type="textarea"
                        class="member-value-textarea"
                        :disabled="savingItem"
                        :placeholder="t('keyDetailPanels.common.memberPlaceholder')"
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

        <!-- ZSet 成员查看弹窗：完整展示 Score 和被省略的 Member。 -->
        <el-dialog
            v-model="itemViewerVisible"
            width="620px"
            destroy-on-close
        >
            <template #header>
                <!-- 弹窗标题：查看完整 ZSet 成员内容，使用预览图标提示只读。 -->
                <DialogTitle :icon="View" :title="t('keyDetailPanels.common.viewMemberTitle')"/>
            </template>

            <el-form label-width="82px" class="item-viewer-form">
                <el-form-item :label="t('keyDetailPanels.common.labels.score')">
                    <el-input :model-value="viewingItem.scoreText" readonly style="width: 300px"/>
                </el-form-item>

                <el-form-item :label="t('keyDetailPanels.common.labels.member')">
                    <ViewerTextarea :model-value="viewingItem.member" :height="160"/>
                </el-form-item>
            </el-form>

            <template #footer>
                <!-- 查看弹窗底部操作区：复制当前完整 Member 内容。 -->
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
import {computed, reactive, ref, watch} from 'vue'
import {ElAutoResizer as AutoResizer, ElMessage, ElMessageBox, FixedSizeList} from 'element-plus'
import {Copy as DocumentCopy, Delete, Edit, Plus, PreviewOpen as View, Search} from '@icon-park/vue-next'
import DialogTitle from '../common/DialogTitle.vue'
import OverflowTooltip from '../common/OverflowTooltip.vue'
import ViewerTextarea from '../common/ViewerTextarea.vue'
import DetailLoadFooter from './common/DetailLoadFooter.vue'
import {useI18n} from '../../i18n/index.js'

// 国际化文案读取函数：驱动 ZSet 表格、弹窗和操作反馈文案。
const {t} = useI18n()

// 组件入参：tabId 用于 IPC 定位连接，keyData 是 KeyDetailPanel 加载后的 ZSet 详情数据。
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

// 搜索关键词：只过滤当前已加载的 ZSet 成员，不触发 Redis 查询。
const searchKeyword = ref('')

// 已加载的 ZSet 成员：首段来自 keyData.value，后续通过加载更多/加载全部追加。
const loadedItems = ref([])

// 成员编辑弹窗显示状态：新增和编辑共用同一个表单弹窗。
const itemEditorVisible = ref(false)

// 成员查看弹窗显示状态：用于完整查看长 Member 和 Score。
const itemViewerVisible = ref(false)

// 成员编辑模式：add 表示新增成员，edit 表示修改已有成员。
const itemEditorMode = ref('add')

// 成员编辑表单：originalMember 用于编辑时判断是否发生 Member 改名。
const itemForm = reactive({
    originalMember: '',
    member: '',
    score: 0
})

// 当前查看中的成员数据：查看弹窗只读展示，避免直接绑定表格行对象。
const viewingItem = reactive({
    member: '',
    scoreText: ''
})

// 保存成员状态：控制新增/编辑确认按钮 loading 和重复提交保护。
const savingItem = ref(false)

// 正在删除的 member：用于给对应行删除按钮展示 loading。
const deletingMember = ref('')

// Score 排序方向：默认保持 Redis ZREVRANGE 的高分到低分展示，点击表头后在升序/降序间切换。
const scoreSortDirection = ref('desc')

// 加载更多状态：控制底部“加载更多”按钮 loading 和重复点击保护。
const isLoadingMore = ref(false)

// 加载全部状态：控制底部“加载全部”按钮 loading 和重复点击保护。
const isLoadingAll = ref(false)

// 当前 ZSet 总长度：初始来自 keyData.size，后续每次分页请求后用后端 ZCARD 结果校正。
const zsetTotalSize = ref(0)

// 每次“加载更多”的分页大小：和主进程首屏 ZSet 加载数量保持一致。
const ZSET_PAGE_SIZE = 100

// 虚拟表格固定行高：和当前行内按钮尺寸、文本行高保持一致，保证滚动定位稳定。
const ROW_HEIGHT = 41

// 当前是否仍有未加载成员：驱动底部按钮禁用状态。
const hasMore = computed(() => loadedItems.value.length < zsetTotalSize.value)

// 当前是否处于编辑已有成员模式：编辑时可能只改 Score，也可能同时改 Member。
const isEditMode = computed(() => itemEditorMode.value === 'edit')

// 成员编辑弹窗标题：根据新增/编辑模式显示不同文案。
const itemEditorTitle = computed(() => (
    isEditMode.value ? t('keyDetailPanels.zset.editTitle') : t('keyDetailPanels.zset.addTitle')
))

// 是否允许提交成员表单：Member 不能为空，Score 必须是有效数字，且当前没有提交中的写操作。
const canSubmitItem = computed(() => {
    return Boolean(itemForm.member.trim()) && Number.isFinite(Number(itemForm.score)) && !savingItem.value
})

/**
 * 格式化 Score 展示文本。
 * Redis score 是数值，这里保留原始数值语义，同时避免整数展示成 1000.0。
 * @param {number|string} score Redis ZSet score
 * @returns {string} 可展示的分数字符串
 */
const formatScore = (score) => {
    const numericScore = Number(score)

    if (!Number.isFinite(numericScore)) {
        return String(score ?? '')
    }

    return Number.isInteger(numericScore) ? String(numericScore) : String(numericScore)
}

// ZSet 表格数据：把 Redis 返回成员转换为带排名、成员和分数展示值的行结构。
const rows = computed(() => {
    // Score 表头排序只影响当前已加载数据的展示顺序，不触发 Redis 重新查询。
    const sortedItems = [...loadedItems.value].sort((left, right) => {
        const leftScore = Number(left?.score) || 0
        const rightScore = Number(right?.score) || 0

        return scoreSortDirection.value === 'desc'
            ? rightScore - leftScore
            : leftScore - rightScore
    })

    return sortedItems.map((item, index) => ({
        rank: index + 1,
        member: String(item?.member ?? ''),
        score: Number(item?.score) || 0,
        scoreText: formatScore(item?.score)
    }))
})

/**
 * 切换 Score 本地排序方向。
 */
const toggleScoreSort = () => {
    scoreSortDirection.value = scoreSortDirection.value === 'desc' ? 'asc' : 'desc'
}

// 过滤后的表格数据：搜索框为空时展示全部，输入后按 Member 或 Score 做不区分大小写匹配。
const filteredRows = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()

    if (!keyword) {
        return rows.value
    }

    return rows.value.filter((row) => (
        row.member.toLowerCase().includes(keyword) ||
        row.scoreText.toLowerCase().includes(keyword)
    ))
})

/**
 * 将 Redis 命令参数格式化为 redis-cli 可识别的字符串参数。
 * @param {unknown} value 参数原始值
 * @returns {string} 转义后的命令参数
 */
const formatCommandArg = (value) => JSON.stringify(String(value ?? ''))

/**
 * 构造当前 ZSet 成员的 ZADD 命令。
 * @param {Object} item ZSet 成员数据
 * @returns {string} 可复制到命令行执行的 ZADD 命令
 */
const buildItemAddCommand = (item) => {
    return `ZADD ${formatCommandArg(props.keyData.key)} ${formatScore(item.score)} ${formatCommandArg(item.member)}`
}

/**
 * 按 Score 倒序整理本地 ZSet 成员。
 * Redis 详情页当前按 ZREVRANGE 展示，本地新增/编辑后也保持同样排序。
 * @param {Array<Object>} items ZSet 成员列表
 * @returns {Array<Object>} 排序后的成员列表
 */
const sortZSetItems = (items) => {
    return [...items].sort((left, right) => Number(right.score) - Number(left.score))
}

/**
 * 执行 Redis 命令并校验返回。
 * @param {string} command Redis 命令
 * @param {Array<string|number>} args 命令参数
 * @returns {Promise<unknown>} Redis 原始返回结果
 */
const runRedisCommand = async (command, args) => {
    const response = await window.api.redis.executeCommand(props.tabId, command, args)

    if (!response.success) {
        throw new Error(response.error || t('keyDetailPanels.common.messages.commandFail', {value: command}))
    }

    return response.data?.result
}

/**
 * 打开新增 ZSet 成员弹窗。
 */
const handleAddItem = () => {
    itemEditorMode.value = 'add'
    itemForm.originalMember = ''
    itemForm.member = ''
    itemForm.score = 0
    itemEditorVisible.value = true
}

/**
 * 打开编辑 ZSet 成员弹窗。
 * @param {Object} row 当前 ZSet 行数据
 */
const handleEditItem = (row) => {
    itemEditorMode.value = 'edit'
    itemForm.originalMember = row.member
    itemForm.member = row.member
    itemForm.score = Number(row.score) || 0
    itemEditorVisible.value = true
}

/**
 * 保存 ZSet 成员。
 * 新增和改名时先用 ZSCORE 查重；Score 变化通过 ZADD 更新，Member 改名通过 ZADD 新成员 + ZREM 旧成员完成。
 */
const handleSaveItem = async () => {
    if (!canSubmitItem.value) {
        return
    }

    savingItem.value = true

    try {
        const member = itemForm.member.trim()
        const score = Number(itemForm.score)
        const originalMember = itemForm.originalMember
        const isMemberRenamed = isEditMode.value && member !== originalMember

        if (!isEditMode.value || isMemberRenamed) {
            // ZSet 以 member 为唯一标识，写入前先查重，避免 ZADD 静默更新已有成员分数。
            const existsScore = await runRedisCommand('ZSCORE', [props.keyData.key, member])
            if (existsScore !== null && existsScore !== undefined) {
                ElMessage.warning(t('keyDetailPanels.common.messages.memberExists'))
                return
            }
        }

        await runRedisCommand('ZADD', [props.keyData.key, score, member])

        if (isMemberRenamed) {
            await runRedisCommand('ZREM', [props.keyData.key, originalMember])
        }

        if (isEditMode.value) {
            const nextItems = loadedItems.value.filter((item) => item.member !== originalMember)
            loadedItems.value = sortZSetItems([...nextItems, {member, score}])
        } else {
            loadedItems.value = sortZSetItems([{member, score}, ...loadedItems.value])
            zsetTotalSize.value += 1
        }

        itemEditorVisible.value = false
        ElMessage.success(isEditMode.value
            ? t('keyDetailPanels.common.messages.memberUpdated')
            : t('keyDetailPanels.common.messages.memberAdded'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.zset.messages.saveFail'))
    } finally {
        savingItem.value = false
    }
}

/**
 * 复制当前 ZSet 成员的 ZADD 命令。
 * @param {Object} row 当前 ZSet 行数据
 */
const handleCopyItemCommand = async (row) => {
    try {
        await navigator.clipboard.writeText(buildItemAddCommand(row))
        ElMessage.success(t('keyDetailPanels.common.messages.commandCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.copyCommandFail'))
    }
}

/**
 * 复制查看弹窗中的完整 ZSet Member。
 */
const handleCopyViewingItem = async () => {
    try {
        // 查看弹窗复制的是当前展示内容，不是表格里的 ZADD 命令。
        await navigator.clipboard.writeText(viewingItem.member || '')
        ElMessage.success(t('keyDetailPanels.common.messages.contentCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.copyContentFail'))
    }
}

/**
 * 打开 ZSet 成员完整内容查看弹窗。
 * @param {Object} row 当前 ZSet 行数据
 */
const handleViewItem = (row) => {
    viewingItem.member = row.member
    viewingItem.scoreText = row.scoreText
    itemViewerVisible.value = true
}

/**
 * 删除 ZSet 成员。
 * @param {Object} row 当前 ZSet 行数据
 */
const handleDeleteItem = async (row) => {
    try {
        await ElMessageBox.confirm(
            t('keyDetailPanels.zset.confirmDelete', {value: row.member}),
            t('keyDetailPanels.zset.deleteTitle'),
            {
                confirmButtonText: t('keyDetail.actions.delete'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
            }
        )

        deletingMember.value = row.member
        const deleteResult = await runRedisCommand('ZREM', [props.keyData.key, row.member])

        if (Number(deleteResult) <= 0) {
            ElMessage.warning(t('keyDetailPanels.common.messages.memberMissing'))
            return
        }

        loadedItems.value = loadedItems.value.filter((item) => item.member !== row.member)
        zsetTotalSize.value = Math.max(0, zsetTotalSize.value - 1)
        ElMessage.success(t('keyDetailPanels.common.messages.memberDeleted'))
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(error.message || t('keyDetailPanels.zset.messages.deleteFail'))
        }
    } finally {
        deletingMember.value = ''
    }
}

/**
 * 拉取指定排名范围内的 ZSet 成员。
 * @param {number} start ZREVRANGE 起始排名下标
 * @param {number} stop ZREVRANGE 结束排名下标
 * @returns {Promise<{items:Array, size:number}>} 后端返回的 ZSet 成员和最新总长度
 */
const fetchZSetRange = async (start, stop) => {
    // 通过 preload 暴露的 IPC 调用主进程，让 Redis 命令仍然留在 main 边界内执行。
    const response = await window.api.redis.getZSetRange(props.tabId, props.keyData.key, start, stop)

    if (!response.success) {
        throw new Error(response.error || t('keyDetailPanels.zset.messages.loadFail'))
    }

    return {
        items: Array.isArray(response.data?.items) ? response.data.items : [],
        size: Number(response.data?.size) || 0
    }
}

/**
 * 追加加载下一页 ZSet 成员。
 * 根据当前已加载数量计算 ZREVRANGE 范围，成功后追加到 loadedItems。
 */
const handleLoadMore = async () => {
    if (!hasMore.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingMore.value = true

    try {
        const start = loadedItems.value.length
        const stop = Math.min(start + ZSET_PAGE_SIZE - 1, zsetTotalSize.value - 1)
        const {items, size} = await fetchZSetRange(start, stop)

        // 每次分页返回都会带最新 ZCARD，用它校正底部按钮是否还需要可点击。
        zsetTotalSize.value = size
        loadedItems.value = [...loadedItems.value, ...items]
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.loadMoreFail'))
    } finally {
        isLoadingMore.value = false
    }
}

/**
 * 一次性加载剩余全部 ZSet 成员。
 * 仅拉取当前未加载的范围，避免重复覆盖已经展示的首段数据。
 */
const handleLoadAll = async () => {
    if (!hasMore.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingAll.value = true

    try {
        const start = loadedItems.value.length
        const stop = Math.max(start, zsetTotalSize.value - 1)
        const {items, size} = await fetchZSetRange(start, stop)

        // 加载剩余全部时同样校正总长度，兼容后台 ZSet 在查看期间发生变化。
        zsetTotalSize.value = size
        loadedItems.value = [...loadedItems.value, ...items]
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.loadAllFail'))
    } finally {
        isLoadingAll.value = false
    }
}

// 监听父级重新加载的 Key 详情：切换 Key 或刷新详情时重置已加载成员与按钮状态。
watch(
    () => props.keyData,
    (nextKeyData) => {
        loadedItems.value = Array.isArray(nextKeyData?.value) ? [...nextKeyData.value] : []
        zsetTotalSize.value = Number(nextKeyData?.size) || loadedItems.value.length
        isLoadingMore.value = false
        isLoadingAll.value = false
    },
    {immediate: true}
)
</script>

<style scoped>
/* ZSet 面板根容器：三段式纵向布局，表格区吃满中间剩余空间。 */
.zset-detail-panel {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    background: var(--el-bg-color);
}

/* 工具栏：左右分布，和 List/Set 面板保持一致的新增/搜索入口位置。 */
.zset-toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
}

/* 新增按钮：固定普通主按钮高度，避免和搜索框高度不一致。 */
.zset-toolbar :deep(.el-button) {
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
.zset-table-wrap {
    min-height: 0;
    flex: 1;
}

/* 表格主体：平整数据表风格，和 List 详情保持一致。 */
.zset-table {
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

.rank-cell {
    width: 80px;
    flex: 0 0 80px;
    justify-content: center;
}

.member-cell {
    flex: 1;
}

.score-cell {
    width: 160px;
    flex: 0 0 160px;
    justify-content: center;
}

/* Score 排序按钮：保持表头文字风格，同时提供可点击的排序入口。 */
.score-sort-button {
    display: inline-flex;
    height: 100%;
    padding: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    gap: 5px;
    background: transparent;
    border: 0;
}

/* Score 排序指示：用 CSS 三角形表达升序/降序，避免额外引入图标。 */
.sort-indicator {
    width: 0;
    height: 0;
    border-right: 4px solid transparent;
    border-left: 4px solid transparent;
}

.sort-indicator.is-desc {
    border-top: 6px solid var(--el-text-color-secondary);
}

.sort-indicator.is-asc {
    border-bottom: 6px solid var(--el-text-color-secondary);
}

.score-sort-button:hover .sort-indicator.is-desc {
    border-top-color: var(--el-color-primary);
}

.score-sort-button:hover .sort-indicator.is-asc {
    border-bottom-color: var(--el-color-primary);
}

.action-cell {
    width: 180px;
    flex: 0 0 180px;
    justify-content: center;
    border-right: 0;
}

/* Member 文本：单行省略展示，完整内容通过 Element Plus Tooltip 提示。 */
.member-text {
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

/* Score 文本：使用醒目的危险色，贴近参考图中的分数视觉。 */
.score-text {
    display: block;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    color: var(--el-color-danger);
    font-variant-numeric: tabular-nums;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
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


/* 成员编辑表单：给弹窗内容留出稳定间距，避免输入区贴边。 */
.item-editor-form,
.item-viewer-form {
    padding: 4px 4px 0 0;
}

/* ZSet Member 文本域：固定高度，长 Member 通过内部滚动查看或编辑。 */
.member-value-textarea :deep(.el-textarea__inner) {
    height: 160px;
    min-height: 160px !important;
    max-height: 160px;
    resize: none;
    line-height: 1.7;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* Score 输入框：固定宽度，避免数字控件撑满弹窗导致视觉过重。 */
.score-input {
    width: 180px;
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

</style>
