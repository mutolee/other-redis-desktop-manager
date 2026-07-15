<!--
    StringDetailPanel.vue
    描述：Redis String 类型 Key 的详情面板。
    职责：展示 String 值内容，并提供编辑、保存、取消能力。
-->
<template>
    <!-- String 主体区域：工具栏固定在顶部，文本内容区域占满剩余高度。 -->
    <div class="string-viewer">
        <!-- String 工具栏：根据编辑状态切换编辑/保存/取消操作。 -->
        <div class="string-toolbar">
            <el-button
                v-if="!isEditingString"
                type="primary"
                @click="handleEditString"
            >
                <el-icon>
                    <Edit/>
                </el-icon>
                {{ t('keyDetailPanels.common.edit') }}
            </el-button>

            <template v-else>
                <el-button
                    type="success"
                    :loading="saving"
                    @click="handleSaveString"
                >
                    <el-icon>
                        <Check/>
                    </el-icon>
                    {{ t('keyDetailPanels.common.save') }}
                </el-button>
                <el-button
                    :disabled="saving"
                    @click="handleCancelEditString"
                >
                    <el-icon>
                        <Close/>
                    </el-icon>
                    {{ t('common.cancel') }}
                </el-button>
            </template>
        </div>

        <!-- String 内容区：继续使用 textarea，滚动条样式由全局样式统一接管。 -->
        <div class="value-container">
            <el-input
                v-model="stringValue"
                type="textarea"
                :readonly="!isEditingString"
                :disabled="saving"
                class="value-textarea"
            />
        </div>
    </div>
</template>

<script setup>
import {ref, watch} from 'vue'
import {ElMessage} from 'element-plus'
import {Check, Close, Edit} from '@icon-park/vue-next'
import {useI18n} from '../../i18n/index.js'

// 国际化文案读取函数：驱动 String 编辑按钮和保存反馈文案。
const {t} = useI18n()

// 组件入参：tabId 用于定位当前 Redis 连接，keyData 是父组件读取到的 String Key 详情。
const props = defineProps({
    tabId: {
        type: String,
        required: true
    },
    keyData: {
        type: Object,
        required: true
    }
})

// 对外事件：保存成功后通知父组件重新拉取 Key 详情，保证 TTL/Size/Value 与 Redis 实际数据一致。
const emit = defineEmits(['refresh'])

// 编辑状态：控制工具栏按钮、textarea 只读态和保存流程。
const isEditingString = ref(false)

// 保存状态：防止重复提交，并给保存按钮提供 loading 反馈。
const saving = ref(false)

// String 编辑值：与 textarea 双向绑定，进入编辑时基于当前 keyData.value 初始化。
const stringValue = ref('')

/**
 * 将后端返回值规整为 textarea 可展示的字符串。
 * @param {unknown} value Redis String 原始值
 * @returns {string} 可展示和编辑的字符串
 */
const normalizeStringValue = (value) => (typeof value === 'string' ? value : '')

/**
 * 进入 String 编辑模式。
 * 进入时重新同步一次当前值，避免用户查看期间外部刷新导致编辑基线过旧。
 */
const handleEditString = () => {
    stringValue.value = normalizeStringValue(props.keyData.value)
    isEditingString.value = true
}

/**
 * 取消 String 编辑。
 * 放弃 textarea 中未保存内容，并恢复到最近一次从 Redis 加载到的值。
 */
const handleCancelEditString = () => {
    stringValue.value = normalizeStringValue(props.keyData.value)
    isEditingString.value = false
}

/**
 * 保存 String 值。
 * 通过 preload 暴露的 executeCommand 调用 Redis SET，成功后通知父组件刷新详情。
 */
const handleSaveString = async () => {
    if (saving.value) {
        return
    }

    saving.value = true

    try {
        // 使用当前详情里的 key 名称作为 SET 目标，避免只保存 textarea 内容而丢失 Key 上下文。
        const result = await window.api.redis.executeCommand(props.tabId, 'SET', [
            props.keyData.key,
            stringValue.value
        ])

        if (!result.success) {
            ElMessage.error(result.error || t('keyDetailPanels.string.messages.saveFail'))
            return
        }

        isEditingString.value = false
        ElMessage.success(t('keyDetailPanels.common.messages.saveSuccess'))
        emit('refresh')
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.string.messages.saveFail'))
    } finally {
        saving.value = false
    }
}

// 监听 Key 数据变化：切换 Key 或父组件刷新后，同步 textarea 内容并退出编辑态。
watch(
    () => props.keyData,
    (nextKeyData) => {
        stringValue.value = normalizeStringValue(nextKeyData?.value)
        isEditingString.value = false
        saving.value = false
    },
    {immediate: true}
)
</script>

<style scoped>
/* String 面板根容器：纵向布局，保证文本区域能吃满右侧详情剩余空间。 */
.string-viewer {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-direction: column;
}

/* 工具栏：固定高度，不参与内容区滚动。 */
.string-toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    margin-bottom: 12px;
}

/* 文本容器：承接 textarea 的满高布局。 */
.value-container {
    display: flex;
    width: 100%;
    min-height: 0;
    flex: 1;
    flex-direction: column;
}

/* Element Plus 输入组件外层：填满文本容器。 */
.value-textarea {
    flex: 1;
    height: 100%;
    min-height: 0;
}

/* textarea 内层：使用等宽字体展示序列化文本、JSON 或命令输出类内容。 */
.value-textarea :deep(.el-textarea__inner) {
    height: 100% !important;
    resize: none;
    font-size: 14px;
    line-height: 1.8;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    box-shadow: 0 0 0 1px var(--el-input-border-color) !important;
    transition: border-color 0.2s, box-shadow 0.2s;
}

/* 编辑态边框：用户一眼能区分当前 textarea 是否可写。 */
.value-textarea :deep(.el-textarea__inner:not([readonly])) {
    border-color: var(--el-color-primary) !important;
}

/* 编辑态悬浮反馈：沿用 Element Plus 输入框 hover 边框色。 */
.value-textarea :deep(.el-textarea__inner:not([readonly]):hover) {
    box-shadow: 0 0 0 1px var(--el-input-hover-border-color) !important;
}

/* 编辑态聚焦反馈：聚焦时用主题色强化当前编辑位置。 */
.value-textarea :deep(.el-textarea__inner:not([readonly]):focus) {
    box-shadow: 0 0 0 1px var(--el-color-primary) !important;
}
</style>
