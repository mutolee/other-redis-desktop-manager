<!--
    KeySelectionBar.vue
    描述：Key 列表选择模式操作条。复用导出和批量删除的全选、清空、关闭与提交布局。
 -->
<template>
    <!-- 选择操作条：紧贴列表上方，左右分区放置选择动作和最终提交动作。 -->
    <div class="key-selection-bar">
        <div class="key-selection-actions">
            <el-button size="small" :type="selectionToggleButtonType" @click="handleSelectionToggle">
                {{ selectionToggleText }}
            </el-button>

            <span class="key-selection-divider"></span>

            <el-button size="small" type="danger" plain @click="$emit('close')">
                {{ currentText.close }}
            </el-button>
        </div>

        <div class="key-selection-actions">
            <el-tooltip
                v-if="isExportMode"
                placement="bottom"
                popper-class="key-export-limit-tooltip"
            >
                <template #content>
                    <div class="key-export-limit-content">
                        <div class="key-export-limit-title">{{ exportLimitTitle }}</div>
                        <ul class="key-export-limit-list">
                            <li v-for="rule in exportLimitRules" :key="rule">{{ rule }}</li>
                        </ul>
                    </div>
                </template>

                <el-button
                    class="export-submit-button"
                    size="small"
                    :type="submitButtonType"
                    :loading="loading"
                    :disabled="selectedCount === 0"
                    @click="$emit('submit')"
                >
                    {{ currentText.submit }}
                </el-button>
            </el-tooltip>

            <el-button
                v-else
                size="small"
                :type="submitButtonType"
                :loading="loading"
                :disabled="selectedCount === 0"
                @click="$emit('submit')"
            >
                {{ currentText.submit }}
            </el-button>
        </div>
    </div>
</template>

<script setup>
/**
 * KeySelectionBar 是 KeyListPanel 的选择模式工具条。
 * 它不维护选中集合，只根据 mode 展示导出或批量删除文案并派发操作事件。
 */
import {computed} from 'vue'
import {useI18n} from '../../i18n/index.js'

const {t} = useI18n()

const props = defineProps({
    mode: {
        type: String,
        default: 'export'
    },
    selectedCount: {
        type: Number,
        default: 0
    },
    allSelected: {
        type: Boolean,
        default: false
    },
    loading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['select-all', 'clear', 'close', 'submit'])

// 导出模式需要额外展示导出限制提示，批量删除模式只保留危险提交按钮。
const isExportMode = computed(() => props.mode === 'export')

// 根据选择模式切换右侧主按钮颜色。
const submitButtonType = computed(() => isExportMode.value ? 'primary' : 'danger')

const exportLimitLines = computed(() => t('keyList.exportSelection.limitTooltip').split('\n').filter(Boolean))
const exportLimitTitle = computed(() => exportLimitLines.value[0] || '')
const exportLimitRules = computed(() => exportLimitLines.value.slice(1))

// 选择条文案集中计算，避免 template 中塞入多处三元表达式。
const currentText = computed(() => {
    if (isExportMode.value) {
        return {
            selectAll: t('keyList.exportSelection.selectAll'),
            clearSelection: t('keyList.exportSelection.clearSelection'),
            close: t('keyList.exportSelection.exit'),
            submit: t('keyList.exportSelection.exportSelected', {value: props.selectedCount})
        }
    }

    return {
        selectAll: t('keyList.batchDeleteSelection.selectAll'),
        clearSelection: t('keyList.batchDeleteSelection.clearSelection'),
        close: t('keyList.batchDeleteSelection.close'),
        submit: t('keyList.batchDeleteSelection.deleteSelected', {value: props.selectedCount})
    }
})

const selectionToggleText = computed(() => props.allSelected ? currentText.value.clearSelection : currentText.value.selectAll)
const selectionToggleButtonType = computed(() => props.allSelected ? 'warning' : 'success')

const handleSelectionToggle = () => {
    emit(props.allSelected ? 'clear' : 'select-all')
}
</script>

<style scoped>
/* 选择栏：紧贴列表上方，保持与搜索结果提示相同的信息层级。 */
.key-selection-bar {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-extra-light);
}

/* 选择栏左右侧按钮组：全选和取消全选在窄宽度下保持紧凑。 */
.key-selection-actions {
    display: flex;
    gap: 8px;
    min-width: 0;
    align-items: center;
}

.key-selection-actions :deep(.el-button + .el-button) {
    margin-left: 0;
}

/* 操作分隔线：把选择动作和关闭模式区分开。 */
.key-selection-divider {
    width: 1px;
    height: 18px;
    flex-shrink: 0;
    background: var(--el-border-color);
}

/* 导出限制说明：直接挂在导出按钮上，用更宽的阅读区域承载多行规则。 */
:global(.el-popper.key-export-limit-tooltip) {
    max-width: 360px;
    padding: 10px 12px !important;
    line-height: 1.6;
    border: 1px solid var(--el-border-color-light) !important;
    border-radius: 6px;
    color: var(--el-text-color-primary) !important;
    background: var(--el-bg-color-overlay) !important;
    box-shadow: var(--el-box-shadow-light);
}

:global(.el-popper.key-export-limit-tooltip .el-popper__arrow::before) {
    border-color: var(--el-border-color-light) !important;
    background: var(--el-bg-color-overlay) !important;
}

:global(.key-export-limit-content) {
    display: flex;
    flex-direction: column;
    gap: 7px;
}

:global(.key-export-limit-title) {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-color-primary);
}

:global(.key-export-limit-list) {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 0;
    margin: 0;
    list-style: none;
}

:global(.key-export-limit-list li) {
    position: relative;
    padding-left: 12px;
    font-size: 12px;
    color: var(--el-text-color-regular);
}

:global(.key-export-limit-list li::before) {
    position: absolute;
    top: 0.72em;
    left: 0;
    width: 4px;
    height: 4px;
    content: "";
    border-radius: 50%;
    background: var(--el-color-primary);
    transform: translateY(-50%);
}

.export-submit-button {
    --el-button-bg-color: #409eff;
    --el-button-border-color: #409eff;
    --el-button-text-color: #ffffff;
    --el-button-hover-bg-color: #66b1ff;
    --el-button-hover-border-color: #66b1ff;
    --el-button-hover-text-color: #ffffff;
    --el-button-active-bg-color: #337ecc;
    --el-button-active-border-color: #337ecc;
    --el-button-active-text-color: #ffffff;
    --el-button-disabled-bg-color: #5f9fd6;
    --el-button-disabled-border-color: #5f9fd6;
    --el-button-disabled-text-color: rgba(255, 255, 255, 0.72);
}
</style>
