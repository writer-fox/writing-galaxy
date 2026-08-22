# 写作星河 · 后端（Spring Boot + SQLite）

版本：Java 17 · Spring Boot 3.2.5 · SQLite（JDBC + JdbcTemplate）

## 技术选型说明

方案 3.1 原本选 **MyBatis-Plus** 作 ORM。实现时为对齐"SQLite 单机零摩擦"的目标，改用了
**Spring JDBC（JdbcTemplate）**：无 Hibernate/MyBatis 方言适配成本、`sort_order` 重排可用原生
SQL 事务直接表达。若后续需要复杂动态查询再引入 MyBatis-Plus 并不冲突。

## 构建与运行

```bash
# 首次用自带 Maven Wrapper（无需全局 mvn）
./mvnw.cmd -DskipTests package      # 打 jar
java -jar target/writer-backend.jar # 启动，监听 8080
```

- 数据文件：`backend/data/writer.db`（首次启动自动建库 + schema）。
- schema：`src/main/resources/schema.sql`（幂等，启动时执行）。

## 已实现接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/works` | 作品列表 |
| POST | `/api/works` | 新建作品 `{title, genre?, summary?}` |
| GET | `/api/works/{id}` | 作品详情 |
| GET | `/api/works/{id}/tree` | 内容树（该作品下章节，按 sort_order 升序）|
| GET | `/api/chapters/{id}` | 章节正文 |
| POST | `/api/chapters?workId={wid}` | 新建章节 `{title?, afterSortOrder?}`（afterSortOrder 省略=追加末尾）|
| PUT | `/api/chapters/{id}` | 更新章节 `{title?, content?, status?}` |
| DELETE | `/api/chapters/{id}?workId={wid}` | 删除章节 |

## sort_order 坐标设计（对齐方案 4.2）

- `(work_id, sort_order)` 唯一，`sort_order` 为稳定坐标（时间轴基准）。
- 插入/删除后**事务内全量紧凑重排**为 1,2,3…（两段式规避唯一约束：先整体取负，再逐条设为目标值）。
- 展示「第 N 章」由 `sort_order` 直接得出。

## 待办（后续迭代）

- 人物/势力/关系（`character/faction/relationship` 表已建，接口未实现）
- AI 大纲生成 / 单章关系抽取（接 LLM，key 由提供方配置）
- 图数据接口 `GET /works/{id}/graph`
