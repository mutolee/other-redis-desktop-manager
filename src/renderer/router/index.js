/**
 * Vue Router 路由入口。
 * Electron 渲染进程使用 hash 路由，避免 file:// 或打包路径下 history 路由刷新失效。
 */
import {createRouter, createWebHashHistory} from 'vue-router'
import {useI18n} from '../i18n/index.js'

// 默认页面标题：路由未声明 meta.title 时使用。
const DEFAULT_PAGE_TITLE = 'Other Redis Desktop Manager'

// 路由标题兜底文案：极早期路由初始化可能早于 Pinia，这里避免标题生成失败。
const ROUTE_TITLE_FALLBACKS = {
    'router.splash.title': '启动中...',
    'router.main.title': '首页'
}

/**
 * 读取路由标题。
 * 优先使用全局 i18n；如果初始路由早于 store 初始化，则使用兜底文案。
 *
 * @param {string} titleKey - 路由标题 i18n key
 * @returns {string} 当前语言标题
 */
const readRouteTitle = (titleKey) => {
    if (!titleKey) {
        return ''
    }

    try {
        const {t} = useI18n()
        return t(titleKey, ROUTE_TITLE_FALLBACKS[titleKey] || '')
    } catch (error) {
        return ROUTE_TITLE_FALLBACKS[titleKey] || ''
    }
}

/**
 * 页面路由表。
 * 启动页和主界面都由主进程窗口加载 hash 地址进入。
 */
const routes = [
    {
        path: '/splash',
        name: 'splash',
        component: () => import('../views/SplashView.vue'),
        meta: {
            titleKey: 'router.splash.title',
            descriptionKey: 'router.splash.description'
        }
    },
    {
        path: '/main',
        name: 'main',
        component: () => import('../views/MainView.vue'),
        meta: {
            titleKey: 'router.main.title',
            descriptionKey: 'router.main.description'
        }
    }
]

// 路由实例：Electron 内使用 createWebHashHistory，兼容开发服务器和生产 dist 文件。
const router = createRouter({
    history: createWebHashHistory(),
    routes
})

/**
 * 路由后置钩子。
 * 只同步文档标题，不输出调试日志，避免生产环境控制台噪音。
 */
router.afterEach((to) => {
    const routeTitle = readRouteTitle(to.meta?.titleKey)

    document.title = routeTitle
        ? `${routeTitle} - ${DEFAULT_PAGE_TITLE}`
        : DEFAULT_PAGE_TITLE
})

export default router
