<!--
    StreamDetailPanel.vue
    描述：Redis Stream 类型 Key 的详情展示面板。
    职责：展示 Stream entries，支持按 ID 范围查询、分段加载，并通过两级 drawer 查看消费组和消费者状态。
-->
<template>
    <!-- Stream 主体区域：顶部工具栏、entries 虚拟表格、底部加载操作纵向排列。 -->
    <div class="stream-detail-panel">
        <!-- Stream 工具栏：左侧预留新增和消费组入口，右侧提供 ID 范围查询。 -->
        <div class="stream-toolbar">
            <div class="toolbar-left">
                <el-button type="primary" :icon="Plus" @click="handleAddEntry">
                    {{ t('keyDetailPanels.common.add') }}
                </el-button>

                <el-button plain @click="openGroupsDrawer">
                    {{ t('keyDetailPanels.stream.groupsAndConsumers') }}
                </el-button>
            </div>

            <div class="toolbar-right">
                <el-input
                    v-model="rangeMinId"
                    class="range-input"
                    clearable
                    :placeholder="t('keyDetailPanels.stream.minId')"
                    @keyup.enter="handleRangeSearch"
                >
                    <template #prefix>
                        <el-icon>
                            <Search/>
                        </el-icon>
                    </template>
                </el-input>
                <span class="range-separator">~</span>
                <el-input
                    v-model="rangeMaxId"
                    class="range-input"
                    clearable
                    :placeholder="t('keyDetailPanels.stream.maxId')"
                    @keyup.enter="handleRangeSearch"
                >
                    <template #prefix>
                        <el-icon>
                            <Search/>
                        </el-icon>
                    </template>
                </el-input>
            </div>
        </div>

        <!-- Entries 表格：使用虚拟列表承载 Stream 消息，避免大量 entry 拖慢渲染。 -->
        <div class="stream-table-wrap">
            <div class="stream-table virtual-detail-table">
                <div class="virtual-table-header">
                    <div class="virtual-table-cell id-cell">{{ t('keyDetailPanels.stream.messageId') }}</div>
                    <div class="virtual-table-cell fields-cell">{{ t('keyDetailPanels.common.labels.fields') }} ({{ rows.length }})</div>
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
                                        <div class="virtual-table-cell id-cell">
                                            <OverflowTooltip :content="data[index].id">
                                                <el-tag class="id-tag" size="small">
                                                    {{ data[index].id }}
                                                </el-tag>
                                            </OverflowTooltip>
                                        </div>
                                        <div class="virtual-table-cell fields-cell">
                                            <OverflowTooltip :content="data[index].summary">
                                                <span class="fields-text" data-overflow-target>{{ data[index].summary }}</span>
                                            </OverflowTooltip>
                                        </div>
                                        <div class="virtual-table-cell action-cell">
                                            <div class="row-actions">
                                                <el-tooltip :content="t('keyDetailPanels.common.copyCommand')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="primary" plain :icon="DocumentCopy" @click="handleCopyEntryCommand(data[index])"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.view')" placement="top" :show-after="200">
                                                    <el-button circle size="small" plain :icon="View" @click="handleViewEntry(data[index])"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.delete')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="danger" :icon="Delete" :loading="deletingEntryId === data[index].id" @click="handleDeleteEntry(data[index])"/>
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
        <!-- Stream Entry 新增弹窗：通过 XADD 写入一条消息，消息 ID 为空时交给 Redis 自动生成。 -->
        <el-dialog
            v-model="entryEditorVisible"
            width="620px"
            destroy-on-close
            :close-on-click-modal="false"
        >
            <template #header>
                <!-- 弹窗标题：Stream Entry 新增使用加号图标，提示会写入一条新消息。 -->
                <DialogTitle :icon="Plus" :title="t('keyDetailPanels.stream.addEntryTitle')"/>
            </template>

            <el-form label-width="86px" class="entry-editor-form" @submit.prevent>
                <el-form-item :label="t('keyDetailPanels.stream.messageId')">
                    <!-- Stream 消息 ID：允许留空交给 Redis 自动生成，也可以一键生成一个合法随机 ID。 -->
                    <el-input
                        v-model="entryForm.messageId"
                        class="message-id-input"
                        :disabled="savingEntry"
                        :placeholder="t('keyDetailPanels.stream.autoMessageIdPlaceholder')"
                        clearable
                    >
                        <template #append>
                            <el-button :disabled="savingEntry" @click="handleGenerateRandomMessageId">
                                {{ t('keyDetailPanels.stream.randomGenerate') }}
                            </el-button>
                        </template>
                    </el-input>
                </el-form-item>

                <!-- Entry Fields：强制使用 JSON 对象格式，新增时展开为同一条 XADD 的 field/value 参数。 -->
                <el-form-item :label="t('keyDetailPanels.common.labels.fields')" required>
                    <el-input
                        v-model="entryForm.fieldsText"
                        type="textarea"
                        class="entry-fields-textarea"
                        :disabled="savingEntry"
                        :placeholder="t('keyDetailPanels.stream.fieldsJsonPlaceholder')"
                    />
                </el-form-item>
            </el-form>

            <template #footer>
                <div class="dialog-footer">
                    <el-button :disabled="savingEntry" @click="entryEditorVisible = false">
                        {{ t('common.cancel') }}
                    </el-button>
                    <el-button
                        type="primary"
                        :loading="savingEntry"
                        :disabled="!canSubmitEntry"
                        @click="handleSaveEntry"
                    >
                        {{ t('common.confirm') }}
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- Stream Entry 查看弹窗：完整展示 ID 与字段列表，避免表格省略影响读取。 -->
        <el-dialog
            v-model="entryViewerVisible"
            width="620px"
            destroy-on-close
        >
            <template #header>
                <!-- 弹窗标题：查看完整 Stream Entry 内容，使用预览图标提示只读。 -->
                <DialogTitle :icon="View" :title="t('keyDetailPanels.stream.viewEntryTitle')"/>
            </template>

            <el-form :label-width="entryViewerLabelWidth" class="entry-viewer-form">
                <el-form-item :label="t('keyDetailPanels.stream.messageId')">
                    <el-input :model-value="viewingEntry.id" readonly style="width: 300px"/>
                </el-form-item>

                <el-form-item :label="t('keyDetailPanels.common.labels.fields')">
                    <ViewerTextarea :model-value="viewingEntryFieldsJson" :height="260"/>
                </el-form-item>
            </el-form>

            <template #footer>
                <!-- 查看弹窗底部操作区：复制当前完整 Fields JSON 内容。 -->
                <div class="dialog-footer">
                    <el-button type="primary" @click="handleCopyViewingEntry">
                        {{ t('keyDetailPanels.common.copy') }}
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 第一层抽屉：展示 Stream Consumer Groups 列表。 -->
        <el-drawer
            v-model="groupsDrawerVisible"
            size="56%"
            :with-header="true"
            :style="streamDrawerStyle"
            append-to-body
            class="stream-groups-drawer"
        >
            <template #header>
                <div class="drawer-header">
                    <el-icon class="drawer-header-icon">
                        <Search/>
                    </el-icon>
                    <el-text size="large">{{ t('keyDetailPanels.stream.groupsAndConsumers') }}</el-text>
                </div>
            </template>

            <div class="drawer-panel">
                <div class="drawer-toolbar">
                    <h3 class="drawer-title">{{ t('keyDetailPanels.stream.consumerGroups') }}</h3>
                    <div class="drawer-actions">
                        <el-button type="primary" :icon="Refresh" :loading="groupsLoading" @click="fetchGroups">
                            {{ t('keyDetailPanels.common.refresh') }}
                        </el-button>
                    </div>
                </div>

                <!-- Groups 表格工具行：搜索框单独位于表格上方右侧，避免挤压标题操作区。 -->
                <div class="drawer-table-tools">
                    <el-input v-model="groupSearchText" class="group-search-input" clearable :placeholder="t('keyDetailPanels.stream.groupSearchPlaceholder')">
                        <template #prefix>
                            <el-icon>
                                <Search/>
                            </el-icon>
                        </template>
                    </el-input>
                </div>

                <el-table v-loading="groupsLoading" :data="filteredGroups" border height="100%" class="groups-table">
                    <template #empty>
                        <!-- Groups 空态：区分搜索无结果和当前 Stream 没有消费组。 -->
                        <div class="drawer-table-empty">
                            <el-empty :image-size="92" :description="groupEmptyDescription"/>
                        </div>
                    </template>

                    <el-table-column prop="name" :label="t('keyDetailPanels.stream.groupName')" min-width="220">
                        <template #default="{ row }">
                            <el-tag type="primary" size="small">{{ row.name }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="consumers" :label="t('keyDetailPanels.stream.consumers')" width="120" align="center"/>
                    <el-table-column :label="t('keyDetailPanels.stream.pending')" width="120" align="center">
                        <template #default="{ row }">
                            <el-tag :type="row.pending > 0 ? 'warning' : 'success'" size="small">{{ row.pending }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="lastDeliveredId" :label="t('keyDetailPanels.stream.lastDeliveredId')" min-width="220">
                        <template #default="{ row }">
                            <el-tag size="small">{{ row.lastDeliveredId || '-' }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('keyDetailPanels.common.action')" width="120" align="center">
                        <template #default="{ row }">
                            <el-button link type="primary" @click="openConsumersDrawer(row)">{{ t('keyDetailPanels.stream.expand') }}</el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </el-drawer>

        <!-- 第二层抽屉：展示指定消费组下的 Consumers。 -->
        <el-drawer
            v-model="consumersDrawerVisible"
            size="46%"
            :with-header="true"
            :style="streamDrawerStyle"
            append-to-body
            class="stream-consumers-drawer"
        >
            <template #header>
                <div class="drawer-header">
                    <el-icon class="drawer-header-icon">
                        <Search/>
                    </el-icon>
                    <el-text size="large">{{ t('keyDetailPanels.stream.groupLabel', {value: selectedGroup?.name || '-'}) }}</el-text>
                </div>
            </template>

            <div class="drawer-panel">
                <div class="consumer-summary">
                    <strong>{{ t('keyDetailPanels.stream.groupLabel', {value: selectedGroup?.name || '-'}) }}</strong>
                    <div class="summary-tags">
                        <el-tag size="small">{{ t('keyDetailPanels.stream.consumersCount', {value: consumerCount}) }}</el-tag>
                        <el-tag size="small" type="warning">{{ t('keyDetailPanels.stream.totalPending', {value: totalPending}) }}</el-tag>
                    </div>
                </div>

                <el-table v-loading="consumersLoading" :data="consumers" border height="100%" class="consumers-table">
                    <template #empty>
                        <!-- Consumers 空态：当前消费组下没有消费者时给出明确提示。 -->
                        <div class="drawer-table-empty">
                            <el-empty :image-size="92" :description="consumersEmptyDescription"/>
                        </div>
                    </template>

                    <el-table-column prop="name" :label="t('keyDetailPanels.stream.consumerName')" min-width="260">
                        <template #default="{ row }">
                            <el-tag size="small">{{ t('keyDetailPanels.stream.consumerLabel', {value: row.name}) }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('keyDetailPanels.common.labels.pending')" width="140" align="center">
                        <template #default="{ row }">
                            <el-tag :type="row.pending > 0 ? 'warning' : 'success'" size="small">{{ row.pending }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column :label="t('keyDetailPanels.stream.idleTime')" width="160" align="center">
                        <template #default="{ row }">
                            {{ formatDuration(row.idle) }}
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </el-drawer>
    </div>
</template>

<script setup>
import {computed, reactive, ref, watch} from 'vue'
import {ElAutoResizer as AutoResizer, ElMessage, ElMessageBox, FixedSizeList} from 'element-plus'
import {Copy as DocumentCopy, Delete, Plus, PreviewOpen as View, Refresh, Search} from '@icon-park/vue-next'
import DialogTitle from '../common/DialogTitle.vue'
import OverflowTooltip from '../common/OverflowTooltip.vue'
import ViewerTextarea from '../common/ViewerTextarea.vue'
import DetailLoadFooter from './common/DetailLoadFooter.vue'
import {useI18n} from '../../i18n/index.js'

// 国际化文案读取函数：驱动 Stream 表格、Entry 弹窗、语言布局和消费组抽屉文案。
const {language, t} = useI18n()

// 组件入参：tabId 用于定位 Redis 连接，keyData 是父组件读取到的 Stream Key 详情。
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

// 已加载的 Stream entries：首段来自 keyData.value，后续通过加载更多/加载全部追加。
const loadedEntries = ref([])

// Stream 总长度：由主进程 XLEN 返回，用于判断是否还有更多 entries。
const streamTotalSize = ref(0)

// ID 范围查询条件：空值时分别映射为 Redis 的最小/最大边界。
const rangeMinId = ref('')
const rangeMaxId = ref('')

// 加载状态：分别控制底部加载按钮，避免重复请求。
const isLoadingMore = ref(false)
const isLoadingAll = ref(false)

// 当前 ID 查询范围是否已经读完：范围查询可能只覆盖全量 Stream 的一部分，需要独立判断。
const rangeExhausted = ref(false)

// Groups 抽屉状态：承载第一层消费组列表。
const groupsDrawerVisible = ref(false)
const groupsLoading = ref(false)
const groups = ref([])
const groupSearchText = ref('')

// Consumers 抽屉状态：承载指定消费组下的消费者列表。
const consumersDrawerVisible = ref(false)
const consumersLoading = ref(false)
const selectedGroup = ref(null)
const consumers = ref([])

// Entry 新增弹窗显示状态：只负责打开/关闭 XADD 表单。
const entryEditorVisible = ref(false)

// Entry 查看弹窗显示状态：用于完整查看表格中被省略的字段内容。
const entryViewerVisible = ref(false)

// Entry 新增表单：messageId 为空时在提交阶段转换为 Redis 自动 ID `*`。
const entryForm = reactive({
    messageId: '',
    fieldsText: ''
})

// 当前查看中的 Entry：和表格行解耦，避免弹窗展示时被列表刷新影响。
const viewingEntry = reactive({
    id: '',
    fields: []
})

// 查看弹窗 Fields JSON：把 Stream field/value 数组格式化为对象文本，便于用户整体复制和阅读。
const viewingEntryFieldsJson = computed(() => {
    const fieldObject = {}

    // Stream 理论上允许重复 field；JSON 对象无法保留重复键，这里以后出现的同名字段为准。
    for (const item of viewingEntry.fields) {
        fieldObject[item.field] = item.value
    }

    return JSON.stringify(fieldObject, null, 4)
})

// 查看弹窗表单标签宽度：英文 Message ID 更长，单独加宽避免换行。
const entryViewerLabelWidth = computed(() => language.value === 'zh-CN' ? '72px' : '96px')

// Entry 保存状态：控制新增弹窗确认按钮 loading 与重复提交保护。
const savingEntry = ref(false)

// 正在删除的 Entry ID：用于给对应行的删除按钮显示 loading。
const deletingEntryId = ref('')

// 每次 Stream 加载数量：和主进程首屏 Stream 加载数量保持一致。
const STREAM_PAGE_SIZE = 100

// 虚拟表格固定行高：和当前行内按钮尺寸、文本行高保持一致，保证滚动定位稳定。
const ROW_HEIGHT = 41

// Stream 抽屉窗口样式：参考 SettingsDrawer，避开顶部标题栏，避免抽屉覆盖窗口控制区域。
const streamDrawerStyle = {
    top: '40px',
    height: 'calc(100vh - 40px)'
}

// 当前是否还有未加载 entries：使用已加载数量和总数比较。
const hasMore = computed(() => !rangeExhausted.value && loadedEntries.value.length < streamTotalSize.value)

// 是否允许提交新增 Entry：Stream 至少需要一组 field/value，且当前没有提交中的写操作。
const canSubmitEntry = computed(() => {
    const {fields, errors} = parseEntryFieldsText(entryForm.fieldsText)

    return fields.length > 0 && errors.length === 0 && !savingEntry.value
})

// Stream 表格数据：保证字段类型稳定，便于虚拟列表渲染。
const rows = computed(() => loadedEntries.value.map((item) => normalizeEntry(item)))

// 当前展示行：预留后续本地过滤入口，当前直接展示已加载 entries。
const filteredRows = computed(() => rows.value)

// Groups 搜索结果：只过滤当前已加载的消费组名称，不触发 Redis 查询。
const filteredGroups = computed(() => {
    const keyword = groupSearchText.value.trim().toLowerCase()

    if (!keyword) {
        return groups.value
    }

    return groups.value.filter((group) => group.name.toLowerCase().includes(keyword))
})

// Groups 空态文案：搜索状态下提示未命中，否则提示当前 Stream 没有消费组。
const groupEmptyDescription = computed(() =>
    groupSearchText.value.trim()
        ? t('keyDetailPanels.stream.empty.noMatchedGroups')
        : t('keyDetailPanels.stream.empty.noGroups')
)

// Consumers 空态文案：跟随当前选中的 Group，避免二级抽屉空态语义模糊。
const consumersEmptyDescription = computed(() =>
    selectedGroup.value?.name
        ? t('keyDetailPanels.stream.empty.noConsumers', {value: selectedGroup.value.name})
        : t('keyDetailPanels.stream.empty.selectGroup')
)

// 当前消费者数量：用于第二层 drawer 顶部摘要。
const consumerCount = computed(() => consumers.value.length)

// 当前消费组 pending 总数：用于第二层 drawer 顶部摘要。
const totalPending = computed(() => consumers.value.reduce((sum, item) => sum + Number(item.pending || 0), 0))

/**
 * 格式化毫秒级空闲时间。
 * @param {number} ms Redis XINFO CONSUMERS 返回的 idle 毫秒数
 * @returns {string} 人类可读的耗时文本
 */
const formatDuration = (ms) => {
    const value = Number(ms)

    if (!Number.isFinite(value) || value <= 0) {
        return '0s'
    }

    if (value < 1000) {
        return `${value}ms`
    }

    return `${Number((value / 1000).toFixed(1))}s`
}

/**
 * 将 Redis 命令参数格式化为 redis-cli 可复制执行的字符串。
 * @param {unknown} value 参数原始值
 * @returns {string} 带转义的命令参数
 */
const formatCommandArg = (value) => JSON.stringify(String(value ?? ''))

/**
 * 执行 Redis 命令并统一处理失败结果。
 * @param {string} command Redis 命令名称
 * @param {Array<string|number>} args 命令参数
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
 * 解析新增 Entry 的 Fields JSON 文本。
 * 格式约定为 JSON 对象，例如 {"key1":"value1"}，对象属性名会作为 Stream Field。
 * @param {string} text 用户输入的 Fields 文本
 * @returns {{fields:Array<{field:string,value:string}>, errors:Array<string>}} 解析结果和格式错误
 */
const parseEntryFieldsText = (text) => {
    const fields = []
    const errors = []
    const source = text.trim()

    if (!source) {
        return {fields, errors}
    }

    let parsedValue = null

    try {
        parsedValue = JSON.parse(source)
    } catch (error) {
        errors.push(t('keyDetailPanels.stream.messages.fieldsJsonInvalid'))
        return {fields, errors}
    }

    if (!parsedValue || Array.isArray(parsedValue) || typeof parsedValue !== 'object') {
        errors.push(t('keyDetailPanels.stream.messages.fieldsMustObject'))
        return {fields, errors}
    }

    Object.entries(parsedValue).forEach(([rawField, rawValue]) => {
        const field = String(rawField).trim()

        if (!field) {
            errors.push(t('keyDetailPanels.stream.messages.emptyFieldName'))
            return
        }

        // Redis Stream 的 field/value 最终都是字符串，复杂值保留为 JSON 字符串写入。
        const value = typeof rawValue === 'string'
            ? rawValue
            : JSON.stringify(rawValue)

        fields.push({field, value: value ?? ''})
    })

    return {fields, errors}
}

/**
 * 规范化 Stream Entry 字段，确保表格、查看弹窗和复制命令拿到稳定结构。
 * @param {Object} entry Stream entry 原始数据
 * @returns {{id:string, fields:Array<{field:string,value:string}>, summary:string}} 规范化后的 entry
 */
const normalizeEntry = (entry) => {
    const fields = Array.isArray(entry?.fields)
        ? entry.fields.map((item) => ({
            field: String(item?.field ?? ''),
            value: String(item?.value ?? '')
        }))
        : []

    return {
        id: String(entry?.id ?? ''),
        fields,
        summary: fields.map((item) => `${item.field}: ${item.value}`).join(', ')
    }
}

/**
 * 构造当前 Stream Entry 的 XADD 命令文本。
 * 注意：复制已有 entry 时保留原 ID，适合迁移到空 Stream；在同一 Stream 重放可能因 ID 顺序限制失败。
 * @param {Object} entry Stream entry 行数据
 * @returns {string} 可复制到命令行执行的 XADD 命令
 */
const buildEntryAddCommand = (entry) => {
    const normalizedEntry = normalizeEntry(entry)
    const fieldArgs = normalizedEntry.fields.flatMap((item) => [
        formatCommandArg(item.field),
        formatCommandArg(item.value)
    ])

    return `XADD ${formatCommandArg(props.keyData.key)} ${formatCommandArg(normalizedEntry.id)} ${fieldArgs.join(' ')}`
}

/**
 * 追加合并 Stream entries。
 * @param {Array} currentItems 当前已加载 entries
 * @param {Array} nextItems 本次读取返回 entries
 * @returns {Array} 去重后的 entries
 */
const mergeEntries = (currentItems, nextItems) => {
    const idSet = new Set(currentItems.map((item) => item.id))
    const mergedItems = [...currentItems]

    // XREVRANGE 翻页使用排除边界，但仍保留去重保护，避免外部刷新期间数据重复。
    for (const item of nextItems) {
        if (!idSet.has(item.id)) {
            idSet.add(item.id)
            mergedItems.push(item)
        }
    }

    return mergedItems
}

/**
 * 读取指定 ID 范围内的 Stream entries。
 * @param {string} maxId 最大 ID，倒序读取的起点
 * @param {string} minId 最小 ID，倒序读取的终点
 * @returns {Promise<{items:Array, size:number}>}
 */
const fetchStreamRange = async (maxId, minId) => {
    const response = await window.api.redis.getStreamRange(
        props.tabId,
        props.keyData.key,
        maxId,
        minId,
        STREAM_PAGE_SIZE
    )

    if (!response.success) {
        throw new Error(response.error || t('keyDetailPanels.stream.messages.loadFail'))
    }

    return {
        items: Array.isArray(response.data?.items) ? response.data.items : [],
        size: Number(response.data?.size) || 0
    }
}

/**
 * 按当前范围重新查询 Stream entries。
 */
const handleRangeSearch = async () => {
    if (isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingMore.value = true

    try {
        const {items, size} = await fetchStreamRange(rangeMaxId.value || '+', rangeMinId.value || '-')
        streamTotalSize.value = size
        loadedEntries.value = items
        rangeExhausted.value = items.length < STREAM_PAGE_SIZE
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.stream.messages.queryFail'))
    } finally {
        isLoadingMore.value = false
    }
}

/**
 * 加载更旧的一页 Stream entries。
 */
const handleLoadMore = async () => {
    if (!hasMore.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingMore.value = true

    try {
        const lastEntry = loadedEntries.value[loadedEntries.value.length - 1]
        const nextMaxId = lastEntry?.id ? `(${lastEntry.id}` : (rangeMaxId.value || '+')
        const {items, size} = await fetchStreamRange(nextMaxId, rangeMinId.value || '-')

        streamTotalSize.value = size
        loadedEntries.value = mergeEntries(loadedEntries.value, items)
        rangeExhausted.value = items.length < STREAM_PAGE_SIZE
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.loadMoreFail'))
    } finally {
        isLoadingMore.value = false
    }
}

/**
 * 循环加载当前范围内剩余的全部 Stream entries。
 */
const handleLoadAll = async () => {
    if (!hasMore.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingAll.value = true

    try {
        while (loadedEntries.value.length < streamTotalSize.value) {
            const beforeLength = loadedEntries.value.length
            const lastEntry = loadedEntries.value[loadedEntries.value.length - 1]
            const nextMaxId = lastEntry?.id ? `(${lastEntry.id}` : (rangeMaxId.value || '+')
            const {items, size} = await fetchStreamRange(nextMaxId, rangeMinId.value || '-')

            streamTotalSize.value = size
            loadedEntries.value = mergeEntries(loadedEntries.value, items)
            rangeExhausted.value = items.length < STREAM_PAGE_SIZE

            // 如果本轮没有新增数据，说明范围已经读完，避免极端情况下死循环。
            if (loadedEntries.value.length === beforeLength || items.length === 0) {
                rangeExhausted.value = true
                break
            }
        }
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.loadAllFail'))
    } finally {
        isLoadingAll.value = false
    }
}

/**
 * 打开消费组抽屉并加载最新 group 列表。
 */
const openGroupsDrawer = async () => {
    groupsDrawerVisible.value = true
    await fetchGroups()
}

/**
 * 加载 Stream 消费组列表。
 */
const fetchGroups = async () => {
    groupsLoading.value = true

    try {
        const response = await window.api.redis.getStreamGroups(props.tabId, props.keyData.key)

        if (!response.success) {
            throw new Error(response.error || t('keyDetailPanels.stream.messages.loadGroupsFail'))
        }

        groups.value = Array.isArray(response.data?.groups) ? response.data.groups : []
    } catch (error) {
        groups.value = []
        ElMessage.error(error.message || t('keyDetailPanels.stream.messages.loadGroupsFail'))
    } finally {
        groupsLoading.value = false
    }
}

/**
 * 打开指定消费组的消费者抽屉。
 * @param {Object} group 当前消费组
 */
const openConsumersDrawer = async (group) => {
    selectedGroup.value = group
    consumersDrawerVisible.value = true
    consumersLoading.value = true

    try {
        const response = await window.api.redis.getStreamConsumers(props.tabId, props.keyData.key, group.name)

        if (!response.success) {
            throw new Error(response.error || t('keyDetailPanels.stream.messages.loadConsumersFail'))
        }

        consumers.value = Array.isArray(response.data?.consumers) ? response.data.consumers : []
    } catch (error) {
        consumers.value = []
        ElMessage.error(error.message || t('keyDetailPanels.stream.messages.loadConsumersFail'))
    } finally {
        consumersLoading.value = false
    }
}

/**
 * 随机生成 Stream 消息 ID。
 * Redis Stream ID 使用 毫秒时间戳-序号 格式，这里生成可读且合法的手动 ID。
 */
const handleGenerateRandomMessageId = () => {
    // 序号部分控制在较小范围内，既能随机，又不会让输入框展示过长。
    const sequence = Math.floor(Math.random() * 1000)
    entryForm.messageId = `${Date.now()}-${sequence}`
}

/**
 * 打开新增 Stream Entry 弹窗。
 */
const handleAddEntry = () => {
    entryForm.messageId = ''
    entryForm.fieldsText = ''
    entryEditorVisible.value = true
}

/**
 * 保存新增 Stream Entry。
 * Redis Stream 使用 XADD 追加消息；messageId 留空时使用 `*` 交给 Redis 自动生成。
 */
const handleSaveEntry = async () => {
    if (!canSubmitEntry.value) {
        return
    }

    savingEntry.value = true

    try {
        const messageId = entryForm.messageId.trim() || '*'
        const {fields, errors} = parseEntryFieldsText(entryForm.fieldsText)

        if (errors.length > 0) {
            ElMessage.warning(errors[0])
            return
        }

        if (fields.length === 0) {
            ElMessage.warning(t('keyDetailPanels.stream.messages.fieldRequired'))
            return
        }

        const fieldArgs = fields.flatMap((item) => [item.field, item.value])
        const createdId = await runRedisCommand('XADD', [props.keyData.key, messageId, ...fieldArgs])
        const normalizedEntry = normalizeEntry({
            id: createdId || messageId,
            fields
        })

        // XREVRANGE 首屏按新到旧展示，新增成功后直接插到本地列表顶部，避免重新拉取导致滚动位置跳动。
        loadedEntries.value = [normalizedEntry, ...loadedEntries.value]
        streamTotalSize.value += 1
        entryEditorVisible.value = false
        ElMessage.success(t('keyDetailPanels.stream.messages.entryAdded'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.stream.messages.addEntryFail'))
    } finally {
        savingEntry.value = false
    }
}

/**
 * 复制当前 Stream Entry 的 XADD 命令。
 * @param {Object} row 当前 Stream entry 行数据
 */
const handleCopyEntryCommand = async (row) => {
    try {
        await navigator.clipboard.writeText(buildEntryAddCommand(row))
        ElMessage.success(t('keyDetailPanels.common.messages.commandCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.copyCommandFail'))
    }
}

/**
 * 复制查看弹窗中的完整 Stream Fields JSON。
 */
const handleCopyViewingEntry = async () => {
    try {
        // 查看弹窗复制的是格式化后的 Fields JSON，不是表格里的 XADD 命令。
        await navigator.clipboard.writeText(viewingEntryFieldsJson.value || '')
        ElMessage.success(t('keyDetailPanels.common.messages.contentCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.copyContentFail'))
    }
}

/**
 * 打开 Stream Entry 完整查看弹窗。
 * @param {Object} row 当前 Stream entry 行数据
 */
const handleViewEntry = (row) => {
    const normalizedEntry = normalizeEntry(row)

    viewingEntry.id = normalizedEntry.id
    viewingEntry.fields = normalizedEntry.fields
    entryViewerVisible.value = true
}

/**
 * 删除 Stream Entry。
 * @param {Object} row 当前 Stream entry 行数据
 */
const handleDeleteEntry = async (row) => {
    try {
        await ElMessageBox.confirm(
            t('keyDetailPanels.stream.confirmDelete', {value: row.id}),
            t('keyDetailPanels.stream.deleteTitle'),
            {
                confirmButtonText: t('keyDetail.actions.delete'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
            }
        )

        deletingEntryId.value = row.id
        const deleteResult = await runRedisCommand('XDEL', [props.keyData.key, row.id])

        if (Number(deleteResult) <= 0) {
            ElMessage.warning(t('keyDetailPanels.stream.messages.entryMissing'))
            return
        }

        // 删除成功后只从本地已加载列表移除当前 ID，不重新扫描整个 Stream。
        loadedEntries.value = loadedEntries.value.filter((item) => String(item.id) !== row.id)
        streamTotalSize.value = Math.max(0, streamTotalSize.value - 1)
        ElMessage.success(t('keyDetailPanels.stream.messages.entryDeleted'))
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(error.message || t('keyDetailPanels.stream.messages.deleteEntryFail'))
        }
    } finally {
        deletingEntryId.value = ''
    }
}

// 监听父级重新加载的 Key 详情：切换 Key 或刷新详情时重置已加载 entries 与抽屉状态。
watch(
    () => props.keyData,
    (nextKeyData) => {
        loadedEntries.value = Array.isArray(nextKeyData?.value) ? [...nextKeyData.value] : []
        streamTotalSize.value = Number(nextKeyData?.size) || loadedEntries.value.length
        rangeExhausted.value = loadedEntries.value.length < STREAM_PAGE_SIZE
        rangeMinId.value = ''
        rangeMaxId.value = ''
        groups.value = []
        consumers.value = []
        selectedGroup.value = null
        entryEditorVisible.value = false
        entryViewerVisible.value = false
        savingEntry.value = false
        deletingEntryId.value = ''
        isLoadingMore.value = false
        isLoadingAll.value = false
    },
    {immediate: true}
)
</script>

<style scoped>
/* Stream 面板根容器：三段式纵向布局，表格区吃满中间剩余空间。 */
.stream-detail-panel {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    background: var(--el-bg-color);
}

/* 工具栏：左侧业务入口，右侧 ID 范围查询，保持单行稳定布局。 */
.stream-toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
}

.toolbar-left,
.toolbar-right {
    display: flex;
    align-items: center;
}

.stream-toolbar :deep(.el-button) {
    height: 32px;
    padding: 0 14px;
    border-radius: 4px;
}

.range-input {
    width: 200px;
}

.range-input :deep(.el-input__wrapper) {
    min-height: 32px;
    border-radius: 4px;
}

.range-separator {
    color: var(--el-text-color-secondary);
}

/* 表格外层：控制中间内容区滚动和底部按钮互不挤压。 */
.stream-table-wrap {
    min-height: 0;
    flex: 1;
}

/* 虚拟表格主体：固定表头 + 虚拟行列表，避免大量 entry 造成 DOM 压力。 */
.stream-table {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    font-size: 14px;
    border: 1px solid var(--el-border-color-light);
    box-sizing: border-box;
}

.virtual-table-header {
    display: flex;
    height: 40px;
    flex-shrink: 0;
    color: var(--el-text-color-regular);
    font-weight: 600;
    background: var(--el-fill-color-lighter);
    border-bottom: 1px solid var(--el-border-color-light);
}

.virtual-table-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.virtual-table-body :deep(.el-auto-resizer) {
    width: 100%;
    height: 100%;
}

.virtual-table-row {
    display: flex;
    height: 41px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
}

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

.id-cell {
    width: 200px;
    flex: 0 0 200px;
}

.fields-cell {
    flex: 1;
}

.action-cell {
    width: 140px;
    flex: 0 0 140px;
    justify-content: center;
    border-right: 0;
}

.id-tag {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}

.id-tag :deep(.el-tag__content),
.fields-text {
    display: block;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 行操作按钮组：紧凑排列，按钮间距由 gap 统一控制。 */
.row-actions {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.row-actions :deep(.el-button) {
    width: 24px;
    height: 24px;
    padding: 0;
    margin-left: 0;
}


/* Entry 弹窗表单：给输入区留出轻微内边距，避免 textarea 贴边。 */
.entry-editor-form,
.entry-viewer-form {
    padding: 4px 4px 0 0;
}

/* 消息 ID 输入框：Stream ID 一般较短，避免输入框在弹窗里显得过长。 */
.message-id-input {
    width: 300px;
}

/* Entry Fields 文本域：强制输入 JSON 对象，适合直接粘贴结构化 Stream 字段。 */
.entry-fields-textarea :deep(.el-textarea__inner) {
    height: 170px;
    min-height: 170px !important;
    max-height: 170px;
    resize: none;
    line-height: 1.7;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 弹窗底部操作：右对齐并清除 Element Plus 相邻按钮默认 margin，避免 gap 失效。 */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.dialog-footer :deep(.el-button) {
    margin-left: 0;
}

/* Drawer 头部：参考 SettingsDrawer 的图标 + 标题样式，保持抽屉入口风格统一。 */
.drawer-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.drawer-header-icon {
    font-size: 24px;
    color: var(--el-color-primary);
}

/* Drawer 内容：参考 SettingsDrawer 的左上内边距，标题、工具栏和表格纵向布局。 */
.drawer-panel {
    display: flex;
    height: 100%;
    min-height: 0;
    padding: 20px 20px 20px 20px;
    flex-direction: column;
    box-sizing: border-box;
    overflow: hidden;
}

.drawer-toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
}

.drawer-title {
    margin: 0;
    padding-bottom: 10px;
    font-size: 18px;
    border-bottom: 2px solid var(--el-color-primary);
}

.drawer-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* Groups 表格上方工具行：把搜索框独立右对齐，表格主体保持完整宽度。 */
.drawer-table-tools {
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
    margin-bottom: 12px;
}

.group-search-input {
    width: 300px;
}

.groups-table,
.consumers-table {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

/* Drawer 表格空态：覆盖 Element Plus 默认短文本空态，保持抽屉表格区域的居中展示。 */
.drawer-table-empty {
    display: flex;
    min-height: 260px;
    align-items: center;
    justify-content: center;
}

.drawer-table-empty :deep(.el-empty) {
    padding: 28px 0;
}

.drawer-table-empty :deep(.el-empty__description) {
    margin-top: 10px;
}

.consumer-summary {
    display: flex;
    min-height: 40px;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.summary-tags {
    display: flex;
    align-items: center;
    gap: 8px;
}
</style>
