// 文本选择工具：协调全局禁选和局部可选文本区域的交互行为。
const SELECTABLE_TEXT_SELECTOR = [
    'input',
    'textarea',
    '[contenteditable="true"]',
    '.el-input__inner',
    '.el-textarea__inner',
    '.virtual-detail-table .virtual-table-cell:not(.action-cell)',
    '.overflow-tooltip-popper'
].join(',')

/**
 * 判断当前点击目标是否位于允许选择文本的区域内。
 *
 * @param {EventTarget|null} target - pointer 事件目标。
 * @returns {boolean} 是否位于可选文本区域。
 */
const isSelectableTextTarget = (target) => {
    return target instanceof Element && Boolean(target.closest(SELECTABLE_TEXT_SELECTOR))
}

/**
 * 清理当前页面文本选区。
 * Electron 外层页面默认禁选，点击不可选区域时需要主动清理之前在表格或 tooltip 中产生的选区。
 */
const clearCurrentSelection = () => {
    window.getSelection?.()?.removeAllRanges()
}

/**
 * 注册全局文本选区清理行为。
 * 点击非可选文本区域时清空旧选区，点击输入框、Redis 详情表格数据列或省略 tooltip 时保留原生选择能力。
 *
 * @returns {Function} 取消注册函数。
 */
export const setupGlobalTextSelectionClear = () => {
    const handlePointerDown = (event) => {
        if (event.button !== 0 || isSelectableTextTarget(event.target)) {
            return
        }

        clearCurrentSelection()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
        document.removeEventListener('pointerdown', handlePointerDown, true)
    }
}
