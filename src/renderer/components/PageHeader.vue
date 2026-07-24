<!--
    PageHeader.vue
    描述：连接页头部工具栏。展示侧边栏折叠入口、当前 DB、刷新按钮和连接运行指标。
 -->
<template>
    <div class="page-header-panel">
        <div class="left">
            <div class="menu-item collapse" @click="()=> eventBus.emit('toggle-side-bar-collapse')">
                <el-icon :size="20" style="color: var(--el-text-color-primary)">
                    <MenuFoldOne v-if="sideCollapseState"/>
                    <MenuUnfoldOne v-else/>
                </el-icon>
            </div>
            <div class="menu-item">
                <el-breadcrumb separator="/">
                    <el-breadcrumb-item>
                        {{ currOpenedConnectionConfig.group_name }}
                    </el-breadcrumb-item>
                    <el-breadcrumb-item>
                        {{ currOpenedConnectionConfig.name }} ({{ currOpenedConnectionConfig.host }}:{{ currOpenedConnectionConfig.port }})
                    </el-breadcrumb-item>
                </el-breadcrumb>
            </div>
            <div class="menu-item">
                <el-select
                    v-model="dbValue"
                    popper-class="page-header-db-popper"
                    :disabled="currOpenedConnectionConfig.status !== 'connected'"
                    size="small"
                    style="width: 120px"
                    @change="handleDbValueChange"
                >
                    <el-option
                        v-for="item in dbOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    >
                        <!-- DB 下拉项：左侧显示 DB 名称，右侧显示当前库 Key 数量。 -->
                        <div class="db-option-content">
                            <span class="db-option-label">{{ item.label }}</span>
                            <span class="db-option-size">({{ formatDbSize(item.size) }})</span>
                        </div>
                    </el-option>
                </el-select>
            </div>
        </div>
        <div class="right">
            <div class="menu-item">
                <el-tooltip :content="t('pageHeader.tooltips.refresh')" placement="bottom" :show-after="200" :offset="12">
                    <button class="ctrl" @click="handleRefresh">
                        <el-icon class="icon">
                            <Refresh/>
                        </el-icon>
                    </button>
                </el-tooltip>
            </div>
            <div class="menu-item">
                <el-tooltip :content="t('pageHeader.tooltips.command')" placement="bottom" :show-after="200" :offset="12">
                    <button class="ctrl" @click="() => eventBus.emit('open-command', currOpenedConnectionConfig)">
                        <el-icon class="icon">
                            <CodeOne/>
                        </el-icon>
                    </button>
                </el-tooltip>
            </div>
            <div class="menu-item">
                <el-text>|</el-text>
            </div>
            <div class="menu-item">
                <el-tooltip :content="t('pageHeader.tooltips.connectionCount')" placement="bottom" :show-after="200" :offset="12">
                    <span class="performance">
                        <el-icon size="20" class="icon"><AddUser/></el-icon>
                        <el-text v-if="currOpenedConnectionConfig.status === 'connected'">{{ serverSummary.connectionCount }}</el-text>
                    </span>
                </el-tooltip>
            </div>
            <div class="menu-item">
                <el-text>|</el-text>
            </div>
            <div class="menu-item">
                <el-tooltip :content="t('pageHeader.tooltips.cpuUsage')" placement="bottom" :show-after="200" :offset="12">
                    <span class="performance">
                        <el-icon size="20" class="icon"><Cpu/></el-icon>
                        <el-text v-if="currOpenedConnectionConfig.status === 'connected'">{{ serverSummary.cpuUsage }}%</el-text>
                    </span>
                </el-tooltip>
            </div>
            <div class="menu-item">
                <el-text>|</el-text>
            </div>
            <div class="menu-item">
                <el-tooltip :content="t('pageHeader.tooltips.memoryUsage')" placement="bottom" :show-after="200" :offset="12">
                    <span class="performance">
                        <el-icon size="20" class="icon"><DashboardOne/></el-icon>
                        <el-text v-if="currOpenedConnectionConfig.status === 'connected'">{{ serverSummary.memoryUsage }}</el-text>
                    </span>
                </el-tooltip>
            </div>
            <div class="menu-item">
                <el-text>|</el-text>
            </div>
            <div class="menu-item">
                <el-tooltip :content="t('pageHeader.tooltips.totalKeys')" placement="bottom" :show-after="200" :offset="12">
                    <span class="performance">
                        <el-icon size="20" class="icon"><Key/></el-icon>
                        <el-text v-if="currOpenedConnectionConfig.status === 'connected'">{{ serverSummary.totalKeys }}</el-text>
                    </span>
                </el-tooltip>
            </div>
            <div class="menu-item">
                <el-text>|</el-text>
            </div>
            <el-tooltip :content="t('pageHeader.tooltips.redisInfo')" placement="bottom" :show-after="200" :offset="6">
                <div class="menu-item more" @click="handleOpenRedisInfo">
                    <span class="performance-more"><el-text>{{ t('pageHeader.more') }}</el-text></span>
                </div>
            </el-tooltip>
        </div>
    </div>

    <!-- Redis 详情抽屉：从头部更多入口打开，展示 INFO 摘要、图表和全量字段。 -->
    <RedisInfoDrawer
        v-model:visible="redisInfoDrawerVisible"
        :connection-id="activeConnectionConfigId"
        :connection-name="`${currOpenedConnectionConfig.name || ''} (${currOpenedConnectionConfig.host || '-'}:${currOpenedConnectionConfig.port || '-'})`"
    />
</template>

<script setup>
import {AddUser, CodeOne, Cpu, DashboardOne, Key, MenuFoldOne, MenuUnfoldOne, Refresh} from '@icon-park/vue-next'

import {storeToRefs} from 'pinia'
import {computed, ref, watch} from 'vue'
import {ElMessage} from 'element-plus'
import {useI18n} from '../i18n/index.js'
import {eventBus} from '../utils/eventBus.js'
import {buildDbOptions, buildDbSizeMap, DEFAULT_DATABASE_COUNT, formatDbSize, normalizeDatabaseCount} from '../utils/redisDatabaseOptionUtil.js'
import {useConnectionConfigsStore} from '../stores/modules/connectionConfigsStore.js'
import {useUserSettingsStore} from '../stores/modules/userSettingsStore.js'
import RedisInfoDrawer from './drawer/RedisInfoDrawer.vue'

// 国际化文案读取函数：驱动页头按钮提示和连接操作反馈消息。
const {t} = useI18n()

// 用户设置 store：读取侧边栏折叠状态，用于切换头部折叠按钮图标。
const {sideCollapseState} = storeToRefs(useUserSettingsStore())
// 连接配置 store：读取当前活动连接和连接 ID，驱动 DB 选择、刷新和性能指标展示。
const {activeConnectionConfigId, currOpenedConnectionConfig} = storeToRefs(useConnectionConfigsStore())
// 当前头部 DB 下拉框绑定值：需要和活动连接的 db_index 保持同步。
const dbValue = ref('0');
// 各 DB 的 Key 数量：来自 INFO Keyspace，用于 DB 下拉列表右侧展示 DBSize。
const dbSizeMap = ref({})
// Redis 实际数据库数量：优先来自后端 CONFIG GET databases，失败时保持默认 16。
const databaseCount = ref(DEFAULT_DATABASE_COUNT)
// 当前活动连接的服务器摘要：只服务 PageHeader 展示，不写入持久配置或页签运行快照。
const serverSummary = ref({
    connectionCount: '0',
    cpuUsage: 0,
    memoryUsage: '0',
    totalKeys: '0'
})
// 摘要请求序号：快速切换连接时只允许最新请求更新当前页头。
let serverSummaryRequestId = 0
// Redis 详情抽屉显示状态：点击头部“更多”按钮后从右侧打开。
const redisInfoDrawerVisible = ref(false)
// DB 下拉选项：按 Redis 实际数据库数量生成，并合并实时 Keyspace 数量。
const dbOptions = computed(() => buildDbOptions(databaseCount.value, dbSizeMap.value))

/**
 * 清空当前页头的服务器摘要。
 * 切换连接或连接断开时立即调用，避免短暂展示上一条连接的数据。
 */
const resetServerSummary = () => {
    serverSummary.value = {
        connectionCount: '0',
        cpuUsage: 0,
        memoryUsage: '0',
        totalKeys: '0'
    }
}

// 监听当前活动连接的 db_index：切换连接页签或切库后，同步更新头部下拉显示值。
watch(
    () => currOpenedConnectionConfig.value?.db_index,
    (nextDbIndex) => {
        dbValue.value = String(nextDbIndex ?? 0)
    },
    {immediate: true}
)

/**
 * 同步 INFO Keyspace 中各 DB 的 Key 数量。
 * Redis INFO 只返回非空 DB，未出现的 DB 在页面上按 0 展示。
 */
const updateDbSizeMap = (keyspace = []) => {
    dbSizeMap.value = buildDbSizeMap(keyspace)
}

/**
 * 同步 Redis 实际 DB 数量。
 * 后端无法读取 CONFIG 时会返回默认 16，这里仍做一次前端兜底，保证下拉列表始终可用。
 */
const updateDatabaseCount = (count) => {
    const currentDbIndex = Number(currOpenedConnectionConfig.value?.db_index) || 0

    databaseCount.value = normalizeDatabaseCount(count, currentDbIndex)
}

/**
 * 数据库索引值改变事件
 */
const handleDbValueChange = async (value) => {
    const connectionId = activeConnectionConfigId.value
    const connectionConfig = currOpenedConnectionConfig.value
    const oldDbIndex = connectionConfig.db_index

    try {
        // 将字符串转换为整数
        const dbIndex = parseInt(value, 10);

        // 更新数据库中的 db_index（使用专门的方法，避免完整验证）
        const result = await window.api.redis.selectDatabase(connectionId, dbIndex);

        // 更新打开的连接的数据库索引
        if (result.success) {
            connectionConfig.db_index = dbIndex;

            // 切换请求完成前若用户已打开其他连接，只更新原连接配置，不污染当前页头。
            if (connectionId !== activeConnectionConfigId.value) {
                return
            }

            ElMessage.success(t('pageHeader.messages.switchDbSuccess').replace('{value}', `DB ${dbIndex}`));
            // 切换库后刷新当前 DB 的 Key 数和页面运行摘要。
            await fetchServerSummary()
        } else {
            if (connectionId !== activeConnectionConfigId.value) {
                return
            }

            ElMessage.error(`${t('pageHeader.messages.switchDbFail')}: ${result.error}`);
            // 恢复旧值
            dbValue.value = String(oldDbIndex);
        }
    } catch (error) {
        if (connectionId !== activeConnectionConfigId.value) {
            return
        }

        ElMessage.error(`${t('pageHeader.messages.updateDbIndexFail')}: ${error.message || error}`);

        // 恢复旧值
        dbValue.value = String(oldDbIndex);
    }
}

/**
 * 刷新当前连接
 */
const handleRefresh = async () => {
    if (currOpenedConnectionConfig.value.status !== 'connected') {
        ElMessage.warning(t('pageHeader.messages.connectFirst'));
        return;
    }

    const connectionId = activeConnectionConfigId.value
    await fetchServerSummary();

    // 刷新期间切换连接时，旧操作不应重置新连接的 Key 列表与详情区。
    if (connectionId !== activeConnectionConfigId.value) {
        return
    }

    // 顶部刷新不仅更新连接指标，也需要重置当前激活连接页的 Key 列表与详情区。
    eventBus.emit('reset-page-info', {
        tabId: connectionId
    })
}

/**
 * 打开Redis详情
 */
const handleOpenRedisInfo = () => {
    if (currOpenedConnectionConfig.value.status !== 'connected') {
        ElMessage.warning(t('pageHeader.messages.connectFirst'));
        return;
    }

    redisInfoDrawerVisible.value = true
}

/**
 * 获取页面 Header 使用的 Redis 运行摘要。
 * 请求期间若切换了连接，旧连接返回的数据会被忽略。
 */
const fetchServerSummary = async () => {
    if (currOpenedConnectionConfig.value.status !== 'connected') {
        return
    }

    const connectionId = activeConnectionConfigId.value
    const requestId = ++serverSummaryRequestId

    try {
        const result = await window.api.redis.getServerSummary(connectionId)
        if (requestId !== serverSummaryRequestId || connectionId !== activeConnectionConfigId.value) {
            return
        }

        if (result.success && result.data) {
            updateDatabaseCount(result.data.databaseCount)
            updateDbSizeMap(result.data.summary?.keyspace)
            serverSummary.value = {
                connectionCount: formatDbSize(result.data.connectedClients),
                cpuUsage: result.data.cpuUsage,
                memoryUsage: result.data.usedMemoryHuman,
                totalKeys: formatDbSize(result.data.totalKeys)
            }
        }
    } catch (error) {
        if (requestId !== serverSummaryRequestId || connectionId !== activeConnectionConfigId.value) {
            return
        }
        ElMessage.error(`${t('pageHeader.messages.fetchServerInfoFail')}: ${error.message || error}`)
    }
}

// 切换连接页签或连接状态变化时刷新 DBSize，避免下拉列表短暂展示上一个连接的 Keyspace。
watch(
    () => [activeConnectionConfigId.value, currOpenedConnectionConfig.value?.status],
    ([, status]) => {
        // 连接或状态变化后立即让上一轮异步请求失效，防止旧数据覆盖新页签。
        serverSummaryRequestId += 1
        const currentDbIndex = Number(currOpenedConnectionConfig.value?.db_index) || 0
        dbSizeMap.value = {}
        databaseCount.value = Math.max(DEFAULT_DATABASE_COUNT, currentDbIndex + 1)
        resetServerSummary()

        if (status === 'connected') {
            fetchServerSummary()
        }
    },
    {immediate: true}
)
</script>

<style scoped>
.page-header-panel {
    height: 60px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    overflow: hidden;
    box-sizing: border-box;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background-color: var(--el-bg-color-overlay);
}

.left, .right {
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

.menu-item {
    height: 60px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    transition: background-color .2s;
}

.right > :first-child {
    padding-right: 0;
}

/* 刷新按钮 */
.menu-item .ctrl {
    min-height: 30px;
    min-width: 30px;
    border: none;
    outline: none;
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease; /* 平滑过渡动画 */
}

.menu-item .ctrl:hover {
    background-color: var(--el-color-primary-light-9);
    border-radius: 4px;
}

/* 图标样式 */
.ctrl .icon, .performance .icon {
    font-size: 18px;
    color: var(--el-text-color-regular);
}

/* icon-park 在按钮中视觉重心略偏上，轻微下移让刷新和命令按钮居中。 */
.ctrl .icon :deep(.i-icon) {
    transform: translateY(2px);
}

.ctrl:active .icon {
    color: var(--el-color-primary);
}

.menu-item.more {
    height: 30px;
    margin-right: 10px;
    border-radius: 4px;
    background-color: transparent;
}

.menu-item.collapse:hover {
    cursor: pointer;
    background-color: var(--el-color-info-light-8);
}

.menu-item.more:hover {
    cursor: pointer;
    background-color: var(--el-color-primary-light-9);
}

.menu-item.more:active .performance-more :deep(.el-text) {
    color: var(--el-color-primary);
}

.menu-item .performance, .menu-item .performance-more {
    display: flex;
    gap: 5px;
    align-items: center;
}

/* DB 下拉项：左侧 DB 名称，右侧展示该库 Key 数量，保持列表扫描感。 */
:global(.page-header-db-popper .el-select-dropdown__item) {
    display: flex;
    padding-right: 10px;
}

.db-option-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-width: 0;
    gap: 12px;
}

.db-option-label {
    flex: 0 0 auto;
}

.db-option-size {
    min-width: 0;
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
