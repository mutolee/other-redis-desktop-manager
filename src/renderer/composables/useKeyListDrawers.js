/**
 * Key 列表 Drawer 状态组合逻辑。
 * 管理内存分析、慢查询和删除目录 Key 三类抽屉的打开参数。
 */
import {ref, unref} from 'vue'
import {ElMessage} from 'element-plus'

/**
 * 创建 Key 列表 Drawer 状态。
 * @param {{connectionId: import('vue').Ref<string>, currentKeySeparator: import('vue').Ref<string>, t: Function}} options - 外部依赖。
 */
export const useKeyListDrawers = (options) => {
    const {connectionId, currentKeySeparator, t} = options

    // 内存分析抽屉显示状态：由顶部操作菜单打开，重型扫描只在抽屉打开后触发。
    const memoryAnalysisDrawerVisible = ref(false)

    // 内存分析匹配范围：顶部菜单使用全库，目录右键菜单使用目录前缀过滤。
    const memoryAnalysisMatchPattern = ref('*')

    // 内存分析范围提示：目录右键打开时用于提示当前只分析某个目录。
    const memoryAnalysisScopeLabel = ref('')

    // 慢查询抽屉显示状态：从顶部操作菜单打开，展示 Redis 实例级 SLOWLOG。
    const slowQueryDrawerVisible = ref(false)

    // 删除目录 Key 抽屉显示状态：目录右键菜单打开，先预览再删除。
    const deleteDirectoryDrawerVisible = ref(false)

    // 当前准备删除的目录节点：用于 Drawer 顶部展示和 pattern 计算。
    const deleteDirectoryTarget = ref(null)

    // 当前目录删除匹配模式：传给 main 进程执行 SCAN MATCH。
    const deleteDirectoryMatchPattern = ref('')

    /**
     * 确保当前连接可用，打开抽屉前统一提示。
     * @returns {boolean} 是否可继续操作
     */
    const ensureConnectionReady = () => {
        if (!unref(connectionId)) {
            ElMessage.warning(t('keyList.messages.connectFirst'))
            return false
        }

        return true
    }

    /**
     * 转义 Redis SCAN MATCH 中的 glob 特殊字符，避免目录名包含通配符时扩大匹配范围。
     * @param {string} value 原始目录 Key
     * @returns {string} 可安全拼入 MATCH pattern 的文本
     */
    const escapeScanMatchPattern = (value) => String(value || '').replace(/[\\*?\[\]]/g, '\\$&')

    /**
     * 构造目录级 SCAN MATCH pattern。
     * 目录分析和目录删除都应使用连接配置中的 key_split，而不是固定冒号。
     * @param {string} directoryKey 目录 Key
     * @returns {string} Redis SCAN MATCH pattern
     */
    const buildDirectoryMatchPattern = (directoryKey) => {
        return `${escapeScanMatchPattern(directoryKey)}${escapeScanMatchPattern(currentKeySeparator.value)}*`
    }

    /**
     * 打开内存分析抽屉。
     * @param {{matchPattern?: string, scopeLabel?: string}} options 分析范围配置
     */
    const openMemoryAnalysisDrawer = (options = {}) => {
        if (!ensureConnectionReady()) {
            return
        }

        memoryAnalysisMatchPattern.value = options.matchPattern || '*'
        memoryAnalysisScopeLabel.value = options.scopeLabel || ''
        memoryAnalysisDrawerVisible.value = true
    }

    /**
     * 打开慢查询抽屉。
     * SLOWLOG 是 Redis 实例级能力，不跟随当前 DB 过滤。
     */
    const openSlowQueryDrawer = () => {
        if (!ensureConnectionReady()) {
            return
        }

        slowQueryDrawerVisible.value = true
    }

    /**
     * 打开目录删除抽屉。
     * @param {Object} row 当前目录节点
     */
    const openDeleteDirectoryDrawer = (row) => {
        if (!ensureConnectionReady()) {
            return
        }

        deleteDirectoryTarget.value = row
        deleteDirectoryMatchPattern.value = buildDirectoryMatchPattern(row.key)
        deleteDirectoryDrawerVisible.value = true
    }

    return {
        memoryAnalysisDrawerVisible,
        memoryAnalysisMatchPattern,
        memoryAnalysisScopeLabel,
        slowQueryDrawerVisible,
        deleteDirectoryDrawerVisible,
        deleteDirectoryTarget,
        deleteDirectoryMatchPattern,
        buildDirectoryMatchPattern,
        openMemoryAnalysisDrawer,
        openSlowQueryDrawer,
        openDeleteDirectoryDrawer
    }
}
