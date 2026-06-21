/**
 * 版本号工具。
 * 提供 GitHub Release tag、本地 package 版本等场景共用的版本规范化和比较能力。
 */

/**
 * 规范化版本号。
 * GitHub Release 常用 v1.2.0 作为 tag，这里去掉前缀 v 并保留纯版本比较所需内容。
 *
 * @param {unknown} version - 原始版本号
 * @returns {string} 规范化后的版本号
 */
export const normalizeVersion = (version) => {
    return String(version || '').trim().replace(/^v/i, '')
}

/**
 * 比较两个语义化版本号。
 * 预发布后缀在当前第一版更新检查中不参与比较，仅按数字段逐段比较。
 *
 * @param {string} leftVersion - 左侧版本号
 * @param {string} rightVersion - 右侧版本号
 * @returns {number} left > right 返回 1，left < right 返回 -1，相等返回 0
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
