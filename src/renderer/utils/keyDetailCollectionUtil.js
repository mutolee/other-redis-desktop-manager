// Key 详情集合加载工具：统一分页大小、加载全部批次和 renderer 可承载的最大条目数。

// 常规“加载更多”每次读取 100 条，保持按钮响应及时，并与 main 进程首屏数量一致。
export const KEY_DETAIL_PAGE_SIZE = 100

// “加载全部”每轮读取 1000 条，减少跨 IPC 次数，同时避免单条 Redis 命令返回过大。
export const KEY_DETAIL_LOAD_ALL_BATCH_SIZE = 1000

// 单个集合详情最多展示 100000 条，防止超大 Value 持续占用 renderer 内存。
export const KEY_DETAIL_MAX_ITEMS = 100000

/**
 * 计算基于下标的下一段 Redis 范围结束位置。
 * 结果同时受总条数、单批数量和详情展示上限约束，可直接用于 LRANGE/ZREVRANGE。
 *
 * @param {number} start - 本轮起始下标。
 * @param {number} totalSize - Redis 当前总条数。
 * @param {number} batchSize - 本轮期望读取条数。
 * @returns {number} 包含边界的结束下标；没有可读数据时小于 start。
 */
export const getKeyDetailRangeStop = (start, totalSize, batchSize = KEY_DETAIL_PAGE_SIZE) => {
    const normalizedStart = Math.max(0, Number(start) || 0)
    const normalizedTotalSize = Math.max(0, Number(totalSize) || 0)
    const normalizedBatchSize = Math.max(1, Number(batchSize) || KEY_DETAIL_PAGE_SIZE)
    const upperBound = Math.min(normalizedTotalSize, KEY_DETAIL_MAX_ITEMS)

    return Math.min(normalizedStart + normalizedBatchSize, upperBound) - 1
}

/**
 * 截取本轮允许追加的条目，确保游标扫描返回数量超过 COUNT 时也不会越过展示上限。
 *
 * @param {number} currentCount - 当前已加载条数。
 * @param {Array} items - 本轮 Redis 返回条目。
 * @returns {Array} 可安全追加到详情列表的条目。
 */
export const takeKeyDetailItemsWithinLimit = (currentCount, items) => {
    const remainingCount = Math.max(0, KEY_DETAIL_MAX_ITEMS - Math.max(0, Number(currentCount) || 0))

    return Array.isArray(items) ? items.slice(0, remainingCount) : []
}

/**
 * 过滤游标扫描中已经加载的重复项，再按详情上限截取本轮新增数据。
 * HSCAN、SSCAN 和 XREVRANGE 在数据变化期间都可能遇到重复项，必须先去重再计算剩余名额。
 *
 * @param {Array} currentItems - 当前已经加载的条目。
 * @param {Array} nextItems - 本轮 Redis 返回条目。
 * @param {(item: unknown) => string} getIdentity - 提取条目唯一标识的方法。
 * @returns {Array} 去重且未超过详情上限的新增条目。
 */
export const takeUniqueKeyDetailItemsWithinLimit = (currentItems, nextItems, getIdentity) => {
    const normalizedCurrentItems = Array.isArray(currentItems) ? currentItems : []
    const normalizedNextItems = Array.isArray(nextItems) ? nextItems : []
    const remainingCount = Math.max(0, KEY_DETAIL_MAX_ITEMS - normalizedCurrentItems.length)

    if (remainingCount === 0 || typeof getIdentity !== 'function') {
        return []
    }

    const identities = new Set(normalizedCurrentItems.map(getIdentity))
    const uniqueItems = []

    for (const item of normalizedNextItems) {
        const identity = getIdentity(item)

        if (identities.has(identity)) {
            continue
        }

        identities.add(identity)
        uniqueItems.push(item)

        if (uniqueItems.length >= remainingCount) {
            break
        }
    }

    return uniqueItems
}

/**
 * 为需要更新已有行的游标列表筛选可合并条目。
 * 已存在标识的条目始终保留，用于刷新最新 Value；只有全新条目才消耗剩余展示名额。
 *
 * @param {Array} currentItems - 当前已经加载的条目。
 * @param {Array} nextItems - 本轮 Redis 返回条目。
 * @param {(item: unknown) => string} getIdentity - 提取条目唯一标识的方法。
 * @returns {Array} 可用于更新已有行或追加新行的条目。
 */
export const takeMergeableKeyDetailItemsWithinLimit = (currentItems, nextItems, getIdentity) => {
    const normalizedCurrentItems = Array.isArray(currentItems) ? currentItems : []
    const normalizedNextItems = Array.isArray(nextItems) ? nextItems : []

    if (typeof getIdentity !== 'function') {
        return []
    }

    const identities = new Set(normalizedCurrentItems.map(getIdentity))
    const mergeableItems = []
    let remainingCount = Math.max(0, KEY_DETAIL_MAX_ITEMS - normalizedCurrentItems.length)

    for (const item of normalizedNextItems) {
        const identity = getIdentity(item)

        if (identities.has(identity)) {
            mergeableItems.push(item)
            continue
        }

        if (remainingCount === 0) {
            continue
        }

        identities.add(identity)
        mergeableItems.push(item)
        remainingCount -= 1
    }

    return mergeableItems
}

/**
 * 判断详情列表是否因为 renderer 展示上限而停止继续加载。
 *
 * @param {number} loadedCount - 当前已加载条数。
 * @param {number} totalSize - Redis 当前总条数。
 * @param {boolean} sourceHasMore - 游标或范围状态是否明确表示仍有后续数据。
 * @returns {boolean} 仍有数据但已达到展示上限时返回 true。
 */
export const hasReachedKeyDetailLimit = (loadedCount, totalSize, sourceHasMore = false) => {
    const normalizedLoadedCount = Math.max(0, Number(loadedCount) || 0)
    const normalizedTotalSize = Math.max(0, Number(totalSize) || 0)

    return normalizedLoadedCount >= KEY_DETAIL_MAX_ITEMS && (
        normalizedLoadedCount < normalizedTotalSize || Boolean(sourceHasMore)
    )
}
