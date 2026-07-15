<!--
    DeleteDirectoryKeysDrawer.vue
    描述：目录 Key 删除确认抽屉。用于右键目录后预览该目录下全部 Key，并在二次确认后批量删除。
-->
<template>
    <el-drawer
        v-model="drawerVisible"
        size="680px"
        direction="rtl"
        :with-header="true"
        :style="{
            top: '40px',
            height: 'calc(100vh - 40px)'
        }"
        @opened="handleDrawerOpened"
        @closed="handleDrawerClosed"
    >
        <template #header>
            <!-- 抽屉标题：危险操作使用红色图标强调删除语义。 -->
            <div class="drawer-header">
                <el-icon class="drawer-header-icon">
                    <Delete/>
                </el-icon>
                <span>{{ t('deleteDirectoryKeys.title') }}</span>
            </div>
        </template>

        <!-- 抽屉主体：顶部目录信息固定，Key 预览列表占满剩余高度。 -->
        <div class="delete-directory-drawer" v-loading="loading || deleting">
            <div class="directory-toolbar">
                <div class="directory-info">
                    <span class="connection-name">{{ connectionName || t('deleteDirectoryKeys.currentConnection') }}</span>
                    <span class="directory-name">{{ directoryKey }}</span>
                </div>
                <el-button :icon="Refresh" :loading="loading" plain @click="fetchDirectoryKeys">
                    {{ t('deleteDirectoryKeys.refresh') }}
                </el-button>
            </div>

            <!-- 删除摘要：展示本次扫描到的 Key 数量和是否达到预览上限。 -->
            <div class="summary-grid">
                <div class="summary-item">
                    <span>{{ t('deleteDirectoryKeys.summary.directory') }}</span>
                    <strong>{{ directoryKey || '-' }}</strong>
                </div>
                <div class="summary-item">
                    <span>{{ t('deleteDirectoryKeys.summary.keyCount') }}</span>
                    <strong>{{ formatNumber(keys.length) }}</strong>
                </div>
                <div class="summary-item">
                    <span>{{ t('deleteDirectoryKeys.summary.status') }}</span>
                    <strong :class="hasMore ? 'is-warning' : 'is-success'">
                        {{ hasMore ? t('deleteDirectoryKeys.summary.reachedLimit') : t('deleteDirectoryKeys.summary.completed') }}
                    </strong>
                </div>
            </div>

            <el-alert
                v-if="hasMore"
                class="limit-alert"
                type="warning"
                :closable="false"
                :title="t('deleteDirectoryKeys.limitWarning', { value: formatNumber(maxKeys) })"
            />

            <div class="list-header">
                <span>{{ t('deleteDirectoryKeys.table.key') }}</span>
            </div>

            <div class="list-body">
                <el-empty v-if="!loading && keys.length === 0" :description="t('deleteDirectoryKeys.empty')"/>

                <AutoResizer v-else class="directory-auto-resizer">
                    <template #default="{ height, width }">
                        <FixedSizeList
                            class-name="directory-virtual-list"
                            :data="keys"
                            :total="keys.length"
                            :height="height"
                            :width="width"
                            :item-size="ROW_HEIGHT"
                            :cache="10"
                        >
                            <template #default="{ data, index, style }">
                                <!-- Key 预览行：只展示 Key 名称，长文本单行省略。 -->
                                <div
                                    v-if="data[index]"
                                    class="directory-key-row"
                                    :style="style"
                                >
                                    <span class="key-name">{{ data[index] }}</span>
                                </div>
                            </template>
                        </FixedSizeList>
                    </template>
                </AutoResizer>
            </div>

            <!-- 底部危险操作区：只有完整预览且存在 Key 时允许删除。 -->
            <div class="drawer-footer">
                <span class="footer-tip">
                    {{ t('deleteDirectoryKeys.footerTip', { value: formatNumber(keys.length) }) }}
                </span>
                <el-button
                    type="danger"
                    :icon="Delete"
                    :loading="deleting"
                    :disabled="loading || hasMore || keys.length === 0"
                    @click="handleDeleteKeys"
                >
                    {{ t('deleteDirectoryKeys.deleteButton') }}
                </el-button>
            </div>
        </div>
    </el-drawer>
</template>

<script setup>
import {computed, ref, watch} from 'vue'
import {ElAutoResizer as AutoResizer, ElMessage, ElMessageBox, FixedSizeList} from 'element-plus'
import {Delete, Refresh} from '@icon-park/vue-next'
import {useI18n} from '../../i18n/index.js'

const ROW_HEIGHT = 38
const DEFAULT_MAX_KEYS = 50000

// 组件入参：由 KeyListPanel 传入当前目录、匹配模式和连接信息。
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    connectionId: {
        type: [String, Number],
        default: ''
    },
    connectionName: {
        type: String,
        default: ''
    },
    directoryKey: {
        type: String,
        default: ''
    },
    matchPattern: {
        type: String,
        default: ''
    },
    maxKeys: {
        type: Number,
        default: DEFAULT_MAX_KEYS
    }
})

// 对外事件：同步显示状态；删除成功后通知父组件更新左侧列表和右侧详情。
const emit = defineEmits(['update:visible', 'deleted'])

// 国际化读取函数：驱动目录删除抽屉文案和反馈消息。
const {t} = useI18n()

// 抽屉可见状态代理：保持父组件 v-model 和 Element Plus Drawer 状态一致。
const drawerVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
})

// 扫描和删除状态：分别控制预览列表 loading 与危险操作 loading。
const loading = ref(false)
const deleting = ref(false)

// 抽屉动画完成状态：避免打开动画期间 props 变化和 opened 同时触发两次扫描。
const drawerOpened = ref(false)

// 目录下 Key 预览列表：由 main 进程按 SCAN MATCH 返回，虚拟列表承载大数据量渲染。
const keys = ref([])

// 是否达到预览上限：达到上限时不允许删除，避免用户误以为只删除了完整目录。
const hasMore = ref(false)
const maxKeys = ref(DEFAULT_MAX_KEYS)

/**
 * 格式化整数。
 * @param {number} value 原始数值
 * @returns {string} 带千分位的文本
 */
const formatNumber = (value) => Number(value || 0).toLocaleString()

/**
 * 扫描当前目录下的 Key。
 * 只做预览，不删除数据；真正删除前仍会二次确认。
 */
const fetchDirectoryKeys = async () => {
    if (!props.connectionId || !props.matchPattern || loading.value) {
        return
    }

    loading.value = true

    try {
        const response = await window.api.redis.scanKeysByPattern(props.connectionId, props.matchPattern, {
            maxKeys: props.maxKeys
        })

        if (!response.success) {
            ElMessage.error(`${t('deleteDirectoryKeys.messages.loadFail')}: ${response.error || t('common.unknownError')}`)
            return
        }

        keys.value = response.data?.keys || []
        hasMore.value = Boolean(response.data?.hasMore)
        maxKeys.value = response.data?.maxKeys || props.maxKeys
    } catch (error) {
        ElMessage.error(`${t('deleteDirectoryKeys.messages.loadFail')}: ${error.message || error}`)
    } finally {
        loading.value = false
    }
}

/**
 * 删除当前预览列表中的全部 Key。
 * 如果预览达到上限，不允许删除，避免只删除部分目录数据。
 */
const handleDeleteKeys = async () => {
    if (deleting.value || hasMore.value || keys.value.length === 0) {
        return
    }

    const keysToDelete = [...keys.value]

    try {
        await ElMessageBox.confirm(
            t('deleteDirectoryKeys.confirm.message', {
                directory: props.directoryKey,
                count: formatNumber(keysToDelete.length)
            }),
            t('deleteDirectoryKeys.confirm.title'),
            {
                confirmButtonText: t('deleteDirectoryKeys.confirm.confirmButton'),
                cancelButtonText: t('common.cancel'),
                type: 'warning',
                confirmButtonClass: 'el-button--danger'
            }
        )

        deleting.value = true
        const response = await window.api.redis.deleteKeys(props.connectionId, keysToDelete)

        if (!response.success) {
            ElMessage.error(`${t('deleteDirectoryKeys.messages.deleteFail')}: ${response.error || t('common.unknownError')}`)
            return
        }

        ElMessage.success(t('deleteDirectoryKeys.messages.deleteSuccess', {
            value: formatNumber(response.data?.deletedCount ?? keysToDelete.length)
        }))
        emit('deleted', keysToDelete)
        drawerVisible.value = false
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(`${t('deleteDirectoryKeys.messages.deleteFail')}: ${error.message || error}`)
        }
    } finally {
        deleting.value = false
    }
}

/**
 * 抽屉打开后再扫描目录，避免用户只是展开右键菜单时触发重型操作。
 */
const handleDrawerOpened = () => {
    drawerOpened.value = true
    fetchDirectoryKeys()
}

/**
 * 抽屉关闭后清理预览状态，避免下次打开时先闪现上一次目录列表。
 */
const handleDrawerClosed = () => {
    drawerOpened.value = false
    keys.value = []
    hasMore.value = false
}

// 抽屉保持打开时切换目录，需要立即重新扫描新目录。
watch(
    () => [props.connectionId, props.matchPattern, props.maxKeys],
    () => {
        if (drawerOpened.value) {
            fetchDirectoryKeys()
        }
    }
)
</script>

<style scoped>
/* 抽屉标题：危险删除操作使用 danger 色图标。 */
.drawer-header {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.drawer-header-icon {
    color: var(--el-color-danger);
    font-size: 18px;
}

/* 抽屉主体：纵向布局，Key 预览列表占满剩余空间。 */
.delete-directory-drawer {
    display: flex;
    height: 100%;
    min-height: 0;
    padding: 20px;
    box-sizing: border-box;
    flex-direction: column;
}

.directory-toolbar {
    display: flex;
    gap: 12px;
    padding-bottom: 14px;
    align-items: center;
    justify-content: space-between;
}

.directory-info {
    display: flex;
    min-width: 0;
    flex-direction: column;
}

.connection-name {
    overflow: hidden;
    color: var(--el-text-color-primary);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.directory-name {
    margin-top: 4px;
    overflow: hidden;
    color: var(--el-color-danger);
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 摘要区：删除前给用户明确目录、数量和扫描完整性。 */
.summary-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr);
    margin-bottom: 14px;
}

.summary-item {
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    background: var(--el-fill-color-extra-light);
}

.summary-item span {
    display: block;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.summary-item strong {
    display: block;
    margin-top: 6px;
    overflow: hidden;
    color: var(--el-text-color-primary);
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.summary-item strong.is-success {
    color: var(--el-color-success);
}

.summary-item strong.is-warning {
    color: var(--el-color-warning);
}

.limit-alert {
    margin-bottom: 12px;
}

.list-header {
    display: grid;
    height: 36px;
    padding: 0 12px;
    flex-shrink: 0;
    align-items: center;
    border: 1px solid var(--el-border-color-light);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

/* 列表主体：虚拟列表承载目录下大量 Key，避免 DOM 膨胀。 */
.list-body {
    flex: 1;
    min-height: 0;
    border: 1px solid var(--el-border-color-light);
    border-radius: 0 0 6px 6px;
    overflow: hidden;
}

.directory-auto-resizer {
    width: 100%;
    height: 100%;
}

.directory-key-row {
    display: flex;
    height: 38px;
    padding: 0 12px;
    align-items: center;
    box-sizing: border-box;
    border-bottom: 1px solid var(--el-border-color-lighter);
    color: var(--el-text-color-regular);
    font-size: 13px;
}

.directory-key-row:hover {
    background: var(--el-table-row-hover-bg-color, var(--el-fill-color-light));
}

.key-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 底部操作区：左侧提示删除数量，右侧承载危险按钮。 */
.drawer-footer {
    display: flex;
    gap: 12px;
    padding-top: 12px;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
}

.footer-tip {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}
</style>
