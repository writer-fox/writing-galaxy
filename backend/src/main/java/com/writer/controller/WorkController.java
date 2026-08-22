package com.writer.controller;

import com.writer.dao.WorkDao;
import com.writer.model.CreateWorkRequest;
import com.writer.model.Work;
import com.writer.service.ChapterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/works")
@CrossOrigin(origins = "*")
public class WorkController {

    private final WorkDao workDao;
    private final ChapterService chapterService;

    public WorkController(WorkDao workDao, ChapterService chapterService) {
        this.workDao = workDao;
        this.chapterService = chapterService;
    }

    @GetMapping
    public List<Work> list() {
        return workDao.list();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateWorkRequest req) {
        if (req.title() == null || req.title().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "作品名不能为空"));
        }
        Long id = workDao.insert(req.title(), req.genre(), req.summary());
        Optional<Work> created = workDao.findById(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(created.orElseThrow());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        Optional<Work> w = workDao.findById(id);
        return w.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** 内容树（对齐方案 GET /works/{id}/tree） */
    @GetMapping("/{id}/tree")
    public ResponseEntity<?> tree(@PathVariable Long id) {
        Optional<Work> w = workDao.findById(id);
        if (w.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(chapterService.listByWork(id));
    }
}
