<!--
    SplashView.vue
    描述：应用启动页。展示启动动画、产品名称、加载阶段文案和版本信息。
 -->
<template>
    <!-- 启动画面背景容器：深色背景 + 圆角边框，模拟独立启动窗口。 -->
    <div class="splash-page">
        <!-- 产品 Logo 区域。 -->
        <div class="logo-container">
            <div class="logo">
                <img src="../assets/logo.png" alt=""/>
            </div>
        </div>

        <!-- 产品名称：使用渐变文字作为启动页核心视觉焦点。 -->
        <div class="product-name">Other Redis Desktop Manager</div>

        <!-- 加载动画区域：阶段文案 + 移动进度条。 -->
        <div class="loading-container">
            <div class="loading-text">
                {{ loadingText }}<span class="loading-dots"></span>
            </div>
            <div class="loading-progress">
                <div class="bar"></div>
            </div>
        </div>

        <!-- 版本信息：右下角展示应用版本和 Chromium 版本。 -->
        <div class="version-container">
            <span :class="{ 'version-error': versionError }">{{ appVersion }}</span>
        </div>
    </div>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {useI18n} from '../i18n/index.js'

// 国际化文案读取函数：驱动启动页版本状态和加载阶段文案。
const {t} = useI18n()

// 应用版本号：由 preload 从 main 进程获取，展示在启动页右下角。
const appVersion = ref(t('splash.versionLoading'))

// 启动阶段文案：跟随 simulateLoadingProcess 分阶段切换。
const loadingText = ref(t('splash.loadingSteps.initializing'))

// 版本获取失败标记：失败时使用错误色展示版本区域。
const versionError = ref(false)

// 启动页阶段文案：只影响视觉反馈，不参与真实初始化流程控制。
const LOADING_TEXT_KEYS = [
    'splash.loadingSteps.initializing',
    'splash.loadingSteps.loadingUi',
    'splash.loadingSteps.preparingConnection',
    'splash.loadingSteps.completed'
]

onMounted(() => {
    initContent()
})

/**
 * 初始化启动页内容。
 * 从 preload 暴露的 appInfo API 获取版本信息，并播放启动阶段文案。
 */
const initContent = async () => {
    try {
        const version = await window.api.appInfo.getVersion()
        const chromeVersion = await window.api.appInfo.getChromeVersion()

        appVersion.value = `${version} · Chrome ${chromeVersion}`

        await simulateLoadingProcess()
    } catch (error) {
        appVersion.value = t('splash.startupFailed')
        versionError.value = true
    }
}

/**
 * 模拟启动加载阶段。
 * 主进程负责真实窗口切换，这里只提供启动页视觉反馈。
 */
const simulateLoadingProcess = async () => {
    for (const key of LOADING_TEXT_KEYS) {
        loadingText.value = t(key)

        // 每个阶段停留 800ms，让启动页文案变化能被用户感知。
        await new Promise((resolve) => setTimeout(resolve, 800))
    }
}
</script>

<style scoped>
.splash-page {
    display: flex;
    flex-direction: column;
    background: rgba(21, 21, 21, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
}

.logo-container {
    display: flex;
    justify-content: center;
    margin-top: 40px;
    margin-bottom: 30px;
}

.logo {
    width: 90px;
    height: 90px;
    background: var(--el-color-primary);
    border-radius: 8px;
    box-shadow: 0 0 20px 8px rgba(52, 152, 219, 0.3);
}

.logo img {
    width: 100%;
    height: 100%;
}

.product-name {
    text-align: center;
    background: linear-gradient(135deg, #ffffff 0%, var(--el-color-primary) 100%);
    background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 700;
    font-size: 24px;
    margin-bottom: 50px;
}

.loading-container {
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
}

.loading-text {
    text-align: center;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 10px;
}

.loading-dots {
    margin-left: 5px;
}

.loading-dots::after {
    content: '';
    animation: loadingDots 1.5s infinite;
}

@keyframes loadingDots {
    0%,
    20% {
        content: '';
    }

    40% {
        content: '.';
    }

    60% {
        content: '..';
    }

    80%,
    100% {
        content: '...';
    }
}

.loading-progress {
    margin-left: 20px;
    margin-right: 20px;
    height: 6px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
}

.loading-progress .bar {
    height: 100%;
    width: 35%;
    background: linear-gradient(90deg, #e74c3c 0%, #3498db 50%, #2ecc71 100%);
    border-radius: 3px;
    animation: loadingProgress 2.5s ease-in-out infinite;
}

@keyframes loadingProgress {
    0% {
        transform: translateX(-100%);
        opacity: 0.8;
    }

    50% {
        transform: translateX(200%);
        opacity: 1;
    }

    100% {
        transform: translateX(400%);
        opacity: 0.8;
    }
}

.version-container {
    font-size: 10px;
    display: flex;
    justify-content: flex-end;
    color: rgba(255, 255, 255, 0.5);
    margin-right: 20px;
    margin-top: 5px;
    margin-bottom: 15px;
}

.version-error {
    color: red;
}
</style>
