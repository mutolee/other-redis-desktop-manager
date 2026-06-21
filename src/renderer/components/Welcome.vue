<!--
    Welcome.vue
    描述：欢迎页面
 -->
<script setup>
import {Info, LinkThree, MenuFoldOne, MenuUnfoldOne, Plus, SettingTwo, Upload} from "@icon-park/vue-next";
import {useConnectionConfigsStore} from "../stores/modules/connectionConfigsStore.js";
import {storeToRefs} from "pinia";
import {eventBus} from "../utils/eventBus.js";
import {formatDateTime} from "../utils/dateTimeUtil.js";
import {useUserSettingsStore} from "../stores/modules/userSettingsStore.js";

// 响应式数据
const {recentConnections} = storeToRefs(useConnectionConfigsStore())
const {sideCollapseState} = storeToRefs(useUserSettingsStore())

/**
 * 处理创建连接配置
 */
const handleCreateConnection = (e) => {
    eventBus.emit('create-new-connection', e)
}

/**
 * 处理导入连接配置
 */
const handleImportConnections = () => {
    eventBus.emit('import-connection')
}

/**
 * 处理选择连接配置
 */
const handleSelectConnection = (connection) => {
    eventBus.emit('click-connection', connection.id.toString())
}
</script>

<template>
    <div class="welcome-panel">
        <div class="collapse" @click="()=> eventBus.emit('toggle-side-bar-collapse')">
            <el-icon :size="20" style="color: var(--el-text-color-primary)">
                <MenuFoldOne v-if="sideCollapseState"/>
                <MenuUnfoldOne v-else/>
            </el-icon>
        </div>
        <el-scrollbar>
            <div class="welcome-content">
                <!-- 欢迎头部 -->
                <div class="welcome-header">
                    <div class="welcome-icon">
                        <el-icon size="64">
                            <LinkThree/>
                        </el-icon>
                    </div>
                    <h1 class="welcome-title">欢迎使用 Redis 客户端</h1>
                    <p class="welcome-description">请从左侧选择一个连接，或创建新的连接开始使用</p>
                </div>
                <!-- 快速操作卡片 -->
                <div class="quick-actions">
                    <div class="action-cards">
                        <!-- 创建连接卡片 -->
                        <div class="action-card" @click="handleCreateConnection">
                            <div class="card-icon">
                                <el-icon size="32">
                                    <Plus/>
                                </el-icon>
                            </div>
                            <h3 class="card-title">创建新连接</h3>
                            <p class="card-description">添加新的 Redis 数据库连接</p>
                        </div>

                        <!-- 导入连接卡片 -->
                        <div class="action-card" @click="handleImportConnections">
                            <div class="card-icon">
                                <el-icon size="32">
                                    <Upload/>
                                </el-icon>
                            </div>
                            <h3 class="card-title">导入连接</h3>
                            <p class="card-description">从文件导入连接配置</p>
                        </div>

                        <!-- 设置卡片 -->
                        <div class="action-card" @click="() => eventBus.emit('open-setting')">
                            <div class="card-icon">
                                <el-icon size="32">
                                    <SettingTwo/>
                                </el-icon>
                            </div>
                            <h3 class="card-title">应用设置</h3>
                            <p class="card-description">配置应用偏好和选项</p>
                        </div>
                    </div>
                </div>
                <!-- 最近连接 -->
                <div class="recent-connections">
                    <h3 class="section-title">最近连接</h3>
                    <el-empty v-if="recentConnections.length === 0" description="还没有连接过 Redis 数据库"/>
                    <div v-else class="connection-list">
                        <div
                            v-for="connection in recentConnections"
                            :key="connection.id"
                            class="connection-item"
                            @click="handleSelectConnection(connection)"
                        >
                            <div class="connection-info">
                                <el-icon class="connection-icon">
                                    <LinkThree/>
                                </el-icon>
                                <div class="connection-details">
                                    <span>{{ connection.group_name }}</span>
                                    <span class="connection-name">{{ connection.name }}</span>
                                    <span class="connection-host">{{ connection.host }}:{{ connection.port }}</span>
                                </div>
                                <el-text class="connection-time">{{ formatDateTime(connection.last_active_at) }}</el-text>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- 使用提示 -->
                <div class="usage-tips">
                    <h3 class="section-title">使用提示</h3>
                    <div class="tips-list">
                        <div class="tip-item">
                            <el-icon class="tip-icon">
                                <Info/>
                            </el-icon>
                            <span>点击左侧连接名称可以快速连接到 Redis 服务器</span>
                        </div>
                        <div class="tip-item">
                            <el-icon class="tip-icon">
                                <Info/>
                            </el-icon>
                            <span>使用文件夹可以更好地组织和管理您的连接</span>
                        </div>
                        <div class="tip-item">
                            <el-icon class="tip-icon">
                                <Info/>
                            </el-icon>
                            <span>支持 SSL 加密连接和 Redis 集群模式</span>
                        </div>
                    </div>
                </div>
            </div>
        </el-scrollbar>
    </div>
</template>

<style scoped>
.welcome-panel {
    height: 100%;
    background: var(--el-bg-color);
    position: relative;
}

/* 深色模式 */
.dark .welcome-panel {
    background: none; /* 深色模式，取消背景颜色，使用全局的深色背景 */
}

.welcome-panel .collapse {
    position: absolute;
    top: 3px;
    left: 3px;
    height: 30px;
    width: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 4px;
    z-index: 99;
    transition: background-color 0.3s;
}

.welcome-panel .collapse:hover {
    cursor: pointer;
    background-color: var(--el-color-info-light-8);
}

.welcome-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 100px 40px 50px 40px;
}

.welcome-content .welcome-header {
    text-align: center;
    margin-bottom: 48px;
}

.welcome-header .welcome-icon {
    color: var(--el-color-primary);
    margin-bottom: 24px;
}

.welcome-header .welcome-title {
    font-size: 28px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 16px 0;
}

.welcome-header .welcome-description {
    font-size: 16px;
    color: var(--el-text-color-secondary);
    margin: 0;
}

.quick-actions {
    margin-bottom: 48px;
}

.quick-actions .action-cards {
    display: grid;
    /* 网格布局，每列最小200px，最大1fr（等分剩余空间） */
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 24px;
}

.action-cards .action-card {
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color);
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-cards .action-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    border-color: var(--el-color-primary);
}

.action-card .card-icon {
    color: var(--el-color-primary);
    margin-bottom: 16px;
}

.action-card .card-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 8px 0;
}

.action-card .card-description {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    margin: 0;
    line-height: 1.5;
}

.recent-connections {
    margin-bottom: 48px;
}

.recent-connections .section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 16px 0;
}

.recent-connections .connection-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.connection-list .connection-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.connection-list .connection-item:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.connection-item .connection-info {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: space-between;
}

.connection-info .connection-icon {
    color: var(--el-color-primary);
    margin-right: 12px;
    font-size: 18px;
}

.connection-info .connection-details {
    display: flex;
    flex-direction: column;
}

.connection-details .connection-name {
    font-weight: 500;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
}

.connection-details .connection-host {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.connection-info .connection-time {
    margin-left: auto;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.usage-tips {
    background: var(--el-color-primary-light-8);
    border-radius: 12px;
    padding: 24px;
}

.usage-tips .section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 16px 0;
}

.usage-tips .tips-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.tips-list .tip-item {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: var(--el-text-color-secondary);
}

.tip-item .tip-icon {
    color: var(--el-color-primary);
    margin-right: 8px;
    font-size: 16px;
}
</style>