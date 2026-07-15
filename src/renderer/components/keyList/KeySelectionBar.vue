<!--
    KeySelectionBar.vue
    描述：Key 列表选择模式操作条。复用导出和批量删除的全选、清空、关闭与提交布局。
 -->
<template>
    <!-- 选择操作条：紧贴列表上方，左右分区放置选择动作和最终提交动作。 -->
    <div class="key-selection-bar">
        <div class="key-selection-actions">
            <el-button size="small" type="success" @click="$emit('select-all')">
                {{ currentText.selectAll }}
            </el-button>
            <el-button size="small" type="warning" @click="$emit('clear')">
                {{ currentText.clearSelection }}
            </el-button>

            <span class="key-selection-divider"></span>

            <el-button size="small" type="danger" plain @click="$emit('close')">
                {{ currentText.close }}
            </el-button>
        </div>

        <div class="key-selection-actions">
            <el-tooltip
                v-if="isExportMode"
                :content="t('keyList.exportSelection.limitTooltip')"
                placement="bottom"
                popper-class="key-export-limit-tooltip"
            >
                <button class="export-limit-tip" type="button">
                    <el-icon>
                        <Attention/>
                    </el-icon>
                </button>
            </el-tooltip>

            <el-button
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
import {Attention} from '@icon-park/vue-next'
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
    loading: {
        type: Boolean,
        default: false
    }
})

defineEmits(['select-all', 'clear', 'close', 'submit'])

// 导出模式需要额外展示导出限制提示，批量删除模式只保留危险提交按钮。
const isExportMode = computed(() => props.mode === 'export')

// 根据选择模式切换右侧主按钮颜色。
const submitButtonType = computed(() => isExportMode.value ? 'primary' : 'danger')

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

/* 导出限制提示图标：放在导出主按钮前，提醒用户大 Key 会按上限截断。 */
.export-limit-tip {
    display: inline-flex;
    width: 24px;
    height: 24px;
    padding: 0;
    cursor: help;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    color: var(--el-color-warning);
    background: transparent;
    transform: translateY(1px);
}

.export-limit-tip:hover {
    color: var(--el-color-warning-dark-2);
}

.export-limit-tip .el-icon {
    font-size: 17px;
    line-height: 1;
}

:global(.key-export-limit-tooltip) {
    max-width: 280px;
    line-height: 1.5;
    white-space: pre-line;
}
</style>
