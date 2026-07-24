<!--
    MemoryAnalysisDrawer.vue
    描述：Key 内存分析抽屉。负责展示当前 DB 中最多 20 万个 Key 的 MEMORY USAGE 排行，并用虚拟列表承载大数据量渲染。
-->
<template>
    <el-drawer
        v-model="drawerVisible"
        size="640px"
        direction="rtl"
        :with-header="true"
        :style="{
            top: '40px',
            height: 'calc(100vh - 40px)'
        }"
        @opened="handleDrawerOpened"
        @closed="handleDrawerClosed"
    >
        <template #header>
            <!-- 抽屉标题：标识当前功能为 Key 内存分析。 -->
            <div class="drawer-header">
                <el-icon class="drawer-header-icon">
                    <Memory/>
                </el-icon>
                <span>{{ t('memoryAnalysis.title') }}</span>
            </div>
        </template>

        <!-- 抽屉主体：顶部摘要固定，列表区域使用虚拟列表撑满剩余高度。 -->
        <div class="memory-analysis-drawer">
            <div class="analysis-toolbar">
                <div class="connection-info">
                    <span class="connection-name">{{ connectionName || t('memoryAnalysis.currentConnection') }}</span>
                    <span v-if="scopeLabel" class="analysis-scope">{{ scopeLabel }}</span>
                </div>
                <el-button :icon="Refresh" :loading="loading" plain @click="fetchAnalysis">
                    {{ t('memoryAnalysis.refresh') }}
                </el-button>
            </div>

            <!-- 摘要指标：展示已分析数量、总内存占用，以及是否达到扫描上限。 -->
            <div class="summary-grid">
                <div class="summary-item">
                    <span>{{ t('memoryAnalysis.summary.scanned') }}</span>
                    <strong>{{ formatNumber(summary.scannedCount) }}</strong>
                </div>
                <div class="summary-item">
                    <span>{{ t('memoryAnalysis.summary.totalMemory') }}</span>
                    <strong>{{ formatBytes(summary.totalMemory) }}</strong>
                </div>
                <div class="summary-item">
                    <span>{{ t('memoryAnalysis.summary.status') }}</span>
                    <strong :class="analysisStatus.className">
                        {{ analysisStatus.text }}
                    </strong>
                </div>
            </div>

            <!-- 列表表头：和虚拟列表行保持相同列宽，避免滚动时视觉错位。 -->
            <div class="list-header">
                <span>{{ t('memoryAnalysis.table.key') }}</span>
                <span>{{ t('memoryAnalysis.table.memory') }}</span>
            </div>

            <div class="list-body" v-loading="loading && rows.length === 0">
                <el-empty v-if="!loading && rows.length === 0" :description="t('memoryAnalysis.empty')"/>

                <AutoResizer v-else class="analysis-auto-resizer">
                    <template #default="{ height, width }">
                        <FixedSizeList
                            class-name="analysis-virtual-list"
                            :data="rows"
                            :total="rows.length"
                            :height="height"
                            :width="width"
                            :item-size="ROW_HEIGHT"
                            :cache="10"
                        >
                            <template #default="{ data, index, style }">
                                <!-- Key 内存行：左侧 Key 名称省略展示，右侧显示人性化内存单位。 -->
                                <div
                                    v-if="data[index]"
                                    class="analysis-row"
                                    :style="style"
                                >
                                    <span class="key-name">{{ data[index].key }}</span>
                                    <span class="key-memory">{{ formatBytes(data[index].memoryUsage) }}</span>
                                </div>
                            </template>
                        </FixedSizeList>
                    </template>
                </AutoResizer>
            </div>

            <div class="analysis-limit">
                {{ t('memoryAnalysis.limitTip', { value: formatNumber(maxKeys) }) }}
            </div>
        </div>
    </el-drawer>
</template>

<script setup>
import {computed, onDeactivated, onUnmounted, ref, watch} from 'vue'
import {ElAutoResizer as AutoResizer, ElMessage, FixedSizeList} from 'element-plus'
import {Memory, Refresh} from '@icon-park/vue-next'
import {useI18n} from '../../i18n/index.js'

const ROW_HEIGHT = 40
const DEFAULT_MAX_KEYS = 200000

// 组件入参：由 KeyListPanel 控制显示状态，并传入当前连接与 DB 信息。
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    connectionId: {
        type: [String, Number],
        default: ''
    },
    connectionName: {
        type: String,
        default: ''
    },
    scopeLabel: {
        type: String,
        default: ''
    },
    matchPattern: {
        type: String,
        default: '*'
    },
    maxKeys: {
        type: Number,
        default: DEFAULT_MAX_KEYS
    }
})

// 对外事件：同步 v-model:visible。
const emit = defineEmits(['update:visible'])

// 国际化文案读取函数：驱动内存分析抽屉标题、摘要和列表文案。
const {t} = useI18n()

// 抽屉可见状态代理：保持父组件 v-model 和 Element Plus Drawer 状态一致。
const drawerVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
})

// 抽屉动画完成状态：避免打开动画期间 watch 和 opened 同时触发两次扫描。
const drawerOpened = ref(false)

// 分析状态和请求序号：关闭、刷新或切换范围时递增序号，使旧批次停止回写和继续拉取。
const loading = ref(false)
let analysisRequestId = 0

// 内存排行原始结果：由 main 进程返回，已经按内存占用从大到小排序。
const rows = ref([])

// 摘要信息：展示已分析数量、总内存，以及是否还有更多 Key 未纳入本次分析。
const summary = ref({
    scannedCount: 0,
    totalMemory: 0,
    hasMore: false
})

// 分析失败状态：失败后可保留已返回批次，但不能把部分结果标记为已完成。
const analysisFailed = ref(false)

// 分析状态文案和颜色：区分扫描中、失败、达到上限和完整结束。
const analysisStatus = computed(() => {
    if (loading.value) {
        return {
            className: 'is-loading',
            text: t('memoryAnalysis.summary.scanning')
        }
    }

    if (analysisFailed.value) {
        return {
            className: 'is-danger',
            text: t('memoryAnalysis.summary.failed')
        }
    }

    return summary.value.hasMore
        ? {className: 'is-warning', text: t('memoryAnalysis.summary.reachedLimit')}
        : {className: 'is-success', text: t('memoryAnalysis.summary.completed')}
})

/**
 * 将两个按内存降序排列的数组线性合并，避免每批都对全部结果重新排序。
 *
 * @param {Array} currentRows - 已展示的有序结果。
 * @param {Array} batchRows - main 返回的当前批次有序结果。
 * @returns {Array} 合并后的降序结果。
 */
const mergeMemoryRows = (currentRows, batchRows) => {
    const mergedRows = []
    let currentIndex = 0
    let batchIndex = 0

    while (currentIndex < currentRows.length && batchIndex < batchRows.length) {
        if (currentRows[currentIndex].memoryUsage >= batchRows[batchIndex].memoryUsage) {
            mergedRows.push(currentRows[currentIndex])
            currentIndex += 1
        } else {
            mergedRows.push(batchRows[batchIndex])
            batchIndex += 1
        }
    }

    return mergedRows
        .concat(currentRows.slice(currentIndex))
        .concat(batchRows.slice(batchIndex))
}

/**
 * 格式化整数。
 * @param {number} value 原始数值。
 * @returns {string} 带千分位的展示文本。
 */
const formatNumber = (value) => {
    return Number(value || 0).toLocaleString()
}

/**
 * 格式化字节数。
 * @param {number} bytes 原始字节数。
 * @returns {string} 人性化内存单位。
 */
const formatBytes = (bytes) => {
    const normalizedBytes = Number(bytes)
    if (!Number.isFinite(normalizedBytes) || normalizedBytes <= 0) {
        return '0 B'
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let value = normalizedBytes
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024
        unitIndex += 1
    }

    return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[unitIndex]}`
}

/**
 * 分批拉取当前 DB 的 Key 内存排行。
 * renderer 持有 cursor 并逐批合并展示；main 每次只执行一轮 SCAN 和对应的 MEMORY USAGE pipeline。
 */
const fetchAnalysis = async () => {
    if (!props.connectionId) {
        return
    }

    const requestId = ++analysisRequestId
    loading.value = true
    rows.value = []
    summary.value = {
        scannedCount: 0,
        totalMemory: 0,
        hasMore: false
    }
    analysisFailed.value = false

    try {
        const seenKeys = new Set()
        let cursor = '0'
        let totalMemory = 0

        do {
            const remaining = props.maxKeys - seenKeys.size
            if (remaining <= 0 || requestId !== analysisRequestId || !props.visible) {
                break
            }

            const response = await window.api.redis.analyzeKeyMemory(props.connectionId, {
                cursor,
                matchPattern: props.matchPattern
            })

            if (requestId !== analysisRequestId || !props.visible) {
                return
            }

            if (!response.success) {
                analysisFailed.value = true
                ElMessage.error(`${t('memoryAnalysis.messages.loadFail')}: ${response.error || t('common.unknownError')}`)
                return
            }

            const batchRemaining = props.maxKeys - seenKeys.size
            const unseenBatchRows = (response.data?.keys || []).filter((row) => {
                if (!row?.key || seenKeys.has(row.key)) {
                    return false
                }

                return true
            })
            const batchRows = unseenBatchRows.slice(0, batchRemaining)
            batchRows.forEach((row) => seenKeys.add(row.key))
            cursor = String(response.data?.cursor ?? '0')
            totalMemory += batchRows.reduce((total, row) => total + (Number(row.memoryUsage) || 0), 0)
            rows.value = mergeMemoryRows(rows.value, batchRows)
            summary.value = {
                scannedCount: seenKeys.size,
                totalMemory,
                hasMore: seenKeys.size >= props.maxKeys
                    && (Boolean(response.data?.hasMore) || unseenBatchRows.length > batchRemaining)
            }
        } while (cursor !== '0' && seenKeys.size < props.maxKeys)
    } catch (error) {
        if (requestId === analysisRequestId && props.visible) {
            analysisFailed.value = true
            ElMessage.error(`${t('memoryAnalysis.messages.loadFail')}: ${error.message || error}`)
        }
    } finally {
        if (requestId === analysisRequestId) {
            loading.value = false
        }
    }
}

/**
 * 抽屉打开后再开始分析，避免用户只是展开菜单时就触发重型扫描。
 */
const handleDrawerOpened = () => {
    drawerOpened.value = true
    fetchAnalysis()
}

/**
 * 抽屉关闭后重置 opened 标记。
 * 目录范围等参数可能会在下次打开前变化，未真正打开时不应触发重型扫描。
 */
const handleDrawerClosed = () => {
    drawerOpened.value = false
    rows.value = []
    summary.value = {
        scannedCount: 0,
        totalMemory: 0,
        hasMore: false
    }
    analysisFailed.value = false
}

// 抽屉已打开时切换分析范围，需要立即刷新结果，支持从不同目录右键连续触发内存分析。
watch(
    () => [props.connectionId, props.matchPattern, props.maxKeys],
    () => {
        if (drawerOpened.value) {
            fetchAnalysis()
        }
    }
)

/**
 * 让当前 renderer 拉取循环失效，旧批次返回后不得继续请求或回写。
 */
const invalidateAnalysisRequest = () => {
    analysisRequestId += 1
    loading.value = false
}

onDeactivated(invalidateAnalysisRequest)
onUnmounted(invalidateAnalysisRequest)

// Drawer 开始关闭时立即取消任务，不等待关闭动画结束。
watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            invalidateAnalysisRequest()
        }
    }
)
</script>

<style scoped>
/* 抽屉标题：图标和文字横向居中，保持和其他 Drawer 标题风格一致。 */
.drawer-header {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.drawer-header-icon {
    color: var(--el-color-primary);
    font-size: 18px;
}

/* 抽屉主体：使用纵向布局，让虚拟列表占满剩余高度。 */
.memory-analysis-drawer {
    display: flex;
    height: 100%;
    min-height: 0;
    padding: 20px;
    box-sizing: border-box;
    flex-direction: column;
}

/* 顶部工具栏：左侧连接信息，右侧刷新按钮。 */
.analysis-toolbar {
    display: flex;
    gap: 12px;
    padding-bottom: 14px;
    align-items: center;
    justify-content: space-between;
}

.connection-info {
    display: flex;
    min-width: 0;
    flex-direction: column;
}

.connection-name {
    overflow: hidden;
    color: var(--el-text-color-primary);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.analysis-limit {
    flex-shrink: 0;
    margin-top: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
    text-align: right;
}

.analysis-scope {
    margin-top: 4px;
    overflow: hidden;
    color: var(--el-color-primary);
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 摘要区：三列展示扫描结果，避免用户只看到列表不知道范围。 */
.summary-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-bottom: 14px;
}

.summary-item {
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    background: var(--el-fill-color-extra-light);
}

.summary-item span {
    display: block;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.summary-item strong {
    display: block;
    margin-top: 6px;
    overflow: hidden;
    color: var(--el-text-color-primary);
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 扫描状态颜色：完成使用成功色，达到上限使用警告色，方便快速识别扫描结果范围。 */
.summary-item strong.is-success {
    color: var(--el-color-success);
}

.summary-item strong.is-warning {
    color: var(--el-color-warning);
}

.summary-item strong.is-loading {
    color: var(--el-color-primary);
}

.summary-item strong.is-danger {
    color: var(--el-color-danger);
}

/* 列表表头：固定高度，右侧内存列靠右展示。 */
.list-header {
    display: grid;
    height: 36px;
    padding: 0 12px;
    flex-shrink: 0;
    align-items: center;
    border: 1px solid var(--el-border-color-light);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 13px;
    grid-template-columns: minmax(0, 1fr) 112px;
}

.list-header span:last-child {
    text-align: right;
}

/* 列表主体：虚拟列表容器必须有稳定高度，避免 20 万条数据撑爆 DOM。 */
.list-body {
    flex: 1;
    min-height: 0;
    border: 1px solid var(--el-border-color-light);
    border-radius: 0 0 6px 6px;
    overflow: hidden;
}

.analysis-auto-resizer {
    width: 100%;
    height: 100%;
}

.analysis-row {
    display: grid;
    height: 40px;
    padding: 0 12px;
    align-items: center;
    box-sizing: border-box;
    border-bottom: 1px solid var(--el-border-color-lighter);
    color: var(--el-text-color-regular);
    font-size: 13px;
    grid-template-columns: minmax(0, 1fr) 112px;
}

.analysis-row:hover {
    background: var(--el-table-row-hover-bg-color, var(--el-fill-color-light));
}

.key-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.key-memory {
    color: var(--el-text-color-secondary);
    font-weight: 600;
    text-align: right;
}
</style>
