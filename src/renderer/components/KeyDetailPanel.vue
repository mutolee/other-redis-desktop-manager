<!--
    KeyDetailPanel.vue
    描述：Redis Key 详情总控组件。
    职责：加载当前 Key 的类型、TTL、大小和值内容，渲染公共头部，并按 Redis 类型分发到独立详情组件。
-->
<template>
    <div class="key-detail-panel">
        <!-- 空状态：右侧没有打开 Key 时展示统一提示。 -->
        <div v-if="!selectedKey" class="empty-state">
            <el-empty :description="t('keyDetail.empty.selectKey')"/>
        </div>

        <!-- 详情主体：公共头部和类型详情区域分离，保证 String/Hash/List 等组件只关注自己的值内容。 -->
        <template v-else>
            <!-- 公共头部区域：包含 Key 标题操作行和 Size/TTL 元信息行。 -->
            <div class="detail-header-section">
                <!-- 公共头部第一行：类型标签、Key 名称编辑区和右侧操作按钮。 -->
                <div class="detail-header">
                    <div class="detail-title">
                        <el-tag :type="getTagType(keyData?.type)" class="detail-type-tag">
                            {{ keyTypeText }}
                        </el-tag>

                        <el-input
                            v-model="editableKey"
                            class="key-name-input"
                            :disabled="isHeaderReadonly"
                            @keyup.enter="handleRenameKey"
                        />

                        <span v-show="isKeyChanged" class="rename-confirm-wrapper">
                            <el-tooltip
                                v-model:visible="renameTooltipVisible"
                                :content="t('keyDetail.tooltips.submitKeyName')"
                                placement="bottom"
                            >
                                <el-button
                                    type="primary"
                                    class="rename-confirm-btn"
                                    :icon="Check"
                                    :disabled="!canRenameKey"
                                    :loading="renaming"
                                    @click="handleRenameKey"
                                />
                            </el-tooltip>
                        </span>
                    </div>

                    <div class="header-actions">
                        <el-tooltip :content="t('keyDetail.tooltips.refresh')" placement="bottom">
                            <el-button
                                circle
                                :icon="Refresh"
                                :loading="loading"
                                @click="fetchData"
                            />
                        </el-tooltip>

                        <el-tooltip :content="t('keyDetail.tooltips.copyCommand')" placement="bottom">
                            <el-button
                                circle
                                plain
                                type="primary"
                                :icon="CommandCode"
                                :disabled="isHeaderReadonly"
                                @click="handleCopySetCommand"
                            />
                        </el-tooltip>

                        <el-tooltip :content="t('keyDetail.tooltips.deleteKey')" placement="bottom">
                            <el-button
                                circle
                                type="danger"
                                :icon="Delete"
                                :disabled="isHeaderReadonly"
                                :loading="deleting"
                                @click="handleDeleteKey"
                            />
                        </el-tooltip>
                    </div>

                    <div class="header-close-action">
                        <el-tooltip :content="t('keyDetail.tooltips.closeDetail')" placement="bottom">
                            <el-button
                                class="close-detail-btn"
                                @click="emit('close')"
                            >
                                {{ t('keyDetail.actions.close') }}
                            </el-button>
                        </el-tooltip>
                    </div>
                </div>

                <!-- 公共元信息行：左侧显示 Size，右侧提供 TTL 编辑。 -->
                <div class="detail-meta">
                    <div class="meta-item">
                        <span class="meta-label">{{ t('keyDetailPanels.common.labels.size') }}:</span>
                        <span class="meta-value">{{ sizeText }}</span>
                    </div>

                    <div class="ttl-editor">
                        <span class="meta-label">{{ t('keyDetailPanels.common.labels.ttl') }}:</span>
                        <el-input-number
                            v-model="editableTtl"
                            size="small"
                            class="ttl-input"
                            :min="-1"
                            :precision="0"
                            :disabled="isHeaderReadonly"
                        />
                        <span class="ttl-confirm-wrapper">
                            <el-tooltip
                                v-model:visible="ttlTooltipVisible"
                                :content="t('keyDetail.tooltips.submitTtl')"
                                placement="bottom"
                            >
                                <el-button
                                    size="small"
                                    type="primary"
                                    class="ttl-confirm-btn"
                                    :icon="Check"
                                    :disabled="!canChangeTtl"
                                    :loading="changingTtl"
                                    @click="handleTtlChange"
                                />
                            </el-tooltip>
                        </span>
                    </div>
                </div>
            </div>

            <!-- 类型内容区：加载成功后按 Redis 类型渲染对应详情组件。 -->
            <div class="detail-content" v-loading="loading">
                <el-alert
                    v-if="errorMessage"
                    :title="errorMessage"
                    type="error"
                    show-icon
                    :closable="false"
                />
                <div v-else-if="isMissingKey" class="missing-key-empty">
                    <el-empty
                        :description="t('keyDetail.empty.missingKey')"
                    />
                </div>
                <component
                    v-else-if="keyData"
                    :is="detailComponent"
                    :tab-id="tabId"
                    :key-data="keyData"
                    @refresh="fetchData"
                />
            </div>
        </template>
    </div>
</template>

<script setup>
import {computed, ref, watch} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import {Check, Copy as CommandCode, Delete, Refresh} from '@icon-park/vue-next'
import StringDetailPanel from './keyDetail/StringDetailPanel.vue'
import HashDetailPanel from './keyDetail/HashDetailPanel.vue'
import ListDetailPanel from './keyDetail/ListDetailPanel.vue'
import SetDetailPanel from './keyDetail/SetDetailPanel.vue'
import ZSetDetailPanel from './keyDetail/ZSetDetailPanel.vue'
import StreamDetailPanel from './keyDetail/StreamDetailPanel.vue'
import UnsupportedDetailPanel from './keyDetail/UnsupportedDetailPanel.vue'
import {useI18n} from '../i18n/index.js'

// 国际化文案读取函数：驱动详情页空态、提示、确认框和操作反馈文案。
const {t} = useI18n()

// 组件入参：tabId 定位 Redis 连接，selectedKey 决定当前详情面板需要加载哪个 Key。
const props = defineProps({
    tabId: {
        type: String,
        required: true
    },
    selectedKey: {
        type: Object,
        default: null
    }
})

// 对外事件：close 关闭详情 tab，renamed/deleted 用于通知父级局部同步左侧 Key 列表。
const emit = defineEmits(['close', 'renamed', 'deleted'])

// 当前 Key 的完整详情数据，由主进程 redis:get-key-data 返回。
const keyData = ref(null)

// 详情加载状态：控制公共内容区 loading。
const loading = ref(false)

// 错误提示文案：加载失败时在详情内容区展示。
const errorMessage = ref('')

// Key 名称编辑值：用于顶部输入框修改 Redis Key 名称。
const editableKey = ref('')

// TTL 编辑值：-1 表示不设置过期时间，非负整数表示过期秒数。
const editableTtl = ref(-1)

// Redis 当前已保存的 TTL：用于和 editableTtl 草稿值比较，决定提交按钮是否可点击。
const savedTtl = ref(-1)

// 独立操作状态：避免重命名、删除、TTL 修改等动作互相打架。
const renaming = ref(false)
const deleting = ref(false)
const changingTtl = ref(false)

// Key 重命名确认按钮 tooltip：点击后会弹出确认框，需要手动关闭 tooltip，避免浮层残留。
const renameTooltipVisible = ref(false)

// TTL 修改确认按钮 tooltip：TTL 只在点击确认后提交，提交后需要同步关闭浮层。
const ttlTooltipVisible = ref(false)

// Redis 类型和 Element Plus 标签样式映射。
const typeTagType = {
    string: '',
    hash: 'success',
    list: 'info',
    set: 'warning',
    zset: 'danger',
    stream: 'warning'
}

// Redis 类型和详情组件映射，新增类型时优先在这里挂载独立组件。
const detailComponentMap = {
    string: StringDetailPanel,
    hash: HashDetailPanel,
    list: ListDetailPanel,
    set: SetDetailPanel,
    zset: ZSetDetailPanel,
    stream: StreamDetailPanel
}

// 当前 Key 是否已经不存在：Redis TYPE 返回 none 时表示 Key 不存在，不应走未知类型兜底页。
const isMissingKey = computed(() => keyData.value?.type === 'none')

// 当前 Key 类型对应的详情组件，未知类型使用兜底面板；不存在的 Key 会被 isMissingKey 提前拦截。
const detailComponent = computed(() => detailComponentMap[keyData.value?.type] || UnsupportedDetailPanel)

// 当前是否存在任意顶部操作正在执行，用于统一禁用输入控件。
const actionLoading = computed(() => renaming.value || deleting.value || changingTtl.value)

// Header 是否只读：Key 不存在或详情未就绪时，禁止重命名、TTL、复制命令和删除等操作。
const isHeaderReadonly = computed(() => loading.value || actionLoading.value || !keyData.value || isMissingKey.value)

// 顶部类型标签文本：优先使用最新加载到的真实类型。
const keyTypeText = computed(() => (
    isMissingKey.value ? 'missing' : (keyData.value?.type || props.selectedKey?.type || 'unknown')
).toUpperCase())

/**
 * 将字节数格式化为人类可读单位。
 * @param {number} bytes 原始字节数
 * @returns {string} 格式化后的容量文本
 */
const formatBytes = (bytes) => {
    const normalizedBytes = Number(bytes)

    if (!Number.isFinite(normalizedBytes) || normalizedBytes <= 0) {
        return '0 B'
    }

    const units = ['B', 'KB', 'MB', 'GB']
    const unitIndex = Math.min(Math.floor(Math.log(normalizedBytes) / Math.log(1024)), units.length - 1)
    const value = normalizedBytes / (1024 ** unitIndex)
    const precision = unitIndex === 0 ? 0 : 2

    return `${Number(value.toFixed(precision))} ${units[unitIndex]}`
}

// Size 展示文本：String 按 UTF-8 字节格式化，集合类型按元素数量展示。
const sizeText = computed(() => {
    if (!keyData.value) {
        return '0 B'
    }

    // Header 的 Size 展示 Redis MEMORY USAGE 返回的空间占用；集合元素数量仍由各类型详情内部使用 size 字段。
    return formatBytes(keyData.value.memoryUsage)
})

// Key 名称是否已经被用户修改，用于控制右侧提交按钮是否显示。
const isKeyChanged = computed(() => {
    const nextKey = editableKey.value.trim()

    // 仅当当前详情稳定加载完成，并且输入框内容不同于当前 Key 名称时，显示重命名提交按钮。
    if (isHeaderReadonly.value || !keyData.value?.key) {
        return false
    }

    return Boolean(nextKey && nextKey !== keyData.value.key)
})

// 是否允许提交 Key 重命名：必须存在有效修改，且 Header 当前允许写操作。
const canRenameKey = computed(() => isKeyChanged.value && !isHeaderReadonly.value)

// TTL 是否已经被用户改动：只比较草稿值和最近一次从 Redis 加载/提交成功的 TTL。
const isTtlChanged = computed(() => {
    if (isHeaderReadonly.value) {
        return false
    }

    return Number(editableTtl.value) !== Number(savedTtl.value)
})

// 是否允许提交 TTL 修改：必须存在有效草稿改动，且 Header 当前允许写操作。
const canChangeTtl = computed(() => isTtlChanged.value && !isHeaderReadonly.value)

/**
 * 获取当前类型对应的 Element Plus tag 样式。
 * @param {string} keyType Redis Key 类型
 * @returns {string|undefined} Element Plus tag type
 */
const getTagType = (keyType) => typeTagType[keyType] || undefined

/**
 * 将 Redis 命令参数格式化为 redis-cli 可识别的字符串参数。
 * @param {unknown} value 参数原始值
 * @returns {string} 转义后的命令参数
 */
const formatCommandArg = (value) => JSON.stringify(String(value ?? ''))

/**
 * 根据 Redis 类型生成设置命令，供顶部复制命令按钮使用。
 * @param {string} keyType Redis Key 类型
 * @param {Object} data 当前 Key 详情数据
 * @returns {string} 可直接在命令行执行的设置命令
 */
const buildSetCommand = (keyType, data) => {
    const key = formatCommandArg(data.key)

    if (keyType === 'string') {
        return `SET ${key} ${formatCommandArg(data.value)}`
    }

    if (keyType === 'hash') {
        // Hash 详情为了分页会使用数组结构；兼容旧的对象结构，保证复制命令仍可用。
        const entries = Array.isArray(data.value)
            ? data.value.map((item) => [item.field, item.value])
            : Object.entries(data.value || {})
        return `HSET ${key} ${entries.flatMap(([field, value]) => [
            formatCommandArg(field),
            formatCommandArg(value)
        ]).join(' ')}`
    }

    if (keyType === 'list') {
        return `RPUSH ${key} ${(data.value || []).map(formatCommandArg).join(' ')}`
    }

    if (keyType === 'set') {
        return `SADD ${key} ${(data.value || []).map(formatCommandArg).join(' ')}`
    }

    if (keyType === 'zset') {
        return `ZADD ${key} ${(data.value || []).flatMap((item) => [
            formatCommandArg(item.score),
            formatCommandArg(item.member)
        ]).join(' ')}`
    }

    if (keyType === 'stream') {
        return (data.value || []).map((entry) => (
            `XADD ${key} ${formatCommandArg(entry.id)} ${(entry.fields || []).flatMap((item) => [
                formatCommandArg(item.field),
                formatCommandArg(item.value)
            ]).join(' ')}`
        )).join('\n')
    }

    return `TYPE ${key}`
}

/**
 * 拉取当前选中 Key 的详情数据。
 * 由 selectedKey 变化、刷新按钮以及子详情保存成功后触发。
 */
const fetchData = async () => {
    if (!props.selectedKey) {
        keyData.value = null
        errorMessage.value = ''
        return
    }

    loading.value = true
    errorMessage.value = ''

    try {
        // 通过 preload 暴露的 Redis API 请求主进程读取 Key 详情。
        const result = await window.api.redis.getKeyData(props.tabId, props.selectedKey.key)

        if (result.success) {
            keyData.value = result.data
            editableKey.value = result.data.key
            savedTtl.value = typeof result.data.ttl === 'number' ? result.data.ttl : -1
            editableTtl.value = savedTtl.value
        } else {
            keyData.value = null
            errorMessage.value = result.error || t('keyDetail.messages.fetchFail')
        }
    } catch (error) {
        keyData.value = null
        errorMessage.value = error.message || t('keyDetail.messages.fetchFail')
    } finally {
        loading.value = false
    }
}

/**
 * 确认当前 Key 在 Redis 中仍然存在。
 * 顶部写操作执行前先检查 EXISTS，避免 Key 已过期后仍提示修改成功。
 * @returns {Promise<boolean>} 当前 Key 是否仍存在
 */
const ensureCurrentKeyExists = async () => {
    if (!keyData.value?.key) {
        return false
    }

    // EXISTS 返回 1 表示 Key 存在，返回 0 表示已过期、被删除或列表尚未刷新。
    const existsResult = await window.api.redis.executeCommand(props.tabId, 'EXISTS', [keyData.value.key])

    if (!existsResult.success) {
        ElMessage.error(existsResult.error || t('keyDetail.messages.checkKeyFail'))
        return false
    }

    if (Number(existsResult.data?.result) === 0) {
        ElMessage.warning(t('keyDetail.messages.keyMissing'))
        await fetchData()
        return false
    }

    return true
}

/**
 * 修改当前 Key 名称。
 * 使用 Redis RENAME 命令完成实际重命名，成功后通知父组件同步 tab。
 */
const handleRenameKey = async () => {
    if (!canRenameKey.value) {
        return
    }

    const oldKey = keyData.value.key
    const nextKey = editableKey.value.trim()
    renaming.value = true
    renameTooltipVisible.value = false

    try {
        // 重命名前先确认源 Key 仍存在，避免过期 Key 弹出成功提示。
        if (!await ensureCurrentKeyExists()) {
            return
        }

        // 使用 RENAMENX 避免覆盖已存在的目标 Key，降低误删数据风险。
        await ElMessageBox.confirm(t('keyDetail.confirm.renameMessage', {value: nextKey}), t('keyDetail.confirm.renameTitle'), {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
        })

        const result = await window.api.redis.executeCommand(props.tabId, 'RENAMENX', [oldKey, nextKey])

        if (!result.success) {
            ElMessage.error(result.error || t('keyDetail.messages.renameFail'))
            return
        }

        // RENAMENX 返回 0 表示目标 Key 已存在，此时 Redis 不会执行重命名。
        if (Number(result.data?.result) === 0) {
            ElMessage.warning(t('keyDetail.messages.targetExists'))
            return
        }

        // 重命名成功后先同步当前详情内的 Key 名称，避免再次编辑时 keyData 和 selectedKey 不一致。
        keyData.value = {
            ...keyData.value,
            key: nextKey
        }
        editableKey.value = nextKey

        ElMessage.success(t('keyDetail.messages.renameSuccess'))
        emit('renamed', {oldKey, newKey: nextKey})
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error(error.message || t('keyDetail.messages.renameFail'))
        }
    } finally {
        renaming.value = false
    }
}

/**
 * 更新当前 Key 的 TTL。
 * -1 使用 PERSIST 清除过期时间，非负整数使用 EXPIRE 设置秒级过期时间。
 */
const handleTtlChange = async () => {
    if (!canChangeTtl.value || changingTtl.value) {
        return
    }

    changingTtl.value = true
    ttlTooltipVisible.value = false
    const nextTtl = Number(editableTtl.value)

    try {
        // TTL 修改前先确认 Key 仍存在；EXPIRE/PERSIST 对不存在 Key 会返回 0。
        if (!await ensureCurrentKeyExists()) {
            editableTtl.value = savedTtl.value
            return
        }

        // 根据 TTL 语义选择 Redis 命令，避免把 -1 直接传给 EXPIRE。
        const command = nextTtl === -1 ? 'PERSIST' : 'EXPIRE'
        const args = nextTtl === -1 ? [keyData.value.key] : [keyData.value.key, String(nextTtl)]
        const result = await window.api.redis.executeCommand(props.tabId, command, args)

        if (!result.success) {
            editableTtl.value = savedTtl.value
            ElMessage.error(result.error || t('keyDetail.messages.ttlFail'))
            return
        }

        // EXPIRE/PERSIST 返回 0 表示命令未作用到 Key，不能提示 TTL 修改成功。
        if (Number(result.data?.result) === 0) {
            editableTtl.value = savedTtl.value
            ElMessage.warning(t('keyDetail.messages.ttlNotChanged'))
            await fetchData()
            return
        }

        savedTtl.value = nextTtl
        ElMessage.success(t('keyDetail.messages.ttlSuccess'))
        await fetchData()
    } catch (error) {
        editableTtl.value = savedTtl.value
        ElMessage.error(error.message || t('keyDetail.messages.ttlFail'))
    } finally {
        changingTtl.value = false
    }
}

/**
 * 复制当前 Key 的设置命令。
 * 复制出的命令用于尽量还原当前 Key 内容，String 类型会生成 SET 命令。
 */
const handleCopySetCommand = async () => {
    if (isHeaderReadonly.value) {
        return
    }

    try {
        // navigator.clipboard 在 Electron 渲染进程中可用，失败时给出明确反馈。
        await navigator.clipboard.writeText(buildSetCommand(keyData.value.type, keyData.value))
        ElMessage.success(t('keyDetail.messages.commandCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetail.messages.copyCommandFail'))
    }
}

/**
 * 删除当前 Key。
 * 删除成功后关闭当前详情 tab，避免右侧继续展示已不存在的数据。
 */
const handleDeleteKey = async () => {
    if (isHeaderReadonly.value || deleting.value) {
        return
    }

    deleting.value = true

    try {
        // 删除前先确认 Key 仍存在，避免已过期 Key 仍弹确认并提示删除成功。
        if (!await ensureCurrentKeyExists()) {
            return
        }

        // 删除属于高风险操作，先要求用户确认。
        await ElMessageBox.confirm(t('keyDetail.confirm.deleteMessage', {value: keyData.value.key}), t('keyDetail.confirm.deleteTitle'), {
            confirmButtonText: t('keyDetail.actions.delete'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
        })

        const result = await window.api.redis.executeCommand(props.tabId, 'DEL', [keyData.value.key])

        if (!result.success) {
            ElMessage.error(result.error || t('keyDetail.messages.deleteFail'))
            return
        }

        // DEL 返回 0 表示没有删除任何 Key，通常是确认后到执行前 Key 已经过期或被删除。
        if (Number(result.data?.result) === 0) {
            ElMessage.warning(t('keyDetail.messages.keyMissing'))
            await fetchData()
            return
        }

        ElMessage.success(t('keyDetail.messages.deleteSuccess'))
        emit('deleted', {key: keyData.value.key})
        emit('close')
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error(error.message || t('keyDetail.messages.deleteFail'))
        }
    } finally {
        deleting.value = false
    }
}

watch(
    () => props.selectedKey,
    (nextKey) => {
        if (nextKey) {
            // 切换详情时先清空旧详情，避免旧 keyData 和新 editableKey 短暂组合导致提交按钮闪烁。
            keyData.value = null
            errorMessage.value = ''
            editableKey.value = nextKey.key
            fetchData()
        } else {
            keyData.value = null
            editableKey.value = ''
            editableTtl.value = -1
            savedTtl.value = -1
            errorMessage.value = ''
        }
    },
    {immediate: true}
)

// 监听 Key 名称修改状态：按钮隐藏时同步关闭 tooltip，避免浮层状态残留。
watch(isKeyChanged, (changed) => {
    if (!changed) {
        renameTooltipVisible.value = false
    }
})

// 监听 TTL 草稿修改状态：按钮不可用时同步关闭 tooltip，避免浮层状态残留。
watch(isTtlChanged, (changed) => {
    if (!changed) {
        ttlTooltipVisible.value = false
    }
})
</script>

<style scoped>
/* 详情根容器：纵向铺满右侧详情卡片。 */
.key-detail-panel {
    --detail-header-bg-color: color-mix(in srgb, var(--el-color-primary) 6%, var(--el-bg-color));

    display: flex;
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
    flex-direction: column;
}

/* 暗黑模式头部背景：使用填充色，避免浅色模式的蓝灰背景在 dark 下发亮。 */
html.dark .key-detail-panel {
    --detail-header-bg-color: var(--el-fill-color-light);
}

/* 空状态：没有选中 Key 时居中展示。 */
.empty-state {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
}

/* Key 不存在空态：TYPE 返回 none 时展示，避免误用未知类型兜底页。 */
.missing-key-empty {
    display: flex;
    height: 100%;
    min-height: 0;
    align-items: center;
    justify-content: center;
}

/* 公共头部区域：标题操作行和元信息行共用同一块背景。 */
.detail-header-section {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--detail-header-bg-color);
}

/* 公共头部：贴近参考页面的浅色工具栏效果。 */
.detail-header {
    display: flex;
    padding: 10px 8px 5px 8px;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

/* 标题区：类型标签和 Key 输入框共占一行主要空间。 */
.detail-title {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 12px;
}

/* 类型标签：固定宽度，避免不同类型切换时头部左右跳动。 */
.detail-type-tag {
    width: 68px;
    height: 32px;
    justify-content: center;
    font-weight: 600;
    border-color: color-mix(in srgb, currentColor 42%, transparent) !important;
}

/* Key 名称输入框：等宽字体，便于阅读冒号分隔的 Redis Key。 */
.key-name-input {
    flex: 1;
    min-width: 160px;
    max-width: 620px;
}

.key-name-input :deep(.el-input__inner) {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* Key 名称提交按钮容器：承载 v-show，避免把运行时指令直接挂到 ElTooltip 组件上。 */
.rename-confirm-wrapper {
    display: inline-flex;
    flex-shrink: 0;
}

/* Key 名称提交按钮：仅在名称变化后显示，固定尺寸避免输入区抖动。 */
.rename-confirm-btn {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
}

/* 右上角操作按钮：保持圆形按钮紧凑排列。 */
.header-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 12px;
}

/* 操作按钮间距：Element Plus 会给相邻按钮追加 margin-left，这里清掉后只让 flex gap 生效。 */
.header-actions :deep(.el-button + .el-button) {
    margin-left: 0;
}

/* 关闭详情按钮容器：通过留白和业务操作按钮分组，避免硬分割线破坏头部质感。 */
.header-close-action {
    display: flex;
    flex-shrink: 0;
    position: relative;
    padding-left: 12px;
    align-items: center;
}

/* 关闭按钮分组线：使用短竖线提示分组，避免整高分割线显得生硬。 */
.header-close-action::before {
    position: absolute;
    left: 0;
    width: 1px;
    height: 18px;
    content: '';
    background: var(--el-border-color);
}

/* 关闭详情按钮：使用普通方形图标按钮，不参与前面圆形业务按钮组。 */
.close-detail-btn {
    width: auto;
    height: 32px;
    padding: 0 12px;
    margin-left: 0;
    border-radius: 4px;
}

/* 元信息行：Size 靠左，TTL 编辑区靠右，匹配参考图的信息层级。 */
.detail-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 35px;
    padding: 0 8px;
    font-size: 14px;
}

/* 元信息项：让标签和值横向对齐。 */
.meta-item,
.ttl-editor {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* 元信息标签：加粗但不抢占内容视觉。 */
.meta-label {
    font-weight: 600;
    color: var(--el-text-color-primary);
}

/* Size 值：使用较小字号，贴近参考图里的辅助信息。 */
.meta-value {
    font-size: 12px;
    color: var(--el-text-color-regular);
}

/* TTL 输入框：控制宽度，保持右侧元信息区域稳定。 */
.ttl-input {
    width: 120px;
}

/* TTL 提交按钮容器：常驻占位，避免按钮出现/隐藏时挤压 TTL 输入框布局。 */
.ttl-confirm-wrapper {
    display: inline-flex;
    flex-shrink: 0;
}

/* TTL 提交按钮：常驻展示，只有 TTL 草稿变化且未执行其他头部操作时才允许点击。 */
.ttl-confirm-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    flex-shrink: 0;
}

/* 类型内容区：承载具体 DetailPanel，内部滚动由子组件自行管理。 */
.detail-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 20px 8px 8px;
}
</style>
