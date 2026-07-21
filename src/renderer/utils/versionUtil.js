/**
 * 规范化版本号。
 * GitHub Release 常用 v1.2.0 作为 tag，这里去掉前缀 v，便于后续比较和展示。
 *
 * @param {unknown} version - 原始版本号。
 * @returns {string} 去掉 v 前缀后的版本号。
 */
export const normalizeVersion = (version) => {
    return String(version || '').trim().replace(/^v/i, '')
}

/**
 * 比较两个版本号的大小。
 * 预发布后缀不参与语义化排序，仅按数字段逐段比较，满足当前 release 更新提示的判断需求。
 *
 * @param {string} leftVersion - 左侧版本号。
 * @param {string} rightVersion - 右侧版本号。
 * @returns {number} left > right 返回 1，left < right 返回 -1，相等返回 0。
 */
export const compareVersions = (leftVersion, rightVersion) => {
    const leftParts = normalizeVersion(leftVersion).split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0)
    const rightParts = normalizeVersion(rightVersion).split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0)
    const maxLength = Math.max(leftParts.length, rightParts.length)

    for (let index = 0; index < maxLength; index += 1) {
        const leftValue = leftParts[index] || 0
        const rightValue = rightParts[index] || 0

        if (leftValue > rightValue) {
            return 1
        }

        if (leftValue < rightValue) {
            return -1
        }
    }

    return 0
}
