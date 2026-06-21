/**
 * Vue Router 路由配置
 * 定义应用的路由规则和页面映射
 */
import {createRouter, createWebHashHistory} from 'vue-router'

// 路由配置数组
const routes = [
    {
        path: '/splash',
        name: 'splash',
        component: () => import('../views/SplashView.vue'),
        meta: {
            title: '启动中...',
            description: 'Redis 客户端管理工具'
        }
    },
    {
        path: '/main',
        name: 'main',
        component: () => import('../views/MainView.vue'),
        meta: {
            title: '首页',
            description: 'Redis 客户端管理工具'
        }
    },
]

// 创建路由实例
const router = createRouter({
    // 使用 hash 模式，适合 Electron 应用
    // 避免文件协议导致的路径问题
    history: createWebHashHistory(),
    routes
})

// 全局前置守卫 - 页面跳转前的处理
router.beforeEach((to, from, next) => {
    console.log(`路由跳转: ${from.path} -> ${to.path}`)
    next()
})

// 全局后置钩子 - 页面跳转后的处理
router.afterEach((to, from) => {
    console.log(`路由跳转完成: ${to.path}`)
})

export default router