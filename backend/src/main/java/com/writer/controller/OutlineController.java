package com.writer.controller;

import com.writer.dao.OutlineDao;
import com.writer.dao.WorkDao;
import com.writer.model.OutlineNode;
import com.writer.model.OutlineNodeRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** 大纲树 CRUD（总纲/分卷纲/章纲，对齐方案 5.1） */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class OutlineController {

    private final OutlineDao dao;
    private final WorkDao workDao;

    public OutlineController(OutlineDao dao, WorkDao workDao) {
        this.dao = dao;
        this.workDao = workDao;
    }

    @GetMapping("/works/{workId}/outline")
    public ResponseEntity<?> list(@PathVariable Long workId) {
        if (workDao.findById(workId).isEmpty()) return ResponseEntity.notFound().build();
        List<OutlineNode> all = dao.listByWork(workId);
        return ResponseEntity.ok(all);
    }

    @PostMapping("/works/{workId}/outline")
    public ResponseEntity<?> create(@PathVariable Long workId, @RequestBody OutlineNodeRequest req) {
        if (workDao.findById(workId).isEmpty()) return ResponseEntity.notFound().build();
        if (req.level() == null || req.level() < 0 || req.level() > 2)
            return ResponseEntity.badRequest().body(Map.of("message", "level 必须为 0/1/2"));
        int sort = req.sortOrder() == null ? dao.nextSortOrder(workId) : req.sortOrder();
        Long id = dao.insert(workId, req.parentId(), req.level(), req.refSortOrder(),
            req.title() == null ? "" : req.title(), req.content(), sort);
        return ResponseEntity.status(HttpStatus.CREATED).body(dao.findById(id).orElseThrow());
    }

    @PutMapping("/outline/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody OutlineNodeRequest req) {
        Optional<OutlineNode> cur = dao.findById(id);
        if (cur.isEmpty()) return ResponseEntity.notFound().build();
        OutlineNode n = cur.get();
        dao.update(id,
            req.parentId(), req.level() == null ? n.level() : req.level(),
            req.refSortOrder() != null ? req.refSortOrder() : n.refSortOrder(),
            req.title() == null ? n.title() : req.title(),
            req.content() != null ? req.content() : n.content(),
            req.sortOrder() == null ? n.sortOrder() : req.sortOrder());
        return ResponseEntity.ok(dao.findById(id).orElseThrow());
    }

    @DeleteMapping("/outline/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (dao.findById(id).isEmpty()) return ResponseEntity.notFound().build();
        dao.delete(id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
