/**
 * Key 详情分页请求状态组合逻辑。
 * 用于集合类型“加载更多”和“加载全部”操作，统一管理 loading、请求序号和组件生命周期失效。
 */
import {onDeactivated, onUnmounted, ref} from 'vue'

/**
 * 创建一个只允许最新分页请求回写的请求控制器。
 * 组件停用或销毁后，当前 IPC 可以自然结束，但旧结果不得继续回写或发起下一批请求。
 *
 * @returns {{loading: import('vue').Ref<boolean>, beginRequest: Function, isRequestCurrent: Function, finishRequest: Function, invalidateRequest: Function}}
 */
export const useKeyDetailBatchRequest = () => {
    const loading = ref(false)
    let requestId = 0

    /**
     * 开始新的分批请求，并让此前仍在等待的请求失效。
     * @returns {number} 当前请求序号。
     */
    const beginRequest = () => {
        requestId += 1
        loading.value = true
        return requestId
    }

    /**
     * 判断异步返回是否仍属于当前有效请求。
     * @param {number} targetRequestId - 发起请求时保存的序号。
     * @returns {boolean} 是否允许继续处理和回写。
     */
    const isRequestCurrent = (targetRequestId) => targetRequestId === requestId

    /**
     * 结束当前请求；旧请求的 finally 不得关闭新请求的 loading。
     * @param {number} targetRequestId - 发起请求时保存的序号。
     */
    const finishRequest = (targetRequestId) => {
        if (isRequestCurrent(targetRequestId)) {
            loading.value = false
        }
    }

    /**
     * 让当前分批循环立即失效，阻止下一批请求和旧结果回写。
     * 既用于组件停用、切换 Key，也用于用户点击“停止加载”主动结束循环。
     */
    const invalidateRequest = () => {
        requestId += 1
        loading.value = false
    }

    onDeactivated(invalidateRequest)
    onUnmounted(invalidateRequest)

    return {
        loading,
        beginRequest,
        isRequestCurrent,
        finishRequest,
        invalidateRequest
    }
}
