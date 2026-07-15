<!--
    CommandDrawer.vue
    描述：Redis 命令行抽屉。为指定连接创建独立命令会话，支持切库、命令执行、历史记录和结果滚动。
-->
<template>
    <el-drawer
        :model-value="drawerVisible"
        :size="drawerHeight"
        direction="btt"
        :with-header="true"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        @close="() => drawerVisible = false"
        @opened="handleDrawerOpened"
        append-to-body
        :class="['command-drawer', { 'is-dragging': isDragging }]"
    >
        <template #header>
            <div class="drawer-header" v-if="isDrawerContentReady && commandConnection">
                <el-icon style="color: var(--el-color-primary)">
                    <CodeOne/>
                </el-icon>
                <el-text>{{ commandConnection.name }}({{ commandConnection.host }}:{{ commandConnection.port }})</el-text>
                <el-select
                    v-model="dbValue"
                    size="small"
                    class="drawer-db-select"
                    popper-class="command-drawer-db-popper"
                    :disabled="commandConnection.status !== 'connected' || isExecuting"
                    @change="handleDbValueChange"
                >
                    <el-option
                        v-for="item in dbOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    >
                        <!-- DB 下拉项：左侧显示 DB 名称，右侧显示命令会话当前读取到的 DBSize。 -->
                        <div class="command-db-option-content">
                            <span class="command-db-option-label">{{ item.label }}</span>
                            <span class="command-db-option-size">({{ formatDbSize(item.size) }})</span>
                        </div>
                    </el-option>
                </el-select>
                <div class="drag">
                    <CommandDrawerDrag :drawerHeight="drawerHeight"
                                       @update:drawerHeight="newHeight => {drawerHeight = newHeight; isDragging = true}"
                                       @update:stopDragging="() => isDragging = false"
                    />
                </div>
            </div>
        </template>
        <div class="command-terminal" ref="terminalRef">
            <el-scrollbar v-if="isDrawerContentReady" ref="scrollbarRef">
                <div class="terminal-content">
                    <div
                        v-for="(line, index) in historyRecord"
                        :key="index"
                        class="terminal-line"
                    >
                        <span v-if="line.type === 'input'" class="command-prompt">&gt;</span>
                        <span v-else class="command-output"></span>
                        <span
                            class="command-text"
                            :class="{
                                out: line.type === 'output',
                                error: line.type === 'error',
                                system: line.type === 'system'
                            }"
                        >
                            {{ line.content }}
                        </span>
                    </div>
                    <!-- 命令执行中 / 连接建立中的占位输出：结果未返回前，在终端区域展示轻量的 loading 动画。 -->
                    <div v-if="isTerminalBusy" class="terminal-line">
                        <span class="command-output"></span>
                        <span class="command-loading" :aria-label="isExecuting ? t('commandDrawer.aria.executing') : t('commandDrawer.aria.connecting')">
                            <span>.</span><span>.</span><span>.</span>
                        </span>
                    </div>
                    <div class="terminal-line">
                        <span class="command-prompt">&gt;</span>
                        <div class="input-wrapper">
                            <span class="input-measure" ref="measureRef">{{ currentInput }}</span>
                            <input
                                ref="inputRef"
                                v-model="currentInput"
                                @keydown="handleInputKeydown"
                                @input="updateSuggestions"
                                class="command-input"
                                :disabled="isExecuting"
                                type="text"
                                autofocus
                            />
                            <span v-if="suggestion" class="command-suggestion" :style="suggestionStyle">{{ suggestion }}</span>
                        </div>
                    </div>
                </div>
            </el-scrollbar>

            <!-- 右下角快捷滚动按钮：用于快速跳到顶部或底部，提高长命令历史下的浏览效率。 -->
            <div v-if="isDrawerContentReady && hasScrollableContent" class="terminal-scroll-actions">
                <el-tooltip :content="t('commandDrawer.actions.toTop')" placement="left">
                    <el-button class="scroll-action-btn" circle @click="scrollToTop">
                        <el-icon>
                            <ArrowUpBold/>
                        </el-icon>
                    </el-button>
                </el-tooltip>
                <el-tooltip :content="t('commandDrawer.actions.toBottom')" placement="left">
                    <el-button class="scroll-action-btn" circle @click="scrollToBottom">
                        <el-icon>
                            <ArrowDownBold/>
                        </el-icon>
                    </el-button>
                </el-tooltip>
            </div>
        </div>
    </el-drawer>
</template>

<script setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {CodeOne, Down as ArrowDownBold, Up as ArrowUpBold} from '@icon-park/vue-next'
import {ElMessage} from 'element-plus'
import {storeToRefs} from 'pinia'
import {matchedExample} from '../../utils/commandExamples.js'
import {buildDbOptions, buildDbSizeMap, DEFAULT_DATABASE_COUNT, formatDbSize, normalizeDatabaseCount} from '../../utils/redisDatabaseOptionUtil.js'
import {formatRedisCommandResult, parseRedisCommandInput} from '../../utils/redisCommandLineUtil.js'
import {mergeConnectionRuntimeSettings} from '../../utils/redisConnectionConfigUtil.js'
import {useUserSettingsStore} from '../../stores/modules/userSettingsStore.js'
import {useI18n} from '../../i18n/index.js'
import CommandDrawerDrag from '../drag/CommandDrawerDrag.vue'

// 组件入参：由侧边栏控制抽屉显示，并传入要打开命令面板的连接配置。
const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    connection: {
        type: Object,
        default: null
    }
})

// 对外事件：同步抽屉显示状态，并在关闭后通知父组件清理当前连接对象。
const emit = defineEmits(['update:visible', 'closed'])

// 国际化文案读取函数：驱动命令抽屉系统提示、错误反馈和操作 tooltip。
const {t} = useI18n()

// 抽屉可见性代理：透传 v-model:visible 给父组件。
const drawerVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
})

// 系统连接设置：用于给命令面板独立会话补齐连接超时和命令超时参数。
const {connectionSettings} = storeToRefs(useUserSettingsStore())

// 抽屉布局状态：高度和拖拽状态由 CommandDrawerDrag 更新。
const drawerHeight = ref('40%')
const isDragging = ref(false)
// 终端 DOM 引用：用于聚焦输入框、测量提示位置和控制结果区滚动。
const terminalRef = ref(null)
const inputRef = ref(null)
const measureRef = ref(null)
const scrollbarRef = ref()
// 命令输入状态：维护当前输入、历史展示、上下键索引和执行中状态。
const currentInput = ref('')
const historyRecord = ref([])
const historyCommands = ref([])
const historyIndex = ref(-1)
const isExecuting = ref(false)
const hasScrollableContent = ref(false)
// 命令会话状态：命令抽屉使用独立 Redis 连接，避免影响页面连接。
const commandConnection = ref(null)
const commandSessionId = ref('')
const lastSessionStatus = ref('')
const dbValue = ref('0')
const dbSizeMap = ref({})
const databaseCount = ref(DEFAULT_DATABASE_COUNT)
const isDrawerContentReady = ref(false)
// DB 下拉选项：按命令面板独立连接读取到的数据库数量和 Keyspace 数量生成。
const dbOptions = computed(() => buildDbOptions(databaseCount.value, dbSizeMap.value))
// 命令提示信息：用于命令示例预览和 Tab 补全。
const suggestion = ref('')
const suggestionStyle = ref({})
const matchedCommand = ref('')
// Redis 连接状态监听解绑函数：用于在抽屉卸载时释放 preload 注册的事件监听。
let removeConnectionStatusListener = null

/**
 * 重置终端输入和历史状态。
 * 抽屉关闭、切换命令连接目标时统一复位，避免不同会话之间互相串数据。
 */
const resetTerminalState = () => {
    currentInput.value = ''
    historyRecord.value = []
    historyCommands.value = []
    historyIndex.value = -1
    isExecuting.value = false
    hasScrollableContent.value = false
    lastSessionStatus.value = ''
    clearSuggestionState()
}

/**
 * 生成命令抽屉专属连接 ID。
 * 和页面连接分离后，命令面板可以独立连接、独立断开，不会影响当前打开的页面页签。
 * @param {string|number} sourceConnectionId 原始连接配置 ID。
 * @returns {string} 命令抽屉专属的连接 ID。
 */
const buildCommandSessionId = (sourceConnectionId) => {
    return `command:${sourceConnectionId}:${Date.now()}`
}

/**
 * 让输入框在抽屉打开后稳定获取焦点。
 * 因为 el-drawer 带动画，单次 nextTick 不一定能覆盖所有打开时机。
 */
const focusInputAfterOpen = () => {
    nextTick(() => {
        if (inputRef.value) {
            inputRef.value.focus()
        }
        scrollToBottom()
        updateScrollActionVisibility()
    })

    setTimeout(() => {
        if (inputRef.value && drawerVisible.value) {
            inputRef.value.focus()
        }
        updateScrollActionVisibility()
    }, 300)
}

/**
 * 关闭当前命令抽屉专属 Redis 会话。
 * 抽屉关闭或切换目标连接时统一调用，避免命令面板遗留独立连接。
 */
const cleanupCommandSession = async () => {
    const sessionId = commandSessionId.value

    commandSessionId.value = ''
    commandConnection.value = null
    dbValue.value = '0'
    dbSizeMap.value = {}
    databaseCount.value = DEFAULT_DATABASE_COUNT

    if (!sessionId) {
        return
    }

    try {
        await window.api.redis.disconnect(sessionId)
    } catch {
        // 关闭面板时不阻断 UI 收起；主进程仍会在应用退出时统一清理残留连接。
    }
}

/**
 * 同步命令面板 DBSize 信息。
 * 命令抽屉使用独立 Redis 连接，因此 DB 数量和 Keyspace 也从当前命令会话读取。
 */
const fetchCommandServerInfo = async () => {
    if (!commandSessionId.value || commandConnection.value?.status !== 'connected') {
        return
    }

    try {
        const result = await window.api.redis.getServerInfo(commandSessionId.value)

        if (result.success && result.data) {
            const currentDbIndex = Number(commandConnection.value?.db_index) || 0
            databaseCount.value = normalizeDatabaseCount(result.data.databaseCount, currentDbIndex)
            dbSizeMap.value = buildDbSizeMap(result.data.summary?.keyspace)
        }
    } catch {
        // DBSize 只是头部辅助信息，读取失败不打断命令面板使用。
    }
}

/**
 * 创建命令抽屉专属 Redis 会话。
 * 打开命令面板时不再借用当前页面连接，而是单独建立一条连接，独立维护状态和 db 上下文。
 */
const createCommandSession = async () => {
    if (!props.connection?.id) {
        return
    }

    await cleanupCommandSession()
    resetTerminalState()

    // 复制连接配置并注入系统超时参数，确保命令面板使用独立、可序列化的运行时连接配置。
    const runtimeConnectionConfig = mergeConnectionRuntimeSettings(
        JSON.parse(JSON.stringify(props.connection)),
        connectionSettings.value
    )
    const sessionId = buildCommandSessionId(props.connection.id)

    commandSessionId.value = sessionId
    commandConnection.value = {
        ...runtimeConnectionConfig,
        id: sessionId,
        sourceConnectionId: props.connection.id,
        status: 'connecting'
    }
    dbValue.value = String(commandConnection.value.db_index ?? 0)
    databaseCount.value = normalizeDatabaseCount(DEFAULT_DATABASE_COUNT, commandConnection.value.db_index ?? 0)
    dbSizeMap.value = {}
    lastSessionStatus.value = 'connecting'
    appendSystemLine(t('commandDrawer.messages.connecting', {value: commandConnection.value.name}), 'info')

    await window.api.redis.connect(sessionId, runtimeConnectionConfig)
}

/**
 * 抽屉打开动画结束后的初始化逻辑。
 * 等抽屉尺寸稳定后再挂载终端内容和连接反馈，避免内容过早进入导致面板上弹。
 */
const handleDrawerOpened = async () => {
    isDrawerContentReady.value = true
    await createCommandSession()
    focusInputAfterOpen()
}

/**
 * 检查终端内容是否超出可视区域。
 * 只有真正出现滚动需求时，才显示“回到顶部 / 回到底部”按钮。
 */
const updateScrollActionVisibility = () => {
    nextTick(() => {
        const wrapRef = scrollbarRef.value?.wrapRef
        if (!wrapRef) {
            hasScrollableContent.value = false
            return
        }

        hasScrollableContent.value = wrapRef.scrollHeight > wrapRef.clientHeight
    })
}

/**
 * 清空当前自动补全提示状态。
 * 用于命令提交、命令执行完成和抽屉关闭时统一复位提示 UI。
 */
const clearSuggestionState = () => {
    suggestion.value = ''
    suggestionStyle.value = {}
    matchedCommand.value = ''
}

/**
 * 在终端历史中写入一条系统消息。
 * @param {string} content 要展示的系统提示文本。
 * @param {'info'|'error'|'success'} [level='info'] 系统消息级别。
 */
const appendSystemLine = (content, level = 'info') => {
    historyRecord.value.push({
        type: 'system',
        level,
        content
    })
}

/**
 * 执行当前输入命令。
 * 真实调用 Electron preload 暴露的 Redis 命令执行接口，并把结果写入终端历史。
 */
const executeCommand = async () => {
    const command = currentInput.value.trim()
    if (!command || isExecuting.value) {
        return
    }

    if (!commandSessionId.value || !commandConnection.value?.id) {
        ElMessage.warning(t('commandDrawer.messages.noConnection'))
        appendSystemLine(t('commandDrawer.messages.noConnectionDetail'), 'error')
        return
    }

    if (commandConnection.value.status !== 'connected') {
        ElMessage.warning(t('commandDrawer.messages.connectFirst'))
        appendSystemLine(t('commandDrawer.messages.connectionNotReady'), 'error')
        return
    }

    // 添加到历史记录
    historyRecord.value.push({
        type: 'input',
        content: command
    })

    // 添加到命令历史（用于上下键导航）
    if (historyCommands.value.length === 0 ||
        historyCommands.value[historyCommands.value.length - 1] !== command) {
        historyCommands.value.push(command)
    }
    historyIndex.value = -1

    // 清空当前输入
    currentInput.value = ''
    isExecuting.value = true
    clearSuggestionState()

    // 解析用户输入，拆出命令名和参数，交给主进程执行真实 Redis 命令。
    const {command: commandName, args} = parseRedisCommandInput(command)

    if (!commandName) {
        appendSystemLine(t('commandDrawer.messages.emptyCommand'), 'error')
        isExecuting.value = false
        return
    }

    try {
        const response = await window.api.redis.executeCommand(commandSessionId.value, commandName, args)

        if (response.success) {
            const formattedResult = formatRedisCommandResult(response.data?.result)

            // 命令行执行 SELECT 后，同步更新当前连接对象的 db_index，避免抽屉头部和页面上下文滞后。
            if (String(commandName).toUpperCase() === 'SELECT') {
                const nextDbIndex = Number(args[0])
                if (commandConnection.value && Number.isInteger(nextDbIndex) && nextDbIndex >= 0) {
                    commandConnection.value.db_index = nextDbIndex
                    dbValue.value = String(nextDbIndex)
                }
            }

            historyRecord.value.push({
                type: 'output',
                content: formattedResult
            })
        } else {
            historyRecord.value.push({
                type: 'error',
                content: response.error || t('commandDrawer.messages.commandFail')
            })
        }
    } catch (error) {
        historyRecord.value.push({
            type: 'error',
            content: error.message || t('commandDrawer.messages.commandException')
        })
    } finally {
        isExecuting.value = false
        // 滚动到底部
        await nextTick()
        scrollToBottom()
        updateScrollActionVisibility()

        // 聚焦输入框
        if (inputRef.value) {
            inputRef.value.focus()
        }
    }
}

/**
 * 更新命令提示
 */
const updateSuggestions = () => {
    const input = currentInput.value
    if (!input) {
        clearSuggestionState()
        return
    }

    // 查找匹配的命令（不区分大小写）
    const example = matchedExample(input)

    if (example.matched) {
        // 保存完整的命令示例用于 Tab 补全
        matchedCommand.value = example.result

        // 显示命令示例中剩余未输入的部分作为提示
        // 例如：输入 "ke"，示例是 "KEYS pattern"，提示显示 "YS pattern"
        const inputLength = input.length
        suggestion.value = example.result.substring(inputLength)

        // 计算提示文本的位置（紧跟在输入文本后面）
        nextTick(() => {
            if (measureRef.value) {
                const width = measureRef.value.offsetWidth
                suggestionStyle.value = {
                    left: `${width}px`
                }
            }
        })
    } else {
        clearSuggestionState()
    }
}

/**
 * 自动补全命令（Tab键）
 */
const completeCommand = (e) => {
    // 阻止 Tab 键的默认行为（切换焦点）
    if (e) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
    }

    if (!matchedCommand.value) {
        return false
    }

    // 保存当前输入框引用
    const input = inputRef.value
    if (!input) return false

    // 确保输入框有焦点
    if (document.activeElement !== input) {
        input.focus()
    }

    // 使用完整的命令示例进行补全
    const newValue = matchedCommand.value

    // 直接更新输入框的值（不通过 v-model，避免响应式延迟）
    input.value = newValue
    currentInput.value = newValue
    clearSuggestionState()

    // 立即设置光标位置
    const newLength = newValue.length
    input.setSelectionRange(newLength, newLength)

    // 确保焦点和光标位置
    input.focus()

    // 使用多个时机确保焦点和光标正确
    nextTick(() => {
        if (inputRef.value) {
            inputRef.value.focus()
            inputRef.value.setSelectionRange(newLength, newLength)
        }
    })

    // 再次确保（防止其他事件干扰）
    setTimeout(() => {
        if (inputRef.value) {
            inputRef.value.focus()
            inputRef.value.setSelectionRange(newLength, newLength)
        }
    }, 10)

    return false
}

/**
 * 导航命令历史（上下键）
 */
const navigateHistory = (direction) => {
    // 如果正在显示提示，上下键应该导航历史而不是提示
    if (historyCommands.value.length === 0) return

    if (direction === 'up') {
        if (historyIndex.value === -1) {
            historyIndex.value = historyCommands.value.length - 1
        } else if (historyIndex.value > 0) {
            historyIndex.value--
        }
    } else if (direction === 'down') {
        if (historyIndex.value >= 0) {
            historyIndex.value++
            if (historyIndex.value >= historyCommands.value.length) {
                historyIndex.value = -1
                currentInput.value = ''
                return
            }
        }
    }

    if (historyIndex.value >= 0) {
        currentInput.value = historyCommands.value[historyIndex.value]
    }
}

/**
 * 处理命令输入区键盘事件。
 * Enter 执行命令，Tab 执行补全，上下键切换命令历史。
 * @param {KeyboardEvent} event 键盘事件对象。
 */
const handleInputKeydown = (event) => {
    if (event.key === 'Enter') {
        event.preventDefault()
        executeCommand()
        return
    }

    if (event.key === 'Tab') {
        completeCommand(event)
        return
    }

    // 单行输入模式下，上下键统一接管为命令历史导航。
    if (event.key === 'ArrowUp') {
        event.preventDefault()
        navigateHistory('up')
        return
    }

    // 单行输入模式下，上下键统一接管为命令历史导航。
    if (event.key === 'ArrowDown') {
        event.preventDefault()
        navigateHistory('down')
    }
}

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
    nextTick(() => {
        const scrollbar = scrollbarRef.value
        if (scrollbar) {
            // 方法: 使用 scrollTo 方法
            scrollbar.scrollTo({
                top: scrollbar.wrapRef.scrollHeight,
                behavior: 'smooth' // 平滑滚动
            })
        }
    })
}

/**
 * 滚动到顶部。
 * 便于快速回看较早的命令记录，不需要手动拖拽长滚动条。
 */
const scrollToTop = () => {
    nextTick(() => {
        const scrollbar = scrollbarRef.value
        if (scrollbar) {
            scrollbar.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
        }
    })
}

/**
 * 切换命令面板当前数据库。
 * 命令抽屉独立连接后，切库只影响命令面板自己的会话，不再影响当前页面页签。
 * @param {string} value DB 下拉框当前值。
 */
const handleDbValueChange = async (value) => {
    if (!commandSessionId.value || !commandConnection.value) {
        return
    }

    const oldDbIndex = commandConnection.value.db_index ?? 0
    const nextDbIndex = parseInt(value, 10)

    if (!Number.isInteger(nextDbIndex) || commandConnection.value.status !== 'connected') {
        dbValue.value = String(oldDbIndex)
        return
    }

    try {
        const response = await window.api.redis.selectDatabase(commandSessionId.value, nextDbIndex)

        if (response.success) {
            commandConnection.value.db_index = nextDbIndex
            dbValue.value = String(nextDbIndex)
            appendSystemLine(t('commandDrawer.messages.dbSwitched', {value: nextDbIndex}), 'success')
            await fetchCommandServerInfo()
        } else {
            dbValue.value = String(oldDbIndex)
            appendSystemLine(t('commandDrawer.messages.dbSwitchFail', {
                value: response.error || t('common.unknownError')
            }), 'error')
        }
    } catch (error) {
        dbValue.value = String(oldDbIndex)
        appendSystemLine(t('commandDrawer.messages.dbSwitchFail', {
            value: error.message || t('common.unknownError')
        }), 'error')
    }
}

// 终端忙碌状态：独立连接建立中或命令执行中，都需要在输出区展示等待动画。
const isTerminalBusy = computed(() => {
    return isExecuting.value || commandConnection.value?.status === 'connecting'
})

// 监听命令面板可见性：打开时创建独立连接并聚焦输入框，关闭时回收会话资源。
watch(drawerVisible, async (newVal) => {
    if (newVal) {
        isDrawerContentReady.value = false
    } else {
        isDrawerContentReady.value = false
        await cleanupCommandSession()
        resetTerminalState()
        emit('closed')
    }
})

// 抽屉打开期间如果切换了命令目标连接，则重新创建独立命令会话。
watch(() => props.connection?.id, async (nextConnectionId, previousConnectionId) => {
    if (!drawerVisible.value || !isDrawerContentReady.value || !nextConnectionId || nextConnectionId === previousConnectionId) {
        return
    }

    await createCommandSession()
    focusInputAfterOpen()
})

// 命令历史变化后重新评估是否需要显示滚动快捷按钮。
watch(historyRecord, () => {
    updateScrollActionVisibility()
}, {deep: true})

onMounted(() => {
    // 监听命令抽屉专属连接状态，只更新当前命令会话，不影响页面连接对象。
    removeConnectionStatusListener = window.api.redis.onConnectionStatusChanged((data) => {
        if (!commandConnection.value || data.connectionId !== commandSessionId.value) {
            return
        }

        commandConnection.value.status = data.status

        // 命令面板独立连接建立成功后，写入一条明确反馈，方便用户确认当前会话已可执行命令。
        if (data.status === 'connected' && lastSessionStatus.value !== 'connected') {
            appendSystemLine(t('commandDrawer.messages.connected', {
                value: commandConnection.value.db_index ?? 0
            }), 'success')
            setTimeout(fetchCommandServerInfo, 300)
        }

        // 连接失败或异常关闭时，也在面板内显式反馈，而不只是依赖外部 toast。
        if ((data.status === 'error' || data.status === 'disconnected') && lastSessionStatus.value !== data.status) {
            appendSystemLine(data.message || t('commandDrawer.messages.disconnected'), 'error')
        }

        lastSessionStatus.value = data.status
    })
})

onUnmounted(async () => {
    removeConnectionStatusListener?.()
    await cleanupCommandSession()
})
</script>

<style scoped>
.drawer-header {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
}

.drawer-header .el-text {
    color: color-mix(in srgb, var(--el-color-white) 70%, transparent);
}

.drawer-header .drawer-db-select {
    width: 120px;
}

/* 命令抽屉头部的 DB 选择器：固定使用暗色风格，和命令面板整体暗背景保持一致。 */
.drawer-header .drawer-db-select :deep(.el-select__wrapper) {
    background: color-mix(in srgb, var(--titlebar-bg-color) 88%, #000);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
}

.drawer-header .drawer-db-select :deep(.el-select__selected-item),
.drawer-header .drawer-db-select :deep(.el-select__placeholder),
.drawer-header .drawer-db-select :deep(.el-select__caret) {
    color: color-mix(in srgb, var(--el-color-white) 82%, transparent);
}

.drawer-header .drawer-db-select :deep(.el-select__wrapper.is-focused) {
    box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.drawer-header .drag {
    position: absolute;
    top: -10px;
    left: calc(50% - 20px);
    z-index: 999;
}

/* 优化拖拽时的性能 */
.command-drawer :deep(.el-drawer) {
    will-change: height;
    transform: translateZ(0); /* 启用硬件加速 */
}

.command-drawer :deep(.el-drawer__body) {
    will-change: height;
}

/* 拖拽时禁用所有过渡动画，确保流畅 */
.command-drawer.is-dragging :deep(.el-drawer),
.command-drawer.is-dragging :deep(.el-drawer__wrapper),
.command-drawer.is-dragging :deep(.el-drawer__body),
.command-drawer.is-dragging :deep(.el-drawer__container) {
    transition: none !important;
    animation: none !important;
    -webkit-transition: none !important;
    -moz-transition: none !important;
    -o-transition: none !important;
}

/* 禁用所有子元素的过渡 */
.command-drawer.is-dragging :deep(*) {
    transition: none !important;
    animation: none !important;
}

.command-terminal {
    position: relative;
    height: 100%;
}

/* 右下角滚动快捷操作：悬浮在终端区域上层，不影响正文布局。 */
.terminal-scroll-actions {
    position: absolute;
    right: 16px;
    bottom: 16px;
    z-index: 10;
    display: flex;
    gap: 8px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

/* 快捷滚动按钮：保持较轻量的半浮层视觉，避免压过终端内容。 */
.scroll-action-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    margin-left: 0 !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-color: color-mix(in srgb, var(--el-color-white) 10%, transparent);
    background: color-mix(in srgb, var(--titlebar-bg-color) 58%, transparent);
    color: color-mix(in srgb, var(--el-color-white) 62%, transparent);
    opacity: 0.72;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.scroll-action-btn :deep(.el-icon) {
    margin: 0;
    font-size: 14px;
    line-height: 1;
}

.scroll-action-btn:hover {
    background: color-mix(in srgb, var(--titlebar-bg-color) 92%, transparent);
    color: var(--el-color-white);
    opacity: 1;
}

.terminal-content {
    flex: 1;
    padding: 10px;
    overflow: hidden;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.6;
}

.terminal-line {
    display: flex;
    align-items: flex-start;
    word-break: break-all;
    color: color-mix(in srgb, var(--el-color-white) 60%, transparent);
    margin-bottom: 5px;
}

.terminal-line .command-prompt {
    color: var(--el-color-primary);
    font-weight: 700;
    flex-shrink: 0;
    user-select: none;
    margin-right: 8px;
    line-height: 1.6;
}

.terminal-line .command-output {
    margin-right: 8px;
    flex-shrink: 0;
}

.terminal-line .command-text {
    color: color-mix(in srgb, var(--el-color-white) 90%, transparent);
    white-space: pre-wrap;
}

.terminal-line .command-text.error {
    color: var(--el-color-danger);
}

.terminal-line .command-text.system {
    color: color-mix(in srgb, var(--el-color-primary) 75%, transparent);
}

.terminal-line .command-text.out {
    color: color-mix(in srgb, var(--el-color-white) 60%, transparent);
}

/* 执行中占位动画：使用三段渐变闪烁的点，提示命令正在等待结果返回。 */
.terminal-line .command-loading {
    display: inline-flex;
    gap: 2px;
    color: color-mix(in srgb, var(--el-color-white) 55%, transparent);
    user-select: none;
}

/* 三个点依次闪烁，模拟终端里常见的等待反馈。 */
.terminal-line .command-loading span {
    animation: command-loading-blink 1.2s infinite ease-in-out;
}

.terminal-line .command-loading span:nth-child(2) {
    animation-delay: 0.2s;
}

.terminal-line .command-loading span:nth-child(3) {
    animation-delay: 0.4s;
}

.terminal-line .input-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;
}

/* 用于测量文本尺寸的辅助元素，不影响页面布局 */
.input-wrapper .input-measure {
    /* 脱离文档流，不影响布局 */
    position: absolute;
    /* 隐藏元素但仍保留其尺寸 */
    visibility: hidden;
    /* 保留空格和换行 */
    white-space: pre;
    /* 继承字体设置以确保测量准确 */
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    /* 清除内外边距避免测量误差 */
    padding: 0;
    margin: 0;
    /* 防止交互干扰测量 */
    pointer-events: none;
    user-select: none;
}

/* 命令行输入框 */
.input-wrapper .command-input {
    /* 占据剩余空间 */
    flex: 1;
    /* 透明背景 */
    background: transparent;
    /* 无边框样式 */
    border: none;
    outline: none;
    /* 文本颜色 */
    color: #d4d4d4;
    /* 继承父元素字体设置 */
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    /* 清除内外边距 */
    padding: 0;
    margin: 0;
    display: block;
    /* 层级控制 */
    position: relative;
    z-index: 1;
    /* 防止 flex 布局中溢出 */
    min-width: 0;
    height: 22px;
    white-space: nowrap;
}

/* 命令提示建议文本（通常作为命令输入的自动补全建议） */
.input-wrapper .command-suggestion {
    /* 绝对定位，覆盖在输入框上 */
    position: absolute;
    top: 0;
    /* 建议文本颜色（通常比输入文本浅） */
    color: #6a6a6a;
    /* 继承字体设置以确保与输入文本对齐 */
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    /* 禁止交互，点击会穿透到底层输入框 */
    pointer-events: none;
    /* 层级低于输入框，确保光标和输入文本可见 */
    z-index: 0;
    /* 防止用户选择建议文本 */
    user-select: none;
    /* 保留空格和换行，确保与输入文本完全对齐 */
    white-space: pre;
}

@keyframes command-loading-blink {
    0%, 80%, 100% {
        opacity: 0.25;
    }
    40% {
        opacity: 1;
    }
}
</style>

<style>
.command-drawer {
    border-radius: 8px 8px 0 0;
    background: var(--el-menu-bg-color);
}

.command-drawer .el-drawer__header {
    padding: 15px 10px 10px 10px !important;
    border-radius: 8px 8px 0 0;
    background-color: var(--titlebar-bg-color);
    color: var(--el-color-white);
}

/* 命令抽屉头部 DB 下拉面板：固定暗色列表风格，避免跟随全局亮色主题跳变。 */
.command-drawer-db-popper.el-select__popper {
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: color-mix(in srgb, var(--titlebar-bg-color) 92%, #000);
}

.command-drawer-db-popper .el-popper__arrow::before {
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    background: color-mix(in srgb, var(--titlebar-bg-color) 92%, #000) !important;
}

.command-drawer-db-popper .el-popper__arrow {
    color: color-mix(in srgb, var(--titlebar-bg-color) 92%, #000) !important;
}

.command-drawer-db-popper .el-select-dropdown__item {
    display: flex;
    padding-right: 10px;
    color: color-mix(in srgb, var(--el-color-white) 82%, transparent);
}

.command-drawer-db-popper .el-select-dropdown__item.hover,
.command-drawer-db-popper .el-select-dropdown__item:hover {
    background: rgba(255, 255, 255, 0.08);
}

.command-drawer-db-popper .el-select-dropdown__item.is-selected {
    color: var(--el-color-primary);
    background: rgba(255, 255, 255, 0.08);
}

/* 命令抽屉 DB 下拉项：左侧 DB 名称，右侧显示当前会话读取到的 DBSize。 */
.command-drawer-db-popper .command-db-option-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-width: 0;
    gap: 12px;
}

.command-drawer-db-popper .command-db-option-label {
    flex: 0 0 auto;
}

.command-drawer-db-popper .command-db-option-size {
    min-width: 0;
    overflow: hidden;
    color: color-mix(in srgb, var(--el-color-white) 48%, transparent);
    font-size: 12px;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
