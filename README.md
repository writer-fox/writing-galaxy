# ✨ Writing Galaxy · 写作星河

> A local desktop writing app for web-novel authors: chapter editing, one-click outline generation, and a 3D character/faction relationship map.
> Runs as a **native desktop app** (Electron) just like VSCode / Trae — all data stored locally, no network or server required.

---

## Project Overview

**Writing Galaxy** is a desktop writing tool built for web-novel (网文) authors, focused on the most painful parts of long-form writing:

- 📝 **Smooth Writing**: CodeMirror editor + IDE-style multi-tabs — writing chapters feels like writing code. Dual themes (light smart-green / dark starry-night).
- 🧭 **One-click Outline**: Based on written chapters, an LLM auto-organizes a 3-layer outline: 总纲 (volume index) → 分卷纲 (book outline) → 章纲 (chapter outline).
- 🕸️ **3D Relationship Graph**: Characters and factions rendered as a star-web — node size = importance, node color = faction, edges = relationships (belong_to / enemy / kinship / master-disciple / lover…). Two view modes: **God view** (global) and **Timeline view** (fades in/out as chapters progress).
- 👥 **Settings / Cast Panel**: Visual management of characters, factions and relationships — changes immediately reflect in the 3D graph.
- 🤖 **AI Assistant**: One-click outline, per-chapter relationship extraction, Q&A and continuation (GLM-4 / DeepSeek switchable).

**Desktop-grade experience**: native frameless window + custom title bar, four resizable columns (Works | AI Assist | Editor | Content Tree) — lightweight and modern like Trae / VSCode.

**Local-first & private**: all data (works, chapters, characters, factions, relationships, outlines) is stored in a local SQLite database. No external server, works offline.

---

## ✨ Key Features

| Module | Description |
| --- | --- |
| Writing Editor | Chapter editing with IDE-style tabs, CodeMirror 6 |
| One-click Outline | LLM generates structured outline (volume/book/chapter), incremental updates |
| 3D Relationship Graph | Nodes = characters/factions, edges = relationships; size = importance; `3d-force-graph` starry rendering |
| Dual Views | God view (global) + Timeline view (fades as chapters progress) |
| Cast Panel | CRUD + manual confirmation for characters/factions/relationships, syncs 3D graph |
| AI Panel | One-click outline / analyze chapter / Q&A / continuation; GLM-4 & DeepSeek |
| Dual Themes | Light (TRAE green) / Dark (starry teal), toggled & remembered |
| Local Data | better-sqlite3 in user data dir, no server required |

---

## 🚀 Quick Start (Developers)

### Requirements
- Node.js 20+
- npm 10+

### Install & Run

```bash
cd ui/writer-app
npm install

# Development mode (hot reload + auto-open desktop window)
npm run electron:dev

# Production build + package (Windows installer)
npm run dist:win
```

Outputs:
- Installer: `ui/writer-app/release/写作星河-0.1.0-x64.exe`
- Portable (no install): `ui/writer-app/release/win-unpacked/写作星河.exe`

### Using the prebuilt installer

Double-click `写作星河-0.1.0-x64.exe`, follow the wizard, then launch "写作星河" from your desktop. (No Node install, no network, no server needed.)

---

## 🤖 AI Configuration (Optional)

The app works fully without AI (everything except AI features). To enable AI, set environment variables before launch:

```bash
# Windows (cmd)
set LLM_API_KEY=your_key_here
# macOS / Linux
LLM_API_KEY=your_key_here npm run electron:start

# Optional: switch model & gateway (default DeepSeek)
set LLM_BASE_URL=https://api.deepseek.com/v1
set LLM_MODEL=deepseek-chat
```

When unconfigured, clicking "Generate Outline / Analyze Chapter" returns a friendly hint — no errors, no crash.

---

## 📁 Data Location

The database is auto-created on first launch in your user data directory:

- **Windows**: `C:\Users\<you>\AppData\Roaming\writing-galaxy\data\writing-galaxy.db`
- **macOS**: `~/Library/Application Support/writing-galaxy/data/writing-galaxy.db`
- **Linux**: `~/.config/writing-galaxy/data/writing-galaxy.db`

---

## 📐 Tech Architecture

```
┌─────────────────────────── Renderer Process (Vue 3) ────────────────────┐
│  ui/writer-app/src/                                                     │
│    api.ts           Data gateway: IPC-first (REST fallback in browser)  │
│    stores/          Pinia: works/data/cast/graph/tabs/theme/aichat      │
│    components/      Four-column layout + panes(editor/outline/graph/cast) │
│    TitleBar         Frameless-window custom title bar                   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │  window.wxAPI (contextBridge / IPC)
┌──────────────────────────────▼────────────── Electron main process ─────┐
│  electron/                                                              │
│    main.js         Window creation + IPC registration + render diag     │
│    preload.js      contextBridge secure bridge (exposes window.wxAPI)   │
│    db.js           better-sqlite3 schema + demo data                    │
│    store.js        Data layer: CRUD / sort_order reorder / graph / AI   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 writing-galaxy.db (local SQLite, user data dir)
```

**Key design**
- No separate backend process: single-process desktop app, all data in local SQLite.
- `sort_order` is the single stable coordinate: chapters are densely re-sorted to 1,2,3… in a transaction after insert/delete (per TECHNICAL.md §4.2).
- Native frameless window + dual themes (`data-theme` defined in `tokens.css`).

---

## 📄 Documentation

| Doc | Description |
| --- | --- |
| `README.md` | This file: project overview + usage |
| `DEVELOP.md` | Developer guide: architecture, build, conventions, known pitfalls |
| `TECHNICAL.md` | Product & data model (sort_order, rel_type, etc.) |
| `ui/UI-DESIGN.md` | Design spec: tokens / layout / interaction |

---

## 🧭 Roadmap

- [x] Chapter editor + multi-tabs + dual themes
- [x] Works library / chapter management (sort_order coordinates)
- [x] Cast panel: characters / factions / relationships
- [x] 3D relationship graph (god view + timeline)
- [x] Outline view + AI generation / per-chapter analysis (provider abstraction)
- [x] Electron desktop packaging + Windows installer
- [ ] App icon & branding
- [ ] In-app AI key settings panel
- [ ] macOS / Linux packaging & release
- [ ] Auto-update (electron-updater)

---

## 📬 Contact / Contributing

Single-author writing tool; issues & suggestions are welcome. Core development follows the conventions in `DEVELOP.md`.

---

---

# 写作星河 · 项目简介（中文）

> 面向网文作者的本地桌面写作软件：章节编辑 + 一键大纲 + 3D 人物/势力关系图。
> 像 VSCode / Trae 一样运行的原生桌面应用（Electron），数据全部保存在本地，无需联网、无需服务器。

## 项目简介

**写作星河**是一款为网络小说作者打造的桌面写作工具，专注解决写作中最头疼的几件事：

- 📝 **顺畅写作**：CodeMirror 编辑器 + IDE 式多 Tab，写章节像写代码一样顺手；支持浅色（智能绿）／深色（星夜）双主题。
- 🧭 **一键大纲**：基于已写章节，用大模型自动整理「总纲 → 分卷纲 → 章纲」三层结构。
- 🕸️ **3D 关系图**：把人物、势力画成星网——节点大小=重要性、节点颜色=派系、边=关系（从属/敌对/亲属/师徒/情侣…），支持**上帝视角**与**时间轴视角**（随章节推进渐入渐出）。
- 👥 **设定集**：人物、势力、关系的可视化管理，改动即时反映到 3D 关系图。
- 🤖 **AI 助手**：一键生成大纲、单章人物/关系抽取、问答续写（GLM-4 / DeepSeek 可切换）。

**桌面级体验**：原生无边框窗口 + 自定义标题栏，四栏弹性分栏（作品栏｜AI 助手｜编辑区｜内容树），像 Trae / VSCode 一样轻量现代。

**本地优先 & 隐私**：所有数据（作品、章节、人物、势力、关系、大纲）都保存在本地 SQLite 数据库，不依赖任何外部服务器，离线也能用。

## 功能亮点

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

## 环境要求
- Node.js 20+
- npm 10+

## 安装与运行

```bash
cd ui/writer-app
npm install
npm run electron:dev     # 开发模式（热更新 + 弹出桌面窗口）
npm run dist:win         # 生产构建 + 打包安装包
```

打包产物：
- 安装包：`ui/writer-app/release/写作星河-0.1.0-x64.exe`
- 免安装版：`ui/writer-app/release/win-unpacked/写作星河.exe`

## AI 配置（可选）

```bash
set LLM_API_KEY=your_key_here   # Windows
LLM_API_KEY=your_key_here npm run electron:start   # macOS/Linux
```

未配置时，点「生成大纲 / 分析本章」会返回友好提示，不会报错或崩溃。

## 文档

| 文档 | 说明 |
| --- | --- |
| `README.md` | 本文档：项目简介 + 使用说明 |
| `DEVELOP.md` | 开发者指南：架构、构建、开发约定、常见坑 |
| `TECHNICAL.md` | 产品与数据模型权威说明（含 sort_order、rel_type 等） |
| `ui/UI-DESIGN.md` | 设计规范：tokens / 布局 / 交互 |

⚛️ 用「写作星河」，让灵感成星河。
