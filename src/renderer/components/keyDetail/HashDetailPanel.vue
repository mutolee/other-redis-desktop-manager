<!--
    HashDetailPanel.vue
    描述：Redis Hash 类型 Key 的详情展示面板。
    职责：按 Field/Value 展示 Hash 字段，并预留新增、编辑、复制、查看、删除和分段加载入口。
-->
<template>
    <!-- Hash 主体区域：顶部工具栏、字段表格和底部加载操作分区排列。 -->
    <div class="hash-detail-panel">
        <!-- Hash 工具栏：左侧预留新增入口，右侧提供本地 Field/Value 搜索。 -->
        <div class="hash-toolbar">
            <el-button type="primary" :icon="Plus" @click="handleAddField">
                {{ t('keyDetailPanels.common.add') }}
            </el-button>

            <el-input
                v-model="searchKeyword"
                class="field-search-input"
                clearable
                :placeholder="t('keyDetailPanels.hash.searchPlaceholder')"
            >
                <template #prefix>
                    <el-icon>
                        <Search/>
                    </el-icon>
                </template>
            </el-input>
        </div>

        <!-- Hash 表格区域：展示字段名、字段值和预留操作按钮。 -->
        <div class="hash-table-wrap">
            <!-- 虚拟表格：表头固定，内容区只渲染可视行，避免大量 Hash 字段拖慢页面。 -->
            <div class="hash-table virtual-detail-table">
                <div class="virtual-table-header">
                    <div class="virtual-table-cell field-cell">{{ t('keyDetailPanels.common.labels.field') }} ({{ rows.length }})</div>
                    <div class="virtual-table-cell value-cell">{{ t('keyDetailPanels.common.labels.value') }}</div>
                    <div class="virtual-table-cell action-cell">{{ t('keyDetailPanels.common.action') }}</div>
                </div>

                <div class="virtual-table-body">
                    <AutoResizer>
                        <template #default="{ height, width }">
                            <FixedSizeList
                                class-name="virtual-table-list"
                                :data="filteredRows"
                                :total="filteredRows.length"
                                :height="height"
                                :width="width"
                                :item-size="ROW_HEIGHT"
                                :cache="8"
                            >
                                <template #default="{ data, index, style }">
                                    <div v-if="data[index]" class="virtual-table-row" :style="style">
                                        <div class="virtual-table-cell field-cell">
                                            <OverflowTooltip :content="data[index].field">
                                                <el-tag class="field-tag" type="primary" size="small">
                                                    {{ data[index].field }}
                                                </el-tag>
                                            </OverflowTooltip>
                                        </div>
                                        <div class="virtual-table-cell value-cell">
                                            <OverflowTooltip :content="data[index].value">
                                                <span class="value-text" data-overflow-target>{{ data[index].value }}</span>
                                            </OverflowTooltip>
                                        </div>
                                        <div class="virtual-table-cell action-cell">
                                            <div class="row-actions">
                                                <el-tooltip :content="t('keyDetailPanels.common.edit')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="success" plain :icon="Edit" @click="handleEditField(data[index])"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.copyCommand')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="primary" plain :icon="DocumentCopy" @click="handleCopyFieldCommand(data[index])"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.view')" placement="top" :show-after="200">
                                                    <el-button circle size="small" plain :icon="View" @click="handleViewField(data[index])"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.delete')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="danger" :icon="Delete" :loading="deletingField === data[index].field" @click="handleDeleteField(data[index])"/>
                                                </el-tooltip>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </FixedSizeList>
                        </template>
                    </AutoResizer>
                </div>
            </div>
        </div>

        <DetailLoadFooter
            :has-more="hasMore"
            :loading-more="isLoadingMore"
            :loading-all="isLoadingAll"
            @load-all="handleLoadAll"
            @load-more="handleLoadMore"
        />
        <!-- Hash 字段编辑弹窗：新增和编辑共用同一套字段表单。 -->
        <el-dialog
            v-model="fieldEditorVisible"
            width="620px"
            destroy-on-close
            :close-on-click-modal="false"
        >
            <template #header>
                <!-- 弹窗标题：Hash 字段新增和编辑共用表单，使用编辑图标表达字段变更。 -->
                <DialogTitle :icon="Edit" :title="fieldEditorTitle"/>
            </template>

            <el-form label-width="72px" class="field-editor-form" @submit.prevent>
                <el-form-item :label="t('keyDetailPanels.common.labels.key')" required>
                    <el-input
                        v-model="fieldForm.field"
                        :disabled="savingField"
                        :placeholder="t('keyDetailPanels.hash.fieldPlaceholder')"
                        clearable
                        style="width: 300px"
                    />
                </el-form-item>

                <el-form-item :label="t('keyDetailPanels.common.labels.value')">
                    <el-input
                        v-model="fieldForm.value"
                        type="textarea"
                        class="field-value-textarea"
                        :disabled="savingField"
                        :placeholder="t('keyDetailPanels.common.valuePlaceholder')"
                    />
                </el-form-item>
            </el-form>

            <template #footer>
                <div class="dialog-footer">
                    <el-button :disabled="savingField" @click="fieldEditorVisible = false">
                        {{ t('common.cancel') }}
                    </el-button>
                    <el-button
                        type="primary"
                        :loading="savingField"
                        :disabled="!canSubmitField"
                        @click="handleSaveField"
                    >
                        {{ t('common.confirm') }}
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- Hash 字段查看弹窗：用于完整查看表格里被省略的长 Value。 -->
        <el-dialog
            v-model="fieldViewerVisible"
            width="620px"
            destroy-on-close
        >
            <template #header>
                <!-- 弹窗标题：查看完整 Hash 字段内容，使用预览图标提示只读。 -->
                <DialogTitle :icon="View" :title="t('keyDetailPanels.hash.viewTitle')"/>
            </template>

            <div class="field-viewer">
                <div class="viewer-toolbar">
                    <div class="viewer-field">
                        <span class="viewer-label">{{ t('keyDetailPanels.common.labels.field') }}:</span>
                        <span class="viewer-field-name">{{ viewingField?.field }}</span>
                    </div>

                    <div class="viewer-format-control">
                        <span class="viewer-label">{{ t('valueFormats.label') }}</span>
                        <ValueFormatSelect v-model="selectedValueFormat"/>
                    </div>
                </div>

                <el-alert
                    v-if="viewingFieldFormatWarning"
                    :title="viewingFieldFormatWarning"
                    type="warning"
                    show-icon
                    :closable="false"
                />

                <ViewerTextarea :model-value="viewingFieldDisplayValue" :height="180"/>
            </div>

            <template #footer>
                <!-- 查看弹窗底部操作区：复制当前完整 Value 内容。 -->
                <div class="dialog-footer">
                    <el-button type="primary" @click="handleCopyViewingField">
                        {{ t('keyDetailPanels.common.copy') }}
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import {computed, reactive, ref, watch} from 'vue'
import {ElAutoResizer as AutoResizer, ElMessage, ElMessageBox, FixedSizeList} from 'element-plus'
import {Copy as DocumentCopy, Delete, Edit, Plus, PreviewOpen as View, Search} from '@icon-park/vue-next'
import DialogTitle from '../common/DialogTitle.vue'
import OverflowTooltip from '../common/OverflowTooltip.vue'
import ViewerTextarea from '../common/ViewerTextarea.vue'
import ValueFormatSelect from '../common/ValueFormatSelect.vue'
import DetailLoadFooter from './common/DetailLoadFooter.vue'
import {useI18n} from '../../i18n/index.js'
import {DEFAULT_VALUE_FORMAT_TYPE, formatValueForDisplay} from '../../utils/valueFormatters/index.js'

// 国际化文案读取函数：驱动 Hash 表格、弹窗和操作反馈文案。
const {t} = useI18n()

// 组件入参：tabId 用于 IPC 定位连接，keyData 是 KeyDetailPanel 加载后的 Hash 详情数据。
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

// 搜索关键词：只过滤当前已加载的 Hash 字段，不触发 Redis 查询。
const searchKeyword = ref('')

// 已加载的 Hash 字段：首段来自 keyData.value，后续通过加载更多/加载全部追加。
const loadedFields = ref([])

// Hash 字段总数：由主进程 HLEN/HKEYS 返回，用于严格判断是否还有下一页。
const hashTotalSize = ref(0)

// 加载更多状态：控制底部“加载更多”按钮 loading 和重复点击保护。
const isLoadingMore = ref(false)

// 加载全部状态：控制底部“加载全部”按钮 loading 和重复点击保护。
const isLoadingAll = ref(false)

// 字段编辑弹窗显示状态：新增和编辑共用，具体模式由 fieldEditorMode 控制。
const fieldEditorVisible = ref(false)

// 字段查看弹窗显示状态：用于查看完整 Field/Value 内容。
const fieldViewerVisible = ref(false)

// 字段编辑模式：add 表示新增 Field，edit 表示修改已有 Field 的 Value。
const fieldEditorMode = ref('add')

// 字段表单：保存当前新增/编辑中的 Field 和 Value 草稿。
const fieldForm = reactive({
    originalField: '',
    field: '',
    value: ''
})

// 当前查看中的字段行：用于查看弹窗展示完整内容。
const viewingField = ref(null)

// 当前查看弹窗的 value 展示格式：只影响预览和复制内容，不参与 Hash 写入。
const selectedValueFormat = ref(DEFAULT_VALUE_FORMAT_TYPE)

// 保存字段状态：控制新增/编辑确认按钮 loading 和重复提交保护。
const savingField = ref(false)

// 正在删除的 Field：用于给对应行的删除按钮展示 loading。
const deletingField = ref('')

// 每次 Hash 范围加载数量：和主进程首屏 Hash 加载数量保持一致。
const HASH_PAGE_SIZE = 100

// 虚拟表格固定行高：和当前行内按钮尺寸、文本行高保持一致，保证滚动定位稳定。
const ROW_HEIGHT = 41

// 当前是否还有未加载字段：使用已加载数量和总数比较，避免 HSCAN COUNT 不严格导致判断失真。
const hasMore = computed(() => loadedFields.value.length < hashTotalSize.value)

// 当前是否处于编辑已有字段模式：编辑时 Field 不允许改名，只修改 Value。
const isEditMode = computed(() => fieldEditorMode.value === 'edit')

// 字段编辑弹窗标题：根据新增/编辑模式显示不同文案。
const fieldEditorTitle = computed(() => (
    isEditMode.value ? t('keyDetailPanels.hash.editTitle') : t('keyDetailPanels.hash.addTitle')
))

// 是否允许提交字段表单：Field 必须存在，且当前没有提交中的写操作。
const canSubmitField = computed(() => Boolean(fieldForm.field.trim()) && !savingField.value)

// Hash 表格数据：把 Redis 返回字段转换为表格可以直接消费的行结构。
const rows = computed(() => loadedFields.value.map((item) => ({
    field: String(item?.field ?? ''),
    value: String(item?.value ?? ''),
    valueRawBase64: typeof item?.valueRawBase64 === 'string' ? item.valueRawBase64 : ''
})))

// 当前查看字段的解析结果：优先使用 main 进程返回的原始字节，保证二进制格式解析准确。
const viewingFieldFormatResult = computed(() => formatValueForDisplay(
    viewingField.value?.value,
    selectedValueFormat.value,
    {rawBase64: viewingField.value?.valueRawBase64}
))

// 查看弹窗 textarea 内容：展示当前格式解析后的文本，解析失败时 formatter 会保留原始内容。
const viewingFieldDisplayValue = computed(() => viewingFieldFormatResult.value.text)

// 查看弹窗解析失败提示：沿用 String 详情页的统一提示文案。
const viewingFieldFormatWarning = computed(() => {
    if (viewingFieldFormatResult.value.success) {
        return ''
    }

    return t('valueFormats.messages.parseFail', {value: viewingFieldFormatResult.value.error})
})

// 过滤后的表格数据：搜索框为空时展示全部，输入后按 Field 或 Value 做不区分大小写匹配。
const filteredRows = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()

    if (!keyword) {
        return rows.value
    }

    return rows.value.filter((row) => (
        row.field.toLowerCase().includes(keyword) ||
        row.value.toLowerCase().includes(keyword)
    ))
})

/**
 * 将 Redis 命令参数格式化为 redis-cli 可识别的字符串参数。
 * @param {unknown} value 参数原始值
 * @returns {string} 转义后的命令参数
 */
const formatCommandArg = (value) => JSON.stringify(String(value ?? ''))

/**
 * 构造当前 Hash 字段的 HSET 命令。
 * @param {Object} row Hash 表格行
 * @returns {string} 可复制到命令行执行的 HSET 命令
 */
const buildFieldSetCommand = (row) => {
    return `HSET ${formatCommandArg(props.keyData.key)} ${formatCommandArg(row.field)} ${formatCommandArg(row.value)}`
}

/**
 * 合并 Hash 字段列表。
 * 范围加载理论上不会重复，但保留去重逻辑可兼容刷新期间字段被外部修改的场景。
 * @param {Array} currentItems 当前已加载字段
 * @param {Array} nextItems 本次范围读取返回字段
 * @returns {Array} 合并后的字段列表
 */
const mergeHashFields = (currentItems, nextItems) => {
    const fieldIndexMap = new Map()
    const mergedItems = [...currentItems]

    // 建立已有 Field 的位置索引，后续重复 Field 直接更新值。
    mergedItems.forEach((item, index) => {
        fieldIndexMap.set(String(item.field), index)
    })

    for (const item of nextItems) {
        const field = String(item?.field ?? '')

        if (fieldIndexMap.has(field)) {
            mergedItems[fieldIndexMap.get(field)] = item
            continue
        }

        fieldIndexMap.set(field, mergedItems.length)
        mergedItems.push(item)
    }

    return mergedItems
}

/**
 * 执行 Redis 命令并校验返回。
 * @param {string} command Redis 命令
 * @param {Array<string>} args 命令参数
 * @returns {Promise<unknown>} Redis 原始返回结果
 */
const runRedisCommand = async (command, args) => {
    const response = await window.api.redis.executeCommand(props.tabId, command, args)

    if (!response.success) {
        throw new Error(response.error || t('keyDetailPanels.common.messages.commandFail', {value: command}))
    }

    return response.data?.result
}

/**
 * 在已加载字段中写入或更新指定 Field。
 * @param {string} field 字段名
 * @param {string} value 字段值
 * @param {boolean} isNewField 是否是新增字段
 */
const upsertLoadedField = (field, value, isNewField = false) => {
    const nextFields = [...loadedFields.value]
    const currentIndex = nextFields.findIndex((item) => String(item.field) === field)

    if (currentIndex >= 0) {
        nextFields[currentIndex] = {field, value}
    } else {
        nextFields.unshift({field, value})
    }

    loadedFields.value = nextFields

    if (isNewField) {
        hashTotalSize.value += 1
    }
}

/**
 * 打开新增 Hash 字段弹窗。
 */
const handleAddField = () => {
    fieldEditorMode.value = 'add'
    fieldForm.originalField = ''
    fieldForm.field = ''
    fieldForm.value = ''
    fieldEditorVisible.value = true
}

/**
 * 打开编辑 Hash 字段弹窗。
 * @param {Object} row 当前 Hash 行数据
 */
const handleEditField = (row) => {
    fieldEditorMode.value = 'edit'
    fieldForm.originalField = row.field
    fieldForm.field = row.field
    fieldForm.value = row.value
    fieldEditorVisible.value = true
}

/**
 * 保存 Hash 字段。
 * 新增和改名时先用 HEXISTS 防止误覆盖；改名时用 HSET 新 Field + HDEL 旧 Field 完成。
 */
const handleSaveField = async () => {
    if (!canSubmitField.value) {
        return
    }

    savingField.value = true

    try {
        const field = fieldForm.field.trim()
        const originalField = fieldForm.originalField
        const value = fieldForm.value
        const isFieldRenamed = isEditMode.value && field !== originalField

        if (!isEditMode.value || isFieldRenamed) {
            // 新增或改名时需要先确认 Redis 中不存在目标 Field，避免 HSET 静默覆盖已有 Field。
            const existsResult = await runRedisCommand('HEXISTS', [props.keyData.key, field])
            if (Number(existsResult) > 0) {
                ElMessage.warning(t('keyDetailPanels.hash.messages.fieldExists'))
                return
            }
        }

        await runRedisCommand('HSET', [props.keyData.key, field, value])

        if (isFieldRenamed) {
            // Redis Hash 没有 Field rename 命令，改名通过写入新 Field 后删除旧 Field 实现。
            await runRedisCommand('HDEL', [props.keyData.key, originalField])
            const nextFields = [...loadedFields.value]
            const originalIndex = nextFields.findIndex((item) => String(item.field) === originalField)

            if (originalIndex >= 0) {
                nextFields[originalIndex] = {field, value}
                loadedFields.value = nextFields
            } else {
                upsertLoadedField(field, value, false)
            }
        } else {
            upsertLoadedField(field, value, !isEditMode.value)
        }
        fieldEditorVisible.value = false
        ElMessage.success(isEditMode.value
            ? t('keyDetailPanels.hash.messages.fieldUpdated')
            : t('keyDetailPanels.hash.messages.fieldAdded'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.hash.messages.saveFail'))
    } finally {
        savingField.value = false
    }
}

/**
 * 复制当前 Hash 字段的 HSET 命令。
 * @param {Object} row 当前 Hash 行数据
 */
const handleCopyFieldCommand = async (row) => {
    try {
        await navigator.clipboard.writeText(buildFieldSetCommand(row))
        ElMessage.success(t('keyDetailPanels.common.messages.commandCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.copyCommandFail'))
    }
}

/**
 * 复制查看弹窗中的完整 Hash Value。
 */
const handleCopyViewingField = async () => {
    try {
        // 查看弹窗复制当前解析后的展示内容，不是表格里的 HSET 命令。
        await navigator.clipboard.writeText(viewingFieldDisplayValue.value)
        ElMessage.success(t('keyDetailPanels.common.messages.contentCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.copyContentFail'))
    }
}

/**
 * 打开字段完整内容查看弹窗。
 * @param {Object} row 当前 Hash 行数据
 */
const handleViewField = (row) => {
    viewingField.value = row
    selectedValueFormat.value = DEFAULT_VALUE_FORMAT_TYPE
    fieldViewerVisible.value = true
}

/**
 * 删除 Hash 字段。
 * @param {Object} row 当前 Hash 行数据
 */
const handleDeleteField = async (row) => {
    try {
        await ElMessageBox.confirm(
            t('keyDetailPanels.hash.confirmDelete', {value: row.field}),
            t('keyDetailPanels.hash.deleteTitle'),
            {
                confirmButtonText: t('keyDetail.actions.delete'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
            }
        )

        deletingField.value = row.field
        const deleteResult = await runRedisCommand('HDEL', [props.keyData.key, row.field])

        if (Number(deleteResult) <= 0) {
            ElMessage.warning(t('keyDetailPanels.hash.messages.fieldMissing'))
            return
        }

        loadedFields.value = loadedFields.value.filter((item) => String(item.field) !== row.field)
        hashTotalSize.value = Math.max(0, hashTotalSize.value - 1)
        ElMessage.success(t('keyDetailPanels.hash.messages.fieldDeleted'))
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(error.message || t('keyDetailPanels.hash.messages.deleteFail'))
        }
    } finally {
        deletingField.value = ''
    }
}

/**
 * 按下标范围获取下一段 Hash 字段。
 * @param {number} start 字段起始下标
 * @param {number} stop 字段结束下标
 * @returns {Promise<{items:Array, size:number}>} 后端返回字段和最新总长度
 */
const fetchHashRange = async (start, stop) => {
    // 通过 preload 暴露的 IPC 调用主进程，让 Redis 命令仍然留在 main 边界内执行。
    const response = await window.api.redis.getHashRange(
        props.tabId,
        props.keyData.key,
        start,
        stop
    )

    if (!response.success) {
        throw new Error(response.error || t('keyDetailPanels.hash.messages.loadFail'))
    }

    return {
        items: Array.isArray(response.data?.items) ? response.data.items : [],
        size: Number(response.data?.size) || 0
    }
}

/**
 * 追加加载下一段 Hash 字段。
 * 根据当前已加载数量计算下一页范围，成功后追加到 loadedFields。
 */
const handleLoadMore = async () => {
    if (!hasMore.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingMore.value = true

    try {
        const start = loadedFields.value.length
        const stop = Math.min(start + HASH_PAGE_SIZE - 1, hashTotalSize.value - 1)
        const {items, size} = await fetchHashRange(start, stop)

        hashTotalSize.value = size
        loadedFields.value = mergeHashFields(loadedFields.value, items)
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.loadMoreFail'))
    } finally {
        isLoadingMore.value = false
    }
}

/**
 * 一次性加载剩余全部 Hash 字段。
 * 按当前已加载数量到总数末尾发起一次范围读取。
 */
const handleLoadAll = async () => {
    if (!hasMore.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingAll.value = true

    try {
        const start = loadedFields.value.length
        const stop = hashTotalSize.value - 1
        const {items, size} = await fetchHashRange(start, stop)

        hashTotalSize.value = size
        loadedFields.value = mergeHashFields(loadedFields.value, items)
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.loadAllFail'))
    } finally {
        isLoadingAll.value = false
    }
}

// 监听父级重新加载的 Key 详情：切换 Key 或刷新详情时重置已加载字段与总数。
watch(
    () => props.keyData,
    (nextKeyData) => {
        loadedFields.value = Array.isArray(nextKeyData?.value)
            ? [...nextKeyData.value]
            : Object.entries(nextKeyData?.value || {}).map(([field, value]) => ({field, value}))
        hashTotalSize.value = Number(nextKeyData?.size) || loadedFields.value.length
        isLoadingMore.value = false
        isLoadingAll.value = false
    },
    {immediate: true}
)
</script>

<style scoped>
/* Hash 面板根容器：三段式纵向布局，表格区吃满中间剩余空间。 */
.hash-detail-panel {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    background: var(--el-bg-color);
}

/* 工具栏：左右分布，和 List/ZSet 面板保持一致的新增/搜索入口位置。 */
.hash-toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
}

/* 新增按钮：固定普通主按钮高度，避免和搜索框高度不一致。 */
.hash-toolbar :deep(.el-button) {
    height: 32px;
    padding: 0 14px;
    border-radius: 4px;
}

/* 搜索框：固定宽度，贴近参考图右侧搜索入口。 */
.field-search-input {
    width: 250px;
}

/* 搜索框内层：维持 32px 高度，和新增按钮视觉对齐。 */
.field-search-input :deep(.el-input__wrapper) {
    min-height: 32px;
    border-radius: 4px;
}

/* 表格外层：控制中间内容区滚动和底部按钮互不挤压。 */
.hash-table-wrap {
    min-height: 0;
    flex: 1;
}

/* 表格主体：平整数据表风格，和 List/ZSet 详情保持一致。 */
.hash-table {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    font-size: 14px;
    border: 1px solid var(--el-border-color-light);
    box-sizing: border-box;
}

/* 虚拟表格表头：固定在内容区顶部，仅滚动表格行区域。 */
.virtual-table-header {
    display: flex;
    height: 40px;
    flex-shrink: 0;
    color: var(--el-text-color-regular);
    font-weight: 600;
    background: var(--el-fill-color-lighter);
    border-bottom: 1px solid var(--el-border-color-light);
}

/* 虚拟表格主体：承载 FixedSizeList，高数据量下只渲染可视行。 */
.virtual-table-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

/* 自动测量容器：显式撑满主体区，保证虚拟列表拿到正确高度。 */
.virtual-table-body :deep(.el-auto-resizer) {
    width: 100%;
    height: 100%;
}

/* 虚拟表格行：固定高度，和 ROW_HEIGHT 保持一致。 */
.virtual-table-row {
    display: flex;
    height: 41px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
}

/* 虚拟表格单元格：统一处理对齐、边框和长文本裁剪。 */
.virtual-table-cell {
    display: flex;
    min-width: 0;
    padding: 0 12px;
    overflow: hidden;
    align-items: center;
    border-right: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.field-cell {
    width: 360px;
    flex: 0 0 360px;
}

.value-cell {
    flex: 1;
}

.action-cell {
    width: 180px;
    flex: 0 0 180px;
    justify-content: center;
    border-right: 0;
}

/* Field 标签：使用浅蓝标签样式，贴近截图中的字段名视觉。 */
.field-tag {
    max-width: 100%;
    overflow: hidden;
    border-color: var(--el-color-primary-light-7);
    background: var(--el-color-primary-light-9);
    text-overflow: ellipsis;
    vertical-align: middle;
}

/* Field 标签内容：Element Plus 标签内部也要单行省略，避免长字段名撑开标签。 */
.field-tag :deep(.el-tag__content) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 暗黑模式 Field 标签：压低边框亮度，避免浅蓝描边在深色背景下过于刺眼。 */
html.dark .field-tag {
    border-color: color-mix(in srgb, var(--el-color-primary) 18%, var(--el-border-color-darker)) !important;
    background: color-mix(in srgb, var(--el-color-primary) 6%, var(--el-bg-color));
}

/* Value 文本：单行省略展示，完整内容通过 Element Plus Tooltip 提示。 */
.value-text {
    display: block;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    color: var(--el-text-color-primary);
    line-height: 40px;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
}

/* 行操作按钮组：紧凑排列，按钮间距由 gap 统一控制。 */
.row-actions {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

/* 行操作按钮：固定 24px 圆形尺寸，贴近参考图中的小图标操作。 */
.row-actions :deep(.el-button) {
    width: 24px;
    height: 24px;
    padding: 0;
    margin-left: 0;
}


/* 字段编辑表单：给弹窗内容留出稳定间距，避免 textarea 贴边。 */
.field-editor-form {
    padding: 4px 4px 0 0;
}

/* Hash 字段 Value 文本域：固定高度，长文本通过内部滚动查看。 */
.field-value-textarea :deep(.el-textarea__inner) {
    height: 180px;
    min-height: 180px !important;
    max-height: 180px;
    resize: none;
    line-height: 1.7;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 弹窗底部操作：右对齐并清除 Element Plus 按钮默认相邻 margin 干扰。 */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.dialog-footer :deep(.el-button) {
    margin-left: 0;
}

/* 查看弹窗主体：工具栏、解析提示和 Value 上下排列。 */
.field-viewer {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* 查看弹窗工具栏：左侧展示 Field，右侧切换 value 解析格式。 */
.viewer-toolbar {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

/* 查看弹窗 Field 行：单行展示字段名，过长时省略。 */
.viewer-field {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 8px;
    color: var(--el-text-color-regular);
}

.viewer-format-control {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
}

.viewer-label {
    flex-shrink: 0;
    color: var(--el-text-color-secondary);
}

.viewer-field-name {
    min-width: 0;
    overflow: hidden;
    color: var(--el-text-color-primary);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

</style>
