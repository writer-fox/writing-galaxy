package com.writer.config;

import com.writer.dao.WorkDao;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 演示数据种子：首次启动（库中无任何 character）时，插入一个示例作品、若干章节、
 * 人物/势力/关系，便于前后端联调与验证 3D 关系图。生产可移除本类。
 */
@Component
public class DemoDataSeeder implements CommandLineRunner {

    private final JdbcTemplate jdbc;
    private final WorkDao workDao;

    public DemoDataSeeder(JdbcTemplate jdbc, WorkDao workDao) {
        this.jdbc = jdbc;
        this.workDao = workDao;
    }

    @Override
    public void run(String... args) {
        Integer charCount = jdbc.queryForObject("SELECT COUNT(*) FROM character", Integer.class);
        if (charCount != null && charCount > 0) return;

        // 作品
        long wid = insertWork("大泽界", "玄幻", "少年林动从宗门沉沦到逆命崛起的画卷。");

        // 章节（1..3）
        insertChapter(wid, 1, "风起", "风从未知的北方来。");
        insertChapter(wid, 2, "叛门", "夜色像一匹浸了墨的绢帛。");
        insertChapter(wid, 3, "反目", "四长老的指印落下。");

        // 势力
        long f1 = insertFaction(wid, "元门", null, "门派", "执掌契约的大宗门", "#4f9df0", 0.9, 1);
        long f2 = insertFaction(wid, "大泽界", null, "组织", "散修联盟", "#d9b64c", 0.7, 3);
        long f3 = insertFaction(wid, "应家", f1, "家族", "元门内的簪缨世家", "#5e8ad6", 0.5, 1);
        long f4 = insertFaction(wid, "刑律堂", f1, "组织", "执掌戒律", "#a86ce0", 0.5, 2);

        // 人物
        long c1 = insertChar(wid, "林动", f1, "主角", "#1f8f6e", 0.85, 1);
        long c2 = insertChar(wid, "应无涯", f3, "配角", "#5e8ad6", 0.6, 1);
        long c3 = insertChar(wid, "四长老", f1, "反派", "#c05656", 0.7, 2);
        long c4 = insertChar(wid, "青萝", f3, "配角", "#d987a6", 0.45, 3);

        // 关系
        insertRel(wid, c1, "character", f1, "faction", "belong_to", 0.8, 1, null);
        insertRel(wid, c1, "character", c2, "character", "master_disciple", 0.7, 1, null);
        insertRel(wid, c3, "character", c1, "character", "enemy", 0.6, 2, null);
        insertRel(wid, c3, "character", f4, "faction", "belong_to", 0.9, 2, null);
        insertRel(wid, f1, "faction", f4, "faction", "subordinate", 0.9, 2, null);
        insertRel(wid, c2, "character", f3, "faction", "belong_to", 0.9, 1, null);
        insertRel(wid, f3, "faction", f1, "faction", "belong_to", 0.95, 1, null);
        insertRel(wid, c1, "character", c4, "character", "lover", 0.6, 3, null);
        insertRel(wid, c4, "character", f2, "faction", "belong_to", 0.8, 3, null);
        insertRel(wid, c1, "character", f2, "faction", "ally", 0.5, 3, null);
    }

    private long insertWork(String title, String genre, String summary) {
        return workDao.insert(title, genre, summary);
    }

    private void insertChapter(long wid, int order, String title, String content) {
        jdbc.update("INSERT INTO chapter(work_id, sort_order, title, content, status) VALUES(?,?,?,?,1)",
                wid, order, title, content);
    }

    private long insertFaction(long wid, String name, Long parent, String type, String desc, String color,
                               double imp, int first) {
        jdbc.update("INSERT INTO faction(work_id, name, parent_faction_id, type, description, color, importance, first_sort_order)"
                + " VALUES(?,?,?,?,?,?,?,?)", wid, name, parent, type, desc, color, imp, first);
        return lastId();
    }

    private long insertChar(long wid, String name, Long factionId, String role, String color,
                            double imp, int first) {
        jdbc.update("INSERT INTO character(work_id, name, faction_id, role, avatar_color, importance, first_sort_order)"
                + " VALUES(?,?,?,?,?,?,?)", wid, name, factionId, role, color, imp, first);
        return lastId();
    }

    private void insertRel(long wid, long fromId, String fromType, long toId, String toType,
                           String relType, double strength, int start, Integer end) {
        jdbc.update("INSERT INTO relationship(work_id, from_id, from_type, to_id, to_type, rel_type, strength,"
                        + " start_sort_order, end_sort_order, confirmed) VALUES(?,?,?,?,?,?,?,?,?,1)",
                wid, fromId, fromType, toId, toType, relType, strength, start, end);
    }

    private long lastId() {
        return jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
    }
}
