/**
 * Redis 命令记录持久化服务。
 * 使用 userData 目录下的 JSONL 文件保存记录，查询仍由内存循环缓冲区完成。
 */
import fs from 'fs'
import path from 'path'
import electron from 'electron'
import {createLogger} from '../utils/logger.js'

const {app} = electron
const log = createLogger('redis-command-history-storage')

// 持久化文件压缩后保留的最大记录数，与内存历史记录上限保持一致。
const HISTORY_LIMIT = 10000

// 文件达到该行数后执行压缩，避免每条命令都重写完整历史文件。
const COMPACTION_THRESHOLD = HISTORY_LIMIT * 2

// 高频命令先在内存聚合，最多等待 1 秒后批量追加到文件。
const FLUSH_DELAY_MS = 1000

// 待写记录达到该数量时立即落盘，控制异常退出时可能丢失的数据量。
const FLUSH_BATCH_SIZE = 100

/**
 * Redis 命令记录文件存储。
 * 文件操作全部进入同一 Promise 队列，保证追加、压缩和清空严格按调用顺序执行。
 */
export class RedisCommandHistoryStorage {
    /**
     * @param {{app?:Object,fs?:Object,path?:Object,fileName?:string}} dependencies - 可替换的 Electron 和文件系统依赖。
     */
    constructor(dependencies = {}) {
        this.app = dependencies.app || app
        this.fileSystem = dependencies.fs || fs.promises
        this.pathUtil = dependencies.path || path
        this.fileName = dependencies.fileName || 'redis-command-history.jsonl'
        this.filePath = ''
        this.initialized = false
        this.initializationPromise = null
        this.writeQueue = Promise.resolve()
        this.pendingRecords = []
        this.persistedRecordCount = 0
        this.flushTimer = null
    }

    /**
     * 初始化持久化目录和文件路径。
     *
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) {
            return
        }

        if (!this.initializationPromise) {
            this.initializationPromise = (async () => {
                if (!this.app.isReady()) {
                    await this.app.whenReady()
                }

                const userDataPath = this.app.getPath('userData')
                this.filePath = this.pathUtil.join(userDataPath, this.fileName)
                await this.fileSystem.mkdir(userDataPath, {recursive: true})
                await this.recoverInterruptedReplacement()
                this.initialized = true
            })().catch((error) => {
                this.initializationPromise = null
                throw error
            })
        }

        await this.initializationPromise
    }

    /**
     * 读取最近的命令记录。
     * 单行损坏时跳过该行，不阻断其他历史记录恢复。
     *
     * @returns {Promise<Object[]>} 按写入时间正序排列的最近记录。
     */
    async load() {
        await this.initialize()

        try {
            const content = await this.fileSystem.readFile(this.filePath, 'utf8')
            const lines = content.split(/\r?\n/).filter(Boolean)
            const records = this.parseLines(lines)

            this.persistedRecordCount = lines.length
            return records.slice(-HISTORY_LIMIT)
        } catch (error) {
            if (error?.code !== 'ENOENT') {
                log.warn('读取 Redis 命令记录失败，将从空记录开始', error)
            }

            this.persistedRecordCount = 0
            return []
        }
    }

    /**
     * 解析 JSONL 行并跳过损坏内容。
     *
     * @param {string[]} lines - JSONL 文件行。
     * @returns {Object[]} 有效命令记录。
     */
    parseLines(lines = []) {
        const records = []

        for (const line of lines) {
            try {
                const record = JSON.parse(line)

                if (record && typeof record === 'object' && !Array.isArray(record)) {
                    records.push(record)
                }
            } catch (error) {
                log.warn('跳过损坏的 Redis 命令记录', error)
            }
        }

        return records
    }

    /**
     * 将文件操作加入串行队列，并在失败时记录错误但保持后续操作可继续执行。
     *
     * @param {Function} operation - 待执行的异步文件操作。
     * @param {string} errorMessage - 操作失败日志。
     * @returns {Promise<void>} 当前操作完成 Promise。
     */
    enqueue(operation, errorMessage) {
        const queuedOperation = this.writeQueue.then(operation, operation)
        this.writeQueue = queuedOperation.catch((error) => {
            log.error(errorMessage, error)
        })

        return queuedOperation
    }

    /**
     * 将一条已脱敏、已截断的记录加入待写缓冲区。
     *
     * @param {Object} record - 可安全持久化的命令记录。
     */
    scheduleAppend(record) {
        if (!this.initialized || !record) {
            return
        }

        this.pendingRecords.push(record)

        if (this.pendingRecords.length >= FLUSH_BATCH_SIZE) {
            void this.flush().catch(() => {})
            return
        }

        if (this.flushTimer) {
            return
        }

        this.flushTimer = setTimeout(() => {
            this.flushTimer = null
            void this.flush().catch(() => {})
        }, FLUSH_DELAY_MS)
        this.flushTimer.unref?.()
    }

    /**
     * 固化当前待写批次并加入文件队列。
     * 新产生的记录会进入下一批，不会与正在写入或压缩的批次相互覆盖。
     *
     * @returns {Promise<void>}
     */
    async flush() {
        if (!this.initialized) {
            return
        }

        this.cancelFlushTimer()

        if (this.pendingRecords.length === 0) {
            await this.writeQueue
            return
        }

        const batch = this.pendingRecords.splice(0)

        try {
            await this.enqueue(async () => {
                const content = batch.map((record) => JSON.stringify(record)).join('\n') + '\n'
                await this.fileSystem.appendFile(this.filePath, content, 'utf8')
                this.persistedRecordCount += batch.length

                if (this.persistedRecordCount >= COMPACTION_THRESHOLD) {
                    try {
                        await this.compactFile()
                    } catch (error) {
                        // 追加已经成功时不能重试整个批次，否则会产生重复记录；后续批次会再次尝试压缩。
                        log.warn('压缩 Redis 命令记录文件失败', error)
                    }
                }
            }, '写入 Redis 命令记录失败')
        } catch (error) {
            // 写入失败时保留当前批次，后续刷新或应用退出时可以再次尝试落盘。
            this.pendingRecords.unshift(...batch)
            throw error
        }
    }

    /**
     * 仅根据已落盘内容压缩文件，避免把仍在排队的记录提前写入后造成重复。
     *
     * @returns {Promise<void>}
     */
    async compactFile() {
        const content = await this.fileSystem.readFile(this.filePath, 'utf8')
        const lines = content.split(/\r?\n/).filter(Boolean)
        const records = this.parseLines(lines).slice(-HISTORY_LIMIT)

        await this.replaceFile(records)
        this.persistedRecordCount = records.length
    }

    /**
     * 恢复上一次替换过程中可能留下的临时文件或备份文件。
     *
     * @returns {Promise<void>}
     */
    async recoverInterruptedReplacement() {
        const temporaryPath = `${this.filePath}.tmp`
        const backupPath = `${this.filePath}.bak`
        const fileExists = await this.pathExists(this.filePath)

        if (fileExists) {
            await Promise.all([
                this.fileSystem.rm(temporaryPath, {force: true}),
                this.fileSystem.rm(backupPath, {force: true})
            ])
            return
        }

        if (await this.pathExists(backupPath)) {
            await this.fileSystem.rename(backupPath, this.filePath)
            await this.fileSystem.rm(temporaryPath, {force: true})
            return
        }

        if (await this.pathExists(temporaryPath)) {
            await this.fileSystem.rename(temporaryPath, this.filePath)
        }
    }

    /**
     * 判断文件是否存在，不把 ENOENT 当作异常传播。
     *
     * @param {string} targetPath - 待检查路径。
     * @returns {Promise<boolean>} 文件是否存在。
     */
    async pathExists(targetPath) {
        try {
            await this.fileSystem.access(targetPath)
            return true
        } catch (error) {
            if (error?.code === 'ENOENT') {
                return false
            }

            throw error
        }
    }

    /**
     * 使用临时文件和备份文件替换历史文件，降低压缩中断造成历史全部丢失的风险。
     *
     * @param {Object[]} records - 需要保留的命令记录。
     * @returns {Promise<void>}
     */
    async replaceFile(records) {
        const temporaryPath = `${this.filePath}.tmp`
        const backupPath = `${this.filePath}.bak`
        const content = records.map((record) => JSON.stringify(record)).join('\n')
        let originalMoved = false

        await this.fileSystem.writeFile(temporaryPath, content ? `${content}\n` : '', 'utf8')
        await this.fileSystem.rm(backupPath, {force: true})

        try {
            await this.fileSystem.rename(this.filePath, backupPath)
            originalMoved = true
        } catch (error) {
            if (error?.code !== 'ENOENT') {
                throw error
            }
        }

        try {
            await this.fileSystem.rename(temporaryPath, this.filePath)
            await this.fileSystem.rm(backupPath, {force: true})
        } catch (error) {
            if (originalMoved && !await this.pathExists(this.filePath)) {
                await this.fileSystem.rename(backupPath, this.filePath)
            }

            throw error
        }
    }

    /**
     * 清空内存待写批次和持久化文件。
     * 已经进入文件队列的追加操作会先完成，再由清空操作覆盖，保证旧记录不会复现。
     *
     * @returns {Promise<void>}
     */
    async clear() {
        if (!this.initialized) {
            await this.initialize()
        }

        this.cancelFlushTimer()
        this.pendingRecords = []

        await this.enqueue(async () => {
            await this.fileSystem.writeFile(this.filePath, '', 'utf8')
            this.persistedRecordCount = 0
        }, '清空 Redis 命令记录文件失败')
    }

    /**
     * 取消尚未触发的批量写入定时器。
     */
    cancelFlushTimer() {
        if (!this.flushTimer) {
            return
        }

        clearTimeout(this.flushTimer)
        this.flushTimer = null
    }

    /**
     * 应用退出或关闭开发者模式前完成待写记录落盘。
     * 存储从未初始化时直接返回，避免退出阶段等待 Electron ready。
     *
     * @returns {Promise<void>}
     */
    async close() {
        if (!this.initialized) {
            if (!this.initializationPromise) {
                return
            }

            await this.initializationPromise
        }

        await this.flush()

        // flush 执行期间可能又收到少量记录，退出前再排空一次。
        if (this.pendingRecords.length > 0) {
            await this.flush()
        }

        if (this.persistedRecordCount > HISTORY_LIMIT) {
            await this.enqueue(
                () => this.compactFile(),
                '收口压缩 Redis 命令记录文件失败'
            )
        }

        await this.writeQueue
    }
}

// main 进程单例：命令历史只由 main 进程读写本地文件。
export const redisCommandHistoryStorage = new RedisCommandHistoryStorage()
