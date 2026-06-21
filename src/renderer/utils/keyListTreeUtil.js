/**
 * Key 列表树结构工具。
 * 负责把 Redis 扫描得到的扁平 Key 列表转换为树形节点，并提供树形展开与祖先判断能力。
 */

/**
 * 构建树形节点映射。
 * 超过最大层级的 Key 会把剩余部分合并到最后一层节点中，避免树结构无限变深。
 * @param {Array<{key: string, type: string}>} flatKeys 扁平 Key 列表
 * @param {number} maxTreeDepth 树形最大展示层级
 * @returns {Map<string, Object>} 树形节点映射
 */
export const buildKeyTreeMap = (flatKeys, maxTreeDepth = 4) => {
    const treeMap = new Map()

    for (const keyData of flatKeys) {
        // 先按冒号拆分 Key，再根据最大层级决定是否合并尾部片段。
        const rawParts = keyData.key.split(':')
        const parts = rawParts.length > maxTreeDepth
            ? [
                ...rawParts.slice(0, maxTreeDepth - 1),
                rawParts.slice(maxTreeDepth - 1).join(':')
            ]
            : rawParts

        for (let index = 0; index < parts.length; index += 1) {
            const nodeKey = parts.slice(0, index + 1).join(':')
            const parentPath = index > 0 ? parts.slice(0, index).join(':') : null
            const isDirectory = index < parts.length - 1
            // 目录节点和真实 Key 节点必须使用不同 nodeId，避免 user:lynn 和 user:lynn:age 的目录前缀冲突。
            const nodeId = isDirectory ? `dir:${nodeKey}` : `key:${keyData.key}`
            const parentKey = parentPath ? `dir:${parentPath}` : null

            if (!treeMap.has(nodeId)) {
                treeMap.set(nodeId, {
                    nodeId,
                    key: nodeKey,
                    parentKey,
                    depth: index,
                    displayKey: parts[index],
                    isDirectory,
                    type: isDirectory ? '' : keyData.type,
                    keyCount: isDirectory ? 0 : 1
                })
            } else if (!isDirectory) {
                // 真实 Key 节点可能重复扫描到，最终以最新类型为准。
                const currentNode = treeMap.get(nodeId)
                currentNode.type = keyData.type
                currentNode.isDirectory = false
                currentNode.keyCount = 1
            }

            // 目录节点的 keyCount 表示其子树下包含的真实 Key 数量。
            if (isDirectory) {
                const currentNode = treeMap.get(nodeId)
                currentNode.keyCount += 1
            }
        }
    }

    return treeMap
}

/**
 * 根据当前展开状态展开树形节点。
 * @param {Array<Object>} nodes 全量树形节点
 * @param {(key: string) => boolean} isExpanded 判断节点是否展开的方法
 * @returns {Array<Object>} 当前应显示的节点列表
 */
export const flattenExpandedTreeNodes = (nodes, isExpanded) => {
    const childrenMap = new Map()

    // 先构建父子关系索引，减少展开时的重复遍历成本。
    for (const node of nodes) {
        const parentKey = node.parentKey ?? '__root__'

        if (!childrenMap.has(parentKey)) {
            childrenMap.set(parentKey, [])
        }

        childrenMap.get(parentKey).push(node)
    }

    const result = []

    /**
     * 递归收集当前父节点下的可见子节点。
     * @param {string} parentKey 当前父节点标识
     */
    const appendVisibleChildren = (parentKey) => {
        const children = childrenMap.get(parentKey) ?? []

        for (const child of children) {
            result.push(child)

            if (child.isDirectory && isExpanded(child.nodeId)) {
                appendVisibleChildren(child.nodeId)
            }
        }
    }

    appendVisibleChildren('__root__')
    return result
}

/**
 * 在树形模式下按关键字过滤节点，并自动补齐命中节点的祖先路径。
 * 适用于本地过滤时保留目录上下文，避免只剩叶子节点导致结构断裂。
 * @param {Array<Object>} rows 当前可见的树形节点列表
 * @param {string} keyword 归一化后的搜索关键字（建议传小写）
 * @param {boolean} isExactSearch 是否为精准搜索
 * @returns {Array<Object>} 带祖先路径的过滤结果
 */
export const filterTreeRowsWithAncestors = (rows, keyword, isExactSearch = false) => {
    if (!keyword) {
        return rows
    }

    // 先建立当前可见节点索引，便于从命中节点向上回溯父级路径。
    const rowMap = new Map(rows.map((row) => [row.nodeId ?? row.key, row]))
    const matchedKeySet = new Set()

    for (const row of rows) {
        const currentKey = row.key.toLowerCase()
        const isMatched = isExactSearch ? currentKey === keyword : currentKey.includes(keyword)

        if (!isMatched) {
            continue
        }

        matchedKeySet.add(row.nodeId ?? row.key)

        // 命中节点后持续向上补齐祖先目录，保证树结构上下文完整。
        let currentParentKey = row.parentKey
        while (currentParentKey && rowMap.has(currentParentKey)) {
            matchedKeySet.add(currentParentKey)
            currentParentKey = rowMap.get(currentParentKey)?.parentKey ?? null
        }
    }

    // 保持原始可见顺序，只筛掉不在命中路径上的节点。
    return rows.filter((row) => matchedKeySet.has(row.nodeId ?? row.key))
}

/**
 * 判断目录节点是否为当前选中 Key 的祖先节点。
 * @param {Object} row 当前目录节点
 * @param {string} activeKey 当前选中的完整 Key
 * @returns {boolean} 是否为祖先目录
 */
export const isAncestorDirectoryKey = (row, activeKey) => {
    if (!row?.isDirectory || !activeKey) {
        return false
    }

    return activeKey.startsWith(`${row.key}:`)
}
