<!--
    Welcome.vue
    描述：主界面的欢迎页。用于在未打开连接页时展示快速操作、最近连接和基础使用提示。
 -->
<template>
    <div class="welcome-panel">
        <!-- 侧边栏折叠按钮：欢迎页没有标题栏操作区时，保留左上角入口。 -->
        <button class="collapse" type="button" @click="handleToggleSideBar">
            <el-icon :size="20" class="collapse-icon">
                <MenuFoldOne v-if="sideCollapseState"/>
                <MenuUnfoldOne v-else/>
            </el-icon>
        </button>

        <el-scrollbar>
            <div class="welcome-content">
                <!-- 欢迎头部：展示产品入口语和当前空页面的引导说明。 -->
                <header class="welcome-header">
                    <div class="welcome-icon">
                        <el-icon size="64">
                            <LinkThree/>
                        </el-icon>
                    </div>
                    <h1 class="welcome-title">{{ t('welcome.title') }}</h1>
                    <p class="welcome-description">{{ t('welcome.description') }}</p>
                </header>

                <!-- 快速操作区：提供创建、导入和设置三个高频入口。 -->
                <section class="quick-actions">
                    <div class="action-cards">
                        <button class="action-card" type="button" @click="handleCreateConnection">
                            <div class="card-icon">
                                <el-icon size="32">
                                    <Plus/>
                                </el-icon>
                            </div>
                            <h3 class="card-title">{{ t('welcome.actions.createTitle') }}</h3>
                            <p class="card-description">{{ t('welcome.actions.createDesc') }}</p>
                        </button>

                        <button class="action-card" type="button" @click="handleImportConnections">
                            <div class="card-icon">
                                <el-icon size="32">
                                    <Upload/>
                                </el-icon>
                            </div>
                            <h3 class="card-title">{{ t('welcome.actions.importTitle') }}</h3>
                            <p class="card-description">{{ t('welcome.actions.importDesc') }}</p>
                        </button>

                        <button class="action-card" type="button" @click="handleOpenSettings">
                            <div class="card-icon">
                                <el-icon size="32">
                                    <SettingTwo/>
                                </el-icon>
                            </div>
                            <h3 class="card-title">{{ t('welcome.actions.settingsTitle') }}</h3>
                            <p class="card-description">{{ t('welcome.actions.settingsDesc') }}</p>
                        </button>
                    </div>
                </section>

                <!-- 最近连接区：为空时展示空状态，否则展示可点击的最近连接列表。 -->
                <section class="recent-connections">
                    <h3 class="section-title">{{ t('welcome.recentTitle') }}</h3>
                    <el-empty v-if="recentConnections.length === 0" :description="t('welcome.recentEmpty')"/>
                    <div v-else class="connection-list">
                        <button
                            v-for="connection in recentConnections"
                            :key="connection.id"
                            class="connection-item"
                            type="button"
                            @click="handleSelectConnection(connection)"
                        >
                            <div class="connection-info">
                                <el-icon class="connection-icon">
                                    <LinkThree/>
                                </el-icon>
                                <div class="connection-details">
                                    <span class="connection-group">{{ connection.group_name }}</span>
                                    <span class="connection-name">{{ connection.name }}</span>
                                    <span class="connection-host">{{ connection.host }}:{{ connection.port }}</span>
                                </div>
                                <el-text class="connection-time">{{ formatDateTime(connection.last_active_at, t) }}</el-text>
                            </div>
                        </button>
                    </div>
                </section>

                <!-- 使用提示区：展示基础操作提醒，帮助首次进入应用的用户建立操作预期。 -->
                <section class="usage-tips">
                    <h3 class="section-title">{{ t('welcome.tipsTitle') }}</h3>
                    <div class="tips-list">
                        <div class="tip-item">
                            <el-icon class="tip-icon">
                                <Info/>
                            </el-icon>
                            <span>{{ t('welcome.tips.connect') }}</span>
                        </div>
                        <div class="tip-item">
                            <el-icon class="tip-icon">
                                <Info/>
                            </el-icon>
                            <span>{{ t('welcome.tips.folders') }}</span>
                        </div>
                        <div class="tip-item">
                            <el-icon class="tip-icon">
                                <Info/>
                            </el-icon>
                            <span>{{ t('welcome.tips.sslCluster') }}</span>
                        </div>
                    </div>
                </section>
            </div>
        </el-scrollbar>
    </div>
</template>

<script setup>
import {Info, LinkThree, MenuFoldOne, MenuUnfoldOne, Plus, SettingTwo, Upload} from '@icon-park/vue-next'
import {storeToRefs} from 'pinia'
import {useConnectionConfigsStore} from '../stores/modules/connectionConfigsStore.js'
import {useUserSettingsStore} from '../stores/modules/userSettingsStore.js'
import {useI18n} from '../i18n/index.js'
import {eventBus} from '../utils/eventBus.js'
import {formatDateTime} from '../utils/dateTimeUtil.js'

// 连接配置 store：欢迎页使用最近连接列表，便于用户快速回到常用 Redis 连接。
const connectionConfigsStore = useConnectionConfigsStore()

// 用户设置 store：欢迎页左上角折叠按钮需要读取当前侧边栏折叠状态。
const userSettingsStore = useUserSettingsStore()

// 从连接配置 store 提取最近连接列表，驱动“最近连接”区域渲染。
const {recentConnections} = storeToRefs(connectionConfigsStore)

// 从用户设置 store 提取侧边栏折叠状态，驱动折叠按钮图标切换。
const {sideCollapseState} = storeToRefs(userSettingsStore)

// 国际化文案读取函数：驱动欢迎页标题、快捷入口、空状态和提示文案。
const {t} = useI18n()

/**
 * 切换左侧菜单折叠状态。
 */
const handleToggleSideBar = () => {
    eventBus.emit('toggle-side-bar-collapse')
}

/**
 * 打开创建连接配置弹窗。
 *
 * @param {MouseEvent} event - 用户点击快速操作卡片时的鼠标事件
 */
const handleCreateConnection = (event) => {
    eventBus.emit('create-new-connection', event)
}

/**
 * 打开连接配置导入流程。
 */
const handleImportConnections = () => {
    eventBus.emit('import-connection')
}

/**
 * 打开应用设置抽屉。
 */
const handleOpenSettings = () => {
    eventBus.emit('open-setting')
}

/**
 * 选择最近连接。
 *
 * @param {Object} connection - 最近连接配置
 */
const handleSelectConnection = (connection) => {
    eventBus.emit('click-connection', connection.id.toString())
}
</script>

<style scoped>
.welcome-panel {
    height: 100%;
    background: var(--el-bg-color);
    position: relative;
}

/* 暗色模式下交给全局背景承载，避免欢迎页出现一块独立色块。 */
.dark .welcome-panel {
    background: none;
}

/* 左上角折叠按钮：固定在欢迎页内，不随内容滚动。 */
.welcome-panel .collapse {
    position: absolute;
    top: 3px;
    left: 3px;
    height: 30px;
    width: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 0;
    z-index: 99;
    transition: background-color 0.3s;
}

.welcome-panel .collapse:hover {
    cursor: pointer;
    background-color: var(--el-color-info-light-8);
}

.collapse-icon {
    color: var(--el-text-color-primary);
}

/* 主内容容器：限制最大宽度，保证欢迎页在宽屏下仍然集中。 */
.welcome-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 100px 40px 50px;
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
    margin: 0 0 16px;
}

.welcome-header .welcome-description {
    font-size: 16px;
    color: var(--el-text-color-secondary);
    margin: 0;
}

.quick-actions {
    margin-bottom: 48px;
}

/* 快速操作卡片网格：根据可用宽度自动换列，避免移动端横向溢出。 */
.quick-actions .action-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 24px;
}

.action-cards .action-card {
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    padding: 24px;
    color: inherit;
    font: inherit;
    text-align: center;
    cursor: pointer;
    transition: box-shadow 0.3s ease, border-color 0.3s ease;
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
    margin: 0 0 8px;
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

.section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 16px;
}

.recent-connections .connection-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* 最近连接项：整行可点击，内部使用按钮语义承载键盘焦点。 */
.connection-list .connection-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 16px;
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    color: inherit;
    font: inherit;
    cursor: pointer;
    text-align: left;
    transition: box-shadow 0.2s, border-color 0.2s;
}

.connection-list .connection-item:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.connection-item .connection-info {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
}

.connection-info .connection-icon {
    color: var(--el-color-primary);
    margin-right: 12px;
    font-size: 18px;
    flex-shrink: 0;
}

.connection-info .connection-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.connection-details .connection-group,
.connection-details .connection-name,
.connection-details .connection-host {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.connection-details .connection-group {
    color: var(--el-text-color-regular);
    font-size: 13px;
    margin-bottom: 2px;
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
    flex-shrink: 0;
}

/* 使用提示区域：作为次要信息块，使用浅色背景与主操作区域区分。 */
.usage-tips {
    background: var(--el-color-primary-light-8);
    border-radius: 8px;
    padding: 24px;
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
    flex-shrink: 0;
}
</style>
