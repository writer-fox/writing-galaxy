package com.writer.dao;

import com.writer.model.Chapter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class ChapterDao {

    private final JdbcTemplate jdbc;

    public ChapterDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final RowMapper<Chapter> MAPPER = (rs, i) -> {
        try {
            return new Chapter(
                rs.getLong("id"),
                rs.getLong("work_id"),
                rs.getInt("sort_order"),
                rs.getString("title"),
                rs.getString("content"),
                rs.getInt("word_count"),
                rs.getInt("status"),
                rs.getString("analyzed_at")
            );
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    };

    public List<Chapter> listByWork(Long workId) {
        return jdbc.query(
            "SELECT * FROM chapter WHERE work_id=? ORDER BY sort_order", MAPPER, workId);
    }

    public Optional<Chapter> findById(Long id) {
        List<Chapter> rows = jdbc.query("SELECT * FROM chapter WHERE id=?", MAPPER, id);
        return rows.stream().findFirst();
    }

    /** 追加末尾：order = 现有最大 order + 1 */
    public int appendOrder(Long workId) {
        Integer max = jdbc.queryForObject(
            "SELECT COALESCE(MAX(sort_order), 0) FROM chapter WHERE work_id=?", Integer.class, workId);
        return (max == null ? 0 : max) + 1;
    }

    public Long insert(Long workId, String title, int sortOrder) {
        jdbc.update(
            "INSERT INTO chapter(work_id, sort_order, title, content, status) VALUES(?,?,?, '', 0)",
            workId, sortOrder, title);
        return jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
    }

    public void updateOrder(Long id, int newOrder) {
        jdbc.update("UPDATE chapter SET sort_order=? WHERE id=?", newOrder, id);
    }

    /**
     * 把某作品所有章节 order 取负，作为紧凑重排第一阶段。
     * 正负互不冲突，避免逐条更新时撞 (work_id, sort_order) 唯一约束。
     */
    public void negateOrders(Long workId) {
        jdbc.update("UPDATE chapter SET sort_order = -sort_order WHERE work_id=?", workId);
    }

    public void shiftUpAfter(Long workId, int fromOrder) {
        // 供重排使用：把 >= from 的所有 order +1（插入时腾位）
        jdbc.update(
            "UPDATE chapter SET sort_order = sort_order + 1 WHERE work_id=? AND sort_order >= ?",
            workId, fromOrder);
    }

    public void shiftDownAfter(Long workId, int fromOrder) {
        // 供删除重排：把 > from 的所有 order -1（删除后压实）
        jdbc.update(
            "UPDATE chapter SET sort_order = sort_order - 1 WHERE work_id=? AND sort_order > ?",
            workId, fromOrder);
    }

    public int updateContent(Long id, String title, String content, Integer status) {
        return jdbc.update(
            "UPDATE chapter SET title=?, content=?, word_count=?, status=?, analyzed_at=datetime('now') WHERE id=?",
            title, content, content == null ? 0 : content.length(), status == null ? 0 : status, id);
    }

    public boolean delete(Long id) {
        return jdbc.update("DELETE FROM chapter WHERE id=?", id) > 0;
    }

    public int maxOrder(Long workId) {
        Integer max = jdbc.queryForObject(
            "SELECT COALESCE(MAX(sort_order), 0) FROM chapter WHERE work_id=?", Integer.class, workId);
        return max == null ? 0 : max;
    }
}
