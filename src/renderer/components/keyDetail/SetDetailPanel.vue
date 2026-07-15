<!--
    SetDetailPanel.vue
    描述：Redis Set 类型 Key 的详情展示面板。
    职责：展示 Set 成员列表，并提供本地 Value 搜索；新增成员按钮先保留为占位入口。
-->
<template>
    <!-- Set 主体区域：顶部工具栏固定，成员列表区域占满剩余空间。 -->
    <div class="set-detail-panel">
        <!-- Set 工具栏：左侧预留新增入口，右侧提供本地 Value 搜索。 -->
        <div class="set-toolbar">
            <el-button type="primary" :icon="Plus" @click="handleAddMember">
                {{ t('keyDetailPanels.common.add') }}
            </el-button>

            <el-input
                v-model="searchKeyword"
                class="member-search-input"
                clearable
                :placeholder="t('keyDetailPanels.set.searchPlaceholder')"
            >
                <template #prefix>
                    <el-icon>
                        <Search/>
                    </el-icon>
                </template>
            </el-input>
        </div>

        <!-- Set 表格区域：固定表头 + 虚拟列表，避免大量 member 一次性渲染造成卡顿。 -->
        <div class="set-table-wrap">
            <div class="set-table virtual-detail-table">
                <div class="virtual-table-header">
                    <div class="virtual-table-cell member-cell">{{ t('keyDetailPanels.common.labels.member') }} ({{ rows.length }})</div>
                    <div class="virtual-table-cell action-cell">{{ t('keyDetailPanels.common.action') }}</div>
                </div>

                <div class="virtual-table-body">
                    <el-empty
                        v-if="filteredRows.length === 0"
                        class="member-empty"
                        :description="t('keyDetailPanels.set.emptyMatched')"
                    />

                    <AutoResizer v-else>
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
                                        <div class="virtual-table-cell member-cell">
                                            <OverflowTooltip :content="data[index].member">
                                                <span class="member-text" data-overflow-target>{{ data[index].member }}</span>
                                            </OverflowTooltip>
                                        </div>
                                        <div class="virtual-table-cell action-cell">
                                            <div class="row-actions">
                                                <el-tooltip :content="t('keyDetailPanels.common.edit')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="success" plain :icon="Edit" @click="handleEditMember(data[index].member)"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.copyCommand')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="primary" plain :icon="DocumentCopy" @click="handleCopyMemberCommand(data[index].member)"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.view')" placement="top" :show-after="200">
                                                    <el-button circle size="small" plain :icon="View" @click="handleViewMember(data[index].member)"/>
                                                </el-tooltip>

                                                <el-tooltip :content="t('keyDetailPanels.common.delete')" placement="top" :show-after="200">
                                                    <el-button circle size="small" type="danger" :icon="Delete" :loading="deletingMember === data[index].member"
                                                               @click="handleDeleteMember(data[index].member)"/>
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

        <!-- Set 成员编辑弹窗：新增和编辑共用同一套 Member 表单。 -->
        <DetailLoadFooter
            :has-more="hasMore"
            :loading-more="isLoadingMore"
            :loading-all="isLoadingAll"
            @load-all="handleLoadAll"
            @load-more="handleLoadMore"
        />
        <el-dialog
            v-model="memberEditorVisible"
            width="620px"
            destroy-on-close
            :close-on-click-modal="false"
        >
            <template #header>
                <!-- 弹窗标题：Set 成员新增和编辑共用表单，使用编辑图标表达成员变更。 -->
                <DialogTitle :icon="Edit" :title="memberEditorTitle"/>
            </template>

            <el-form label-width="82px" class="member-editor-form" @submit.prevent>
                <el-form-item :label="t('keyDetailPanels.common.labels.member')" required>
                    <el-input
                        v-model="memberForm.member"
                        type="textarea"
                        class="member-value-textarea"
                        :disabled="savingMember"
                        :placeholder="t('keyDetailPanels.common.memberPlaceholder')"
                    />
                </el-form-item>
            </el-form>

            <template #footer>
                <div class="dialog-footer">
                    <el-button :disabled="savingMember" @click="memberEditorVisible = false">
                        {{ t('common.cancel') }}
                    </el-button>
                    <el-button
                        type="primary"
                        :loading="savingMember"
                        :disabled="!canSubmitMember"
                        @click="handleSaveMember"
                    >
                        {{ t('common.confirm') }}
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- Set 成员查看弹窗：用于完整查看被省略的长 Member。 -->
        <el-dialog
            v-model="memberViewerVisible"
            width="620px"
            destroy-on-close
        >
            <template #header>
                <!-- 弹窗标题：查看完整 Set 成员内容，使用预览图标提示只读。 -->
                <DialogTitle :icon="View" :title="t('keyDetailPanels.common.viewMemberTitle')"/>
            </template>

            <ViewerTextarea :model-value="viewingMember" :height="180"/>

            <template #footer>
                <!-- 查看弹窗底部操作区：复制当前完整 Member 内容。 -->
                <div class="dialog-footer">
                    <el-button type="primary" @click="handleCopyViewingMember">
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
import DetailLoadFooter from './common/DetailLoadFooter.vue'
import {useI18n} from '../../i18n/index.js'

// 国际化文案读取函数：驱动 Set 表格、弹窗和操作反馈文案。
const {t} = useI18n()

// 组件入参：接收 KeyDetailPanel 加载后的 Set Key 详情数据。
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

// 搜索关键词：只在当前 Set 成员中做本地过滤，不触发 Redis 查询。
const searchKeyword = ref('')

// Set 成员列表：使用本地状态承载，新增、编辑、删除后可局部更新而不重拉整个详情。
const members = ref([])

// 成员编辑弹窗显示状态：新增和编辑共用，具体模式由 memberEditorMode 控制。
const memberEditorVisible = ref(false)

// 成员查看弹窗显示状态：用于查看完整 Member 内容。
const memberViewerVisible = ref(false)

// 成员编辑模式：add 表示新增成员，edit 表示替换已有成员。
const memberEditorMode = ref('add')

// 成员编辑表单：originalMember 用于编辑时判断是否需要执行替换。
const memberForm = reactive({
    originalMember: '',
    member: ''
})

// 当前查看中的成员内容。
const viewingMember = ref('')

// 保存成员状态：控制新增/编辑确认按钮 loading 和重复提交保护。
const savingMember = ref(false)

// 正在删除的成员：用于给对应成员删除按钮展示 loading。
const deletingMember = ref('')

// Set 当前 SSCAN 游标：父级首屏加载后带入，后续加载更多持续推进。
const setCursor = ref('0')

// 当前 Set 总成员数：初始来自 keyData.size，后续每次分页请求后用后端 SCARD 结果校正。
const setTotalSize = ref(0)

// 加载更多状态：控制底部“加载更多”按钮 loading 和重复点击保护。
const isLoadingMore = ref(false)

// 加载全部状态：控制底部“加载全部”按钮 loading 和重复点击保护。
const isLoadingAll = ref(false)

// 虚拟表格固定行高：和当前行内按钮尺寸、文本行高保持一致，保证滚动定位稳定。
const ROW_HEIGHT = 41

// 每次 SSCAN 建议扫描数量：和主进程首屏 Set 加载数量保持一致。
const SET_PAGE_SIZE = 100

// 当前是否处于编辑已有成员模式：编辑时会把旧 Member 替换成新 Member。
const isEditMode = computed(() => memberEditorMode.value === 'edit')

// 成员编辑弹窗标题：根据新增/编辑模式显示不同文案。
const memberEditorTitle = computed(() => (
    isEditMode.value ? t('keyDetailPanels.set.editTitle') : t('keyDetailPanels.set.addTitle')
))

// 是否允许提交成员表单：Member 不能为空，且当前没有提交中的写操作。
const canSubmitMember = computed(() => Boolean(memberForm.member.trim()) && !savingMember.value)

// 当前是否仍有未扫描成员：SSCAN 只能通过 cursor 是否归零判断是否结束。
const hasMore = computed(() => setCursor.value !== '0')

// Set 表格数据：把成员数组转成虚拟表格需要的行结构。
const rows = computed(() => {
    return members.value.map((member) => ({
        member
    }))
})

// 过滤后的成员列表：搜索框为空时展示全部成员，输入后按 Value 进行不区分大小写匹配。
const filteredRows = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()

    if (!keyword) {
        return rows.value
    }

    return rows.value.filter((row) => row.member.toLowerCase().includes(keyword))
})

/**
 * 将 Redis 命令参数格式化为 redis-cli 可识别的字符串参数。
 * @param {unknown} value 参数原始值
 * @returns {string} 转义后的命令参数
 */
const formatCommandArg = (value) => JSON.stringify(String(value ?? ''))

/**
 * 构造当前 Set 成员的 SADD 命令。
 * @param {string} member Set 成员
 * @returns {string} 可复制到命令行执行的 SADD 命令
 */
const buildMemberAddCommand = (member) => {
    return `SADD ${formatCommandArg(props.keyData.key)} ${formatCommandArg(member)}`
}

/**
 * 合并 Set 成员列表。
 * SSCAN 在数据变化时可能返回重复成员，前端按 member 去重保证表格稳定。
 * @param {Array<string>} currentItems 当前已加载成员
 * @param {Array<string>} nextItems 新扫描成员
 * @returns {Array<string>} 合并后的成员列表
 */
const mergeSetMembers = (currentItems, nextItems) => {
    const merged = [...currentItems]
    const seen = new Set(merged)

    for (const item of nextItems) {
        const member = String(item ?? '')
        if (!seen.has(member)) {
            seen.add(member)
            merged.push(member)
        }
    }

    return merged
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
 * 按 cursor 扫描下一段 Set 成员。
 * @param {string} cursor SSCAN 当前游标
 * @returns {Promise<{items:Array<string>, cursor:string, size:number}>}
 */
const fetchSetRange = async (cursor) => {
    const response = await window.api.redis.getSetRange(
        props.tabId,
        props.keyData.key,
        cursor,
        SET_PAGE_SIZE
    )

    if (!response.success) {
        throw new Error(response.error || t('keyDetailPanels.set.messages.loadFail'))
    }

    return {
        items: Array.isArray(response.data?.items) ? response.data.items.map((item) => String(item)) : [],
        cursor: String(response.data?.cursor ?? '0'),
        size: Number(response.data?.size) || 0
    }
}

/**
 * 打开新增 Set 成员弹窗。
 */
const handleAddMember = () => {
    memberEditorMode.value = 'add'
    memberForm.originalMember = ''
    memberForm.member = ''
    memberEditorVisible.value = true
}

/**
 * 打开编辑 Set 成员弹窗。
 * @param {string} member 当前 Set 成员
 */
const handleEditMember = (member) => {
    memberEditorMode.value = 'edit'
    memberForm.originalMember = member
    memberForm.member = member
    memberEditorVisible.value = true
}

/**
 * 保存 Set 成员。
 * 新增和改名时先用 SISMEMBER 检查唯一性；编辑时通过 SADD 新 Member + SREM 旧 Member 完成替换。
 */
const handleSaveMember = async () => {
    if (!canSubmitMember.value) {
        return
    }

    savingMember.value = true

    try {
        const member = memberForm.member.trim()
        const originalMember = memberForm.originalMember
        const isMemberRenamed = isEditMode.value && member !== originalMember

        if (!isEditMode.value || isMemberRenamed) {
            // Set 成员必须唯一，写入前先查重，避免 SADD 静默忽略导致用户误以为已修改。
            const existsResult = await runRedisCommand('SISMEMBER', [props.keyData.key, member])
            if (Number(existsResult) > 0) {
                ElMessage.warning(t('keyDetailPanels.common.messages.memberExists'))
                return
            }
        }

        if (isEditMode.value && !isMemberRenamed) {
            memberEditorVisible.value = false
            ElMessage.info(t('keyDetailPanels.common.messages.memberUnchanged'))
            return
        }

        await runRedisCommand('SADD', [props.keyData.key, member])

        if (isMemberRenamed) {
            await runRedisCommand('SREM', [props.keyData.key, originalMember])
            const nextMembers = [...members.value]
            const originalIndex = nextMembers.findIndex((item) => item === originalMember)

            if (originalIndex >= 0) {
                nextMembers[originalIndex] = member
                members.value = nextMembers
            } else {
                members.value = [member, ...members.value]
            }
        } else {
            members.value = [member, ...members.value]
            setTotalSize.value += 1
        }

        memberEditorVisible.value = false
        ElMessage.success(isEditMode.value
            ? t('keyDetailPanels.common.messages.memberUpdated')
            : t('keyDetailPanels.common.messages.memberAdded'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.set.messages.saveFail'))
    } finally {
        savingMember.value = false
    }
}

/**
 * 复制当前 Set 成员的 SADD 命令。
 * @param {string} member 当前 Set 成员
 */
const handleCopyMemberCommand = async (member) => {
    try {
        await navigator.clipboard.writeText(buildMemberAddCommand(member))
        ElMessage.success(t('keyDetailPanels.common.messages.commandCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.copyCommandFail'))
    }
}

/**
 * 复制查看弹窗中的完整 Set Member。
 */
const handleCopyViewingMember = async () => {
    try {
        // 查看弹窗复制的是当前展示内容，不是表格里的 SADD 命令。
        await navigator.clipboard.writeText(viewingMember.value || '')
        ElMessage.success(t('keyDetailPanels.common.messages.contentCopied'))
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.copyContentFail'))
    }
}

/**
 * 打开成员完整内容查看弹窗。
 * @param {string} member 当前 Set 成员
 */
const handleViewMember = (member) => {
    viewingMember.value = member
    memberViewerVisible.value = true
}

/**
 * 追加加载下一段 Set 成员。
 */
const handleLoadMore = async () => {
    if (!hasMore.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingMore.value = true

    try {
        const {items, cursor, size} = await fetchSetRange(setCursor.value)
        setCursor.value = cursor
        setTotalSize.value = size
        members.value = mergeSetMembers(members.value, items)
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.loadMoreFail'))
    } finally {
        isLoadingMore.value = false
    }
}

/**
 * 持续扫描直到 cursor 归零，加载剩余全部 Set 成员。
 */
const handleLoadAll = async () => {
    if (!hasMore.value || isLoadingMore.value || isLoadingAll.value) {
        return
    }

    isLoadingAll.value = true

    try {
        let cursor = setCursor.value
        let nextMembers = members.value
        let latestSize = setTotalSize.value

        // SSCAN 必须按 cursor 逐轮推进，cursor 回到 0 才代表本轮扫描结束。
        while (cursor !== '0') {
            const result = await fetchSetRange(cursor)
            cursor = result.cursor
            latestSize = result.size
            nextMembers = mergeSetMembers(nextMembers, result.items)
        }

        setCursor.value = cursor
        setTotalSize.value = latestSize
        members.value = nextMembers
    } catch (error) {
        ElMessage.error(error.message || t('keyDetailPanels.common.messages.loadAllFail'))
    } finally {
        isLoadingAll.value = false
    }
}

/**
 * 删除 Set 成员。
 * @param {string} member 当前 Set 成员
 */
const handleDeleteMember = async (member) => {
    try {
        await ElMessageBox.confirm(
            t('keyDetailPanels.set.confirmDelete', {value: member}),
            t('keyDetailPanels.set.deleteTitle'),
            {
                confirmButtonText: t('keyDetail.actions.delete'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
            }
        )

        deletingMember.value = member
        const deleteResult = await runRedisCommand('SREM', [props.keyData.key, member])

        if (Number(deleteResult) <= 0) {
            ElMessage.warning(t('keyDetailPanels.common.messages.memberMissing'))
            return
        }

        members.value = members.value.filter((item) => item !== member)
        setTotalSize.value = Math.max(0, setTotalSize.value - 1)
        ElMessage.success(t('keyDetailPanels.common.messages.memberDeleted'))
    } catch (error) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error(error.message || t('keyDetailPanels.set.messages.deleteFail'))
        }
    } finally {
        deletingMember.value = ''
    }
}

// 监听父级重新加载的 Key 详情：切换 Key 或刷新详情时同步当前成员列表。
watch(
    () => props.keyData,
    (nextKeyData) => {
        const value = Array.isArray(nextKeyData?.value) ? nextKeyData.value : []
        members.value = value.map((member) => String(member))
        setCursor.value = String(nextKeyData?.cursor ?? '0')
        setTotalSize.value = Number(nextKeyData?.size) || members.value.length
        savingMember.value = false
        deletingMember.value = ''
        isLoadingMore.value = false
        isLoadingAll.value = false
    },
    {immediate: true}
)
</script>

<style scoped>
/* Set 面板根容器：纵向布局，确保内容区不会撑破右侧详情区域。 */
.set-detail-panel {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    background: var(--el-bg-color);
}

/* 工具栏：左右分布，保持和截图中新增按钮、搜索框的视觉位置一致。 */
.set-toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
}

/* 新增按钮：固定为参考图中的普通主按钮尺寸，后续接入 SADD 时继续沿用。 */
.set-toolbar :deep(.el-button) {
    height: 32px;
    padding: 0 14px;
    border-radius: 4px;
}

/* 搜索框：固定宽度，避免成员列表变化时工具栏宽度抖动。 */
.member-search-input {
    width: 250px;
}

/* 搜索框内层：贴近参考图的 32px 高度，不抢占内容区视觉重心。 */
.member-search-input :deep(.el-input__wrapper) {
    min-height: 32px;
    border-radius: 4px;
}

/* 表格外层：承接中间剩余高度，底部不额外撑出页面滚动条。 */
.set-table-wrap {
    min-height: 0;
    flex: 1;
}


/* 表格主体：固定表头 + 虚拟内容区，和 List/Hash/ZSet 详情保持一致。 */
.set-table {
    display: flex;
    width: 100%;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    font-size: 14px;
    border: 1px solid var(--el-border-color-light);
    box-sizing: border-box;
}

/* 虚拟表格表头：固定在顶部，只滚动下面的成员行。 */
.virtual-table-header {
    display: flex;
    height: 40px;
    flex-shrink: 0;
    color: var(--el-text-color-regular);
    font-weight: 600;
    background: var(--el-fill-color-lighter);
    border-bottom: 1px solid var(--el-border-color-light);
}

/* 虚拟表格主体：承载 AutoResizer 和 FixedSizeList，内部滚动不影响外层布局。 */
.virtual-table-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.virtual-table-body :deep(.el-auto-resizer) {
    width: 100%;
    height: 100%;
}

/* 虚拟表格行：固定高度，必须和 ROW_HEIGHT 保持一致。 */
.virtual-table-row {
    display: flex;
    height: 41px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
}

/* 表格单元格：统一处理对齐、边框和长文本裁剪。 */
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

.member-cell {
    flex: 1;
}

.action-cell {
    width: 180px;
    flex: 0 0 180px;
    justify-content: center;
    border-right: 0;
}

/* 成员文本：单行省略展示，完整内容交给 OverflowTooltip。 */
.member-text {
    display: block;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    color: var(--el-text-color-primary);
    line-height: 40px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 行操作按钮组：紧凑排列，避免占用过多表格横向空间。 */
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

/* 空状态：占满内容区域，搜索无结果时保持页面重心稳定。 */
.member-empty {
    height: 100%;
}

/* 成员编辑表单：给弹窗内容留出稳定间距，避免 textarea 贴边。 */
.member-editor-form {
    padding: 4px 4px 0 0;
}

/* Set 成员文本域：固定高度，长 Member 通过内部滚动查看或编辑。 */
.member-value-textarea :deep(.el-textarea__inner) {
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

</style>
