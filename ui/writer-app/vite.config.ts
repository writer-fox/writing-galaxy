import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
  },
  // 关键：产出相对路径，Electron(file:// 协议)下才能正确加载 assets
  base: './',
  build: {
    chunkSizeWarningLimit: 800,
  },
})
