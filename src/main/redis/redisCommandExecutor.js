/**
 * Redis 命令统一执行器。
 * 为业务命令提供超时、耗时统计和开发者命令记录，避免各服务重复实现执行包装逻辑。
 */
import {tMain} from '../utils/mainI18n.js'

/**
 * Redis 命令执行器。
 */
export class RedisCommandExecutor {
    /**
     * @param {{historyService:Object,getCommandTimeout:Function}} dependencies - 历史记录和命令超时依赖。
     */
    constructor(dependencies = {}) {
        this.historyService = dependencies.historyService
        this.getCommandTimeout = dependencies.getCommandTimeout
    }

    /**
     * 执行单条 Redis 命令并记录结果。
     * Promise 超时只能停止等待，不能取消已经发往 Redis 的底层命令，因此调用方仍需避免发送无界操作。
     *
     * @param {{connection?:Object,config?:Object,command?:string,args?:Array,source?:string,label?:string,record?:boolean,pipelineCommands?:Array}} options - 命令上下文。
     * @param {Function} task - 实际执行 Redis 命令的异步函数。
     * @returns {Promise<*>} Redis 命令结果。
     */
    async execute(options = {}, task) {
        const connection = options.connection || null
        const config = connection?.config || options.config || {}
        const command = String(options.command || options.label || 'REDIS').toUpperCase()
        const label = String(options.label || command)
        const commandTimeout = this.getCommandTimeout(config)
        const startedAt = Date.now()
        let timer = null

        try {
            const result = await Promise.race([
                task(),
                new Promise((_, reject) => {
                    timer = setTimeout(() => {
                        const timeoutError = new Error(tMain('redis.commandTimeout', {
                            label,
                            timeout: commandTimeout
                        }))
                        timeoutError.code = 'REDIS_COMMAND_TIMEOUT'
                        reject(timeoutError)
                    }, commandTimeout)
                })
            ])

            this.appendHistory(options, {
                connection,
                command,
                durationMs: Date.now() - startedAt,
                status: 'success'
            })

            return result
        } catch (error) {
            this.appendHistory(options, {
                connection,
                command,
                durationMs: Date.now() - startedAt,
                status: error?.code === 'REDIS_COMMAND_TIMEOUT' ? 'timeout' : 'error',
                error: error?.message || String(error)
            })

            throw error
        } finally {
            if (timer) {
                clearTimeout(timer)
            }
        }
    }

    /**
     * 执行 Pipeline，并将其记录为一条可展开的父记录。
     * 子命令共享 Pipeline 总耗时，不单独伪造每条命令的耗时。
     *
     * @param {{connection:Object,commands:Array,source?:string,label?:string,record?:boolean}} options - Pipeline 上下文。
     * @param {Function} task - 实际执行 pipeline.exec() 的函数。
     * @returns {Promise<*>} Pipeline 执行结果。
     */
    executePipeline(options = {}, task) {
        const commands = Array.isArray(options.commands) ? options.commands : []

        return this.execute({
            ...options,
            command: 'PIPELINE',
            args: [`${commands.length} commands`],
            pipelineCommands: commands
        }, task)
    }

    /**
     * 在允许记录时向历史服务追加命令元数据。
     *
     * @param {Object} options - 原始命令上下文。
     * @param {Object} result - 执行状态和耗时。
     */
    appendHistory(options, result) {
        if (options.record === false || !this.historyService) {
            return
        }

        this.historyService.append({
            ...options,
            ...result,
            timestamp: Date.now()
        })
    }
}
