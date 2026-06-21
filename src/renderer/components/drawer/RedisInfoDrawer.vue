<!--
    RedisInfoDrawer.vue
    描述：Redis 服务器详情抽屉。展示 INFO 摘要、ECharts 图表和完整 INFO 字段表格。
 -->
<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { use } from 'echarts/core'
import { BarChart, GaugeChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { ElMessage } from 'element-plus'
import { Cpu, DashboardOne, DatabaseSearch, Info, LinkThree, Refresh, Search, Server } from '@icon-park/vue-next'
import { useI18n } from '../../i18n/index.js'

use([BarChart, GaugeChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

// 组件入参：由 PageHeader 控制抽屉显示，并传入当前连接 ID 与连接名称。
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

// 国际化文案读取函数：驱动 Redis 详情抽屉、图表和表格文案。
const { t } = useI18n()

// 抽屉可见性代理：透传 Element Plus Drawer 的显示状态。
const drawerVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
})

// INFO 加载状态：控制刷新按钮 loading 和内容区域 loading。
const loading = ref(false)

// INFO 完整数据：来自 main 进程 getServerInfo 的增强返回结构。
const serverInfo = ref(null)

// INFO 表格搜索关键字：仅在前端过滤当前已加载数据。
const searchText = ref('')

// 图表渲染开关：等待 Drawer 完全打开后再挂载 ECharts，避免容器宽高为 0 的警告。
const chartReady = ref(false)

// INFO 字段映射：便于概览区按 key 快速读取字段值。
const infoMap = computed(() => {
    const map = new Map()
    for (const row of serverInfo.value?.rows || []) {
        map.set(row.key, row.value)
    }
    return map
})

// INFO 全量表格数据：按 section/key/value 展示。
const infoRows = computed(() => serverInfo.value?.rows || [])

// 搜索后的 INFO 表格数据：匹配 section、key 或 value。
const filteredInfoRows = computed(() => {
    const keyword = searchText.value.trim().toLowerCase()
    if (!keyword) {
        return infoRows.value
    }

    return infoRows.value.filter((row) => {
        return String(row.section).toLowerCase().includes(keyword)
            || String(row.key).toLowerCase().includes(keyword)
            || String(row.value).toLowerCase().includes(keyword)
    })
})

// Keyspace 图表数据：按 DB 展示 Key 数量。
const keyspaceRows = computed(() => serverInfo.value?.summary?.keyspace || [])

// 概览卡片：挑选用户最关心的版本、模式、运行时间和角色信息。
const overviewCards = computed(() => [
    {
        label: t('redisInfo.overview.version'),
        value: getInfoValue('redis_version') || '-',
        icon: Server
    },
    {
        label: t('redisInfo.overview.mode'),
        value: getInfoValue('redis_mode') || getInfoValue('role') || '-',
        icon: Info
    },
    {
        label: t('redisInfo.overview.uptime'),
        value: t('redisInfo.overview.uptimeDays').replace('{value}', getInfoValue('uptime_in_days') || 0),
        icon: Refresh
    },
    {
        label: t('redisInfo.overview.clients'),
        value: getInfoValue('connected_clients') || '0',
        icon: DatabaseSearch
    }
])

// 状态信息：用于状态分区展示 Redis 运行模式、角色、系统和配置摘要。
const statusItems = computed(() => [
    { label: t('redisInfo.status.role'), value: getInfoValue('role') || '-' },
    { label: t('redisInfo.status.processId'), value: getInfoValue('process_id') || '-' },
    { label: t('redisInfo.status.port'), value: getInfoValue('tcp_port') || '-' },
    { label: t('redisInfo.status.configFile'), value: getInfoValue('config_file') || '-' },
    { label: t('redisInfo.status.system'), value: getInfoValue('os') || '-' },
    { label: t('redisInfo.status.arch'), value: `${getInfoValue('arch_bits') || '-'} bit` },
    { label: t('redisInfo.status.eventLoop'), value: getInfoValue('eventloop') || '-' },
    { label: t('redisInfo.status.clusterStatus'), value: getInfoValue('cluster_enabled') === '1' ? t('redisInfo.status.enabled') : t('redisInfo.status.disabled') }
])

// 内存信息：用于内存分区展示 Redis 内存占用与碎片率。
const memoryItems = computed(() => [
    { label: t('redisInfo.memory.used'), value: getInfoValue('used_memory_human') || formatBytes(getInfoNumber('used_memory')) },
    { label: t('redisInfo.memory.peak'), value: getInfoValue('used_memory_peak_human') || formatBytes(getInfoNumber('used_memory_peak')) },
    { label: t('redisInfo.memory.rss'), value: getInfoValue('used_memory_rss_human') || formatBytes(getInfoNumber('used_memory_rss')) },
    { label: t('redisInfo.memory.max'), value: getInfoNumber('maxmemory') > 0 ? formatBytes(getInfoNumber('maxmemory')) : t('redisInfo.memory.unlimited') },
    { label: t('redisInfo.memory.fragmentation'), value: getInfoValue('mem_fragmentation_ratio') || '-' },
    { label: t('redisInfo.memory.policy'), value: getInfoValue('maxmemory_policy') || '-' }
])

// CPU 信息：展示累计 CPU 和本次采样计算出的近似使用率。
const cpuItems = computed(() => [
    { label: t('redisInfo.cpu.usage'), value: `${serverInfo.value?.cpuUsage ?? 0}%` },
    { label: t('redisInfo.cpu.system'), value: getInfoValue('used_cpu_sys') || '0' },
    { label: t('redisInfo.cpu.user'), value: getInfoValue('used_cpu_user') || '0' },
    { label: t('redisInfo.cpu.childSystem'), value: getInfoValue('used_cpu_sys_children') || '0' },
    { label: t('redisInfo.cpu.childUser'), value: getInfoValue('used_cpu_user_children') || '0' }
])

// CPU 仪表盘：展示当前采样区间内的 CPU 使用率。
const cpuChartOption = computed(() => ({
    tooltip: { formatter: '{a}<br/>{b}: {c}%' },
    series: [
        {
            name: 'CPU',
            type: 'gauge',
            min: 0,
            max: 100,
            progress: { show: true, width: 10 },
            axisLine: { lineStyle: { width: 10 } },
            axisTick: { show: false },
            splitLine: { length: 8 },
            detail: { formatter: '{value}%', fontSize: 16 },
            data: [{ value: Number(serverInfo.value?.cpuUsage || 0), name: t('redisInfo.cpu.usageRate') }]
        }
    ]
}))

// 内存图表：有 maxmemory 时展示使用/剩余；未限制时展示 used/rss/peak 的占比视图。
const memoryChartOption = computed(() => {
    const usedMemory = getInfoNumber('used_memory')
    const maxMemory = getInfoNumber('maxmemory')
    const rssMemory = getInfoNumber('used_memory_rss')
    const peakMemory = getInfoNumber('used_memory_peak')
    const data = maxMemory > 0
        ? [
            { name: t('redisInfo.memory.used'), value: usedMemory },
            { name: t('redisInfo.memory.free'), value: Math.max(maxMemory - usedMemory, 0) }
        ]
        : [
            { name: t('redisInfo.memory.used'), value: usedMemory },
            { name: 'RSS', value: rssMemory },
            { name: t('redisInfo.memory.peak'), value: peakMemory }
        ]

    return {
        tooltip: {
            trigger: 'item',
            formatter: (params) => `${params.name}: ${formatBytes(params.value)}`
        },
        legend: { bottom: 0, itemWidth: 10, itemHeight: 10 },
        series: [
            {
                type: 'pie',
                radius: ['46%', '70%'],
                center: ['50%', '42%'],
                avoidLabelOverlap: true,
                label: { formatter: '{b}' },
                data
            }
        ]
    }
})

// Keyspace 图表：展示各 DB 的 Key 数量，没有 Key 时展示空数组。
const keyspaceChartOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: 36, right: 16, top: 20, bottom: 28 },
    xAxis: {
        type: 'category',
        data: keyspaceRows.value.map((row) => row.db)
    },
    yAxis: { type: 'value' },
    series: [
        {
            type: 'bar',
            barMaxWidth: 28,
            data: keyspaceRows.value.map((row) => row.keys)
        }
    ]
}))

/**
 * 获取 INFO 字段原始字符串值。
 * @param {string} key INFO 字段名
 * @returns {string} 字段值
 */
const getInfoValue = (key) => String(infoMap.value.get(key) ?? '')

/**
 * 获取 INFO 字段数字值。
 * @param {string} key INFO 字段名
 * @returns {number} 数字值
 */
const getInfoNumber = (key) => {
    const value = Number(infoMap.value.get(key))
    return Number.isFinite(value) ? value : 0
}

/**
 * 将字节数格式化为人类可读单位。
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的容量
 */
const formatBytes = (bytes) => {
    const value = Number(bytes)
    if (!Number.isFinite(value) || value <= 0) {
        return '0 B'
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = value
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex += 1
    }

    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

/**
 * 拉取 Redis INFO 完整信息。
 */
const fetchRedisInfo = async () => {
    if (!props.connectionId) {
        return
    }

    loading.value = true
    try {
        const result = await window.api.redis.getServerInfo(props.connectionId)
        if (!result.success) {
            ElMessage.error(t('redisInfo.fetchFail') + (result.error || t('redisInfo.unknownError')))
            return
        }

        serverInfo.value = result.data
    } catch (error) {
        ElMessage.error(t('redisInfo.fetchFail') + (error.message || error))
    } finally {
        loading.value = false
    }
}

/**
 * 关闭抽屉。
 */
const closeDrawer = () => {
    drawerVisible.value = false
    chartReady.value = false
}

/**
 * Drawer 打开动画完成后再渲染图表。
 */
const handleDrawerOpened = async () => {
    await nextTick()
    requestAnimationFrame(() => {
        chartReady.value = true
    })
}

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            searchText.value = ''
            fetchRedisInfo()
        }
    }
)
</script>

<template>
    <el-drawer
        :model-value="drawerVisible"
        size="62%"
        direction="rtl"
        :with-header="true"
        :style="{
            top: '40px',
            height: 'calc(100vh - 40px)'
        }"
        @opened="handleDrawerOpened"
        @close="closeDrawer"
    >
        <template #header>
            <!-- Drawer 头部：只展示当前连接名称，操作入口放到内容区。 -->
            <div class="drawer-header">
                <div class="drawer-title">
                    <el-icon class="drawer-header-icon">
                        <Server />
                    </el-icon>
                    <div class="drawer-title-text">
                        <el-text size="large">{{ t('redisInfo.title') }}</el-text>
                    </div>
                </div>
            </div>
        </template>

        <div class="drawer-content" v-loading="loading">
            <el-scrollbar>
                <div class="content-inner">
                    <!-- 内容操作栏：刷新属于详情内容操作，不放在 Drawer header。 -->
                    <div class="content-toolbar">
                        <span class="connection-title">
                            <LinkThree class="connection-title-icon" />
                            <span>{{ connectionName || t('redisInfo.currentConnection') }}</span>
                        </span>
                        <el-button :icon="Refresh" :loading="loading" plain @click="fetchRedisInfo">
                            {{ t('redisInfo.refresh') }}
                        </el-button>
                    </div>

                    <!-- 概览卡片：展示 Redis 版本、模式、运行时间和客户端数。 -->
                    <div class="overview-grid">
                        <div v-for="item in overviewCards" :key="item.label" class="overview-card">
                            <el-icon class="overview-icon">
                                <component :is="item.icon" />
                            </el-icon>
                            <div class="overview-text">
                                <span class="overview-label">{{ item.label }}</span>
                                <strong class="overview-value">{{ item.value }}</strong>
                            </div>
                        </div>
                    </div>

                    <!-- 图表区域：CPU、内存和 Keyspace 以可视化方式展示。 -->
                    <div class="chart-grid">
                        <div class="chart-panel">
                            <div class="panel-title">
                                <Cpu />
                                <span>{{ t('redisInfo.sections.cpu') }}</span>
                            </div>
                            <VChart v-if="chartReady" class="chart" :option="cpuChartOption" autoresize />
                        </div>

                        <div class="chart-panel">
                            <div class="panel-title">
                                <DashboardOne />
                                <span>{{ t('redisInfo.sections.memory') }}</span>
                            </div>
                            <VChart v-if="chartReady" class="chart" :option="memoryChartOption" autoresize />
                        </div>

                        <div class="chart-panel">
                            <div class="panel-title">
                                <DatabaseSearch />
                                <span>{{ t('redisInfo.sections.keyspace') }}</span>
                            </div>
                            <VChart v-if="chartReady" class="chart" :option="keyspaceChartOption" autoresize />
                        </div>
                    </div>

                    <!-- 指标详情：将状态、内存、CPU 常用字段分组展示。 -->
                    <div class="info-section-grid">
                        <div class="info-section">
                            <h3>{{ t('redisInfo.sections.status') }}</h3>
                            <div v-for="item in statusItems" :key="item.label" class="info-item">
                                <span>{{ item.label }}</span>
                                <strong>{{ item.value }}</strong>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>{{ t('redisInfo.sections.memory') }}</h3>
                            <div v-for="item in memoryItems" :key="item.label" class="info-item">
                                <span>{{ item.label }}</span>
                                <strong>{{ item.value }}</strong>
                            </div>
                        </div>

                        <div class="info-section">
                            <h3>{{ t('redisInfo.sections.cpu') }}</h3>
                            <div v-for="item in cpuItems" :key="item.label" class="info-item">
                                <span>{{ item.label }}</span>
                                <strong>{{ item.value }}</strong>
                            </div>
                        </div>
                    </div>

                    <!-- 完整 INFO 表格：保留 Redis INFO ALL 的所有字段，支持本地搜索。 -->
                    <div class="info-table-panel">
                        <div class="table-toolbar">
                            <div>
                                <h3>{{ t('redisInfo.sections.infoAll') }}</h3>
                                <span>{{ filteredInfoRows.length }} / {{ infoRows.length }}</span>
                            </div>
                            <el-input
                                v-model="searchText"
                                class="info-search-input"
                                clearable
                                :placeholder="t('redisInfo.table.searchPlaceholder')"
                            >
                                <template #prefix>
                                    <el-icon><Search /></el-icon>
                                </template>
                            </el-input>
                        </div>

                        <el-table
                            class="info-table"
                            :data="filteredInfoRows"
                            height="360"
                            border
                            :empty-text="t('redisInfo.table.empty')"
                        >
                            <el-table-column prop="section" :label="t('redisInfo.table.section')" width="150" show-overflow-tooltip />
                            <el-table-column prop="key" :label="t('redisInfo.table.key')" min-width="220" show-overflow-tooltip />
                            <el-table-column prop="value" :label="t('redisInfo.table.value')" min-width="320" show-overflow-tooltip />
                        </el-table>
                    </div>
                </div>
            </el-scrollbar>
        </div>
    </el-drawer>
</template>

<style scoped>
/* Drawer 头部：左侧标题信息，右侧刷新按钮。 */
.drawer-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.drawer-title {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.drawer-header-icon {
    font-size: 24px;
    color: var(--el-color-primary);
}

.drawer-title-text {
    display: flex;
    min-width: 0;
}

/* Drawer 内容：右侧抽屉内部独立滚动，避免影响窗口级滚动条。 */
.drawer-content {
    height: 100%;
    padding: 20px 0 20px 20px;
    overflow: hidden;
}

.content-inner {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding-right: 20px;
    padding-bottom: 24px;
}

/* 内容操作栏：承载刷新等内容级操作，靠右展示且不占用 Drawer header。 */
.content-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.connection-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.connection-title-icon {
    flex-shrink: 0;
    color: var(--el-color-primary);
    font-size: 15px;
}

.connection-title span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 概览卡片：四列展示高频指标。 */
.overview-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
}

.overview-card {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    background: var(--el-bg-color-overlay);
}

.overview-icon {
    flex-shrink: 0;
    font-size: 24px;
    color: var(--el-color-primary);
}

.overview-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.overview-label {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.overview-value {
    overflow: hidden;
    color: var(--el-text-color-primary);
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 图表区：CPU、内存、Keyspace 三块等宽排列。 */
.chart-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.chart-panel,
.info-section,
.info-table-panel {
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    background: var(--el-bg-color-overlay);
}

.chart-panel {
    min-height: 260px;
    padding: 14px;
}

.panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--el-text-color-primary);
    font-weight: 600;
    line-height: 1;
}

/* 图表标题图标：覆盖 icon-park 默认 inline 对齐，避免图标视觉上偏高。 */
.panel-title :deep(.i-icon) {
    display: inline-flex;
    align-items: center;
    line-height: 1;
}

.chart {
    width: 100%;
    height: 210px;
}

/* 指标分组：状态、内存、CPU 三栏展示，便于快速扫读。 */
.info-section-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.info-section {
    padding: 14px;
}

.info-section h3,
.info-table-panel h3 {
    margin: 0;
    color: var(--el-text-color-primary);
    font-size: 15px;
}

.info-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 10px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.info-item:last-child {
    border-bottom: none;
}

.info-item span {
    flex-shrink: 0;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.info-item strong {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 500;
    text-align: right;
}

/* INFO 表格：保留完整字段，并在顶部提供本地搜索。 */
.info-table-panel {
    padding: 14px;
}

.table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
}

.table-toolbar > div {
    display: flex;
    align-items: baseline;
    gap: 10px;
}

.table-toolbar span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.info-search-input {
    width: 280px;
}

.info-table :deep(.el-table__cell) {
    vertical-align: top;
}

@media (max-width: 1280px) {
    .overview-grid,
    .chart-grid,
    .info-section-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>
