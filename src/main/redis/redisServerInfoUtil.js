// Redis INFO 解析工具：负责把原始 INFO 文本转换为摘要、Keyspace 和完整详情结构。

const INFO_SUMMARY_SECTIONS = [
    'server',
    'clients',
    'memory',
    'persistence',
    'stats',
    'replication',
    'cpu',
    'cluster'
]

/**
 * 创建 Redis INFO 摘要的稳定结构。
 * 完整详情和轻量摘要共用该结构，避免 renderer 因请求类型不同而增加空值判断。
 *
 * @returns {Object} INFO 分区摘要。
 */
const createInfoSummary = () => {
    return {
        server: {},
        clients: {},
        memory: {},
        persistence: {},
        stats: {},
        replication: {},
        cpu: {},
        cluster: {},
        keyspace: []
    }
}

/**
 * 解析 Redis INFO 文本。
 * 轻量调用只提取页面所需摘要；完整详情调用额外保留 rows 和 sections 供 Drawer 表格展示。
 *
 * @param {string} infoRaw - Redis INFO 命令返回文本。
 * @param {Object} options - 解析选项。
 * @param {number} options.currentDb - 当前连接选中的数据库索引。
 * @param {boolean} options.includeDetails - 是否保留完整行和分区数据。
 * @returns {{data:Object, totalCpu:number, maxKeyspaceDb:number}} 解析结果及 CPU、Keyspace 辅助数据。
 */
export const parseRedisInfo = (infoRaw, {currentDb = 0, includeDetails = false} = {}) => {
    const normalizedCurrentDb = Math.max(0, Number(currentDb) || 0)
    const data = {
        connectedClients: 0,
        cpuUsage: 0,
        usedMemory: 0,
        usedMemoryHuman: '0',
        totalKeys: 0,
        rows: [],
        sections: [],
        summary: createInfoSummary()
    }
    const sectionMap = new Map()
    let currentSection = 'General'
    let cpuSys = 0
    let cpuUser = 0
    let maxKeyspaceDb = normalizedCurrentDb

    for (const rawLine of infoRaw.split('\n')) {
        const line = rawLine.trim()
        if (!line) {
            continue
        }

        if (line.startsWith('#')) {
            currentSection = line.replace(/^#\s*/, '') || 'General'
            continue
        }

        const separatorIndex = line.indexOf(':')
        if (separatorIndex <= 0) {
            continue
        }

        const key = line.slice(0, separatorIndex)
        const value = line.slice(separatorIndex + 1)
        const sectionKey = currentSection.toLowerCase()

        if (includeDetails) {
            const row = {section: currentSection, key, value}
            data.rows.push(row)

            if (!sectionMap.has(currentSection)) {
                sectionMap.set(currentSection, {name: currentSection, rows: []})
            }
            sectionMap.get(currentSection).rows.push(row)
        }

        if (INFO_SUMMARY_SECTIONS.includes(sectionKey)) {
            data.summary[sectionKey][key] = value
        }

        if (key === 'connected_clients') {
            data.connectedClients = Number.parseInt(value, 10) || 0
        } else if (key === 'used_cpu_sys') {
            cpuSys = Number.parseFloat(value) || 0
        } else if (key === 'used_cpu_user') {
            cpuUser = Number.parseFloat(value) || 0
        } else if (key === 'used_memory') {
            data.usedMemory = Number.parseInt(value, 10) || 0
        } else if (key === 'used_memory_human') {
            data.usedMemoryHuman = value || '0'
        } else if (/^db\d+$/i.test(key)) {
            const dbIndex = Number.parseInt(key.slice(2), 10) || 0
            const keysMatch = value.match(/(?:^|,)keys=(\d+)/)
            const expiresMatch = value.match(/(?:^|,)expires=(\d+)/)
            const avgTtlMatch = value.match(/(?:^|,)avg_ttl=(\d+)/)
            const keyCount = keysMatch ? Number.parseInt(keysMatch[1], 10) || 0 : 0

            maxKeyspaceDb = Math.max(maxKeyspaceDb, dbIndex)
            data.summary.keyspace.push({
                db: key.toLowerCase(),
                keys: keyCount,
                expires: expiresMatch ? Number.parseInt(expiresMatch[1], 10) || 0 : 0,
                avgTtl: avgTtlMatch ? Number.parseInt(avgTtlMatch[1], 10) || 0 : 0
            })

            if (dbIndex === normalizedCurrentDb) {
                data.totalKeys = keyCount
            }
        }
    }

    if (includeDetails) {
        data.sections = Array.from(sectionMap.values())
    }

    return {
        data,
        totalCpu: cpuSys + cpuUser,
        maxKeyspaceDb
    }
}
