package com.writer.dao;

import com.writer.model.CharacterRow;
import com.writer.model.Faction;
import com.writer.model.Relationship;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

@Repository
public class GraphDao {

    private final JdbcTemplate jdbc;

    public GraphDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 可空的 BIGINT 列：SQLite 可能返回 Integer，安全转 Long */
    private static Long oL(ResultSet rs, String col) throws SQLException {
        Object o = rs.getObject(col);
        return o == null ? null : ((Number) o).longValue();
    }

    private static final RowMapper<CharacterRow> CHAR = (rs, i) -> new CharacterRow(
        rs.getLong("id"),
        rs.getLong("work_id"),
        rs.getString("name"),
        rs.getString("aliases"),
        oL(rs, "faction_id"),
        rs.getString("role"),
        rs.getString("description"),
        rs.getString("avatar_color"),
        rs.getDouble("importance"),
        rs.getInt("first_sort_order"),
        oL(rs, "last_active_sort_order") == null ? null : oL(rs, "last_active_sort_order").intValue(),
        rs.getString("status"),
        rs.getInt("confirmed") != 0
    );

    private static final RowMapper<Faction> FACTION = (rs, i) -> new Faction(
        rs.getLong("id"),
        rs.getLong("work_id"),
        rs.getString("name"),
        oL(rs, "parent_faction_id"),
        rs.getString("type"),
        rs.getString("description"),
        rs.getString("color"),
        rs.getDouble("importance"),
        rs.getInt("first_sort_order"),
        oL(rs, "last_active_sort_order") == null ? null : oL(rs, "last_active_sort_order").intValue()
    );

    private static final RowMapper<Relationship> REL = (rs, i) -> new Relationship(
        rs.getLong("id"),
        rs.getLong("work_id"),
        rs.getLong("from_id"),
        rs.getString("from_type"),
        rs.getLong("to_id"),
        rs.getString("to_type"),
        rs.getString("rel_type"),
        rs.getDouble("strength"),
        rs.getInt("start_sort_order"),
        oL(rs, "end_sort_order") == null ? null : oL(rs, "end_sort_order").intValue(),
        rs.getString("note"),
        rs.getInt("confirmed") != 0
    );

    public List<CharacterRow> listCharacters(Long workId) {
        return jdbc.query("SELECT * FROM character WHERE work_id=? ORDER BY first_sort_order", CHAR, workId);
    }

    public List<Faction> listFactions(Long workId) {
        return jdbc.query("SELECT * FROM faction WHERE work_id=? ORDER BY first_sort_order", FACTION, workId);
    }

    public List<Relationship> listRelationships(Long workId) {
        return jdbc.query("SELECT * FROM relationship WHERE work_id=?", REL, workId);
    }
}
