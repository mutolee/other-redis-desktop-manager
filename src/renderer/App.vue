<!--
    App.vue
    描述：渲染进程根组件。
    职责：作为应用最外层 Vue 入口，只承载路由出口；具体页面骨架、主题初始化和业务状态由下层视图/组件负责。
 -->
<template>
    <!-- Element Plus 全局配置：根据用户设置切换内置组件语言。 -->
    <el-config-provider :locale="elementLocale">
        <!-- 路由出口：根据当前路由渲染启动页、主页面等顶层视图。 -->
        <router-view/>
    </el-config-provider>
</template>

<script setup>
import { watch } from 'vue'
import { useI18n } from './i18n/index.js'

// 国际化配置：Element Plus locale 和 html lang 都由用户语言设置驱动。
const { language, elementLocale } = useI18n()

watch(
    language,
    (nextLanguage) => {
        // 同步 html lang，方便浏览器、辅助工具和未来本地化样式识别当前语言。
        document.documentElement.lang = nextLanguage

        // 同步 main 进程语言，驱动托盘菜单等 Electron 原生 UI 文案。
        window.api?.appInfo?.setLanguage?.(nextLanguage)
    },
    { immediate: true }
)
</script>
