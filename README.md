# ✨ 写作星河 · Writing Galaxy

> 面向网文作者的本地桌面写作软件：章节编辑 + 一键大纲 + 3D 人物/势力关系图。
> 像 VSCode / Trae 一样运行的**原生桌面应用**（Electron），数据全部保存在本地，无需联网、无需安装服务器。

---

## 项目简介

**写作星河**是一款为网络小说作者打造的桌面写作工具，专注解决写作中最头疼的几件事：

- 📝 **顺畅写作**：CodeMirror 编辑器 + IDE 式多 Tab，写章节像写代码一样顺手；支持浅色（智能绿）／深色（星夜）双主题。
- 🧭 **一键大纲**：基于已写章节，用大模型自动整理「总纲 → 分卷纲 → 章纲」三层结构。
- 🕸️ **3D 关系图**：把人物、势力画成星网——节点大小=重要性、节点颜色=派系、边=关系（从属/敌对/亲属/师徒/情侣…），支持**上帝视角**与**时间轴视角**（随章节推进渐入渐出）。
- 👥 **设定集**：人物、势力、关系的可视化管理，改动即时反映到 3D 关系图。
- 🤖 **AI 助手**：一键生成大纲、单章人物/关系抽取、问答续写（GLM-4 / DeepSeek 可切换）。

**桌面级体验**：原生无边框窗口 + 自定义标题栏，四栏弹性分栏（作品栏｜AI 助手｜编辑区｜内容树），像 Trae / VSCode 一样轻量现代。

**本地优先 & 隐私**：所有数据（作品、章节、人物、势力、关系、大纲）都保存在本地 SQLite 数据库，不依赖任何外部服务器，离线也能用。

---

## ✨ 功能亮点

| 模块 | 说明 |
| --- | --- |
| 写作编辑器 | 章节正文编辑，IDE 式 tab 多开，CodeMirror 6 |
| 一键大纲 | LLM 输出结构化大纲（总纲/分卷纲/章纲），支持增量更新 |
| 3D 人物关系图 | 节点=人物/势力，边=关系；节点大小=重要性；`3d-force-graph` 星夜渲染 |
| 双视角 | 上帝视角（全局）+ 时间轴视角（随章节推进渐入渐出） |
| 设定集 | 人物/势力/关系增删改 + 人工确认，联动 3D 图 |
| AI 交互栏 | 一键大纲、分析本章、问答、续写入口；GLM-4 / DeepSeek 可切换 |
| 双主题 | 浅色（TRAE 智能绿）／深色（星夜青绿），一键切换并持久记忆 |
| 本地数据 | better-sqlite3，存在用户数据目录，无需服务器 |

---

## 🚀 快速开始（开发者）

### 环境要求
- Node.js 20+
- npm 10+

### 安装与运行

```bash
cd ui/writer-app
npm install

# 开发模式（热更新 + 自动弹出桌面窗口）
npm run electron:dev

# 生产构建 + 打包安装包（Windows）
npm run dist:win
```

打包产物：
- 安装包：`ui/writer-app/release/写作星河-0.1.0-x64.exe`
- 免安装版：`ui/writer-app/release/win-unpacked/写作星河.exe`

### 使用已打好的安装包

直接双击 `写作星河-0.1.0-x64.exe`，按向导安装，即可在桌面启动「写作星河」。（无需安装 Node、无需联网。）

---

## 🤖 AI 配置（可选）

应用默认不调用大模型也能正常使用（除 AI 功能外全部可用）。若想启用 AI，需在启动前配置环境变量：

```bash
# Windows (cmd)
set LLM_API_KEY=your_key_here
# macOS / Linux
LLM_API_KEY=your_key_here npm run electron:start

# 可选：切换模型与网关（默认 DeepSeek）
set LLM_BASE_URL=https://api.deepseek.com/v1
set LLM_MODEL=deepseek-chat
```

未配置时，点「生成大纲 / 分析本章」会返回友好提示，不会报错或崩溃。

---

## 📁 数据存放位置

首次启动会自动建库，数据存在系统的用户数据目录：

- **Windows**：`C:\Users\<你>\AppData\Roaming\writing-galaxy\data\writing-galaxy.db`
- **macOS**：`~/Library/Application Support/writing-galaxy/data/writing-galaxy.db`
- **Linux**：`~/.config/writing-galaxy/data/writing-galaxy.db`

---

## 📐 技术架构

```
┌─────────────────────────── 渲染进程 (Vue 3) ───────────────────────────┐
│  ui/writer-app/src/                                                    │
│    api.ts           数据出口：IPC 优先（浏览器预览时回退 REST）          │
│    stores/          Pinia：works/data/cast/graph/tabs/theme/aichat     │
│    components/      四栏布局 + panes(编辑器/大纲/关系图/设定集)           │
│    TitleBar       无边框窗口自定义标题栏                                 │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │  window.wxAPI（contextBridge / IPC）
┌──────────────────────────────▼────────────── Electron 主进程 ──────────┐
│  electron/                                                             │
│    main.js        窗口创建 + IPC 注册 + 渲染诊断                         │
│    preload.js     contextBridge 安全桥（暴露 window.wxAPI）              │
│    db.js          better-sqlite3 建库建表 + 演示数据                     │
│    store.js       数据操作层：CRUD / sort_order 重排 / graph 组装 / AI   │
└────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 writing-galaxy.db（本地 SQLite，用户数据目录）
```

**关键设计**
- 无独立后端进程：单进程桌面应用，数据全存本地 SQLite。
- `sort_order` 是唯一稳定坐标：章节插入/删除后事务内全量紧凑重排为 1,2,3…（对齐技术方案 4.2）。
- 原生无边框窗口 + 双主题（tokens.css 定义 `data-theme`）。

---

## 📄 文档

| 文档 | 说明 |
| --- | --- |
| `README.md` | 本文档：项目简介 + 使用说明 |
| `DEVELOP.md` | 开发者指南：架构、构建、开发约定、常见坑 |
| `技术方案.md` | 产品与数据模型权威说明（含 sort_order、rel_type 等） |
| `ui/UI设计文档.md` | 设计规范：tokens / 布局 / 交互 |

---

## 🧭 路线图

- [x] 章节编辑器 + 多 Tab + 双主题
- [x] 作品库 / 章节维护（sort_order 坐标）
- [x] 人物/势力/关系设定集管理
- [x] 3D 人物关系图（上帝视角 + 时间轴）
- [x] 大纲视图 + AI 生成 / 单章分析（接口 + Provider 抽象）
- [x] Electron 桌面化 + Windows 安装包
- [ ] 应用图标与品牌
- [ ] 内置 AI Key 设置面板
- [ ] macOS / Linux 打包与发布
- [ ] 自动更新（electron-updater）

---

## 📬 联系 / 贡献

本项目为单作者写作工具，欢迎提 issue 或建议。核心开发遵守 `DEVELOP.md` 中的约定。

---

⚛️ 用「写作星河」，让灵感成星河。
