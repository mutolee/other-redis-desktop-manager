<!--
    PageHeader.vue
    描述：连接页头部工具栏。展示侧边栏折叠入口、当前 DB、刷新按钮和连接运行指标。
 -->
<script setup>
import { AddUser, CodeOne, Cpu, DashboardOne, Key, MenuFoldOne, MenuUnfoldOne, Refresh } from '@icon-park/vue-next'

import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '../i18n/index.js'
import { eventBus } from '../utils/eventBus.js'
import { useConnectionConfigsStore } from '../stores/modules/connectionConfigsStore.js'
import { useUserSettingsStore } from '../stores/modules/userSettingsStore.js'
import RedisInfoDrawer from './drawer/RedisInfoDrawer.vue'

// 国际化文案读取函数：驱动页头按钮提示和连接操作反馈消息。
const { t } = useI18n()

// 用户设置 store：读取侧边栏折叠状态，用于切换头部折叠按钮图标。
const { sideCollapseState } = storeToRefs(useUserSettingsStore())
// 连接配置 store：读取当前活动连接和连接 ID，驱动 DB 选择、刷新和性能指标展示。
const { activeConnectionConfigId, currOpenedConnectionConfig } = storeToRefs(useConnectionConfigsStore())
// 当前头部 DB 下拉框绑定值：需要和活动连接的 db_index 保持同步。
const dbValue = ref('0');
// Redis 连接状态监听解绑函数：避免页头组件重复挂载时累积同类监听。
let removeConnectionStatusListener = null
// Redis 详情抽屉显示状态：点击头部“更多”按钮后从右侧打开。
const redisInfoDrawerVisible = ref(false)
// 生成 Redis 数据库列表（默认 0-15）
const dbList = ref(
    Array.from({length: 16}, (_, i) => ({
        label: `DB ${i}`,
        value: String(i)
    }))
);

// 监听当前活动连接的 db_index：切换连接页签或切库后，同步更新头部下拉显示值。
watch(
    () => currOpenedConnectionConfig.value?.db_index,
    (nextDbIndex) => {
        dbValue.value = String(nextDbIndex ?? 0)
    },
    { immediate: true }
)

/**
 * 数据库索引值改变事件
 */
const handleDbValueChange = async (value) => {
    // 获取旧值
    const old_db_Index = currOpenedConnectionConfig.value.db_index;
    try {
        // 将字符串转换为整数
        const dbIndex = parseInt(value, 10);

        // 更新数据库中的 db_index（使用专门的方法，避免完整验证）
        const result = await window.api.redis.selectDatabase(activeConnectionConfigId.value, dbIndex);

        // 更新打开的连接的数据库索引
        if (result.success) {
            currOpenedConnectionConfig.value.db_index = dbIndex;
            ElMessage.success(t('pageHeader.messages.switchDbSuccess').replace('{value}', `DB ${dbIndex}`));
            // 切换库后刷新 INFO 信息
            await fetchServerInfo()
        } else {
            ElMessage.error(`${t('pageHeader.messages.switchDbFail')}: ${result.error}`);
            // 恢复旧值
            dbValue.value = String(old_db_Index);
        }
    } catch (error) {
        ElMessage.error(`${t('pageHeader.messages.updateDbIndexFail')}: ${error.message || error}`);

        // 恢复旧值
        dbValue.value = String(old_db_Index);
    }
}

/**
 * 刷新当前连接
 */
const handleRefresh = async () => {
    if(currOpenedConnectionConfig.value.status !== 'connected'){
        ElMessage.warning(t('pageHeader.messages.connectFirst'));
        return;
    }

    await fetchServerInfo();
}

/**
 * 打开Redis详情
 */
const handleOpenRedisInfo = () => {
    if(currOpenedConnectionConfig.value.status !== 'connected'){
        ElMessage.warning(t('pageHeader.messages.connectFirst'));
        return;
    }

    redisInfoDrawerVisible.value = true
}

/**
 * 获取 Redis 服务器实时状态信息
 */
const fetchServerInfo = async () => {
    if (currOpenedConnectionConfig.value.status !== 'connected') return
    try {
        const result = await window.api.redis.getServerInfo(activeConnectionConfigId.value)
        if (result.success && result.data) {
            // 格式化数字：1000 → 1K, 1000000 → 1M
            const fmt = (n) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)
            currOpenedConnectionConfig.value.connection_count = fmt(result.data.connectedClients)
            currOpenedConnectionConfig.value.cpu_usage = result.data.cpuUsage
            currOpenedConnectionConfig.value.memory_usage = result.data.usedMemoryHuman
            currOpenedConnectionConfig.value.total_keys = fmt(result.data.totalKeys)
        }
    } catch (error) {
        ElMessage.error(`${t('pageHeader.messages.fetchServerInfoFail')}: ${error.message || error}`)
    }
}

// 连接状态变化时自动获取服务器信息
onMounted(() => {
    removeConnectionStatusListener = window.api.redis.onConnectionStatusChanged((data) => {
        // 只响应当前活动连接的状态变化，避免命令面板等独立会话误触发页头 INFO 刷新。
        if (data.status === 'connected' && data.connectionId === activeConnectionConfigId.value) {
            setTimeout(fetchServerInfo, 500)
        }
    })
})

onUnmounted(() => {
    // 释放页头组件自己的连接状态监听，避免 KeepAlive / 重建场景下重复注册。
    removeConnectionStatusListener?.()
})
</script>

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
                <el-select v-model="dbValue" @change="handleDbValueChange" :disabled="currOpenedConnectionConfig.status !== 'connected'" size="small" style="width: 100px">
                    <el-option
                        v-for="item in dbList"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
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
                        <el-text v-if="currOpenedConnectionConfig.status === 'connected'">{{ currOpenedConnectionConfig.connection_count ?? '0' }}</el-text>
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
                        <el-text v-if="currOpenedConnectionConfig.status === 'connected'">{{ currOpenedConnectionConfig.cpu_usage ?? '0' }}%</el-text>
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
                        <el-text v-if="currOpenedConnectionConfig.status === 'connected'">{{ currOpenedConnectionConfig.memory_usage ?? '0' }}</el-text>
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
                        <el-text v-if="currOpenedConnectionConfig.status === 'connected'">{{ currOpenedConnectionConfig.total_keys ?? '0' }}</el-text>
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
    background-color: var(--el-color-info-light-8);
    border-radius: 4px;
}

.menu-item .ctrl:active {
    background-color: var(--el-color-info-light-7);
    border-radius: 4px;
}

/* 图标样式 */
.ctrl .icon, .performance .icon {
    font-size: 18px;
    color: var(--el-text-color-regular);
}

.ctrl .icon:active {
    color: var(--el-color-primary);
}

.menu-item.more {
    height: 30px;
    margin-right: 10px;
    border-radius: 4px;
    background-color: var(--el-color-info-light-7);
}

.menu-item.collapse:hover, .menu-item.more:hover {
    cursor: pointer;
    background-color: var(--el-color-info-light-8);
}

.menu-item .performance, .menu-item .performance-more {
    display: flex;
    gap: 5px;
    align-items: center;
}
</style>
