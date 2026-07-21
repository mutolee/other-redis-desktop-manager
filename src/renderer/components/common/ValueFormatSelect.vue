<!--
    ValueFormatSelect.vue
    描述：Redis value 展示格式选择器。
    职责：统一 Text/JSON/Hex 等展示格式选项，供 String 预览和后续查看弹窗复用。
-->
<template>
    <!-- 展示格式选择器：只控制预览文本如何解析，不改变 Redis 中保存的原始 value。 -->
    <el-select
        :model-value="modelValue"
        class="value-format-select"
        size="small"
        placement="bottom-end"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <el-option
            v-for="option in formatOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
        />
    </el-select>
</template>

<script setup>
import {computed} from 'vue'
import {useI18n} from '../../i18n/index.js'
import {VALUE_FORMAT_TYPES} from '../../utils/valueFormatters/index.js'

// 组件入参：modelValue 是当前展示格式，父组件决定何时显示选择器。
defineProps({
    modelValue: {
        type: String,
        required: true
    }
})

// 对外事件：同步 v-model，选择器本身不持有业务状态。
const emit = defineEmits(['update:modelValue'])

// 国际化文案：展示格式名称需要随系统语言切换。
const {t} = useI18n()

// 格式选项：第一阶段只开放 Text/UTF-8、JSON、Hex。
const formatOptions = computed(() => [
    {
        label: t('valueFormats.text'),
        value: VALUE_FORMAT_TYPES.TEXT
    },
    {
        label: t('valueFormats.json'),
        value: VALUE_FORMAT_TYPES.JSON
    },
    {
        label: t('valueFormats.hex'),
        value: VALUE_FORMAT_TYPES.HEX
    },
    {
        label: t('valueFormats.binary'),
        value: VALUE_FORMAT_TYPES.BINARY
    },
    {
        label: t('valueFormats.javaSerialization'),
        value: VALUE_FORMAT_TYPES.JAVA_SERIALIZATION
    },
    {
        label: t('valueFormats.phpSerialize'),
        value: VALUE_FORMAT_TYPES.PHP_SERIALIZE
    },
    {
        label: t('valueFormats.pickle'),
        value: VALUE_FORMAT_TYPES.PICKLE
    },
    {
        label: t('valueFormats.messagePack'),
        value: VALUE_FORMAT_TYPES.MESSAGE_PACK
    },
    {
        label: t('valueFormats.gzip'),
        value: VALUE_FORMAT_TYPES.GZIP
    },
    {
        label: t('valueFormats.zlibDeflate'),
        value: VALUE_FORMAT_TYPES.ZLIB_DEFLATE
    },
    {
        label: t('valueFormats.brotli'),
        value: VALUE_FORMAT_TYPES.BROTLI
    }
])
</script>

<style scoped>
/* 展示格式选择器：固定宽度，避免切换语言或格式名称时挤压工具栏按钮。 */
.value-format-select {
    width: 145px;
}

.value-format-select :deep(.el-select__selected-item) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
