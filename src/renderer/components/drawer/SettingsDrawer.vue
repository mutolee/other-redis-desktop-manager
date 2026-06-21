<!--
  设置抽屉组件
  描述：以 el-drawer 展示设置内容，可在任意位置通过 v-model 复用
-->
<script setup>
import {Check, LinkThree, More, SettingTwo, Theme} from '@icon-park/vue-next';
import {computed, ref} from "vue";
import {storeToRefs} from "pinia";
import {useUserSettingsStore} from "../../stores/modules/userSettingsStore.js";
import {ElMessage, ElMessageBox} from "element-plus";

// Props
const props = defineProps({
    visible: {
        type: Boolean
    }
})

// Emits
const emit = defineEmits(['update:visible'])

// 响应式数据
const drawerVisible = computed({
    get: () => props.visible,
    // update:visible 是一个特殊的 Vue 约定写法，用于实现自定义组件的双向绑定
    // 会自动更新父组件的 v-model:visible 绑定的属性值
    set: value => emit('update:visible', value)
})

// 获取用户设置 store
const userSettingsStore = useUserSettingsStore()
const {
    theme,
    color,
    language,
    sideCollapseState,
    connectionSettings,
    closeManagement,
    developerMode
} = storeToRefs(userSettingsStore)

// 当前激活的标签页
const activeTab = ref('general')

// 主题选项
const themeOptions = [
    {label: '浅色', value: 'light'},
    {label: '深色', value: 'dark'}
]

// 颜色选项
const colorOptions = [
    {label: '默认', value: 'default', color: '#409EFF'},
    {label: '优雅粉', value: 'pink', color: '#E91E63'},
    {label: '商务紫', value: 'purple', color: '#673AB7'},
    {label: '活力橙', value: 'orange', color: '#FF9800'},
    {label: '清新绿', value: 'green', color: '#4CAF50'},
    {label: '商务黑', value: 'business', color: '#2C3E50'},
    {label: '靛青蓝', value: 'cyan', color: '#00BCD4'},
    {label: '咖啡棕', value: 'brown', color: '#8B4513'},
    {label: '科技蓝', value: 'blue', color: '#1E88E5'},
]

// 语言选项
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
    userSettingsStore.setTheme(value)
}

/**
 * 处理颜色变更
 */
const handleColorChange = (value) => {
    userSettingsStore.setColor(value)
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
            '确定要重置所有设置为默认值吗？此操作不可撤销。',
            '确认重置',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )
        userSettingsStore.resetToDefaults()
        ElMessage.success('设置已重置为默认值')
    } catch {
        // 用户取消操作
    }
}
</script>

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
                <el-text size="large">应用设置</el-text>
            </div>
        </template>
        <div class="drawer-content">
            <div class="content-wrapper">
                <div class="content-left">
                    <el-tabs v-model="activeTab" tab-position="left" class="settings-tabs">
                        <el-tab-pane label="常规" name="general">
                            <template #label>
                                <span class="tab-label">
                                    <SettingTwo/>常规
                                </span>
                            </template>
                        </el-tab-pane>
                        <el-tab-pane label="外观" name="appearance">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><Theme/></el-icon>外观
                                </span>
                            </template>
                        </el-tab-pane>
                        <el-tab-pane label="连接" name="connection">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><LinkThree/></el-icon>连接
                                </span>
                            </template>
                        </el-tab-pane>
                        <el-tab-pane label="其他" name="other">
                            <template #label>
                                <span class="tab-label">
                                    <el-icon><More/></el-icon>其他
                                </span>
                            </template>
                        </el-tab-pane>
                    </el-tabs>
                </div>
                <div class="content-right">
                    <el-scrollbar>
                        <!-- 常规设置 -->
                        <div v-show="activeTab === 'general'" class="tab-content">
                            <h3 class="section-title">常规设置</h3>
                            <el-text type="info" size="small">配置应用的基本选项</el-text>
                            <el-divider/>
                            <div class="settings-section">
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>界面语言</span>
                                        <span class="desc">选择应用的显示语言</span>
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
                                        <span>关闭时提示</span>
                                        <span class="desc">关闭应用时是否显示确认提示</span>
                                    </div>
                                    <el-switch v-model="closeManagement.prompt"/>
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>关闭时最小化到托盘</span>
                                        <span class="desc">关闭窗口时最小化到系统托盘，而不是退出应用</span>
                                    </div>
                                    <el-switch v-model="closeManagement.closeToTray"/>
                                </div>
                            </div>
                        </div>
                        <!-- 外观设置 -->
                        <div v-show="activeTab === 'appearance'" class="tab-content">
                            <h3 class="section-title">外观设置</h3>
                            <el-text type="info" size="small">配置应用的外观选项</el-text>
                            <el-divider/>
                            <div class="settings-section">
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>收缩菜单</span>
                                        <span class="desc">设置左侧菜单栏是否收缩</span>
                                    </div>
                                    <el-switch v-model="sideCollapseState"/>
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>主题</span>
                                        <span class="desc">选择应用的主题模式</span>
                                    </div>
                                    <el-radio-group v-model="theme" @change="handleThemeChange">
                                        <el-radio-button v-for="option in themeOptions" :key="option.value" :label="option.value">
                                            {{ option.label }}
                                        </el-radio-button>
                                    </el-radio-group>
                                </div>
                                <div class="settings-item color">
                                    <div class="settings-item-label">
                                        <span>颜色主题</span>
                                        <span class="desc">选择应用的主色调</span>
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
                                            <el-text style="color: white;">{{ option.label }}</el-text>
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
                            <h3 class="section-title">连接设置</h3>
                            <el-text type="info" size="small">配置应用的连接选项</el-text>
                            <el-divider/>
                            <div class="settings-section">
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>连接超时时间</span>
                                        <span class="desc">Redis 连接超时时间（毫秒）</span>
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
                                        <span>命令超时时间</span>
                                        <span class="desc">Redis 命令执行超时时间（毫秒）</span>
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
                                        <span>Key 扫描数量</span>
                                        <span class="desc">SCAN 命令每次扫描的 Key 数量，值越大可能影响性能</span>
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
                            <h3 class="section-title">其他设置</h3>
                            <el-text type="info" size="small">配置应用的其他选项</el-text>
                            <el-divider/>
                            <div class="settings-section">
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>重置设置</span>
                                        <span class="desc">将所有设置恢复为默认值</span>
                                    </div>
                                    <el-button type="danger" @click="handleReset">重置为默认值</el-button>
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>开发者模式</span>
                                        <span class="desc">开启开发者模式，显示更多调试信息。<span v-if="developerMode">快捷键：Ctrl/Command + Shift + I</span></span>
                                    </div>
                                    <el-switch v-model="developerMode" @change="handleDeveloperModeChange"/>
                                </div>
                                <div class="settings-item">
                                    <div class="settings-item-label">
                                        <span>版本信息</span>
                                        <span class="desc">V1.0.0</span>
                                    </div>
                                    <el-button>版本检查</el-button>
                                </div>
                            </div>
                        </div>
                    </el-scrollbar>
                </div>
            </div>
        </div>
    </el-drawer>
</template>

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
    flex-shrink: 0;
}

.content-right {
    flex: 1;
    overflow: hidden;
}

.settings-tabs .tab-label {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 75px;
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

.color-select {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.color-item {
    width: 80px;
    height: 80px;
    border-radius: 6px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.color-item:hover {
    transform: scale(1.1);
}

.color-item.is-active {
    box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.7);
}

.color-item.is-active .check-icon {
    color: #fff;
    font-size: 20px;
}
</style>