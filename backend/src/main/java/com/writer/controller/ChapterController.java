package com.writer.controller;

import com.writer.model.Chapter;
import com.writer.model.CreateChapterRequest;
import com.writer.model.UpdateChapterRequest;
import com.writer.service.ChapterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/chapters")
@CrossOrigin(origins = "*")
public class ChapterController {

    private final ChapterService service;

    public ChapterController(ChapterService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        Optional<Chapter> c = service.get(id);
        return c.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(
            @RequestParam Long workId,
            @RequestBody CreateChapterRequest req) {
        Chapter created = service.create(workId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UpdateChapterRequest req) {
        boolean ok = service.update(id, req);
        if (!ok) return ResponseEntity.notFound().build();
        return service.get(id).<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** 删除：workId 用于删除后的重排 */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @RequestParam Long workId) {
        boolean ok = service.delete(workId, id);
        if (!ok) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
