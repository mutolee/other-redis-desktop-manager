import {defineStore} from 'pinia'
import {ref} from 'vue'

/**
 * 基础 UI 状态存储。
 * 管理侧边栏搜索模式、导出模式等跨组件共享的轻量界面状态。
 */
export const useBaseStateStore = defineStore('baseStateStore', () => {

    // 搜索模式状态：连接菜单和连接配置弹窗会根据该状态切换搜索交互。
    const searchModeState = ref(false)

    // 导出模式状态：连接菜单进入批量选择导出时使用。
    const exportModeState = ref(false)

    return {
        searchModeState,
        exportModeState
    }
})
