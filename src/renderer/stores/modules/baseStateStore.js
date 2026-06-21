import {ref} from "vue";
import {defineStore} from "pinia";

/**
 * 基础状态存储
 */
export const useBaseStateStore = defineStore('baseStateStore', () => {

    // 搜索状态
    const searchModeState = ref(false)
    // 导出状态
    const exportModeState = ref(false)

    return {
        // 属性
        searchModeState,
        exportModeState,
    }
})