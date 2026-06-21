/**
 * 渲染进程入口文件
 * 负责初始化 Vue 应用、注册插件和挂载到 DOM
 */
import {createApp} from 'vue'
import App from './App.vue'

// Element Plus UI 组件库
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// 引入暗黑主题
import 'element-plus/theme-chalk/dark/css-vars.css'

// 导入全局样式
import './assets/global.css'

// Vue Router 路由管理
import router from './router'

// Pina 状态管理
import store from './stores'

/**
 * 创建 Vue 应用实例
 * 注册必要的插件和中间件
 */
const app = createApp(App)
// 注册路由 - 提供页面导航功能
app.use(router)
// 注册状态管理 - 提供全局状态共享功能
app.use(store)
// 注册 Element Plus - 提供丰富的 UI 组件
app.use(ElementPlus)
// 挂载应用到 DOM 节点
app.mount('#app')