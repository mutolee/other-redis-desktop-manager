<!--
    UpdateCheckDialog.vue
    描述：版本检查结果弹窗。用于展示 GitHub Release 最新版本、当前版本和 Markdown 更新说明。
-->
<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '../../i18n/index.js'
import { renderReleaseNotesMarkdown } from '../../utils/releaseNotesMarkdownUtil.js'

// 组件入参：父组件控制弹窗显隐，并传入 main 进程返回的版本更新信息。
const props = defineProps({
    visible: {
        type: Boolean
    },
    updateInfo: {
        type: Object,
        default: null
    }
})

// 对外事件：同步 v-model:visible，让父组件只关心弹窗是否打开。
const emit = defineEmits(['update:visible'])

// 国际化文案：弹窗标题、按钮、版本标签和错误提示都从统一 i18n 中读取。
const { t } = useI18n()

// 打开 Release 页面状态：控制底部更新按钮 loading，避免重复跳转。
const openingReleasePage = ref(false)

// 弹窗可见性代理：把 el-dialog 的 v-model 变化透传给父组件。
const dialogVisible = computed({
    get: () => props.visible,
    set: value => emit('update:visible', value)
})

// 更新说明 HTML：把 GitHub Release Markdown 转成弹窗可展示的安全 HTML 片段。
const releaseNotesHtml = computed(() => renderReleaseNotesMarkdown(
    props.updateInfo?.releaseNotes,
    t('settings.update.noReleaseNotes')
))

/**
 * 打开 GitHub Release 页面。
 * 用户确认更新后执行外部浏览器跳转，失败时在当前弹窗上下文给出可读反馈。
 */
const handleOpenReleasePage = async () => {
    const releasePageUrl = props.updateInfo?.releasePageUrl

    if (!releasePageUrl || openingReleasePage.value) {
        return
    }

    openingReleasePage.value = true

    try {
        const openResult = await window.api.mainWin.openExternal(releasePageUrl)

        if (!openResult.success) {
            ElMessage.error(openResult.error || t('settings.update.openReleaseFail'))
            return
        }

        dialogVisible.value = false
    } finally {
        openingReleasePage.value = false
    }
}
</script>

<template>
    <!-- 更新提示弹窗：固定尺寸承载 GitHub Release Markdown 内容，避免长文本挤压按钮区。 -->
    <el-dialog
        v-model="dialogVisible"
        class="update-dialog"
        width="560px"
        append-to-body
        :close-on-click-modal="false"
        :close-on-press-escape="!openingReleasePage"
        :destroy-on-close="false"
    >
        <template #header>
            <div class="update-dialog-header">
                <span class="update-dialog-title">{{ t('settings.update.foundTitle') }}</span>
            </div>
        </template>

        <div class="update-dialog-body">
            <!-- 版本摘要：固定在内容顶部，便于用户快速判断当前版本和最新版本。 -->
            <div class="update-version-card">
                <div class="update-version-item">
                    <span class="update-version-label">{{ t('settings.update.currentVersion') }}</span>
                    <span class="update-version-value">V{{ updateInfo?.currentVersion }}</span>
                </div>
                <div class="update-version-divider"></div>
                <div class="update-version-item">
                    <span class="update-version-label">{{ t('settings.update.latestVersion') }}</span>
                    <span class="update-version-value is-latest">V{{ updateInfo?.latestVersion }}</span>
                </div>
            </div>

            <!-- 更新内容：使用 el-scrollbar 承载 Markdown 渲染结果，长内容只在弹窗内部滚动。 -->
            <div class="update-notes-section">
                <div class="update-notes-title">{{ t('settings.update.releaseNotesTitle') }}</div>
                <el-scrollbar class="update-notes-scrollbar">
                    <div class="update-notes-markdown" v-html="releaseNotesHtml"></div>
                </el-scrollbar>
            </div>
        </div>

        <template #footer>
            <div class="update-dialog-footer">
                <el-button :disabled="openingReleasePage" @click="dialogVisible = false">
                    {{ t('common.cancel') }}
                </el-button>
                <el-button type="primary" :loading="openingReleasePage" @click="handleOpenReleasePage">
                    {{ t('settings.update.updateNow') }}
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
/* 更新弹窗：固定宽高展示 Release Notes，避免 Markdown 内容撑破窗口或挤压操作按钮。 */
:global(.update-dialog) {
    --update-dialog-height: 520px;
    height: var(--update-dialog-height);
    max-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
}

:global(.update-dialog .el-dialog__header) {
    padding: 18px 20px 10px;
    margin-right: 0;
}

:global(.update-dialog .el-dialog__body) {
    flex: 1;
    min-height: 0;
    padding: 0 20px;
    overflow: hidden;
}

:global(.update-dialog .el-dialog__footer) {
    padding: 14px 20px 18px;
}

.update-dialog-header {
    display: flex;
    align-items: center;
    min-width: 0;
}

.update-dialog-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.update-dialog-body {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    gap: 14px;
}

.update-version-card {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    background: var(--el-fill-color-light);
    flex-shrink: 0;
}

.update-version-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}

.update-version-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.update-version-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--el-text-color-primary);
}

.update-version-value.is-latest {
    color: var(--el-color-primary);
}

.update-version-divider {
    width: 1px;
    height: 34px;
    background: var(--el-border-color);
}

.update-notes-section {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    overflow: hidden;
    background: var(--el-bg-color);
}

.update-notes-title {
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    border-bottom: 1px solid var(--el-border-color);
    background: var(--el-fill-color-light);
    flex-shrink: 0;
}

.update-notes-scrollbar {
    height: 100%;
}

.update-notes-markdown {
    padding: 14px 16px;
    color: var(--el-text-color-regular);
    font-size: 14px;
    line-height: 1.75;
    user-select: text;
}

.update-notes-markdown :deep(h2),
.update-notes-markdown :deep(h3) {
    margin: 0 0 10px;
    color: var(--el-text-color-primary);
    font-weight: 700;
    line-height: 1.4;
}

.update-notes-markdown :deep(h2) {
    font-size: 17px;
}

.update-notes-markdown :deep(h3) {
    font-size: 15px;
    margin-top: 14px;
}

.update-notes-markdown :deep(p) {
    margin: 0 0 10px;
}

.update-notes-markdown :deep(ul) {
    margin: 0 0 12px;
    padding-left: 18px;
}

.update-notes-markdown :deep(li) {
    margin-bottom: 8px;
    padding-left: 2px;
}

.update-notes-markdown :deep(code) {
    padding: 2px 5px;
    border-radius: 4px;
    color: var(--el-color-primary);
    background: var(--el-fill-color);
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
}

.update-dialog-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
}

.update-dialog-footer :deep(.el-button + .el-button) {
    margin-left: 0;
}
</style>