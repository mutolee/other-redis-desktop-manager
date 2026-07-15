import {createPinia} from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

/**
 * Pinia 状态管理入口。
 * 负责创建全局 Pinia 实例，并注册持久化插件。
 */
const store = createPinia()

// 持久化插件：具体哪些 store 持久化由各 store 的 persist 配置决定。
store.use(piniaPluginPersistedstate)

export default store
