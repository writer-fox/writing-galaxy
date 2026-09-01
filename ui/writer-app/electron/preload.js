// preload：通过 contextBridge 向渲染进程暴露类型安全的 IPC 客户端
const { contextBridge, ipcRenderer } = require('electron')

function invoke(channel) {
  return (...args) =>
    ipcRenderer.invoke(channel, ...args).then((res) => {
      if (!res || !res.ok) throw new Error((res && res.error) || 'IPC 错误')
      return res.data
    })
}

// 暴露给前端，与原来 fetch 后端同一个方法形状，但走本地 IPC
contextBridge.exposeInMainWorld('wxAPI', {
  works: {
    list: invoke('work:list'),
    create: invoke('work:create'),
    get: invoke('work:get'),
  },
  chapters: {
    listByWork: invoke('chapter:list'),
    get: invoke('chapter:get'),
    create: invoke('chapter:create'),
    update: invoke('chapter:update'),
    remove: invoke('chapter:delete'),
  },
  characters: {
    list: invoke('character:list'),
    create: invoke('character:create'),
    update: invoke('character:update'),
    remove: invoke('character:delete'),
  },
  factions: {
    list: invoke('faction:list'),
    create: invoke('faction:create'),
    update: invoke('faction:update'),
    remove: invoke('faction:delete'),
  },
  relationships: {
    list: invoke('relationship:list'),
    create: invoke('relationship:create'),
    confirm: invoke('relationship:confirm'),
    remove: invoke('relationship:delete'),
  },
  outline: {
    list: invoke('outline:list'),
    get: invoke('outline:get'),
    create: invoke('outline:create'),
    update: invoke('outline:update'),
    remove: invoke('outline:delete'),
  },
  graph: {
    get: invoke('graph:get'),
  },
  ai: {
    status: invoke('ai:status'),
    outline: invoke('ai:outline'),
    analyzeChapter: invoke('ai:analyzeChapter'),
  },
  config: {
    get: invoke('config:get'),
    update: invoke('config:update'),
  },
  app: {
    info: invoke('app:info'),
  },
  // 窗口控制（无边框标题栏用；返回 Promise 便于知道结果）
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize').then(() => true),
    maximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle').then((v) => !!v),
    close: () => ipcRenderer.invoke('window:close').then(() => true),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized').then((v) => !!v),
  },
  // 元信息
  meta: { platform: process.platform, versions: process.versions },
})
