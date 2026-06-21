import {createPinia} from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

/**
 * 创建一个Pinia实例
 * <br/>
 * Pinia文档地址：https://pinia.vuejs.org/zh/introduction.html
 */
const store = createPinia()
// 注册持久化插件
store.use(piniaPluginPersistedstate)

export default store