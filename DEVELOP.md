# 写作星河 · 开发指南

> 面向网文作者的本地桌面写作软件：章节编辑 + 一键大纲 + 3D 人物/势力关系图（上帝视角 + 时间轴）。
> **Electron 桌面应用**（Vue3 + TS + better-sqlite3 本地直存，无独立后端进程）。

---

## 1. 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 窗口壳 | Electron | 无边框自定义标题栏 + 圆角容器，跨 Win/macOS/Linux |
| 前端 | Vue 3 + TypeScript + Vite + Pinia | 四栏布局 / tab / 双主题（浅 TRAE 风 / 深星夜风）/ CodeMirror 6 / 3d-force-graph |
| 本地数据 | better-sqlite3（主进程） | 单文件库，经 IPC 供渲染进程读写 |
| LLM | 主进程直连外部 API（GLM-4 优先 / DeepSeek） | 通过环境变量 `LLM_API_KEY` 等配置 |

## 2. 目录结构

```
写作星河/
├── 技术方案.md          # 产品/数据模型（权威）
├── UI设计文档.md         # 设计规范（tokens/布局/交互）
├── DEVELOP.md           # 本文档
└── ui/
    └── writer-app/      # Electron + Vue 前端工程（唯一工程）
        ├── electron/            # Electron 主进程（commonjs）
        │   ├── main.js          # 窗口创建 + IPC 注册 + 渲染诊断
        │   ├── preload.js       # contextBridge 安全桥（exposeInMainWorld wx）
        │   ├── db.js            # better-sqlite3 建库建表 + 演示数据
        │   └── store.js         # 数据操作层（CRUD / sort_order 重排 / graph 组装 / AI）
        ├── src/
        │   ├── api.ts           # 数据出口：IPC 优先，浏览器回退 REST
        │   ├── stores/          # Pinia：works/data/cast/graph/tabs/theme/aichat
        │   ├── components/      # 布局组件 + panes（编辑器/大纲/关系图/设定集）
        │   └── styles/          # tokens.css（双主题）/ base.css
        ├── index.html           # Vite 入口
        ├── vite.config.ts       # base='./'（关键：Electron file:// 加载相对资源）
        └── package.json         # 含 electron-builder 打包配置
```

## 3. 构建与运行

### 3.1 开发运行（热更新 + 桌面窗口）

```bash
cd ui/writer-app
npm install
npm run electron:dev     # 起 Vite(5173) + Electron 加载 dev 服务器，改代码自动刷新
```

### 3.2 只跑前端（浏览器预览，后端/数据不可用）

```bash
npm run dev              # 浏览器 http://localhost:5173（此时 IPC 不可用，见 api.ts 回退）
```

### 3.3 生产构建 + 打包

```bash
npm run build            # vue-tsc 类型检查 + vite build → dist/
npm run dist:win         # build + electron-builder 打 Windows NSIS 安装包
npm run dist             # 全平台（当前平台）
npm run dist:dir         # 免安装目录（release/win-unpacked）
```

产物：
- 安装包：`ui/writer-app/release/写作星河-0.1.0-x64.exe`
- 免安装版：`ui/writer-app/release/win-unpacked/写作星河.exe`

### 3.4 LLM 配置（可选，未配置时 AI 返回明确提示）

```bash
set LLM_API_KEY=xxx        # Windows
LLM_API_KEY=xxx            # macOS/Linux
# 可选项：LLM_BASE_URL（默认 deepseek）、LLM_MODEL（默认 deepseek-chat）
```

## 4. 架构与数据流

```
渲染进程(Vue) ──wxAPI(IPC)──> 主进程 ──better-sqlite3──> writing-galaxy.db(本地)
        ▲                                                     （用户数据目录）
        └──────── AI 直连外部 LLM API（主进程发起，避免渲染进程直连/nge利 key）
```

- **无后端进程**：单进程桌面应用，数据全部存本地 SQLite（`app.getPath('userData')/data/writing-galaxy.db`）。
- **IPC 封装**：`preload.js` 暴露 `window.wxAPI`；`api.ts` 检测到 `wxAPI` 走 IPC，否则浏览器回退 REST（开发预览用）。
- **sort_order 是唯一稳定坐标**：章节插入/删除后事务内全量紧凑重排为 1,2,3…；人物出场/关系起止/章纲关联全部以 `sort_order` 索引（对齐方案 4.2，禁止用 chapter_no）。
- **无边框窗口**：`main.js` 设 `frame:false`，前端 `TitleBar.vue` 自绘标题栏（拖拽 + 最小化/最大化/关闭），窗口控制走 IPC。
- **双主题**：`tokens.css` 两套 `html[data-theme]`（浅 TRAE / 深星夜），theme store 持久化到 localStorage。

## 5. 数据模型（SQLite 表，见 electron/db.js）

- **work** 作品
- **chapter** 章节（`(work_id, sort_order)` 唯一）
- **character** 人物（faction_id 归属、first_sort_order 出场坐标、confirmed）
- **faction** 势力（parent_faction_id 可嵌套）
- **relationship** 关系（from/to 类型、rel_type、start/end 坐标）
- **outline_node** 大纲三层树（level 0/1/2）

关系 `rel_type` 枚举与颜色映射见 `store.js` 的 `REL_META`，与 `技术方案.md` 4.2.6 一致。

## 6. 开发约定

1. **Electron 主进程用 CommonJS**：`electron/package.json` 声明 `"type":"commonjs"`（因 `writer-app/package.json` 是 `"type":"module"`，.js 默认按 ESM 会报 `require is not defined`）。
2. **原生模块**：`better-sqlite3` 装在 `dependencies`（electron-builder 只打包 dependencies）；改 Electron 版本后需 `npx electron-rebuild -f -w better-sqlite3`（或由 electron-builder 自动 rebuild）。
3. **Vite 资源相对路径**：`vite.config.ts` 的 `base:'./'` 不能去掉，否则 Electron `file://` 下 `/assets/...` 加载失败 → 白屏。
4. **数据出口唯一**：前端只经 `api.ts`；Pinia store 持状态；组件内不直接 IPC。
5. **类型安全**：`npm run build`（vue-tsc）必须零错误。
6. **提交**：小而语义化 commit（feat:/fix:），改动后跑构建验证再提交。

## 7. 常见问题（已踩过的坑）

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 窗口空白 | dist 资源是绝对路径 `/assets/`，file:// 下加载失败 | `vite.config.ts` `base:'./'` 产相对路径 |
| `require is not defined` | `.js` 被当 ESM（package.json type:module） | `electron/package.json` 声明 commonjs |
| `NODE_MODULE_VERSION` 不匹配 | better-sqlite3 用 Node ABI 编译 | `electron-rebuild` 重编为 Electron ABI |
| Electron 二进制下载超时 | 官方源被墙 | `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` |
| 打包证书校验失败 | 网络代理 | `NODE_TLS_REJECT_UNAUTHORIZED=0` + 国内 electron-builder 镜像 |
| 旧版残留导致新装空白/无反应 | 旧进程/旧快捷方式占用 | 卸载旧版 + 结束所有写作星河.exe 进程 |

## 8. 验收标准

1. `npm run electron:dev` 弹出桌面窗口，浅色 TRAE 界面 + 顶部自定义标题栏。
2. 可新建作品 → 章节增删/编辑 → 人物/势力/关系管理 → 3D 关系图 + 时间轴联动。
3. 主题切换生效（浅/深）且持久化。
4. 标题栏最小化/最大化/关闭可用；AI 未配 key 时返回友好提示不崩溃。
5. `npm run build` 零错误；`npm run dist:win` 产出安装包，安装后独立运行。
