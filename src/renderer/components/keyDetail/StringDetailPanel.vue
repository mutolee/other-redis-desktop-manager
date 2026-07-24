<!--
    StringDetailPanel.vue
    描述：Redis String 类型 Key 的详情面板。
    职责：展示 String 值内容，并提供编辑、保存、取消能力。
-->
<template>
    <!-- String 主体区域：工具栏固定在顶部，文本内容区域占满剩余高度。 -->
    <div class="string-viewer">
        <!-- String 工具栏：左侧控制编辑状态，右侧在预览模式切换 value 展示格式。 -->
        <div class="string-toolbar">
            <div class="string-toolbar-actions">
                <template v-if="!isEditingString">
                    <el-button
                        v-if="valueTruncated"
                        type="primary"
                        plain
                        :loading="loadingFullValue"
                        @click="handleLoadFullValue"
                    >
                        <el-icon>
                            <Download/>
                        </el-icon>
                        {{ t('keyDetailPanels.string.loadFull') }}
                    </el-button>
                    <el-button
                        v-else
                        type="primary"
                        @click="handleEditString"
                    >
                        <el-icon>
                            <Edit/>
                        </el-icon>
                        {{ t('keyDetailPanels.common.edit') }}
                    </el-button>
                </template>
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

            <div v-if="!isEditingString" class="string-format-control">
                <span class="format-label">{{ t('valueFormats.label') }}</span>
                <ValueFormatSelect v-model="selectedValueFormat"/>
            </div>
        </div>

        <!-- 截断预览提示：说明当前展示范围，完整内容由用户主动加载。 -->
        <div v-if="valueTruncated" class="string-preview-notice">
            <el-icon class="string-preview-notice-icon">
                <Attention/>
            </el-icon>
            <span>
                {{ t('keyDetailPanels.string.previewNotice', {
                    loaded: formatByteSize(loadedBytes),
                    total: formatByteSize(totalBytes)
                }) }}
            </span>
        </div>

        <!-- String 解析提示：解析失败时保留原始 value 展示，并提示用户当前格式不匹配。 -->
        <el-alert
            v-if="formatWarningMessage"
            class="format-warning"
            :title="formatWarningMessage"
            type="warning"
            show-icon
            :closable="false"
        />

        <!-- String 内容区：继续使用 textarea，滚动条样式由全局样式统一接管。 -->
        <div class="value-container">
            <el-input
                :model-value="currentTextareaValue"
                type="textarea"
                :readonly="!isEditingString"
                :disabled="saving"
                class="value-textarea"
                @update:model-value="handleStringValueInput"
            />
        </div>
    </div>
</template>

<script setup>
import {computed, ref, watch} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import {Attention, Check, Close, Download, Edit} from '@icon-park/vue-next'
import {useI18n} from '../../i18n/index.js'
import ValueFormatSelect from '../common/ValueFormatSelect.vue'
import {DEFAULT_VALUE_FORMAT_TYPE, formatValueForDisplay} from '../../utils/valueFormatters/index.js'
import {formatByteSize} from '../../utils/byteSizeUtil.js'

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

// 对外事件：保存成功后刷新详情；完整 Value 加载后同步父级 Key 数据，保证顶部复制命令使用完整内容。
const emit = defineEmits(['refresh', 'value-loaded'])

// 编辑状态：控制工具栏按钮、textarea 只读态和保存流程。
const isEditingString = ref(false)

// 保存状态：防止重复提交，并给保存按钮提供 loading 反馈。
const saving = ref(false)

// 完整 Value 加载状态：控制按钮 loading，并避免重复发起大数据 IPC 请求。
const loadingFullValue = ref(false)

// String 编辑值：与 textarea 双向绑定，进入编辑时基于当前 keyData.value 初始化。
const stringValue = ref('')

// 当前已加载的 String 文本与原始字节：首屏可能只是预览，主动加载后替换为完整内容。
const loadedValue = ref('')
const loadedValueRawBase64 = ref('')

// String 字节状态：用于展示预览范围，并决定是否允许直接进入编辑模式。
const totalBytes = ref(0)
const loadedBytes = ref(0)
const valueTruncated = ref(false)

// 当前预览展示格式：只影响只读预览，不参与编辑和保存序列化。
const selectedValueFormat = ref(DEFAULT_VALUE_FORMAT_TYPE)

// 超大 String 主动完整加载前的确认阈值，避免一次 IPC 在无提示时传输过多数据。
const FULL_VALUE_CONFIRM_BYTES = 50 * 1024 * 1024

// 预览解析结果：在非编辑模式下按用户选择的格式展示 String value。
const formattedValueResult = computed(() => formatValueForDisplay(
    loadedValue.value,
    selectedValueFormat.value,
    {rawBase64: loadedValueRawBase64.value}
))

// textarea 当前展示值：编辑时始终使用原始值，预览时使用解析后的展示文本。
const currentTextareaValue = computed(() => (
    isEditingString.value ? stringValue.value : formattedValueResult.value.text
))

// 解析失败提示：格式不匹配时不阻塞查看，textarea 中仍展示原始 value。
const formatWarningMessage = computed(() => {
    if (isEditingString.value || formattedValueResult.value.success) {
        return ''
    }

    return t('valueFormats.messages.parseFail', {value: formattedValueResult.value.error})
})

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
    if (valueTruncated.value) {
        ElMessage.warning(t('keyDetailPanels.string.messages.loadFullBeforeEdit'))
        return
    }

    stringValue.value = loadedValue.value
    isEditingString.value = true
}

/**
 * 取消 String 编辑。
 * 放弃 textarea 中未保存内容，并恢复到最近一次从 Redis 加载到的值。
 */
const handleCancelEditString = () => {
    stringValue.value = loadedValue.value
    isEditingString.value = false
}

/**
 * 主动读取完整 String Value。
 * 超过确认阈值时先提示内存风险，用户确认后再执行可能较大的 IPC 数据传输。
 */
const handleLoadFullValue = async () => {
    if (loadingFullValue.value || !valueTruncated.value) {
        return
    }

    const requestKey = props.keyData.key

    try {
        let confirmed = false

        if (totalBytes.value >= FULL_VALUE_CONFIRM_BYTES) {
            await ElMessageBox.confirm(
                t('keyDetailPanels.string.confirmLoadFull.message', {value: formatByteSize(totalBytes.value)}),
                t('keyDetailPanels.string.confirmLoadFull.title'),
                {
                    confirmButtonText: t('keyDetailPanels.string.confirmLoadFull.confirmButton'),
                    cancelButtonText: t('common.cancel'),
                    type: 'warning'
                }
            )
            confirmed = true
        }

        loadingFullValue.value = true
        let response = await window.api.redis.getFullStringValue(props.tabId, requestKey, {confirmed})

        if (!response.success) {
            ElMessage.error(response.error || t('keyDetailPanels.string.messages.loadFullFail'))
            return
        }

        // Value 在预览后可能被外部放大，main 以最新 STRLEN 为准重新要求确认。
        if (response.data?.confirmationRequired) {
            await ElMessageBox.confirm(
                t('keyDetailPanels.string.confirmLoadFull.message', {value: formatByteSize(response.data.size)}),
                t('keyDetailPanels.string.confirmLoadFull.title'),
                {
                    confirmButtonText: t('keyDetailPanels.string.confirmLoadFull.confirmButton'),
                    cancelButtonText: t('common.cancel'),
                    type: 'warning'
                }
            )
            response = await window.api.redis.getFullStringValue(props.tabId, requestKey, {confirmed: true})

            if (!response.success) {
                ElMessage.error(response.error || t('keyDetailPanels.string.messages.loadFullFail'))
                return
            }
        }

        // Key 在请求期间被重命名或详情已刷新时，旧请求结果不再回写当前面板。
        if (requestKey !== props.keyData.key) {
            return
        }

        const fullValueData = response.data || {}
        loadedValue.value = normalizeStringValue(fullValueData.value)
        loadedValueRawBase64.value = fullValueData.valueRawBase64 || ''
        totalBytes.value = Number(fullValueData.size) || 0
        loadedBytes.value = Number(fullValueData.loadedBytes) || totalBytes.value
        valueTruncated.value = Boolean(fullValueData.valueTruncated)
        stringValue.value = loadedValue.value
        selectedValueFormat.value = DEFAULT_VALUE_FORMAT_TYPE
        emit('value-loaded', fullValueData)
        ElMessage.success(t('keyDetailPanels.string.messages.loadFullSuccess'))
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(error.message || t('keyDetailPanels.string.messages.loadFullFail'))
        }
    } finally {
        loadingFullValue.value = false
    }
}

/**
 * 处理 textarea 输入。
 * 只有编辑模式允许写入原始 String 值，预览模式的格式化内容不回写到编辑状态。
 *
 * @param {string} value textarea 最新输入值
 */
const handleStringValueInput = (value) => {
    if (isEditingString.value) {
        stringValue.value = value
    }
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
        ], {source: 'key-detail'})

        if (!result.success) {
            ElMessage.error(result.error || t('keyDetailPanels.string.messages.saveFail'))
            return
        }

        // 保存后先回到默认文本预览，避免父级刷新前旧解析警告短暂闪现。
        selectedValueFormat.value = DEFAULT_VALUE_FORMAT_TYPE
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
        loadedValue.value = normalizeStringValue(nextKeyData?.value)
        loadedValueRawBase64.value = nextKeyData?.valueRawBase64 || ''
        totalBytes.value = Number(nextKeyData?.size) || 0
        loadedBytes.value = Number(nextKeyData?.loadedBytes) || 0
        valueTruncated.value = Boolean(nextKeyData?.valueTruncated)
        stringValue.value = loadedValue.value
        selectedValueFormat.value = DEFAULT_VALUE_FORMAT_TYPE
        isEditingString.value = false
        saving.value = false
        loadingFullValue.value = false
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
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

/* 工具栏按钮组：编辑/保存/取消沿用 Element Plus 按钮样式，避免右侧格式选择器挤压按钮。 */
.string-toolbar-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 12px;
}

.string-toolbar-actions :deep(.el-button + .el-button) {
    margin-left: 0;
}

/* 展示格式区域：只在预览模式出现，靠右展示当前 value 解析方式。 */
.string-format-control {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
}

.format-label {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    white-space: nowrap;
}

/* 截断预览说明：轻量底色与正文区分，提示信息保持单行优先并允许窄窗口换行。 */
.string-preview-notice {
    display: flex;
    flex-shrink: 0;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
    padding: 9px 12px;
    color: var(--el-text-color-regular);
    font-size: 13px;
    line-height: 1.6;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
}

.string-preview-notice-icon {
    flex-shrink: 0;
    margin-top: 3px;
    color: var(--el-color-warning);
    font-size: 16px;
}

/* 解析提示：高度由内容自然决定，但和 textarea 保持明确间距。 */
.format-warning {
    flex-shrink: 0;
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
