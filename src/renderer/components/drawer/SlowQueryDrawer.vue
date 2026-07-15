<!--
    SlowQueryDrawer.vue
    描述：Redis 慢查询抽屉。负责展示当前连接所在 Redis 实例的 SLOWLOG 记录与慢日志配置。
-->
<template>
    <el-drawer
        v-model="drawerVisible"
        size="900px"
        direction="rtl"
        :with-header="true"
        :style="{
            top: '40px',
            height: 'calc(100vh - 40px)'
        }"
        @opened="handleDrawerOpened"
    >
        <template #header>
            <!-- 抽屉标题：慢查询是实例级能力，不绑定具体 DB。 -->
            <div class="drawer-header">
                <el-icon class="drawer-header-icon">
                    <HistoryQuery/>
                </el-icon>
                <span>{{ t('slowQuery.title') }}</span>
            </div>
        </template>

        <!-- 抽屉主体：顶部工具栏和摘要固定，表格区域承接剩余高度滚动。 -->
        <div class="slow-query-drawer" v-loading="loading">
            <div class="query-toolbar">
                <div class="connection-info">
                    <span class="connection-name">{{ connectionName || t('slowQuery.currentConnection') }}</span>
                    <span class="instance-tip">{{ t('slowQuery.instanceTip') }}</span>
                </div>

                <div class="toolbar-actions">
                    <el-select v-model="queryCount" class="count-select" size="default" @change="fetchSlowLog">
                        <el-option
                            v-for="item in countOptions"
                            :key="item"
                            :label="t('slowQuery.countOption', { value: item })"
                            :value="item"
                        />
                    </el-select>
                    <el-button :icon="Refresh" :loading="loading" plain @click="fetchSlowLog">
                        {{ t('slowQuery.refresh') }}
                    </el-button>
                    <el-button :icon="Delete" type="danger" plain :loading="resetting" @click="handleResetSlowLog">
                        {{ t('slowQuery.reset') }}
                    </el-button>
                </div>
            </div>

            <!-- 摘要信息：展示慢日志总数、阈值、最大长度和当前读取数量。 -->
            <div class="summary-grid">
                <div class="summary-item">
                    <span>{{ t('slowQuery.summary.total') }}</span>
                    <strong>{{ formatNumber(summary.total) }}</strong>
                </div>
                <div class="summary-item">
                    <span>{{ t('slowQuery.summary.threshold') }}</span>
                    <strong>{{ formatSlowThreshold(summary.slowerThan) }}</strong>
                </div>
                <div class="summary-item">
                    <span>{{ t('slowQuery.summary.maxLen') }}</span>
                    <strong>{{ formatNullableNumber(summary.maxLen) }}</strong>
                </div>
                <div class="summary-item">
                    <span>{{ t('slowQuery.summary.loaded') }}</span>
                    <strong>{{ formatNumber(rows.length) }}</strong>
                </div>
            </div>

            <div class="table-shell">
                <el-table
                    v-if="rows.length > 0"
                    :data="rows"
                    height="100%"
                    size="small"
                    class="slow-query-table"
                >
                    <el-table-column prop="id" :label="t('slowQuery.table.id')" width="82"/>
                    <el-table-column :label="t('slowQuery.table.time')" width="120">
                        <template #default="{ row }">
                            <span>{{ formatTimestamp(row.timestamp) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('slowQuery.table.duration')" width="104" align="right">
                        <template #default="{ row }">
                            <span class="duration-text">{{ formatDuration(row.durationMicroseconds) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('slowQuery.table.command')" min-width="320">
                        <template #default="{ row }">
                            <span class="command-text">{{ row.command || '-' }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="clientAddress" :label="t('slowQuery.table.client')" width="150" show-overflow-tooltip>
                        <template #default="{ row }">
                            <span>{{ row.clientAddress || '-' }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('slowQuery.table.actions')" width="76" align="center" fixed="right">
                        <template #default="{ row }">
                            <el-tooltip :content="t('slowQuery.copyCommand')" placement="top" :show-after="200">
                                <el-button class="copy-btn" :icon="Copy" text @click="handleCopyCommand(row.command)"/>
                            </el-tooltip>
                        </template>
                    </el-table-column>
                </el-table>

                <div v-else-if="loading" class="table-loading-placeholder"></div>

                <el-empty v-else :description="t('slowQuery.empty')"/>
            </div>
        </div>
    </el-drawer>
</template>

<script setup>
import {computed, ref} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import {Copy, Delete, HistoryQuery, Refresh} from '@icon-park/vue-next'
import {useI18n} from '../../i18n/index.js'

const DEFAULT_COUNT = 128

// 组件入参：由 KeyListPanel 控制抽屉显示，并传入当前连接信息。
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
    }
})

// 对外事件：同步 v-model:visible。
const emit = defineEmits(['update:visible'])

// 国际化读取函数：驱动慢查询抽屉标题、工具栏、表格和反馈文案。
const {t} = useI18n()

// 抽屉可见状态代理：保持父组件 v-model 和 Element Plus Drawer 状态一致。
const drawerVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
})

// 慢日志读取数量选项：SLOWLOG GET count 读取最近 count 条记录。
const countOptions = [64, 128, 256, 512]
const queryCount = ref(DEFAULT_COUNT)

// 加载和重置状态：分别控制刷新、首次打开加载和清空慢日志操作。
const loading = ref(false)
const resetting = ref(false)

// 慢查询日志行数据：由 main 进程读取 SLOWLOG GET 后结构化返回。
const rows = ref([])

// 慢日志摘要：包括实例级总数、阈值和最大保留长度。
const summary = ref({
    total: 0,
    slowerThan: null,
    maxLen: null
})

/**
 * 格式化整数。
 * @param {number} value 原始数值
 * @returns {string} 带千分位的文本
 */
const formatNumber = (value) => Number(value || 0).toLocaleString()

/**
 * 格式化可能缺失的数值。
 * @param {number|null} value 原始数值
 * @returns {string} 数值文本或占位符
 */
const formatNullableNumber = (value) => {
    if (!Number.isFinite(Number(value))) {
        return '-'
    }

    return formatNumber(value)
}

/**
 * 格式化慢查询阈值。
 * Redis slowlog-log-slower-than 单位是微秒，-1 表示禁用慢日志，0 表示记录所有命令。
 * @param {number|null} microseconds 阈值微秒数
 * @returns {string} 人性化阈值文本
 */
const formatSlowThreshold = (microseconds) => {
    const value = Number(microseconds)
    if (!Number.isFinite(value)) {
        return '-'
    }

    if (value < 0) {
        return t('slowQuery.thresholdDisabled')
    }

    if (value === 0) {
        return t('slowQuery.thresholdAll')
    }

    return formatDuration(value)
}

/**
 * 格式化慢查询耗时。
 * @param {number} microseconds Redis 返回的微秒耗时
 * @returns {string} ms/us 文本
 */
const formatDuration = (microseconds) => {
    const value = Number(microseconds) || 0
    if (value < 1000) {
        return `${value} us`
    }

    return `${(value / 1000).toFixed(value >= 100000 ? 0 : 2)} ms`
}

/**
 * 格式化 Redis 慢日志时间戳。
 * @param {number} seconds Unix 秒级时间戳
 * @returns {string} 本地时间文本
 */
const formatTimestamp = (seconds) => {
    const value = Number(seconds)
    if (!Number.isFinite(value) || value <= 0) {
        return '-'
    }

    return new Date(value * 1000).toLocaleString()
}

/**
 * 拉取慢查询日志。
 * SLOWLOG 是实例级能力，不区分当前 DB；CONFIG 权限不足时 main 会返回空配置。
 */
const fetchSlowLog = async () => {
    if (!props.connectionId || loading.value) {
        return
    }

    loading.value = true

    try {
        const response = await window.api.redis.getSlowLog(props.connectionId, {
            count: queryCount.value
        })

        if (!response.success) {
            ElMessage.error(`${t('slowQuery.messages.loadFail')}: ${response.error || t('common.unknownError')}`)
            return
        }

        rows.value = response.data?.items || []
        summary.value = {
            total: response.data?.total || 0,
            slowerThan: response.data?.config?.slowerThan ?? null,
            maxLen: response.data?.config?.maxLen ?? null
        }
    } catch (error) {
        ElMessage.error(`${t('slowQuery.messages.loadFail')}: ${error.message || error}`)
    } finally {
        loading.value = false
    }
}

/**
 * 清空慢查询日志。
 * 该操作会执行 SLOWLOG RESET，影响整个 Redis 实例，需要二次确认。
 */
const handleResetSlowLog = async () => {
    if (!props.connectionId || resetting.value) {
        return
    }

    try {
        await ElMessageBox.confirm(
            t('slowQuery.confirm.resetMessage'),
            t('slowQuery.confirm.resetTitle'),
            {
                confirmButtonText: t('slowQuery.confirm.resetConfirm'),
                cancelButtonText: t('common.cancel'),
                type: 'warning',
                confirmButtonClass: 'el-button--danger'
            }
        )

        resetting.value = true
        const response = await window.api.redis.resetSlowLog(props.connectionId)

        if (!response.success) {
            ElMessage.error(`${t('slowQuery.messages.resetFail')}: ${response.error || t('common.unknownError')}`)
            return
        }

        ElMessage.success(t('slowQuery.messages.resetSuccess'))
        await fetchSlowLog()
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(`${t('slowQuery.messages.resetFail')}: ${error.message || error}`)
        }
    } finally {
        resetting.value = false
    }
}

/**
 * 复制慢查询命令文本。
 * @param {string} command 命令文本
 */
const handleCopyCommand = async (command) => {
    if (!command) {
        return
    }

    try {
        await navigator.clipboard.writeText(command)
        ElMessage.success(t('slowQuery.messages.copySuccess'))
    } catch (error) {
        ElMessage.error(`${t('slowQuery.messages.copyFail')}: ${error.message || error}`)
    }
}

/**
 * 抽屉打开后再加载慢查询，避免用户只是展开顶部菜单时触发 Redis 请求。
 */
const handleDrawerOpened = () => {
    fetchSlowLog()
}
</script>

<style scoped>
/* 抽屉标题：图标和标题文字保持居中对齐。 */
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

/* 抽屉主体：纵向布局，让表格区域撑满剩余空间。 */
.slow-query-drawer {
    display: flex;
    height: 100%;
    min-height: 0;
    padding: 20px;
    box-sizing: border-box;
    flex-direction: column;
}

/* 顶部工具栏：左侧连接信息，右侧数量选择、刷新和清空操作。 */
.query-toolbar {
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

.instance-tip {
    margin-top: 4px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.toolbar-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    align-items: center;
}

.count-select {
    width: 116px;
}

/* 摘要区域：展示慢日志配置和加载概况。 */
.summary-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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

/* 表格容器：固定边框和圆角，内部交给 el-table 滚动。 */
.table-shell {
    flex: 1;
    min-height: 0;
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    overflow: hidden;
}

.slow-query-table {
    width: 100%;
    height: 100%;
}

.table-loading-placeholder {
    width: 100%;
    height: 100%;
}

.duration-text {
    color: var(--el-color-warning);
    font-weight: 600;
}

.command-text {
    display: block;
    overflow: hidden;
    font-family: Consolas, Monaco, monospace;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.copy-btn {
    width: 28px;
    height: 28px;
    padding: 0;
}
</style>
