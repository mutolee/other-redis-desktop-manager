<!--
    SplashView.vue
    描述：启动页
 -->
<script setup>
import {onMounted, ref} from "vue";

// 响应式数据
const appVersion = ref('加载中...');
const loadingText = ref('正在初始化应用组件');
const versionError = ref(false);

onMounted(() => {
    initContent();
});

/**
 * 启动页面初始化脚本
 * 负责获取应用版本信息并更新页面显示
 */
const initContent = async () => {
    try {
        console.log('启动页面开始初始化...');

        // 获取应用版本信息
        const version = await window.api.appInfo.getVersion();
        const chromeVersion = await window.api.appInfo.getChromeVersion();

        // 更新版本显示（包含 Chrome 版本，低调展示）
        appVersion.value = `${version} · Chrome ${chromeVersion}`;
        console.log(`版本信息: ${version} (Chrome ${chromeVersion})`);

        // 模拟加载过程，提供更好的用户体验
        await simulateLoadingProcess();

        console.log('启动页面初始化完成');
    } catch (error) {
        console.error('启动页面初始化失败:', error);

        // 错误处理 - 显示默认版本信息
        appVersion.value = '应用启动失败...';
        versionError.value = true;
    }
};

/**
 * 模拟加载过程
 * 提供视觉反馈，让用户知道应用正在启动
 */
const simulateLoadingProcess = async () => {
    const loadingTexts = [
        '正在初始化应用组件',
        '正在加载用户界面',
        '正在准备数据库连接',
        '启动完成'
    ];

    for (let i = 0; i < loadingTexts.length; i++) {
        loadingText.value = loadingTexts[i];

        // 每个阶段等待 800ms
        await new Promise(resolve => setTimeout(resolve, 800));
    }
}
</script>

<template>
    <div class="splash-page no-select">
        <div class="logo-container">
            <div class="logo">
                <img src="../assets/img/logo.png" alt=""/>
            </div>
        </div>
        <div class="product-name">Other Redis Desktop Manager</div>
        <div class="loading-container">
            <div class="loading-text">
                {{ loadingText }}<span class="loading-dots"></span>
            </div>
            <div class="loading-progress">
                <div class="bar"></div>
            </div>
        </div>
        <div class="version-container">
            <span :class="{ 'version-error': versionError }">{{ appVersion }}</span>
        </div>
    </div>
</template>

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
    margin-top: 25px;
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
    0%, 20% {
        content: '';
    }
    40% {
        content: '.';
    }
    60% {
        content: '..';
    }
    80%, 100% {
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
    justify-content: right;
    color: rgba(255, 255, 255, 0.5);
    margin-right: 20px;
    margin-top: 5px;
    margin-bottom: 15px;
}

.version-error {
    color: red;
}
</style>