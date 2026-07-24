<!--
    RedisCommandHistoryDrawer.vue
    描述：开发者模式下的 Redis 命令执行记录抽屉。负责搜索、筛选、手动分页、刷新和清空当前会话日志。
-->
<template>
    <el-drawer
        v-model="drawerVisible"
        class="redis-command-history-drawer"
        size="60%"
        direction="rtl"
        :with-header="true"
        :style="{
            top: '40px',
            height: 'calc(100vh - 40px)'
        }"
        @opened="handleDrawerOpened"
    >
        <template #header>
            <!-- 抽屉标题：该记录跨连接汇总，因此使用全局历史图标而不是当前连接图标。 -->
            <div class="drawer-header">
                <el-icon class="drawer-header-icon">
                    <HistoryQuery/>
                </el-icon>
                <span>{{ t('commandHistory.title') }}</span>
            </div>
        </template>

        <div class="command-history-content">
            <!-- 查询工具栏：搜索和筛选均由 main 进程作用于完整的内存记录。 -->
            <div class="history-toolbar">
                <div class="history-filters">
                    <el-input
                        v-model="keyword"
                        class="keyword-input"
                        clearable
                        :placeholder="t('commandHistory.searchPlaceholder')"
                        @clear="handleSearch"
                        @keyup.enter="handleSearch"
                    >
                        <template #prefix>
                            <el-icon><Search/></el-icon>
                        </template>
                    </el-input>

                    <el-select
                        v-model="connectionId"
                        class="connection-select"
                        clearable
                        filterable
                        :placeholder="t('commandHistory.filters.connection')"
                        @change="handleFilterChange"
                    >
                        <el-option
                            v-for="item in connectionOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>

                    <el-select
                        v-model="source"
                        class="source-select"
                        clearable
                        :placeholder="t('commandHistory.filters.source')"
                        @change="handleFilterChange"
                    >
                        <el-option
                            v-for="item in sourceOptions"
                            :key="item"
                            :label="getSourceLabel(item)"
                            :value="item"
                        />
                    </el-select>

                    <el-select
                        v-model="status"
                        class="status-select"
                        clearable
                        :placeholder="t('commandHistory.filters.status')"
                        @change="handleFilterChange"
                    >
                        <el-option
                            v-for="item in statusOptions"
                            :key="item"
                            :label="getStatusLabel(item)"
                            :value="item"
                        />
                    </el-select>

                    <el-button type="primary" plain :icon="Search" @click="handleSearch">
                        {{ t('commandHistory.actions.search') }}
                    </el-button>
                </div>

                <div class="history-actions">
                    <el-button :icon="Refresh" :loading="loading" plain @click="fetchHistory">
                        {{ t('commandHistory.actions.refresh') }}
                    </el-button>
                    <el-button
                        type="danger"
                        plain
                        :icon="Delete"
                        :loading="clearing"
                        :disabled="total === 0"
                        @click="handleClearHistory"
                    >
                        {{ t('commandHistory.actions.clear') }}
                    </el-button>
                </div>
            </div>

            <!-- 当前页表格：只渲染一页数据，避免 10000 条日志同时进入 DOM。 -->
            <div class="history-table-shell" v-loading="loading">
                <el-table
                    :data="rows"
                    height="100%"
                    size="small"
                    class="history-table"
                    :empty-text="t('commandHistory.empty')"
                >
                    <el-table-column :label="t('commandHistory.table.time')" width="154">
                        <template #default="{ row }">
                            <span class="time-text">{{ formatHistoryTime(row.timestamp) }}</span>
                        </template>
                    </el-table-column>

                    <el-table-column :label="t('commandHistory.table.connection')" width="184" show-overflow-tooltip>
                        <template #default="{ row }">
                            <div class="connection-cell">
                                <span class="connection-cell-name">{{ row.connectionName || '-' }}</span>
                                <span class="connection-cell-address">{{ formatConnectionAddress(row) }}</span>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column prop="dbIndex" :label="t('commandHistory.table.db')" width="62" align="center">
                        <template #default="{ row }">
                            <span>DB {{ row.dbIndex }}</span>
                        </template>
                    </el-table-column>

                    <el-table-column :label="t('commandHistory.table.source')" width="126" show-overflow-tooltip>
                        <template #default="{ row }">
                            <span>{{ getSourceLabel(row.source) }}</span>
                        </template>
                    </el-table-column>

                    <el-table-column :label="t('commandHistory.table.command')" width="112" show-overflow-tooltip>
                        <template #default="{ row }">
                            <span class="command-name">{{ formatCommandName(row) }}</span>
                        </template>
                    </el-table-column>

                    <el-table-column :label="t('commandHistory.table.args')" min-width="260">
                        <template #default="{ row }">
                            <OverflowTooltip
                                :content="formatCommandArgs(row)"
                                placement="top"
                                :width="400"
                                :max-width="400"
                                :show-after="250"
                            >
                                <span class="args-text">{{ formatCommandArgs(row) }}</span>
                            </OverflowTooltip>
                        </template>
                    </el-table-column>

                    <el-table-column :label="t('commandHistory.table.duration')" width="104" align="right">
                        <template #default="{ row }">
                            <span :class="['duration-text', getDurationClass(row.durationMs)]">
                                {{ formatDuration(row.durationMs) }}
                            </span>
                        </template>
                    </el-table-column>

                    <el-table-column :label="t('commandHistory.table.status')" width="94" align="center" fixed="right">
                        <template #default="{ row }">
                            <el-tooltip
                                :disabled="!row.error"
                                :content="row.error"
                                placement="left"
                                :show-after="200"
                            >
                                <el-tag :type="getStatusTagType(row.status)" size="small" effect="light">
                                    {{ getStatusLabel(row.status) }}
                                </el-tag>
                            </el-tooltip>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <!-- 手动分页：翻页时重新向 main 查询，Drawer 不缓存完整的 10000 条数据。 -->
            <div class="history-pagination">
                <span class="history-limit-tip">{{ t('commandHistory.limitTip', {value: 10000}) }}</span>
                <el-pagination
                    v-model:current-page="page"
                    v-model:page-size="pageSize"
                    background
                    :page-sizes="pageSizeOptions"
                    :total="total"
                    layout="total, sizes, prev, pager, next"
                    @current-change="fetchHistory"
                    @size-change="handlePageSizeChange"
                />
            </div>
        </div>
    </el-drawer>
</template>

<script setup>
import {computed, ref} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import {Delete, HistoryQuery, Refresh, Search} from '@icon-park/vue-next'
import {useI18n} from '../../i18n/index.js'
import {formatAbsoluteDateTimeWithSeconds} from '../../utils/dateTimeUtil.js'
import OverflowTooltip from '../common/OverflowTooltip.vue'

// 组件入参：标题栏仅在开发者模式下挂载并控制 Drawer 显示。
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
})

// 对外事件：同步 v-model:visible。
const emit = defineEmits(['update:visible'])

// 国际化文案读取函数：驱动标题、筛选器、表格、状态和操作反馈。
const {t} = useI18n()

// Drawer 可见状态代理：保持父组件状态和 Element Plus Drawer 一致。
const drawerVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
})

// 查询条件：关键词支持连接、命令、参数、来源、状态和错误文本的综合搜索。
const keyword = ref('')
const connectionId = ref('')
const source = ref('')
const status = ref('')

// 分页状态：仅保存当前页，翻页和修改每页数量都会重新查询 main 进程。
const page = ref(1)
const pageSize = ref(50)
const pageSizeOptions = [20, 50, 100]
const total = ref(0)

// Drawer 数据状态：查询结果携带可用连接和来源选项，避免额外增加 IPC。
const rows = ref([])
const connectionOptions = ref([])
const sourceOptions = ref([])
const statusOptions = ['success', 'error', 'timeout']

// 操作状态：分别控制查询遮罩和清空按钮，防止重复提交。
const loading = ref(false)
const clearing = ref(false)
let queryGeneration = 0

// 命令来源到国际化文案的映射；未知来源直接展示 main 返回值，便于后续服务扩展。
const SOURCE_I18N_KEYS = {
    'renderer-command': 'commandHistory.sources.rendererCommand',
    'command-panel': 'commandHistory.sources.commandPanel',
    'key-list': 'commandHistory.sources.keyList',
    'key-detail': 'commandHistory.sources.keyDetail',
    'memory-analysis': 'commandHistory.sources.memoryAnalysis',
    'directory-preview': 'commandHistory.sources.directoryPreview',
    'batch-delete': 'commandHistory.sources.batchDelete',
    'key-export': 'commandHistory.sources.keyExport',
    'key-import': 'commandHistory.sources.keyImport',
    'slow-log': 'commandHistory.sources.slowLog',
    'server-info': 'commandHistory.sources.serverInfo',
    'database-selector': 'commandHistory.sources.databaseSelector',
    'connection-test': 'commandHistory.sources.connectionTest'
}

/**
 * 查询当前页命令记录。
 * 使用查询代次阻止快速切换筛选条件时旧请求覆盖最新结果。
 */
const fetchHistory = async () => {
    const requestGeneration = queryGeneration + 1
    queryGeneration = requestGeneration
    loading.value = true

    try {
        const response = await window.api.redis.getCommandHistory({
            page: page.value,
            pageSize: pageSize.value,
            keyword: keyword.value,
            connectionId: connectionId.value,
            source: source.value,
            status: status.value
        })

        if (requestGeneration !== queryGeneration) {
            return
        }

        if (!response.success) {
            ElMessage.error(response.error || t('commandHistory.messages.loadFail'))
            return
        }

        rows.value = response.data?.items || []
        total.value = Number(response.data?.total) || 0
        connectionOptions.value = response.data?.connections || []
        sourceOptions.value = response.data?.sources || []

        // 删除最后一页数据后回到新的末页，避免停留在空页。
        const maxPage = Math.max(Math.ceil(total.value / pageSize.value), 1)
        if (page.value > maxPage) {
            page.value = maxPage
            await fetchHistory()
        }
    } catch (error) {
        if (requestGeneration === queryGeneration) {
            ElMessage.error(`${t('commandHistory.messages.loadFail')}: ${error.message || error}`)
        }
    } finally {
        if (requestGeneration === queryGeneration) {
            loading.value = false
        }
    }
}

/**
 * 从第一页执行关键词搜索。
 */
const handleSearch = () => {
    page.value = 1
    fetchHistory()
}

/**
 * 修改连接、来源或状态筛选后从第一页重新查询。
 */
const handleFilterChange = () => {
    page.value = 1
    fetchHistory()
}

/**
 * 修改每页数量后回到第一页，避免页码超出新的总页数。
 */
const handlePageSizeChange = () => {
    page.value = 1
    fetchHistory()
}

/**
 * 清空当前会话命令记录。
 * 清空属于不可恢复操作，执行前使用确认弹窗明确影响范围。
 */
const handleClearHistory = async () => {
    if (clearing.value || total.value === 0) {
        return
    }

    try {
        await ElMessageBox.confirm(
            t('commandHistory.confirm.clearMessage'),
            t('commandHistory.confirm.clearTitle'),
            {
                confirmButtonText: t('commandHistory.confirm.clearConfirm'),
                cancelButtonText: t('common.cancel'),
                type: 'warning',
                confirmButtonClass: 'el-button--danger'
            }
        )

        clearing.value = true
        const response = await window.api.redis.clearCommandHistory()

        if (!response.success) {
            ElMessage.error(response.error || t('commandHistory.messages.clearFail'))
            return
        }

        page.value = 1
        rows.value = []
        total.value = 0
        connectionOptions.value = []
        sourceOptions.value = []
        ElMessage.success(t('commandHistory.messages.clearSuccess', {
            value: response.data?.clearedCount || 0
        }))
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(`${t('commandHistory.messages.clearFail')}: ${error.message || error}`)
        }
    } finally {
        clearing.value = false
    }
}

/**
 * 格式化日志时间。
 *
 * @param {number} timestamp - main 进程记录的毫秒时间戳。
 * @returns {string} 带秒的绝对时间。
 */
const formatHistoryTime = (timestamp) => formatAbsoluteDateTimeWithSeconds(timestamp, t)

/**
 * 格式化连接地址。
 *
 * @param {Object} row - 命令记录。
 * @returns {string} host:port 或占位符。
 */
const formatConnectionAddress = (row) => {
    return [row.host, row.port].filter((item) => item !== null && item !== undefined && item !== '').join(':') || '-'
}

/**
 * 格式化命令名称，Pipeline 同时展示子命令总数。
 *
 * @param {Object} row - 命令记录。
 * @returns {string} 命令名称。
 */
const formatCommandName = (row) => {
    if (row.command === 'PIPELINE') {
        return `${row.command} (${row.pipelineTotalCount || 0})`
    }

    return row.command || '-'
}

/**
 * 格式化命令参数。
 * Pipeline 展示已保留的子命令摘要，并提示因体积限制省略的数量。
 *
 * @param {Object} row - 命令记录。
 * @returns {string} 参数或子命令摘要。
 */
const formatCommandArgs = (row) => {
    if (row.command !== 'PIPELINE') {
        return Array.isArray(row.args) && row.args.length > 0 ? row.args.join(' ') : '-'
    }

    const commands = (row.pipelineCommands || []).map((item) => {
        const args = Array.isArray(item.args) && item.args.length > 0 ? ` ${item.args.join(' ')}` : ''
        return `${item.command}${args}`
    })
    const omittedText = row.pipelineOmittedCount > 0
        ? `; ${t('commandHistory.pipelineOmitted', {value: row.pipelineOmittedCount})}`
        : ''

    return `${commands.join('; ')}${omittedText}` || '-'
}

/**
 * 格式化命令耗时。
 *
 * @param {number} durationMs - 毫秒耗时。
 * @returns {string} 毫秒文本。
 */
const formatDuration = (durationMs) => `${Number(durationMs || 0).toLocaleString()} ms`

/**
 * 根据耗时返回视觉级别。
 *
 * @param {number} durationMs - 毫秒耗时。
 * @returns {string} CSS class。
 */
const getDurationClass = (durationMs) => {
    const value = Number(durationMs) || 0

    if (value >= 1000) {
        return 'is-slow'
    }

    if (value >= 200) {
        return 'is-warning'
    }

    return ''
}

/**
 * 获取命令状态国际化文案。
 *
 * @param {string} value - success/error/timeout。
 * @returns {string} 状态文案。
 */
const getStatusLabel = (value) => t(`commandHistory.status.${value}`, {value})

/**
 * 获取 Element Plus Tag 类型。
 *
 * @param {string} value - 命令状态。
 * @returns {'success'|'danger'|'warning'|'info'} Tag 类型。
 */
const getStatusTagType = (value) => {
    if (value === 'success') return 'success'
    if (value === 'timeout') return 'warning'
    if (value === 'error') return 'danger'
    return 'info'
}

/**
 * 获取命令来源文案。
 *
 * @param {string} value - main 进程记录的来源标识。
 * @returns {string} 国际化来源名称。
 */
const getSourceLabel = (value) => {
    const key = SOURCE_I18N_KEYS[value]
    return key ? t(key) : (value || '-')
}

/**
 * Drawer 完成打开动画后查询首屏，避免未打开时产生无意义请求。
 */
const handleDrawerOpened = () => {
    fetchHistory()
}
</script>

<style scoped>
/* 抽屉标题：历史图标和标题保持同一基线。 */
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
    font-size: 19px;
}

/* Drawer 主体：工具栏和分页固定，只有表格内部滚动。 */
.command-history-content {
    display: flex;
    height: 100%;
    min-height: 0;
    padding: 18px 20px 14px;
    box-sizing: border-box;
    flex-direction: column;
}

/* 顶部工具栏：筛选项可收缩，操作按钮保持稳定宽度。 */
.history-toolbar {
    display: flex;
    gap: 14px;
    padding-bottom: 14px;
    align-items: center;
    justify-content: space-between;
}

.history-filters,
.history-actions {
    display: flex;
    gap: 8px;
    min-width: 0;
    align-items: center;
}

.history-filters {
    flex: 1;
}

.history-actions {
    flex-shrink: 0;
}

.keyword-input {
    width: 250px;
}

.connection-select {
    width: 180px;
}

.source-select {
    width: 150px;
}

.status-select {
    width: 120px;
}

/* 表格区域：稳定占据剩余高度，边框与项目其他工具 Drawer 保持一致。 */
.history-table-shell {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
}

.history-table {
    width: 100%;
    height: 100%;
}

/* 表格正文允许拖选复制，表头仍保持标准表格交互。 */
.history-table :deep(.el-table__body .cell),
.history-table :deep(.el-table__body .cell *) {
    cursor: text;
    user-select: text;
    -webkit-user-select: text;
}

.time-text,
.command-name,
.args-text {
    font-family: Consolas, Monaco, monospace;
}

.connection-cell {
    display: flex;
    min-width: 0;
    flex-direction: column;
    line-height: 1.35;
}

.connection-cell-name,
.connection-cell-address {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.connection-cell-name {
    color: var(--el-text-color-primary);
}

.connection-cell-address {
    color: var(--el-text-color-secondary);
    font-size: 11px;
}

.command-name {
    color: var(--el-color-primary);
    font-weight: 600;
}

.history-table :deep(.args-text) {
    display: block;
    overflow: hidden;
    color: var(--el-text-color-regular);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.duration-text {
    color: var(--el-text-color-regular);
    font-variant-numeric: tabular-nums;
}

.duration-text.is-warning {
    color: var(--el-color-warning);
}

.duration-text.is-slow {
    color: var(--el-color-danger);
    font-weight: 600;
}

/* 底部分页：左侧说明容量，右侧保留标准手动分页操作。 */
.history-pagination {
    display: flex;
    gap: 16px;
    padding-top: 14px;
    align-items: center;
    justify-content: space-between;
}

.history-limit-tip {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

@media (max-width: 1180px) {
    .history-toolbar {
        align-items: flex-end;
        flex-direction: column;
    }

    .history-filters,
    .history-actions {
        width: 100%;
    }

    .history-actions {
        justify-content: flex-end;
    }

    .keyword-input,
    .connection-select,
    .source-select,
    .status-select {
        flex: 1;
        width: auto;
        min-width: 110px;
    }
}

</style>
