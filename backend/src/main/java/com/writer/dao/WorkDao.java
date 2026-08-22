package com.writer.dao;

import com.writer.model.Work;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class WorkDao {

    private final JdbcTemplate jdbc;

    public WorkDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final RowMapper<Work> MAPPER = (rs, i) -> new Work(
        rs.getLong("id"),
        rs.getString("title"),
        rs.getString("genre"),
        rs.getString("summary"),
        rs.getString("created_at"),
        rs.getString("updated_at")
    );

    public List<Work> list() {
        return jdbc.query("SELECT * FROM work ORDER BY created_at DESC", MAPPER);
    }

    public Optional<Work> findById(Long id) {
        List<Work> rows = jdbc.query("SELECT * FROM work WHERE id=?", MAPPER, id);
        return rows.stream().findFirst();
    }

    public Long insert(String title, String genre, String summary) {
        jdbc.update(
            "INSERT INTO work(title, genre, summary) VALUES(?, ?, ?)",
            title, genre, summary);
        return jdbc.queryForObject("SELECT last_insert_rowid()", Long.class);
    }

    public void touch(Long id) {
        jdbc.update("UPDATE work SET updated_at=datetime('now') WHERE id=?", id);
    }
}
