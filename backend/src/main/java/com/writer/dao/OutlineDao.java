package com.writer.dao;

import com.writer.model.OutlineNode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

/** 大纲（outline_node 三层树）CRUD */
@Repository
public class OutlineDao {

    private final JdbcTemplate jdbc;

    public OutlineDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static Long oL(ResultSet rs, String col) throws SQLException {
        Object o = rs.getObject(col);
        return o == null ? null : ((Number) o).longValue();
    }

    private static final RowMapper<OutlineNode> MAPPER = (rs, i) -> new OutlineNode(
        rs.getLong("id"),
        rs.getLong("work_id"),
        oL(rs, "parent_id"),
        rs.getInt("level"),
        oL(rs, "ref_sort_order") == null ? null : oL(rs, "ref_sort_order").intValue(),
        rs.getString("title"),
        rs.getString("content"),
        rs.getInt("sort_order")
    );

    public List<OutlineNode> listByWork(Long workId) {
        return jdbc.query("SELECT * FROM outline_node WHERE work_id=? ORDER BY sort_order, id", MAPPER, workId);
    }

    public Optional<OutlineNode> findById(Long id) {
        List<OutlineNode> rows = jdbc.query("SELECT * FROM outline_node WHERE id=?", MAPPER, id);
        return rows.stream().findFirst();
    }

    public Long insert(Long workId, Long parentId, int level, Integer refSortOrder,
                       String title, String content, int sortOrder) {
        jdbc.update("INSERT INTO outline_node(work_id, parent_id, level, ref_sort_order, title, content, sort_order)"
                + " VALUES(?,?,?,?,?,?,?)",
            workId, parentId, level, refSortOrder, title, content, sortOrder);
        return lastId();
    }

    public void update(Long id, Long parentId, int level, Integer refSortOrder,
                       String title, String content, int sortOrder) {
        jdbc.update("UPDATE outline_node SET parent_id=?, level=?, ref_sort_order=?, title=?, content=?, sort_order=?"
                + " WHERE id=?", parentId, level, refSortOrder, title, content, sortOrder, id);
    }

    public void delete(Long id) {
        // 级联：先删子节点（章纲/分卷），再删自身
        jdbc.update("DELETE FROM outline_node WHERE parent_id=?", id);
        jdbc.update("DELETE FROM outline_node WHERE id=?", id);
    }

    /** 同级下一个可用 sort_order（max+1） */
    public int nextSortOrder(Long workId) {
        Integer m = jdbc.queryForObject("SELECT COALESCE(MAX(sort_order),0) FROM outline_node WHERE work_id=?",
            Integer.class, workId);
        return m + 1;
    }

    private long lastId() {
        return jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
    }
}
