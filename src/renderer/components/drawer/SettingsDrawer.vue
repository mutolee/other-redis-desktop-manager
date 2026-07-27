<!--
    SettingsDrawer.vue
    描述：系统设置抽屉。管理主题、主题色、侧边栏、连接超时、关闭行为和开发者模式等用户偏好。
-->
<template>
    <el-drawer
        :model-value="drawerVisible"
        size="50%"
        direction="ltr"
        :with-header="true"
        :style="{
            'top': '40px',
            'height': 'calc(100vh - 40px)'
        }"
        @close="closeDrawer"
    >
        <template #header>
            <div class="drawer-header">
                <el-icon class="drawer-header-icon">
                    <SettingTwo/>
                </el-icon>
                <el-text size="large">{{ t('settings.title') }}</el-text>
            </div>
        </template>
        <div class="drawer-content">
            <div class="content-wrapper">
                <div class="content-left" :style="{ '--settings-tab-width': settingsTabWidth }">
                    <el-tabs v-model="activeTab" tab-position="left" class="settings-tabs">
                        <el-tab-pane :label="t('settings.tabs.general')" name="general">
                            <template #label>
                                <span class="tab-label">
                                    <SettingTwo class="tab-icon"/>{{ t('settings.tabs.general') }}
                                </span>
                            </template>
                        </el-tab-pane>
                        <el-tab-pane :label="t('settings.tabs.appearance')" name="appearance">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon class="tab-icon"><Theme/></el-icon>{{ t('settings.tabs.appearance') }}
                                </span>
                            </template>
                        </el-tab-pane>
                        <el-tab-pane :label="t('settings.tabs.connection')" name="connection">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon class="tab-icon"><LinkThree/></el-icon>{{ t('settings.tabs.connection') }}
                                </span>
                            </template>
                        </el-tab-pane>
                        <el-tab-pane :label="t('settings.tabs.other')" name="other">
                            <template #label>
                                <span class="tab-label settings-other-tab-label">
                                    <el-icon class="tab-icon"><More/></el-icon>
                                    {{ t('settings.tabs.other') }}
                                    <span v-if="hasAvailableUpdate" class="settings-update-dot"></span>
                                </span>
                            </template>
                        </el-tab-pane>
                    </el-tabs>
                </div>
                <div class="content-right">
                    <el-scrollbar>
                        <!-- 常规设置 -->
                        <div v-show="activeTab === 'general'" class="tab-content">
                            <h3 class="section-title">{{ t('settings.generalTitle') }}</h3>
                            <el-text type="info" size="small">{{ t('settings.generalDesc') }}</el-text>
                            <el-divider/>
                            <div class="settings-section">
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.language') }}</span>
                                        <span class="desc">{{ t('settings.languageDesc') }}</span>
                                    </div>
                                    <el-select v-model="language" @change="handleLanguageChange" style="width: 200px">
                                        <el-option
                                            v-for="option in languageOptions"
                                            :key="option.value"
                                            :label="option.label"
                                            :value="option.value"
                                        />
                                    </el-select>
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.closePrompt') }}</span>
                                        <span class="desc">{{ t('settings.closePromptDesc') }}</span>
                                    </div>
                                    <el-switch v-model="closeManagement.prompt"/>
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.closeToTray') }}</span>
                                        <span class="desc">{{ t('settings.closeToTrayDesc') }}</span>
                                    </div>
                                    <el-switch v-model="closeManagement.closeToTray"/>
                                </div>
                            </div>
                        </div>
                        <!-- 外观设置 -->
                        <div v-show="activeTab === 'appearance'" class="tab-content">
                            <h3 class="section-title">{{ t('settings.appearanceTitle') }}</h3>
                            <el-text type="info" size="small">{{ t('settings.appearanceDesc') }}</el-text>
                            <el-divider/>
                            <div class="settings-section">
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.sidebarCollapse') }}</span>
                                        <span class="desc">{{ t('settings.sidebarCollapseDesc') }}</span>
                                    </div>
                                    <el-switch v-model="sideCollapseState"/>
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.theme') }}</span>
                                        <span class="desc">{{ t('settings.themeDesc') }}</span>
                                    </div>
                                    <el-radio-group v-model="theme" @change="handleThemeChange">
                                        <el-radio-button v-for="option in themeOptions" :key="option.value" :label="option.value">
                                            {{ option.label }}
                                        </el-radio-button>
                                    </el-radio-group>
                                </div>
                                <div class="settings-item color">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.color') }}</span>
                                        <span class="desc">{{ t('settings.colorDesc') }}</span>
                                    </div>
                                    <div class="color-select">
                                        <div
                                            v-for="option in colorOptions"
                                            :key="option.value"
                                            class="color-item"
                                            :class="{ 'is-active': color === option.value }"
                                            :style="{ backgroundColor: option.color }"
                                            @click="handleColorChange(option.value)"
                                        >
                                            <span class="color-label">{{ option.label }}</span>
                                            <el-icon v-if="color === option.value" class="check-icon">
                                                <Check/>
                                            </el-icon>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- 连接设置 -->
                        <div v-show="activeTab === 'connection'" class="tab-content">
                            <h3 class="section-title">{{ t('settings.connectionTitle') }}</h3>
                            <el-text type="info" size="small">{{ t('settings.connectionDesc') }}</el-text>
                            <el-divider/>
                            <div class="settings-section">
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.connectTimeout') }}</span>
                                        <span class="desc">{{ t('settings.connectTimeoutDesc') }}</span>
                                    </div>
                                    <el-input-number
                                        v-model="connectionSettings.connectTimeout"
                                        :min="1000"
                                        :max="60000"
                                        :step="1000"
                                        controls-position="right"
                                        style="width: 120px"
                                    />
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.commandTimeout') }}</span>
                                        <span class="desc">{{ t('settings.commandTimeoutDesc') }}</span>
                                    </div>
                                    <el-input-number
                                        v-model="connectionSettings.commandTimeout"
                                        :min="1000"
                                        :max="30000"
                                        :step="1000"
                                        controls-position="right"
                                        style="width: 120px"
                                    />
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.scanCount') }}</span>
                                        <span class="desc">{{ t('settings.scanCountDesc') }}</span>
                                    </div>
                                    <el-input-number
                                        v-model="connectionSettings.scanCount"
                                        :min="100"
                                        :max="10000"
                                        :step="100"
                                        controls-position="right"
                                        style="width: 120px"
                                    />
                                </div>
                            </div>
                        </div>
                        <!-- 其他设置 -->
                        <div v-show="activeTab === 'other'" class="tab-content">
                            <h3 class="section-title">{{ t('settings.otherTitle') }}</h3>
                            <el-text type="info" size="small">{{ t('settings.otherDesc') }}</el-text>
                            <el-divider/>
                            <div class="settings-section">
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.resetSettings') }}</span>
                                        <span class="desc">{{ t('settings.resetSettingsDesc') }}</span>
                                    </div>
                                    <el-button type="danger" @click="handleReset">{{ t('common.reset') }}</el-button>
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>{{ t('settings.developerMode') }}</span>
                                        <span class="desc">
                                            {{ t('settings.developerModeDesc') }}
                                            <span v-if="developerMode">
                                                {{ t('settings.developerShortcut', {value: developerShortcut}) }}
                                            </span>
                                        </span>
                                    </div>
                                    <el-switch v-model="developerMode" @change="handleDeveloperModeChange"/>
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span class="version-title">
                                            {{ t('settings.versionInfo') }}
                                            <span v-if="hasAvailableUpdate" class="version-new-badge">{{ t('settings.update.newBadge') }}</span>
                                        </span>
                                        <span class="desc">
                                            V{{ currentVersion }}
                                            <span v-if="hasAvailableUpdate && latestVersion" class="latest-version-text">(V{{ latestVersion }})</span>
                                        </span>
                                    </div>
                                    <el-button :loading="checkingUpdate" @click="handleCheckUpdate">
                                        {{ t('settings.versionCheck') }}
                                    </el-button>
                                </div>
                            </div>
                        </div>
                    </el-scrollbar>
                </div>
            </div>
        </div>
    </el-drawer>
    <!-- 更新提示弹窗：独立组件负责版本信息展示、Markdown 内容渲染和 Release 页面跳转。 -->
    <UpdateCheckDialog v-model:visible="updateDialogVisible" :update-info="updateDialogInfo"/>
</template>

<script setup>
import {Check, LinkThree, More, SettingTwo, Theme} from '@icon-park/vue-next'
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {storeToRefs} from 'pinia'
import {ElMessage, ElMessageBox} from 'element-plus'
import {applyThemeTransition} from '../../utils/themeTransition.js'
import {useI18n} from '../../i18n/index.js'
import {useUserSettingsStore} from '../../stores/modules/userSettingsStore.js'
import {useAppUpdateStore} from '../../stores/modules/appUpdateStore.js'
import UpdateCheckDialog from '../dialog/UpdateCheckDialog.vue'

// 组件入参：由标题栏或其他入口控制设置抽屉显示状态。
const props = defineProps({
    visible: {
        type: Boolean
    }
})

// 对外事件：同步 v-model:visible。
const emit = defineEmits(['update:visible'])

// 抽屉可见性代理：把 Element Plus Drawer 的 v-model 透传给父组件。
const drawerVisible = computed({
    get: () => props.visible,
    // update:visible 是一个特殊的 Vue 约定写法，用于实现自定义组件的双向绑定
    // 会自动更新父组件的 v-model:visible 绑定的属性值
    set: value => emit('update:visible', value)
})

// 用户设置 Store：设置抽屉中的主题、语言、关闭行为等配置项直接读写该 Store。
const userSettingsStore = useUserSettingsStore()

// 应用更新 Store：驱动版本检查按钮 loading、Other Tab 红点和版本信息 new 标记。
const appUpdateStore = useAppUpdateStore()

// 国际化文案：设置抽屉是语言切换入口，需要优先接入 i18n。
const {t} = useI18n()

// 开发者工具快捷键：macOS 使用系统常见组合，其他平台保持 Ctrl + Shift + I。
const developerShortcut = window.api.appInfo.getPlatform() === 'darwin'
    ? 'Option + Command + I'
    : 'Ctrl + Shift + I'

// 记录最后点击位置，用于 View Transitions 动画圆心
let lastClickX = 0
let lastClickY = 0

const onMousedown = (e) => {
    lastClickX = e.clientX
    lastClickY = e.clientY
}

onMounted(() => document.addEventListener('mousedown', onMousedown))
onUnmounted(() => document.removeEventListener('mousedown', onMousedown))

const {
    theme,
    color,
    language,
    sideCollapseState,
    connectionSettings,
    closeManagement,
    developerMode
} = storeToRefs(userSettingsStore)
const {
    currentVersion,
    hasAvailableUpdate,
    latestVersion,
    checking: checkingUpdate
} = storeToRefs(appUpdateStore)

// 当前激活的设置标签页。
const activeTab = ref('general')

// 更新弹窗状态：发现新版本后交给独立弹窗组件展示。
const updateDialogVisible = ref(false)

// 待展示的更新信息：由 main 进程从 GitHub Release 返回，传给更新弹窗组件。
const updateDialogInfo = ref(null)

// 设置左侧 Tabs 宽度：中文紧凑显示，英文为较长标签预留空间。
const settingsTabWidth = computed(() => language.value === 'en-US' ? '130px' : '100px')

// 主题选项：浅色/深色，切换时使用 View Transition 动画。
const themeOptions = computed(() => [
    {label: t('settings.themeLight'), value: 'light'},
    {label: t('settings.themeDark'), value: 'dark'}
])

// 主题色选项：用于切换 Element Plus 主题色变量。
const colorOptions = computed(() => [
    {label: t('settings.colors.default'), value: 'default', color: '#409EFF'},
    {label: t('settings.colors.pink'), value: 'pink', color: '#E91E63'},
    {label: t('settings.colors.purple'), value: 'purple', color: '#673AB7'},
    {label: t('settings.colors.orange'), value: 'orange', color: '#FF9800'},
    {label: t('settings.colors.green'), value: 'green', color: '#4CAF50'},
    {label: t('settings.colors.business'), value: 'business', color: '#2C3E50'},
    {label: t('settings.colors.cyan'), value: 'cyan', color: '#00BCD4'},
    {label: t('settings.colors.brown'), value: 'brown', color: '#8B4513'},
    {label: t('settings.colors.blue'), value: 'blue', color: '#1E88E5'}
])

// 语言选项：切换后会更新 Element Plus 内置文案和已接入 i18n 的业务文案。
const languageOptions = [
    {label: '简体中文', value: 'zh-CN'},
    {label: 'English', value: 'en-US'}
]

/**
 * 关闭抽屉
 */
const closeDrawer = () => {
    drawerVisible.value = false
}

/**
 * 处理主题变更
 */
const handleThemeChange = (value) => {
    applyThemeTransition(() => {
        userSettingsStore.setTheme(value)
    }, {clientX: lastClickX, clientY: lastClickY})
}

/**
 * 处理颜色变更
 */
const handleColorChange = (value) => {
    applyThemeTransition(() => {
        userSettingsStore.setColor(value)
    }, {clientX: lastClickX, clientY: lastClickY})
}

/**
 * 处理语言变更
 */
const handleLanguageChange = (value) => {
    userSettingsStore.setLanguage(value)
}

/**
 * 处理开发者模式变更
 */
const handleDeveloperModeChange = async (value) => {
    if (value) {
        await window.api.develop.openDevelopMode()
    } else {
        await window.api.develop.closeDevelopMode()
    }
}

/**
 * 重置所有设置
 */
const handleReset = async () => {
    try {
        await ElMessageBox.confirm(
            t('settings.resetConfirmMessage'),
            t('settings.resetConfirmTitle'),
            {
                confirmButtonText: t('common.confirm'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
            }
        )
        userSettingsStore.resetToDefaults()
        ElMessage.success(t('settings.resetSuccess'))
    } catch {
        // 用户取消操作
    }
}

/**
 * 手动检查 GitHub Release 更新。
 * 通过 main 进程访问 GitHub Release，renderer 只负责展示 loading、结果弹窗和错误提示。
 */
const handleCheckUpdate = async () => {
    if (checkingUpdate.value) {
        return
    }

    try {
        const updateResult = await appUpdateStore.checkForUpdates()

        if (!updateResult.success) {
            ElMessage.error(updateResult.error || t('settings.update.checkFail'))
            return
        }

        const updateInfo = updateResult.data

        if (!updateInfo.hasUpdate) {
            ElMessage.success(t('settings.update.noUpdate', {value: updateInfo.currentVersion}))
            return
        }

        updateDialogInfo.value = updateInfo
        updateDialogVisible.value = true
    } catch (error) {
        ElMessage.error(error.message || t('settings.update.checkFail'))
    }
}

onMounted(async () => {
    await appUpdateStore.initializeUpdateState()
})
</script>

<style scoped>
.drawer-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.drawer-header-icon {
    font-size: 24px;
    color: var(--el-color-primary);
}

.drawer-content {
    height: 100%;
    padding: 20px 0 0 20px;
    overflow: hidden;
}

.content-wrapper {
    display: flex;
    gap: 20px;
    height: 100%;
}

.content-left {
    width: var(--settings-tab-width, 100px);
    flex-shrink: 0;
    overflow: hidden;
}

.content-right {
    flex: 1;
    overflow: hidden;
}

.settings-tabs .tab-label {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tab-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 1;
    transform: translateY(1px);
}

.settings-update-dot {
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #f56c6c;
}

.settings-tabs .tab-label :deep(.i-icon),
.settings-tabs .tab-label :deep(.el-icon) {
    flex-shrink: 0;
}

/* 设置页左侧 Tabs：给英文标签预留稳定宽度，避免长单词撑破侧边栏。 */
.settings-tabs :deep(.el-tabs__header) {
    width: var(--settings-tab-width, 100px);
    margin-right: 0;
}

.settings-tabs :deep(.el-tabs__item) {
    justify-content: flex-start;
    width: var(--settings-tab-width, 100px);
    padding: 0 14px;
    overflow: hidden;
}

.tab-content {
    padding: 0 20px 20px 10px;
}

.section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.settings-section {
    margin-top: 30px;
}

.settings-item:not(.color) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 0;
    min-height: 60px;
    gap: 20px;
}

.settings-item.color {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px 0;
    min-height: 100px;
}

.settings-item-label {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 6px;
}

.settings-item-label .desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.version-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.version-new-badge {
    height: 16px;
    padding: 0 5px;
    border-radius: 8px;
    font-size: 11px;
    line-height: 16px;
    color: #ffffff;
    background: #f56c6c;
    text-transform: uppercase;
}

.latest-version-text {
    margin-left: 4px;
    color: #f56c6c;
}

.color-select {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.color-item {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 6px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
}

.color-item:hover {
    transform: scale(1.1);
}

.color-item.is-active {
    box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.7);
}

.color-item.is-active .check-icon {
    position: absolute;
    right: 5px;
    top: 5px;
    color: #fff;
    font-size: 16px;
}

/* 颜色卡片文字：英文较长时限制为两行，保持卡片高度和对齐稳定。 */
.color-label {
    display: -webkit-box;
    overflow: hidden;
    color: #fff;
    font-size: 13px;
    line-height: 1.35;
    text-align: center;
    word-break: keep-all;
    overflow-wrap: anywhere;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}
</style>
