package com.writer.controller;

import com.writer.dao.CastDao;
import com.writer.dao.WorkDao;
import com.writer.model.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 人物 / 势力 / 关系 手动 CRUD（对齐方案 M1 与接口设计）。
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CastController {

    private final CastDao dao;
    private final WorkDao workDao;

    public CastController(CastDao dao, WorkDao workDao) {
        this.dao = dao;
        this.workDao = workDao;
    }

    private boolean workExists(Long workId) {
        return workDao.findById(workId).isPresent();
    }

    private ResponseEntity<?> notFound() {
        return ResponseEntity.notFound().build();
    }

    private ResponseEntity<?> bad(String msg) {
        return ResponseEntity.badRequest().body(Map.of("message", msg));
    }

    /* ================= 人物 ================= */

    @GetMapping("/works/{workId}/characters")
    public ResponseEntity<?> listCharacters(@PathVariable Long workId) {
        if (!workExists(workId)) return notFound();
        return ResponseEntity.ok(dao.listCharacters(workId));
    }

    @PostMapping("/works/{workId}/characters")
    public ResponseEntity<?> createCharacter(@PathVariable Long workId, @RequestBody CreateCharacterRequest r) {
        if (!workExists(workId)) return notFound();
        if (r.name() == null || r.name().isBlank()) return bad("人物名不能为空");
        double imp = r.importance() == null ? 0.5 : Math.max(0, Math.min(1, r.importance()));
        int first = r.firstSortOrder() == null ? 1 : r.firstSortOrder();
        Long id = dao.insertCharacter(workId, r.name().trim(),
            r.aliases() == null ? "[]" : r.aliases(),
            r.factionId(), r.role() == null ? "配角" : r.role(), r.description(),
            r.avatarColor() == null ? "#2a9d8f" : r.avatarColor(), imp, first,
            r.status() == null ? "存活" : r.status());
        return ResponseEntity.status(HttpStatus.CREATED).body(dao.findCharacter(id).orElseThrow());
    }

    @PutMapping("/characters/{id}")
    public ResponseEntity<?> updateCharacter(@PathVariable Long id, @RequestBody UpdateCharacterRequest r) {
        Optional<CharacterRow> cur = dao.findCharacter(id);
        if (cur.isEmpty()) return notFound();
        CharacterRow c = cur.get();
        dao.updateCharacter(id,
            r.name() == null ? c.name() : r.name().trim(),
            r.aliases() == null ? c.aliases() : r.aliases(),
            r.factionId() != null ? r.factionId() : c.factionId(),
            r.role() == null ? c.role() : r.role(),
            r.description() != null ? r.description() : c.description(),
            r.avatarColor() != null ? r.avatarColor() : c.avatarColor(),
            r.importance() == null ? c.importance() : Math.max(0, Math.min(1, r.importance())),
            r.firstSortOrder() == null ? c.firstSortOrder() : r.firstSortOrder(),
            r.status() == null ? c.status() : r.status(),
            r.confirmed());
        return ResponseEntity.ok(dao.findCharacter(id).orElseThrow());
    }

    @DeleteMapping("/characters/{id}")
    public ResponseEntity<?> deleteCharacter(@PathVariable Long id) {
        if (dao.findCharacter(id).isEmpty()) return notFound();
        dao.deleteRelationshipsOf(id, "character");
        dao.deleteCharacter(id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    /* ================= 势力 ================= */

    @GetMapping("/works/{workId}/factions")
    public ResponseEntity<?> listFactions(@PathVariable Long workId) {
        if (!workExists(workId)) return notFound();
        return ResponseEntity.ok(dao.listFactions(workId));
    }

    @PostMapping("/works/{workId}/factions")
    public ResponseEntity<?> createFaction(@PathVariable Long workId, @RequestBody CreateFactionRequest r) {
        if (!workExists(workId)) return notFound();
        if (r.name() == null || r.name().isBlank()) return bad("势力名不能为空");
        double imp = r.importance() == null ? 0.5 : Math.max(0, Math.min(1, r.importance()));
        int first = r.firstSortOrder() == null ? 1 : r.firstSortOrder();
        Long id = dao.insertFaction(workId, r.name().trim(), r.parentFactionId(),
            r.type() == null ? "组织" : r.type(), r.description(),
            r.color() == null ? "#4f9df0" : r.color(), imp, first);
        return ResponseEntity.status(HttpStatus.CREATED).body(dao.findFaction(id).orElseThrow());
    }

    @PutMapping("/factions/{id}")
    public ResponseEntity<?> updateFaction(@PathVariable Long id, @RequestBody CreateFactionRequest r) {
        Optional<Faction> cur = dao.findFaction(id);
        if (cur.isEmpty()) return notFound();
        Faction f = cur.get();
        dao.updateFaction(id,
            r.name() == null ? f.name() : r.name().trim(),
            r.parentFactionId(), r.type() == null ? f.type() : r.type(),
            r.description() != null ? r.description() : f.description(),
            r.color() != null ? r.color() : f.color(),
            r.importance() == null ? f.importance() : Math.max(0, Math.min(1, r.importance())),
            r.firstSortOrder() == null ? f.firstSortOrder() : r.firstSortOrder());
        return ResponseEntity.ok(dao.findFaction(id).orElseThrow());
    }

    @DeleteMapping("/factions/{id}")
    public ResponseEntity<?> deleteFaction(@PathVariable Long id) {
        if (dao.findFaction(id).isEmpty()) return notFound();
        dao.deleteRelationshipsOf(id, "faction");
        dao.detachFactionMembers(id);
        dao.deleteFaction(id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    /* ================= 关系 ================= */

    @GetMapping("/works/{workId}/relationships")
    public ResponseEntity<?> listRelationships(@PathVariable Long workId) {
        if (!workExists(workId)) return notFound();
        return ResponseEntity.ok(dao.listRelationships(workId));
    }

    @PostMapping("/works/{workId}/relationships")
    public ResponseEntity<?> createRelationship(@PathVariable Long workId, @RequestBody CreateRelationshipRequest r) {
        if (!workExists(workId)) return notFound();
        if (r.fromId() == null || r.toId() == null) return bad("关系两端都必须指定");
        if (r.relType() == null || r.relType().isBlank()) return bad("关系类型不能为空");
        double s = r.strength() == null ? 0.5 : Math.max(0, Math.min(1, r.strength()));
        int start = r.startSortOrder() == null ? 1 : r.startSortOrder();
        Long id = dao.insertRelationship(workId, r.fromId(),
            r.fromType() == null ? "character" : r.fromType(), r.toId(),
            r.toType() == null ? "character" : r.toType(), r.relType(), s, start,
            r.endSortOrder(), r.note());
        return ResponseEntity.status(HttpStatus.CREATED).body(dao.findRelationship(id).orElseThrow());
    }

    @PutMapping("/relationships/{id}/confirm")
    public ResponseEntity<?> confirmRelationship(@PathVariable Long id) {
        Optional<Relationship> cur = dao.findRelationship(id);
        if (cur.isEmpty()) return notFound();
        Relationship r = cur.get();
        dao.updateRelationship(id, r.fromId(), r.fromType(), r.toId(), r.toType(), r.relType(),
            r.strength(), r.startSortOrder(), r.endSortOrder(), r.note(), true);
        return ResponseEntity.ok(dao.findRelationship(id).orElseThrow());
    }

    @DeleteMapping("/relationships/{id}")
    public ResponseEntity<?> deleteRelationship(@PathVariable Long id) {
        if (dao.findRelationship(id).isEmpty()) return notFound();
        dao.deleteRelationship(id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
