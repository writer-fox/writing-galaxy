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
import java.util.Optional;

/**
 * 人物/势力/关系 CRUD（方案 M1）。
 * 读操作与 GraphDao 复用同一套 RowMapper 语义。
 */
@Repository
public class CastDao {

    private final JdbcTemplate jdbc;

    public CastDao(JdbcTemplate jdbc) {
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

    /* ---------- 人物 ---------- */

    public List<CharacterRow> listCharacters(Long workId) {
        return jdbc.query("SELECT * FROM character WHERE work_id=? ORDER BY first_sort_order, id", CHAR, workId);
    }

    public Optional<CharacterRow> findCharacter(Long id) {
        List<CharacterRow> rows = jdbc.query("SELECT * FROM character WHERE id=?", CHAR, id);
        return rows.stream().findFirst();
    }

    public Long insertCharacter(Long workId, String name, String aliases, Long factionId, String role,
                                String description, String avatarColor, double importance,
                                int firstSortOrder, String status) {
        jdbc.update("INSERT INTO character(work_id, name, aliases, faction_id, role, description, avatar_color,"
                        + " importance, first_sort_order, status) VALUES(?,?,?,?,?,?,?,?,?,?)",
            workId, name, aliases, factionId, role, description, avatarColor, importance, firstSortOrder, status);
        return lastId();
    }

    public void updateCharacter(Long id, String name, String aliases, Long factionId, String role,
                                String description, String avatarColor, Double importance,
                                Integer firstSortOrder, String status, Boolean confirmed) {
        jdbc.update("UPDATE character SET name=?, aliases=?, faction_id=?, role=?, description=?,"
                        + " avatar_color=?, importance=?, first_sort_order=?, status=?, confirmed=? WHERE id=?",
            name, aliases, factionId, role, description, avatarColor, importance, firstSortOrder, status,
            confirmed != null && confirmed ? 1 : 0, id);
    }

    public void deleteCharacter(Long id) {
        jdbc.update("DELETE FROM character WHERE id=?", id);
    }

    /* ---------- 势力 ---------- */

    public List<Faction> listFactions(Long workId) {
        return jdbc.query("SELECT * FROM faction WHERE work_id=? ORDER BY first_sort_order, id", FACTION, workId);
    }

    public Optional<Faction> findFaction(Long id) {
        List<Faction> rows = jdbc.query("SELECT * FROM faction WHERE id=?", FACTION, id);
        return rows.stream().findFirst();
    }

    public Long insertFaction(Long workId, String name, Long parentFactionId, String type,
                              String description, String color, double importance, int firstSortOrder) {
        jdbc.update("INSERT INTO faction(work_id, name, parent_faction_id, type, description, color,"
                        + " importance, first_sort_order) VALUES(?,?,?,?,?,?,?,?)",
            workId, name, parentFactionId, type, description, color, importance, firstSortOrder);
        return lastId();
    }

    public void updateFaction(Long id, String name, Long parentFactionId, String type,
                              String description, String color, Double importance, Integer firstSortOrder) {
        jdbc.update("UPDATE faction SET name=?, parent_faction_id=?, type=?, description=?, color=?,"
                        + " importance=?, first_sort_order=? WHERE id=?",
            name, parentFactionId, type, description, color, importance, firstSortOrder, id);
    }

    public void deleteFaction(Long id) {
        jdbc.update("DELETE FROM faction WHERE id=?", id);
    }

    /* ---------- 关系 ---------- */

    public List<Relationship> listRelationships(Long workId) {
        return jdbc.query("SELECT * FROM relationship WHERE work_id=? ORDER BY start_sort_order, id", REL, workId);
    }

    public Optional<Relationship> findRelationship(Long id) {
        List<Relationship> rows = jdbc.query("SELECT * FROM relationship WHERE id=?", REL, id);
        return rows.stream().findFirst();
    }

    public Long insertRelationship(Long workId, Long fromId, String fromType, Long toId, String toType,
                                   String relType, double strength, int startSortOrder, Integer endSortOrder,
                                   String note) {
        jdbc.update("INSERT INTO relationship(work_id, from_id, from_type, to_id, to_type, rel_type, strength,"
                        + " start_sort_order, end_sort_order, note) VALUES(?,?,?,?,?,?,?,?,?,?)",
            workId, fromId, fromType, toId, toType, relType, strength, startSortOrder, endSortOrder, note);
        return lastId();
    }

    public void updateRelationship(Long id, Long fromId, String fromType, Long toId, String toType,
                                   String relType, Double strength, Integer startSortOrder, Integer endSortOrder,
                                   String note, Boolean confirmed) {
        jdbc.update("UPDATE relationship SET from_id=?, from_type=?, to_id=?, to_type=?, rel_type=?,"
                        + " strength=?, start_sort_order=?, end_sort_order=?, note=?, confirmed=? WHERE id=?",
            fromId, fromType, toId, toType, relType, strength, startSortOrder, endSortOrder, note,
            confirmed != null && confirmed ? 1 : 0, id);
    }

    public void deleteRelationship(Long id) {
        jdbc.update("DELETE FROM relationship WHERE id=?", id);
    }

    /** 删除实体时级联清理与其相关的所有关系 */
    public void deleteRelationshipsOf(Long entityId, String entityType) {
        jdbc.update("DELETE FROM relationship WHERE (from_id=? AND from_type=?) OR (to_id=? AND to_type=?)",
            entityId, entityType, entityId, entityType);
    }

    /** 删除势力后，解除其下人物的归属 */
    public void detachFactionMembers(Long factionId) {
        jdbc.update("UPDATE character SET faction_id=NULL WHERE faction_id=?", factionId);
    }

    private long lastId() {
        return jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
    }
}
