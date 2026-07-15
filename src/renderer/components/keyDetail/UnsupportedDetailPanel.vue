<!--
    UnsupportedDetailPanel.vue
    描述：暂未支持或未知 Redis Key 类型的兜底详情面板。
    职责：在类型未实现时给出可理解的原因、当前 Key 信息和排查命令，避免详情区空白或误导用户。
-->
<template>
    <!-- 未支持类型提示：展示类型来源说明、当前 Key 信息和建议命令。 -->
    <div class="unsupported-detail-panel">
        <div class="unsupported-content">
            <el-empty
                :description="t('keyDetailPanels.unsupported.empty')"
            />

            <el-alert
                class="unsupported-alert"
                type="info"
                :title="typeDescription"
                :closable="false"
                show-icon
            />

            <!-- 当前 Key 摘要：保留关键信息，方便用户确认当前打开的对象。 -->
            <el-descriptions
                class="unsupported-descriptions"
                :column="1"
                border
                size="small"
            >
                <el-descriptions-item :label="t('keyDetailPanels.unsupported.keyName')">
                    <span class="key-text">{{ keyName }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="t('keyDetailPanels.unsupported.redisType')">
                    <el-tag type="info" effect="plain">{{ displayType }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item :label="t('keyDetailPanels.unsupported.currentStatus')">
                    {{ supportStatusText }}
                </el-descriptions-item>
            </el-descriptions>

            <!-- 建议命令：当前阶段只提示安全的 TYPE 命令，不主动读取未知模块内容。 -->
            <div class="command-hint">
                <span class="command-label">{{ t('keyDetailPanels.unsupported.commandHint') }}</span>
                <code>{{ typeCommand }}</code>
            </div>
        </div>
    </div>
</template>

<script setup>
import {computed} from 'vue'
import {useI18n} from '../../i18n/index.js'

// 国际化文案读取函数：驱动未支持类型的说明、状态和字段标签。
const {t} = useI18n()

// 组件入参：接收 KeyDetailPanel 加载后的统一 keyData 数据，用于展示未知类型的上下文信息。
const props = defineProps({
    keyData: {
        type: Object,
        required: true
    }
})

// 当前 Key 名称：兜底为空字符串，避免未知数据结构导致模板展示 undefined。
const keyName = computed(() => String(props.keyData?.key || ''))

// 当前 Redis 类型：统一转大写展示，便于和 redis-cli TYPE 输出对照。
const displayType = computed(() => String(props.keyData?.type || 'UNKNOWN').toUpperCase())

// 安全的类型确认命令：只生成 TYPE，不生成可能破坏或误读模块数据的命令。
const typeCommand = computed(() => `TYPE ${formatCommandArg(keyName.value)}`)

// 未支持类型说明：对常见 Redis Stack / Module 类型给出更贴近用户理解的提示。
const typeDescription = computed(() => {
    const type = displayType.value

    if (type.includes('REJSON') || type === 'JSON') {
        return t('keyDetailPanels.unsupported.descriptions.redisJson')
    }

    if (type.includes('TSDB') || type.includes('TIMESERIES')) {
        return t('keyDetailPanels.unsupported.descriptions.timeSeries')
    }

    if (['BF', 'CF', 'CMS', 'TOPK', 'TDIGEST'].some((moduleType) => type.includes(moduleType))) {
        return t('keyDetailPanels.unsupported.descriptions.redisBloom')
    }

    if (type.includes('FT') || type.includes('SEARCH')) {
        return t('keyDetailPanels.unsupported.descriptions.redisSearch')
    }

    return t('keyDetailPanels.unsupported.descriptions.default')
})

// 支持状态文案：明确告诉用户不是连接失败，也不是 Key 损坏。
const supportStatusText = computed(() => (
    t('keyDetailPanels.unsupported.supportStatus')
))

/**
 * 将命令参数转成 redis-cli 友好的字符串。
 * @param {unknown} value 原始命令参数
 * @returns {string} 带引号且已转义的命令参数
 */
const formatCommandArg = (value) => JSON.stringify(String(value ?? ''))
</script>

<style scoped>
/* 未支持类型面板：居中展示说明内容，避免详情区只剩默认空态。 */
.unsupported-detail-panel {
    display: flex;
    height: 100%;
    min-height: 0;
    padding: 48px 32px;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}

/* 内容容器：限制最大宽度，让说明信息在宽屏下仍然易读。 */
.unsupported-content {
    display: flex;
    width: min(720px, 100%);
    flex-direction: column;
    gap: 18px;
}

/* 提示信息：和空态之间留出清晰层级。 */
.unsupported-alert {
    margin-top: 0;
}

.unsupported-alert :deep(.el-alert__content) {
    line-height: 1.7;
}

/* Key 摘要：承接当前对象上下文，帮助用户确认不是加载失败。 */
.unsupported-descriptions {
    margin-top: 0;
}

.unsupported-descriptions :deep(.el-descriptions__label),
.unsupported-descriptions :deep(.el-descriptions__content) {
    padding: 12px 14px;
    line-height: 1.6;
}

.key-text {
    word-break: break-all;
}

/* 建议命令：使用轻量代码块展示，不抢占主提示视觉。 */
.command-hint {
    display: flex;
    gap: 10px;
    margin-top: 0;
    padding: 14px 16px;
    align-items: flex-start;
    flex-direction: column;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    background: var(--el-fill-color-extra-light);
    color: var(--el-text-color-regular);
    font-size: 13px;
}

.command-label {
    flex-shrink: 0;
}

.command-hint code {
    display: block;
    max-width: 100%;
    min-width: 0;
    padding: 6px 8px;
    border-radius: 3px;
    background: var(--el-bg-color);
    color: var(--el-color-primary);
    font-family: Consolas, Monaco, monospace;
    word-break: break-all;
}
</style>
