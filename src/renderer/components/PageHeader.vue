<!--
    PageHeader.vue
    描述：页面头部
 -->
<script setup>
import {AddUser, CodeOne, Cpu, DashboardOne, Key, MenuFoldOne, MenuUnfoldOne, Refresh} from "@icon-park/vue-next";

import {storeToRefs} from "pinia";
import {useConnectionConfigsStore} from "../stores/modules/connectionConfigsStore.js";
import {ref} from "vue";
import {ElMessage} from "element-plus";
import {eventBus} from "../utils/eventBus.js";
import {useUserSettingsStore} from "../stores/modules/userSettingsStore.js";

// 响应式数据
const {sideCollapseState} = storeToRefs(useUserSettingsStore())
const {activeConnectionConfigId, currOpenedConnectionConfig} = storeToRefs(useConnectionConfigsStore())
const dbValue = ref('0');
// 生成 Redis 数据库列表（默认 0-15）
const dbList = ref(
    Array.from({length: 16}, (_, i) => ({
        label: `DB ${i}`,
        value: String(i)
    }))
);

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
            ElMessage.success(`已切换到数据库 DB ${dbIndex}`);
        } else {
            ElMessage.error(`切换数据库失败: ${result.error}`);
            // 恢复旧值
            dbValue.value = String(old_db_Index);
        }
    } catch (error) {
        console.error('Failed to update db_index:', error);
        ElMessage.error(`更新数据库索引失败: ${error.message || error}`);

        // 恢复旧值
        dbValue.value = String(old_db_Index);
    }
}

/**
 * 刷新当前连接
 */
const handleRefresh = async () => {
    if(currOpenedConnectionConfig.value.status !== 'connected'){
        ElMessage.warning('请先连接数据库');
        return;
    }

    console.log('handleRefresh');
}

/**
 * 打开Redis详情
 */
const handleOpenRedisInfo = () => {
    if(currOpenedConnectionConfig.value.status !== 'connected'){
        ElMessage.warning('请先连接数据库');
        return;
    }

    console.log('handleOpenRedisInfo');
}
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
                <el-tooltip content="刷新当前连接信息" placement="bottom" :show-after="200" :offset="12">
                    <button class="ctrl" @click="handleRefresh">
                        <el-icon class="icon">
                            <Refresh/>
                        </el-icon>
                    </button>
                </el-tooltip>
            </div>
            <div class="menu-item">
                <el-tooltip content="打开命令行" placement="bottom" :show-after="200" :offset="12">
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
                <el-tooltip content="连接数量" placement="bottom" :show-after="200" :offset="12">
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
                <el-tooltip content="CPU使用率" placement="bottom" :show-after="200" :offset="12">
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
                <el-tooltip content="内存使用量" placement="bottom" :show-after="200" :offset="12">
                    <span class="performance">
                        <el-icon size="20" class="icon"><DashboardOne/></el-icon>
                        <el-text v-if="currOpenedConnectionConfig.status === 'connected'">{{ currOpenedConnectionConfig.memory_usage ?? '0' }}K</el-text>
                    </span>
                </el-tooltip>
            </div>
            <div class="menu-item">
                <el-text>|</el-text>
            </div>
            <div class="menu-item">
                <el-tooltip content="总Key数量" placement="bottom" :show-after="200" :offset="12">
                    <span class="performance">
                        <el-icon size="20" class="icon"><Key/></el-icon>
                        <el-text v-if="currOpenedConnectionConfig.status === 'connected'">{{ currOpenedConnectionConfig.total_keys ?? '0' }}</el-text>
                    </span>
                </el-tooltip>
            </div>
            <div class="menu-item">
                <el-text>|</el-text>
            </div>
            <el-tooltip content="查看更多Redis信息" placement="bottom" :show-after="200" :offset="6">
                <div class="menu-item more" @click="handleOpenRedisInfo">
                    <span class="performance-more"><el-text>更多</el-text></span>
                </div>
            </el-tooltip>
        </div>
    </div>
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