<!--
  命令行抽屉组件
  描述：可在任意位置通过 v-model 复用
-->
<script setup>
import {computed, nextTick, ref, watch} from "vue";
import {CodeOne} from '@icon-park/vue-next'
import {matchedExample} from "../../utils/commandExamples.js";
import CommandDrawerDrag from "../drag/CommandDrawerDrag.vue";

// props
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

// Emits
const emit = defineEmits(['update:visible'])

// 计算属性
const drawerVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
})

// 响应式数据
const drawerHeight = ref('40%') // Drawer 高度（像素值，初始为40%视口高度）
const isDragging = ref(false) // 是否正在拖拽
// 终端内容引用
const terminalRef = ref(null)
const inputRef = ref(null) // 输入框引用
const measureRef = ref(null) // 用于测量输入文本宽度的元素
const scrollbarRef = ref() // 滚动条引用
// 当前输入
const currentInput = ref('')
const historyRecord = ref([]) // 历史记录，用于屏幕展示
const historyCommands = ref([]) // 历史输入命令
const historyIndex = ref(-1) // 历史输入命令索引（用于上下键导航）
// 命令提示信息
const suggestion = ref('') // 当前提示的命令示例
const suggestionStyle = ref({}) // 提示文本的样式（用于定位）
const matchedCommand = ref('') // 当前匹配的命令名（用于 Tab 补全）

/**
 * 监听 visible 变化，当打开时聚焦输入框
 */
watch(drawerVisible, (newVal) => {
    if (newVal) {
        // 使用多个时机确保焦点设置成功（因为 drawer 有动画延迟）
        nextTick(() => {
            if (inputRef.value) {
                inputRef.value.focus()
            }
            // 滚动到底部
            scrollToBottom()
        })

        // 延迟再次设置焦点，确保 drawer 动画完成后也能获取焦点
        setTimeout(() => {
            if (inputRef.value && drawerVisible.value) {
                inputRef.value.focus()
            }
        }, 300) // el-drawer 的默认动画时间约为 300ms
    } else {
        // 清空命令历史
        currentInput.value = ''
        historyRecord.value = []
        historyCommands.value = []
        historyIndex.value = -1
        // 清空提示信息
        suggestion.value = ''
        suggestionStyle.value = {}
        matchedCommand.value = ''
    }
})

/**
 * 执行命令
 */
const executeCommand = async () => {
    const command = currentInput.value.trim()
    if (!command) {
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

    // 模拟执行命令（暂时）
    await simulateCommandExecution(command)

    // 滚动到底部
    await nextTick()
    scrollToBottom()

    // 聚焦输入框
    if (inputRef.value) {
        inputRef.value.focus()
    }

    // 清空提示信息
    suggestion.value = ''
    suggestionStyle.value = {}
    matchedCommand.value = ''
}

/**
 * 模拟命令执行
 */
const simulateCommandExecution = async (command) => {
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 100))

    // 模拟不同的命令响应
    let output = ''
    const cmd = command.toLowerCase()

    if (cmd === 'help' || cmd === '?') {
        output = `Redis 命令行帮助：
  PING          - 测试连接
  INFO          - 获取服务器信息
  KEYS *        - 列出所有键
  GET <key>     - 获取键值
  SET <key> <value> - 设置键值
  DEL <key>     - 删除键
  FLUSHDB       - 清空当前数据库
  DBSIZE        - 获取键数量
  TYPE <key>    - 获取键类型
  TTL <key>     - 获取键过期时间
  EXPIRE <key> <seconds> - 设置键过期时间`
    } else if (cmd === 'ping') {
        output = 'PONG'
    } else if (cmd.startsWith('get ')) {
        const key = command.substring(4).trim()
        output = `(nil)`
    } else if (cmd.startsWith('set ')) {
        output = 'OK'
    } else if (cmd.startsWith('del ')) {
        output = '(integer) 0'
    } else if (cmd === 'dbsize') {
        output = '(integer) 0'
    } else if (cmd === 'keys *') {
        output = '(empty array)'
    } else if (cmd === 'info') {
        output = `# Server
redis_version:7.2.5
redis_git_sha1:00000000
redis_mode:standalone
os:Linux
arch_bits:64
process_id:1133

# Memory
used_memory:70766576
used_memory_human:67.49M
used_memory_peak:110928920
used_memory_peak_human:105.79M`
    } else if (cmd === 'flushdb') {
        output = 'OK'
    } else {
        output = `(error) ERR unknown command '${command.split(' ')[0]}'`
    }

    // 添加输出到历史
    historyRecord.value.push({
        type: 'output',
        content: output
    })
}

/**
 * 更新命令提示
 */
const updateSuggestions = () => {
    const input = currentInput.value
    if (!input) {
        // 清空提示信息
        suggestion.value = ''
        suggestionStyle.value = {}
        matchedCommand.value = ''
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
        // 清空提示信息
        suggestion.value = ''
        suggestionStyle.value = {}
        matchedCommand.value = ''
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
    // 清空提示信息
    suggestion.value = ''
    suggestionStyle.value = {}
    matchedCommand.value = ''

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
</script>

<template>
    <el-drawer
        :model-value="drawerVisible"
        :size="drawerHeight"
        direction="btt"
        :with-header="true"
        @close="() => drawerVisible = false"
        append-to-body
        :class="['command-drawer', { 'is-dragging': isDragging }]"
    >
        <template #header>
            <div class="drawer-header" v-if="connection">
                <el-icon style="color: var(--el-color-primary)">
                    <CodeOne/>
                </el-icon>
                <el-text>{{ connection.name }}({{ connection.host }}:{{ connection.port }}) - DB {{ connection.db_index || 0 }}</el-text>
                <div class="drag">
                    <CommandDrawerDrag :drawerHeight="drawerHeight"
                                       @update:drawerHeight="newHeight => {drawerHeight = newHeight; isDragging = true}"
                                       @update:stopDragging="() => isDragging = false"
                    />
                </div>
            </div>
        </template>
        <div class="command-terminal" ref="terminalRef">
            <el-scrollbar ref="scrollbarRef">
                <div class="terminal-content">
                    <div
                        v-for="(line, index) in historyRecord"
                        :key="index"
                        class="terminal-line"
                    >
                        <span v-if="line.type === 'input'" class="command-prompt">>：</span>
                        <span v-else-if="line.type === 'output'" class="command-output"></span>
                        <span class="command-text" :class="line.type === 'output' ? 'out' : ''">{{ line.content }}</span>
                    </div>
                    <div class="terminal-line">
                        <span class="command-prompt">>：</span>
                        <div class="input-wrapper">
                            <span class="input-measure" ref="measureRef">{{ currentInput }}</span>
                            <input
                                ref="inputRef"
                                v-model="currentInput"
                                @keydown.enter="executeCommand"
                                @keydown.up.prevent="navigateHistory('up')"
                                @keydown.down.prevent="navigateHistory('down')"
                                @keydown.tab.prevent.stop="completeCommand"
                                @input="updateSuggestions"
                                class="command-input"
                                type="text"
                                autofocus
                            />
                            <span v-if="suggestion" class="command-suggestion" :style="suggestionStyle">{{ suggestion }}</span>
                        </div>
                    </div>
                </div>
            </el-scrollbar>
        </div>
    </el-drawer>
</template>

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
    height: 100%;
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
}

.terminal-line .command-output {
    margin-right: 8px;
    flex-shrink: 0;
}

.terminal-line .command-text {
    color: color-mix(in srgb, var(--el-color-white) 90%, transparent);
    white-space: pre-wrap;
}

.terminal-line .command-text.out {
    color: color-mix(in srgb, var(--el-color-white) 60%, transparent);
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
    /* 层级控制 */
    position: relative;
    z-index: 1;
    /* 防止 flex 布局中溢出 */
    min-width: 0;
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
</style>