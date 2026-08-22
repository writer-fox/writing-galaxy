# 写作星河 · 技术方案文档

> 面向网文作者的写作辅助软件：章节编辑 + 一键大纲 + 3D 人物/势力关系图（上帝视角 + 时间轴双模式）。

---

## 1. 项目概述

### 1.1 核心功能

| 模块 | 说明 |
| --- | --- |
| 写作编辑器 | 章节正文编辑，IDE 式 tab 多开 |
| 一键生成大纲 | 读取章节，LLM 输出结构化大纲（总纲/分卷纲/章纲），支持增量更新 |
| 3D 人物关系图 | 节点=人物/势力，边=关系（从属/敌对/亲属等），节点大小=重要性 |
| 双视角 | 上帝视角（全局聚合）+ 时间轴视角（随章节推进渐入渐出） |
| AI 交互栏 | 快捷入口：生成大纲、提取关系、问答、续写 |

### 1.2 布局（四栏 + tab 工作区）

```
┌──────┬────────┬────────────────────────┬──────────────┐
│ 作品  │ AI 交互 │ [第1章][大纲][关系图]…  │  内容树       │
│ 分类  │ 栏(窄) ├────────────────────────┤  - 章节      │
│      │        │                        │  - 大纲      │
│      │        │   工作区内容            │  - 人物关系图│
│      │        │  (文本 / 大纲 / 3D视图) │  - 设定集    │
└──────┴────────┴────────────────────────┴──────────────┘
```

- 点右侧内容树任意项 → 中间顶部新增 tab
- 多 tab 并存，点 tab 切换工作区
- 3D 关系图作为 tab 打开时，工作区变为 3D 全屏视图，底部时间轴 scrubber

---

## 2. 整体架构

```
┌──────────────────────────────────────────────────────┐
│                   前端 (Vue 3 + TS)                   │
│  四栏布局 / Tab系统 / CodeMirror编辑器 / 3D关系图视图   │
└──────────────┬─────────────────────────┬─────────────┘
               │ REST/WS                  │ LLM 编排
┌──────────────▼─────────────────────────▼─────────────┐
│              后端 (Spring Boot)                        │
│  章节CRUD / 大纲生成 / 实体关系抽取 / 时间索引计算      │
└──────────────┬─────────────────────────┬─────────────┘
               │                          │
       ┌───────▼────────┐         ┌───────▼────────┐
       │  SQLite(IDB)   │         │  LLM API       │
       │ (章节/大纲/设定)│         │ (GLM/DeepSeek) │
       └────────────────┘         └────────────────┘
```

### 2.1 前后端职责

- **前端**：UI 渲染、3D 图渲染、本地草稿缓存（IndexedDB）、tab/视图切换
- **后端**：数据持久化、LLM 调用编排、实体关系抽取算法、重要性/时间索引计算
- **LLM 仅在后端调用**：避免前端泄露 key，且便于做缓存与限流

---

## 3. 技术选型

### 3.1 整体选型

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 前端框架 | Vue 3 + TypeScript + Vite | 贴合用户技术栈，生态成熟 |
| UI 组件 | Element Plus / Naive UI | 都支持 Vue 3，Naive 更轻 |
| 编辑器 | CodeMirror 6 | 比 Monaco 轻，移动端友好，扩展强 |
| 状态管理 | Pinia | Vue 3 官方推荐 |
| 3D 关系图 | **3d-force-graph**（见 3.2） | 专为关系图设计，力导向+WebGL |
| 后端 | Spring Boot 3 + Java 17 | 贴合用户技术栈；若判定纯单机可改轻量方案（见 D2/D4）|
| ORM | MyBatis-Plus | 国内主流，灵活，兼容 SQLite/PG |
| 数据库 | SQLite 为主；可选云同步用 PostgreSQL | 跟随 D4：单机免安装、零依赖；仅启用可选云同步时才需 PG |
| LLM | GLM-4 优先，其次 DeepSeek（V4-flash）/ 通义 / GPT | 通用可切换；国内优先 GLM-4、DeepSeek |

### 3.2 3D 视图选型（重点）

#### 候选对比

| 方案 | 力导向 | 3D 支持 | 关系图专用 | 性能 | 文字标签 | 学习成本 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **3d-force-graph** | ✅ 内置 d3-force-3d | ✅ 原生 three.js | ✅ | WebGL，万节点可接受 | ✅ sprite 标签 | 低 | **采用** |
| React Three Fiber | 需自写 | ✅ | ❌ 通用 | WebGL | 需自写 | 中 | 不采用 |
| three.js 原生 | 需自写 | ✅ | ❌ | WebGL | 需自写 | 高 | 不采用 |
| Cytoscape.js | ✅ | ❌ 仅 2D | ✅ | 一般 | ✅ | 中 | 不采用（要 3D） |
| D3.js | ✅ | ❌ 2D 为主 | ❌ | SVG 慢 | ✅ | 中 | 不采用 |

#### 最终选型：`3d-force-graph`

**理由**：
1. **专为关系图设计**：自带力导向布局（基于 `d3-force-3d`），节点自动散开，无需自己写物理引擎
2. **真 3D**：基于 three.js，可旋转/缩放/平移，符合「3D 非平面」需求
3. **节点/边高度可定制**：
   - 节点大小 → 重要性权重
   - 节点颜色 → 人物/势力类型区分
   - 边颜色/粗细 → 关系类型（从属/敌对/亲属）
   - 边方向 → 箭头表示从属方向
4. **文字标签**：用 `three-spritetext` 库渲染节点名称
5. **性能**：WebGL 渲染，万级节点可流畅（网文人物一般几百级，绰绰有余）
6. **交互完善**：内置 hover 高亮、点击聚焦、缩放，开发量小

**封装要点**：
- 包一层 `RelationGraph.vue` 组件，接收图数据 + 当前时间轴章节
- 势力作为「父节点」，人物挂靠势力（用同色或聚簇布局）
- 时间轴模式：按 `firstSort` 过滤可见节点，配合渐入动画
- 节点点击 → 右侧弹出该人物/势力档案

**备选/降级方案**：若 3D 可读性不足（节点过多糊成一团），加「按势力聚类折叠」「重要性阈值过滤」「2D 投影切换」开关。

---

## 4. 数据模型（重点）

### 4.1 模型总览

```
Work(作品)
 ├── Chapter(章节) ──→ OutlineNode(大纲节点)
 ├── Outline(大纲树)
 ├── Character(人物)
 ├── Faction(势力)
 ├── Relationship(关系，带时间维度)
 └── EntityTimeline(实体时间索引)
```

### 4.2 核心表设计（SQLite 为主，兼容 PostgreSQL 可选云同步）

> D4 决策：单机 SQLite。以下 `jsonb`/`bigserial` 等为 PG 术语；落 SQLite 时 `jsonb → JSON`、`bigserial → INTEGER PRIMARY KEY (AUTOINCREMENT)`，字段语义不变。启用可选云同步时才映射回 PG。

#### 4.2.1 作品 work

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigserial PK | |
| title | varchar(200) | 作品名 |
| genre | varchar(50) | 类型（玄幻/都市…） |
| summary | text | 简介 |
| created_at / updated_at | timestamp | |

#### 4.2.2 章节 chapter

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigserial PK | |
| work_id | bigint FK | |
| volume_no | int | 分卷号 |
| sort_order | int | 章内排序（**唯一稳定坐标，作为时间轴基准**）|
| title | varchar(200) | |
| content | text | 正文 |
| word_count | int | |
| status | smallint | 0草稿 1完成 2已分析 |
| analyzed_at | timestamp | 最后一次 AI 分析时间 |

> **时间轴坐标设计（修订）**
> 原以 `chapter_no` 作坐标，但写作时**插入/删改章节会导致章节序号漂移**——在第 10 章前插一章后，原第 11 章变第 12 章，所有引用它的出场/关系记录都会错位。
>
> **改用 `sort_order` 作稳定坐标**：`sort_order` 是唯一且可变更的排序字段（复用第 9 节决策「不插入不改动」场景可直接当章节号）。约束：
> 1. `(work_id, sort_order)` 唯一；段落/大纲/实体时间索引一律存 `sort_order` 而非 `chapter_no`。
> 2. 插入/删除时仅批量重排受影响区间的 `sort_order`，一次性执行，保持紧凑（1,2,3…）。
> 3. 前端展示的「第 N 章」由 `sort_order` 直接得出，后端不再维护独立的 `chapter_no`。
> 4. 若插入后仍未重排（草稿态），`sort_order` 允许跳值（如用 10,20,30 预留空隙），重排功能提供「一键压实」。
> 5. 历史记录（`entity_appearance` 出场章等）依赖的坐标统一存 `sort_order`，重排时事务内同步更新。

#### 4.2.3 大纲节点 outline_node（树形）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigserial PK | |
| work_id | bigint FK | |
| parent_id | bigint | 父节点（总纲→分卷纲→章纲）|
| level | smallint | 0总纲 1分卷纲 2章纲 |
| ref_sort_order | int | 关联章节（章纲用，即 chapter 的 sort_order）|
| title | varchar(200) | |
| content | text | 大纲正文 |
| sort_order | int | 同级排序 |

#### 4.2.4 人物 character

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigserial PK | |
| work_id | bigint FK | |
| name | varchar(100) | |
| aliases | jsonb | 别名列表 `["小明","明哥"]` |
| faction_id | bigint | 当前所属势力（最新）|
| role | varchar(50) | 主角/配角/反派/路人 |
| description | text | 简介 |
| avatar_color | varchar(20) | 3D 节点颜色 |
| importance | float | 重要性 0~1（影响节点大小）|
| first_sort_order | int | 首次出场坐标（chapter 的 sort_order）|
| last_active_sort_order | int | 最后活跃坐标 |
| status | varchar(20) | 存活/死亡/退场 |
| confirmed | bool | 人工确认过（应对 AI 幻觉）|

> `importance` 由后端综合计算：出场频次 + 角色权重 + AI 评估，可人工修正。
> `faction_id` 存「最新」势力，历史归属在 `faction_membership` 表追踪。

#### 4.2.5 势力 faction

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigserial PK | |
| work_id | bigint FK | |
| name | varchar(100) | |
| parent_faction_id | bigint | 上级势力（势力可嵌套）|
| type | varchar(30) | 门派/国家/家族/组织 |
| description | text | |
| color | varchar(20) | 3D 聚簇颜色 |
| importance | float | 势力重要性 |
| first_sort_order | int | 首次出场坐标 |
| last_active_sort_order | int | 最后活跃坐标 |

#### 4.2.6 关系 relationship（核心，带时间维度）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigserial PK | |
| work_id | bigint FK | |
| from_id | bigint | 起点实体ID |
| from_type | varchar(10) | character / faction |
| to_id | bigint | 终点实体ID |
| to_type | varchar(10) | character / faction |
| rel_type | varchar(30) | 见下方枚举 |
| strength | float | 关系强度 0~1（影响边粗细）|
| start_sort_order | int | 关系开始（chapter 的 sort_order）|
| end_sort_order | int | 关系结束（null=持续至今）|
| note | varchar(200) | 备注（如"师徒""叛变"）|
| confirmed | bool | 人工确认 |

**rel_type 枚举**（前端按类型染色）：

| 类型 | 说明 | 边颜色 | 方向 |
| --- | --- | --- | --- |
| belong_to | 从属（人物→势力 / 势力→上级势力）| 灰 | 有向 |
| ally | 结盟 | 绿 | 无向 |
| enemy | 敌对 | 红 | 无向 |
| kinship | 亲属 | 金 | 无向 |
| master_disciple | 师徒 | 蓝 | 有向 |
| lover | 情侣 | 粉 | 无向 |
| subordinate | 上下级 | 橙 | 有向 |
| custom | 自定义 | 紫 | - |

> 时间轴视图按当前章节坐标 `C`（= 该章 `sort_order`）过滤：`start_sort_order <= C AND (end_sort_order IS NULL OR end_sort_order >= C)`。
> 人物叛变 = 旧 `belong_to` 关系 `end_sort_order` 设为叛变章坐标 + 新增 `belong_to` 关系。

#### 4.2.7 势力归属历史 faction_membership（追踪人物势力变化）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigserial PK | |
| character_id | bigint FK | |
| faction_id | bigint FK | |
| join_sort_order | int | 加入坐标 |
| leave_sort_order | int | 离开坐标（null=仍在）|
| role_in_faction | varchar(50) | 职务（长老/弟子…）|

> 与 `relationship(belong_to)` 互补：relationship 给图渲染用，membership 给历史追溯用。可由 membership 自动生成 belong_to 关系。

#### 4.2.8 实体出场记录 entity_appearance（重要性计算 + 时间轴依据）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | bigserial PK | |
| work_id | bigint FK | |
| entity_id | bigint | 人物/势力ID |
| entity_type | varchar(10) | character / faction |
| sort_order | int | 出场坐标（chapter 的 sort_order）|
| mention_count | int | 本章提及次数 |
| is_major | bool | 本章是否重要戏份 |

> 用于：① 计算重要性权重；② 时间轴模式下决定节点在该章是否「活跃高亮」。
> `importance` 计算公式（后端定时跑）：
> `importance = 0.5 * 角色权重(主角1/配角0.6/反派0.8/路人0.3) + 0.3 * 归一化出场频次 + 0.2 * 最近N章活跃度`

### 4.3 图数据组装（喂给 3d-force-graph）

后端提供接口 `GET /works/{id}/graph?mode=god|timeline&sort=S`，返回：

```json
{
  "nodes": [
    {
      "id": "c-12", "type": "character", "name": "林动",
      "factionId": "f-3", "factionName": "元门",
      "importance": 0.85, "color": "#5b8ff9",
      "size": 17, "alive": true, "firstSort": 1, "lastActiveSort": 120
    },
    {
      "id": "f-3", "type": "faction", "name": "元门",
      "importance": 0.9, "color": "#5b8ff9", "size": 22,
      "parentFactionId": "f-1"
    }
  ],
  "links": [
    {
      "source": "c-12", "target": "f-3",
      "type": "belong_to", "color": "#aaa",
      "width": 2, "directed": true, "label": "弟子",
      "startSort": 1, "endSort": null
    }
  ],
  "meta": { "totalCharacters": 45, "totalFactions": 8, "currentSort": 50 }
}
```

**节点大小映射**：`size = 5 + importance * 25`（最小5，最大30）
**势力聚簇**：同 `factionId` 的人物用同色，力导向加 `cluster` 力让同势力聚拢。

---

## 5. 关键模块设计

### 5.1 AI 大纲生成

**流程**：
1. 用户在 AI 栏点「生成大纲」→ 选择范围（全书/某卷/某章）
2. 后端取对应章节正文，分批送 LLM（长文切片）
3. Prompt 要求输出 JSON 结构（总纲/分卷纲/章纲三层）
4. 结果写入 `outline_node`，与现有合并（按 `ref_sort_order` 去重）
5. 大纲作为文件出现在右侧内容树「大纲」分类下

**增量更新**：只取 `analyzed_at` 之后新增/修改的章节重跑，避免全量。

**Prompt 骨架**（后端模板）：
```
你是网文大纲整理助手。阅读以下章节，输出结构化大纲 JSON：
{
  "outline": [
    { "level": 1, "title": "分卷名", "content": "...",
      "children": [ { "level": 2, "refChapter": 1, "title": "章纲", "content": "..." } ] }
  ]
}
要求：章纲关联到具体章节号；提取核心冲突与人物动向；不要编造未发生剧情。
章节内容：
{chapters}
```

### 5.2 人物/势力关系抽取

**触发**：章节状态置为「完成」后手动点「分析本章」，或批量分析。

**流程**：
1. 后端取该章正文 + 已知实体列表（避免新人物重复创建）
2. Prompt 要求 LLM 输出：新人物、新势力、关系变化、势力归属变化
3. 结果入库：
   - 新人物 → `character`，`first_sort_order` = 本章坐标
   - 新势力 → `faction`
   - 关系 → `relationship`（带 `start_sort_order`）
   - 归属 → `faction_membership`
   - 出场 → `entity_appearance`
4. 所有结果 `confirmed=false`，前端在右侧内容树标红，用户可修正

**Prompt 骨架**：
```
已知实体（避免重复创建）：
人物：{characters}
势力：{factions}
阅读本章，输出 JSON：
{
  "newCharacters": [{ "name":"", "aliases":[], "faction":"", "role":"", "desc":"" }],
  "newFactions":  [{ "name":"", "parent":"", "type":"", "desc":"" }],
  "relationships":[{ "from":"", "to":"", "type":"belong_to|ally|enemy|...", "strength":0.5, "note":"" }],
  "membershipChanges":[{ "character":"", "faction":"", "action":"join|leave", "role":"" }],
  "appearances": [{ "entity":"", "mentionCount":5, "isMajor":true }]
}
章节内容：
{chapter}
```

### 5.3 3D 关系图视图

**组件**：`RelationGraph.vue`，封装 `3d-force-graph`

**Props**：
- `mode`: `'god' | 'timeline'`
- `currentSort`: number（timeline 模式，当前章节坐标）
- `filterFactionId?`: 高亮/聚焦某势力

**功能**：
- 节点 hover → 高亮其所有关系边 + 显示 tooltip
- 节点点击 → 右侧抽屉显示人物/势力档案（含出场章节列表）
- 滚轮缩放、拖拽旋转
- 底部时间轴 scrubber（timeline 模式）：拖动改变 `currentSort`，节点/边渐入渐出
- 顶部工具栏：切换 god/timeline、按势力过滤、重要性阈值滑块、2D/3D 投影切换、重新布局

**性能**：节点 > 500 时开启 LOD（远处节点不渲染标签），按势力折叠子图。

### 5.4 四栏布局 + Tab 系统

- 用 Vue Router 或自管理 tab 状态（Pinia）
- `openTabs: Tab[]`，每 tab = `{ id, type: 'chapter'|'outline'|'graph'|'setting', refId, title }`
- 工作区根据 `activeTab.type` 渲染对应组件
- 支持关闭、右键关闭其他、拖拽排序（可后续迭代）
- 编辑器组件复用，按 `refId` 加载内容；3D 图组件单例（切 tab 保留状态）

---

## 6. 接口设计（核心）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /works | 作品列表（最左栏）|
| POST | /works | 新建作品 |
| GET | /works/{id}/tree | 右侧内容树（章节+大纲+图入口）|
| GET | /chapters/{id} | 取章节正文 |
| PUT | /chapters/{id} | 保存章节 |
| POST | /ai/outline | 生成大纲 `{workId, scope}` |
| POST | /ai/analyze-chapter | 分析单章 `{chapterId}` |
| POST | /ai/analyze-batch | 批量分析 `{workId, fromSort, toSort}` |
| GET | /works/{id}/graph | 图数据 `?mode=&sort=` |
| GET | /characters/{id} | 人物档案 |
| PUT | /characters/{id} | 修正人物 |
| PUT | /relationships/{id}/confirm | 确认关系 |

---

## 7. MVP 范围与迭代规划（分层，每层可独立上线）

> 分层原则：先做出**能用的写作工具**，再验证关系图数据，最后上 3D。3D 关系图是**硬需求**（D5 决策），但通过分层保证每层都能独立上线、避免一上来同时啃编辑器、3D、时间轴三块硬骨头。

### M0 —— 核心写作工坊（第一可交付）
- 四栏布局（作品栏 / AI 栏 / 工作区 / 内容树）+ tab 系统
- 章节增删改查 + CodeMirror 编辑器
- 章节排序（`sort_order`）+ 插入/删除自动重排 + 「一键压实」
- 工坊数据本地持久化（SQLite，预留可选云同步接口，见 D2/D4）
- 交付标准：作者能正常新建作品、写/存/插入章节、切换 tab

### M1 —— 手动关系图（为 3D 打数据与交互基础）
- 手动建人物 / 势力 / 关系 + 归属（不上 AI）
- 先做 2D god 视图渲染，用于快速验证可读性与交互（**作为 M2 3D 的中间校验/兜底，非最终形态**）
- 节点/边按类型染色、节点 size 映射 importance、势力聚簇、hover 高亮、点击出档案
- 交付标准：能拼出一张清晰的出场关系图，图数据与交互在 2D 上验证通过后再整体替换为 3D

### M2 —— 3D 关系图 + 时间轴（硬需求）
- 在 M1 数据基础上替换为 `3d-force-graph` 3D 渲染，360° 旋转/缩放/平移
- 时间轴 scrubber 切换章节坐标 `currentSort` 过滤，节点/边渐入渐出
- 势力过滤、重要性阈值滑块、2D/3D 切换开关
- 降级保障（不改变硬需求）：若部署到低性能环境，保留 2D 投影/势力折叠/阈值过滤开关，确保图仍可读，但 3D 模式本身必须提供

### 第二阶段（AI 接入）
- 一键生成大纲
- 单章人物/关系抽取（带人工确认，`confirmed=false`）
- 重要性自动计算

### 第三阶段（打磨）
- 批量分析、增量更新
- 势力聚簇优化、LOD（若保留 3D）
- 关系版本化、叛变/死亡处理
- 本地草稿缓存、断网保护

---

## 7.5 工程落地基础（跨阶段）

- **schema 迁移**：引入 Flyway（Spring Boot 侧）管理表结构演进，避免手工改表
- **测试策略**：后端实体抽取/坐标重排逻辑写单元测试；前端跑 Vue 组件冒烟测试；AI 输出用 JSON Schema 校验后入库
- **分发方式**：待第 9 节确定单机/多用户后决定打包形态（单机桌面 → 内置 DB + 安装包；多设备 → 服务端部署）
- **后台任务**：重要性计算用 Spring `@Scheduled` 定时跑，配置可关（单机场景默认手动触发）

---

## 8. 风险与对策

| 风险 | 对策 |
| --- | --- |
| AI 抽取幻觉 | 所有结果 `confirmed=false`，前端标红人工确认；提供「忽略此人」 |
| 3D 节点过密不可读 | **3D 是硬需求**（D5），但保留降级保障：势力折叠、重要性阈值过滤、2D 投影切换，确保低性能环境下图仍可读 |
| 关系随时间复杂变化 | relationship 带 start/end 坐标（`start_sort_order/end_sort_order`）；叛变=旧关系结束+新关系开始 |
| LLM 成本/延迟 | 增量分析、结果缓存、长文切片、可配置模型 |
| 长篇性能 | entity_appearance 索引、图数据按章节预计算缓存 |
| **章节插入/删除导致坐标漂移** | `(work_id, sort_order)` 唯一；排序独立于业务展示，重排用事务批量更新并同步历史坐标 |

---

## 9. 待确认决策清单

> 以下决策会直接影响架构与 M0 实现。**已标记 ✅ 的为本轮已确认项**；其余待后续拍板。

- [✅] **D1 分析触发方式**：写完一章手动触发分析（推荐）——已确认
- [✅] **D2 部署形态 / 多用户**：**单机为主，预留可选云同步**——已确认；架构上以本地 SQLite 为唯一数据源，预留同步插件接口（不强制服务端）
- [✅] **D3 LLM 厂商**：通用可切换，**优先 GLM-4，其次 DeepSeek（V4-flash）**，兼通义 / GPT——已确认
- [✅] **D4 存储选型**：单机 SQLite 为主；云同步时若启用可选服务端则用 PostgreSQL（跟随 D2 预留）
- [✅] **D5 3D 是否必须**：**3D 关系图是硬需求**，直接进入 M2——已确认（M1 的 2D 仅作中间校验/兜底）
- [✅] **D6 MVP 分层认可**：采用 **M0/M1/M2 分层**——已确认

> 备注：D2/D3/D4 相互关联。D1、D2、D3、D5、D6 已确认；后续若需补云端/多用户能力，再细化同步方案。
