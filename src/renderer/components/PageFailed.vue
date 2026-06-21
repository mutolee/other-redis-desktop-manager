<!--
    PageFailed.vue
    描述：连接失败页。展示失败原因提示、检查建议，并提供编辑连接和重新连接入口。
 -->
<script setup>
import { Caution as Warning, Connection, Edit } from '@icon-park/vue-next'
import { storeToRefs } from 'pinia'
import { useI18n } from '../i18n/index.js'
import { eventBus } from '../utils/eventBus.js'
import { useConnectionConfigsStore } from '../stores/modules/connectionConfigsStore.js'
import { useUserSettingsStore } from '../stores/modules/userSettingsStore.js'
import { mergeConnectionRuntimeSettings } from '../utils/redisConnectionConfigUtil.js'

// 国际化文案读取函数：驱动连接失败页的说明、建议和操作按钮文案。
const { t } = useI18n()

// 连接配置 store：读取当前打开连接，作为重新连接和编辑连接的目标。
const { currOpenedConnectionConfig } = storeToRefs(useConnectionConfigsStore())
// 系统连接设置：重连时继续沿用全局超时参数。
const { connectionSettings } = storeToRefs(useUserSettingsStore())

/**
 * Redis 重新连接
 */
const reconnect = () => {
    if (!currOpenedConnectionConfig.value || !currOpenedConnectionConfig.value.id) {
        return
    }
    // 清理连接配置数据，确保只包含可序列化的内容
    const cleanConfig = JSON.parse(JSON.stringify(currOpenedConnectionConfig.value))
    // 将系统设置中的运行时超时参数合并到重连请求。
    const runtimeConnectionConfig = mergeConnectionRuntimeSettings(cleanConfig, connectionSettings.value)
    window.api.redis.connect(currOpenedConnectionConfig.value.id, runtimeConnectionConfig)
}
</script>

<template>
    <!-- 连接失败内容区：居中展示错误说明、检查建议和恢复操作。 -->
    <div class="connection-failed-page">
        <div class="failed-panel">
            <div class="failed-container">
                <div class="failed-top">
                    <el-icon :size="80" class="failed-icon">
                        <Warning/>
                    </el-icon>
                    <div class="failed-text">
                        <h3 class="failed-title">{{ t('pageFailed.title') }}</h3>
                        <el-text class="failed-desc">{{ t('pageFailed.description') }}</el-text>
                    </div>
                </div>
                <div class="failed-tips">
                    <div class="tips-item">
                        <span class="tips-label">{{ t('pageFailed.tips.serviceLabel') }}</span>
                        <span class="tips-text">{{ t('pageFailed.tips.serviceText') }}</span>
                    </div>
                    <div class="tips-item">
                        <span class="tips-label">{{ t('pageFailed.tips.networkLabel') }}</span>
                        <span class="tips-text">{{ t('pageFailed.tips.networkText') }}</span>
                    </div>
                    <div class="tips-item">
                        <span class="tips-label">{{ t('pageFailed.tips.securityLabel') }}</span>
                        <span class="tips-text">{{ t('pageFailed.tips.securityText') }}</span>
                    </div>
                </div>
                <div class="failed-bottom">
                    <el-button @click="() => eventBus.emit('edit-connection', currOpenedConnectionConfig)">
                        <el-icon style="margin-right: 8px;">
                            <Edit/>
                        </el-icon>
                        {{ t('pageFailed.actions.edit') }}
                    </el-button>
                    <el-button type="primary" @click="reconnect">
                        <el-icon style="margin-right: 8px;">
                            <Connection/>
                        </el-icon>
                        {{ t('pageFailed.actions.reconnect') }}
                    </el-button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.connection-failed-page {
    min-width: 500px;
    height: 100%;
    display: flex;
}

.failed-panel {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--el-border-color-lighter);
    background-color: var(--el-bg-color-overlay);
    padding: 20px;
}

.failed-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
    width: 700px;
}

.failed-top {
    display: flex;
    align-items: flex-start;
    gap: 24px;
    width: 100%;
}

.failed-icon {
    color: var(--el-color-danger);
    flex-shrink: 0;
}

.failed-text {
    flex: 1;
    min-width: 0;
}

.failed-title {
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 8px 0;
}

.failed-desc {
    font-size: 14px;
    margin: 0;
    line-height: 1.6;
}

.failed-tips {
    width: 100%;
    background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
    border-radius: 8px;
    padding: 20px 24px;
    border-left: 3px solid var(--el-color-primary);
}

.tips-item {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    font-size: 13px;
}

.tips-item:last-child {
    margin-bottom: 0;
}

.tips-label {
    font-weight: 600;
    color: var(--el-text-color-secondary);
    min-width: 80px;
    margin-right: 12px;
}

.tips-text {
    color: #606266;
    flex: 1;
}

.failed-bottom {
    display: flex;
    justify-content: center;
    gap: 12px;
    width: 100%;
}
</style>
