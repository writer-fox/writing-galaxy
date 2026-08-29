import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'wx-theme'

function readInitial(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'dark' ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readInitial())

  watch(mode, (m) => {
    document.documentElement.setAttribute('data-theme', m)
    localStorage.setItem(STORAGE_KEY, m)
  })

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  // 应用到根元素（首次初始化）
  document.documentElement.setAttribute('data-theme', mode.value)

  return { mode, toggle }
})
