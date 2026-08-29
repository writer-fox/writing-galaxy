# 写作星河 · 开发指南

> 面向网文作者的写作辅助工具:章节编辑 + 一键大纲 + 3D 人物/势力关系图(上帝视角 + 时间轴)。
> 本指南面向开发者:如何构建、运行、扩展,以及当前迭代的并行开发计划。

---

## 1. 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | Vue 3 + TypeScript + Vite + Pinia | 四栏布局 / tab / 双主题 / CodeMirror 6 / 3d-force-graph |
| 后端 | Spring Boot 3.2 + Java 17 | JdbcTemplate(对齐 SQLite 单机零摩擦,暂不引 ORM) |
| 数据库 | SQLite(JDBC,单文件 `backend/data/writer.db`) | 单机为主;可选云同步时再上 PostgreSQL |
| LLM | GLM-4 优先 / DeepSeek 次之(provider 抽象,可配置) | 未配 key 时接口返回明确提示,不阻塞非 AI 功能 |

## 2. 目录结构

```
写作星河/
├── 技术方案.md        # 产品/数据模型/接口契约(权威)
├── UI设计文档.md       # 设计规范(tokens/布局/交互)
├── DEVELOP.md         # 本文档
├── backend/           # Spring Boot + SQLite
│   ├── pom.xml        # Maven(mvnw wrapper 自带)
│   └── src/main/java/com/writer/
│       ├── controller/  # REST 接口
│       ├── service/     # 业务逻辑(sort_order 重排等)
│       ├── dao/         # JdbcTemplate 数据访问
│       ├── model/       # record 模型 + 请求体
│       └── config/      # SqliteBootstrap / DemoDataSeeder
└── ui/
    ├── prototype/     # 早期静态原型(设计参照,已弃用)
    └── writer-app/    # Vite + Vue3 + TS 前端工程
        └── src/
            ├── api.ts           # 后端 REST 客户端(唯一出口)
            ├── stores/          # Pinia:data(章节)/graph/tabs/theme/persistence
            ├── components/      # 布局组件 + panes(编辑器/大纲/关系图)
            └── composables/     # 布局拖拽
```

## 3. 构建与运行

### 3.1 后端

```bash
cd backend
./mvnw.cmd -DskipTests package          # 打 jar(首次需网络拉依赖)
java -jar target/writer-backend.jar      # 启动,监听 8080
```

- 数据文件 `backend/data/writer.db` 首次启动自动建库;`schema.sql` 幂等。
- `DemoDataSeeder` 在库空时写入示例作品「大泽界」+ 人物/势力/关系,便于联调。

### 3.2 前端

```bash
cd ui/writer-app
npm install        # 首次
npm run dev        # 开发服务器 http://localhost:5173(后端需已启动)
npm run build      # 生产构建(vue-tsc 类型检查 + vite build,必须全绿)
```

- 后端地址由 `VITE_API_BASE` 环境变量覆盖,默认 `http://localhost:8080`。
- 前端**不做 mock 兜底**:后端不可用时明确报错提示(除 3D 图演示保留了 mock 分支)。

### 3.3 依赖工具

- Maven 本地副本 `.tools/apache-maven-3.9.9`(仓库内不提交);`mvnw` wrapper 优先。
- Node 20+ / npm 10+。

## 4. 架构与数据流

```
前端(Vue3) ── REST ──> 后端(Spring Boot) ──> SQLite
    ▲                     │
    └──── 3D 图数据 <─────┘  /works/{id}/graph?mode=god|timeline&sort=N
```

- **sort_order 是唯一稳定坐标**:章节插入/删除后事务内全量紧凑重排为 1,2,3…;人物出场、关系起止、章纲关联全部以 `sort_order` 索引(对齐方案 4.2,禁止再用 `chapter_no`)。
- **数据所有权在后端**:前端不持久化业务数据,localStorage 仅存 UI 偏好(主题/tab)。
- **LLM 仅后端调用**:避免 key 泄露,前端只调 `/api/ai/*`。

## 5. API 契约(已实现 + 迭代目标)

| 方法 | 路径 | 状态 |
| --- | --- | --- |
| GET/POST | `/api/works`、`/api/works/{id}` | ✅ |
| GET | `/api/works/{id}/tree` | ✅ 章节树 |
| GET/POST/PUT/DELETE | `/api/chapters[/{id}]` | ✅ 含 sort_order 重排 |
| GET | `/api/works/{id}/graph?mode=&sort=` | ✅ god/timeline |
| GET/POST | `/api/works/{id}/characters` | 🚧 迭代 |
| PUT/DELETE | `/api/characters/{id}` | 🚧 迭代 |
| GET/POST | `/api/works/{id}/factions` | 🚧 迭代 |
| PUT/DELETE | `/api/factions/{id}` | 🚧 迭代 |
| GET/POST | `/api/works/{id}/relationships` | 🚧 迭代 |
| PUT | `/api/relationships/{id}/confirm` | 🚧 迭代 |
| GET/POST | `/api/works/{id}/outline` | 🚧 迭代 |
| PUT/DELETE | `/api/outline/{id}` | 🚧 迭代 |
| POST | `/api/ai/outline` | 🚧 迭代(provider 骨架) |
| POST | `/api/ai/analyze-chapter` | 🚧 迭代(provider 骨架) |

> 响应格式与图数据 JSON 严格对齐 `技术方案.md` 第 4.3 节;关系 `rel_type` 枚举、颜色映射见方案 4.2.6。

## 6. 开发约定

1. **命名**:后端 record 模型 + `CreateXxxRequest` 请求体;DAO 用 `JdbcTemplate` + 静态 `RowMapper`;Controller 统一 `@CrossOrigin("*")` + `ResponseEntity<?>` 处理 404/400。
2. **错误处理**:缺失资源返回 `404`;参数非法返回 `400` + `{"message": "…"}`;不做全局异常拦截,保持简单。
3. **事务**:涉及重排/级联的操作加 `@Transactional`(如 `ChapterService.renumber`)。
4. **SQLite 兼容**:`BIGINT` 列可能返回 `Integer`,DAO 统一走 `GraphDao.oL()` 式的安全转换;布尔用 `INTEGER 0/1`。
5. **前端**:数据访问只经 `api.ts`;Pinia store 持状态;组件内不直接 fetch。
6. **类型安全**:`npm run build`(vue-tsc)必须零错误——未使用的导入、隐式 any 都要清掉。
7. **提交**:小而语义化 commit(feat:/fix:),改动后跑构建验证再提交。

## 7. 当前迭代计划(并行分组)

```
组① 后端(互相零依赖,可并行)
  A1 人物/势力/关系 CRUD      → 新文件 CastDao/CastController + 请求模型
  A2 大纲 outline CRUD        → 新文件 OutlineDao/OutlineController + 请求模型
  A3 AI provider + 接口骨架    → 新文件 llm/Provider 抽象 + AiController

组② 前端(不依赖 A1-A3,立即开工)
  B1 api.ts 补全全部接口       → 按方案契约先写死,与后端并行
  B2 作品库面板(列表/新建/切换)+ 章节数据切后端 → 替换静态按钮/localStorage

组③ 前端(依赖组①接口就绪)
  B3 设定集面板:人物/势力/关系管理(增删改/确认),联动 3D 图
  B4 大纲视图接后端 + AI 面板接后端

组④ 联调
  C1 全链路冒烟 → C2 mvn package + npm run build 全绿 → C3 提交推送
```

**串行瓶颈**:B3/B4 等 A1/A2/A3;C1 等全部。组①②可完全错开等待。

## 8. 验收标准(联调冒烟清单)

1. 新建作品 → 出现在作品库;切换作品,内容树跟随。
2. 新建章节(尾部/指定位置插入)→ sort_order 自动压实;编辑标题/正文保存后重开仍在。
3. 手动新建人物/势力/关系 → 3D 图出现对应节点/边;确认/删除后图随之更新。
4. 时间轴拖动 → 节点/边按出场坐标渐入渐出。
5. 大纲视图展示三层树;AI「生成大纲/分析本章」在未配 key 时返回明确提示,不崩溃。
6. `npm run build` 零错误;`mvn -DskipTests package` 成功;后端冒烟脚本全部 2xx。
