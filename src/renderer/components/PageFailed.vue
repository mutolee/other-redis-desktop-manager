<!--
    ConnectionFailed.vue
    描述：连接失败页面
 -->
<script setup>
import {Connection, Edit, Warning} from '@element-plus/icons-vue'
import {eventBus} from "../utils/eventBus.js";
import {storeToRefs} from "pinia";
import {useConnectionConfigsStore} from "../stores/modules/connectionConfigsStore.js";

// 响应式数据
const {currOpenedConnectionConfig} = storeToRefs(useConnectionConfigsStore())

/**
 * Redis 重新连接
 */
const reconnect = () => {
    if (!currOpenedConnectionConfig.value || !currOpenedConnectionConfig.value.id) {
        return
    }
    // 清理连接配置数据，确保只包含可序列化的内容
    const cleanConfig = JSON.parse(JSON.stringify(currOpenedConnectionConfig.value))
    window.api.redis.connect(currOpenedConnectionConfig.value.id, cleanConfig)
}
</script>

<template>
    <div class="connection-failed-page">
        <div class="failed-panel">
            <div class="failed-container">
                <div class="failed-top">
                    <el-icon :size="80" class="failed-icon">
                        <Warning/>
                    </el-icon>
                    <div class="failed-text">
                        <h3 class="failed-title">连接失败</h3>
                        <el-text class="failed-desc">无法连接到Redis服务器，请检查连接配置是否正确</el-text>
                    </div>
                </div>
                <div class="failed-tips">
                    <div class="tips-item">
                        <span class="tips-label">检查事项：</span>
                        <span class="tips-text">确认Redis服务是否正常运行</span>
                    </div>
                    <div class="tips-item">
                        <span class="tips-label">网络连接：</span>
                        <span class="tips-text">检查主机地址和端口是否正确</span>
                    </div>
                    <div class="tips-item">
                        <span class="tips-label">安全设置：</span>
                        <span class="tips-text">确认密码和认证信息是否正确</span>
                    </div>
                </div>
                <div class="failed-bottom">
                    <el-button @click="() => eventBus.emit('edit-connection', currOpenedConnectionConfig)">
                        <el-icon style="margin-right: 8px;">
                            <Edit/>
                        </el-icon>
                        编辑连接
                    </el-button>
                    <el-button type="primary" @click="reconnect">
                        <el-icon style="margin-right: 8px;">
                            <Connection/>
                        </el-icon>
                        重新连接
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
    border-radius: 8px;
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
