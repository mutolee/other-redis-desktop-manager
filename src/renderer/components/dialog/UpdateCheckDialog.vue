<!--
    UpdateCheckDialog.vue
    描述：版本检查结果弹窗。用于展示 GitHub Release 最新版本、当前版本和 Markdown 更新说明。
-->
<template>
    <!-- 更新提示弹窗：保持 Element Plus Dialog 原始样式，只固定高度并让内容区滚动。 -->
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
            <!-- 弹窗标题：使用更新图标强化这是版本升级确认弹窗。 -->
            <DialogTitle :icon="DownloadComputer" :title="t('settings.update.foundTitle')"/>
        </template>
        <div class="update-dialog-body">
            <!-- 版本摘要：仅展示文字信息，不额外改变 Dialog 的原始视觉风格。 -->
            <div class="update-version-summary">
                <span>{{ t('settings.update.currentVersion') }}: V{{ updateInfo?.currentVersion }}</span>
                <span>{{ t('settings.update.latestVersion') }}: V{{ updateInfo?.latestVersion }}</span>
            </div>

            <!-- 更新内容：body 内部滚动，Dialog header/footer 保持 Element Plus 原始样式。 -->
            <el-scrollbar class="update-notes-scrollbar">
                <div class="update-notes-title">{{ t('settings.update.releaseNotesTitle') }}</div>
                <div class="update-notes-markdown" v-html="releaseNotesHtml"></div>
            </el-scrollbar>
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

<script setup>
import {computed, ref} from 'vue'
import {DownloadComputer} from '@icon-park/vue-next'
import {ElMessage} from 'element-plus'
import {useI18n} from '../../i18n/index.js'
import {renderReleaseNotesMarkdown} from '../../utils/releaseNotesMarkdownUtil.js'
import DialogTitle from '../common/DialogTitle.vue'

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
const {t} = useI18n()

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

<style scoped>
/* 更新弹窗尺寸：保留 Element Plus Dialog 原始视觉，仅固定整体高度。 */
:global(.update-dialog) {
    --update-dialog-height: 520px;
    height: var(--update-dialog-height);
    max-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
}

/* Dialog 内容区：成为内部滚动容器的约束边界，避免 Markdown 挤压 footer。 */
:global(.update-dialog .el-dialog__body) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.update-dialog-body {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    gap: 12px;
}

/* 版本摘要：简单文字行，避免额外自定义卡片破坏 Dialog 原始观感。 */
.update-version-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    flex-shrink: 0;
    color: var(--el-text-color-regular);
    font-size: 13px;
}

/* 更新内容：Dialog body 内唯一滚动区，右侧保留一点阅读空隙。 */
.update-notes-scrollbar {
    flex: 1;
    min-height: 0;
}

.update-notes-title {
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.update-notes-markdown {
    padding-right: 10px;
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
