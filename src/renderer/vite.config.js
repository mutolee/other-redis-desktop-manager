// vite.config.js
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// 导出 Vite 配置
export default defineConfig({
    // 设置项目根目录为当前目录（renderer 目录）
    root: __dirname,

    // 配置需要使用的插件
    plugins: [
        // Vue.js 官方插件，用于支持 .vue 单文件组件
        vue()
    ],

    // 设置基础路径，'./' 表示相对路径部署
    base: './',

    // 构建配置选项
    build: {
        // 指定输出目录，将构建结果输出到项目根目录下的 dist 文件夹
        outDir: path.resolve(__dirname, '../../dist'),

        // 构建前清空输出目录
        emptyOutDir: true,

        // Rollup 打包配置
        rollupOptions: {
            // 指定入口文件
            input: path.resolve(__dirname, 'index.html')
        }
    },

    // 开发服务器配置
    server: {
        // 设置开发服务器端口
        port: 5173
    }
})
