package com.writer.controller;

import com.writer.dao.WorkDao;
import com.writer.model.GraphResponse;
import com.writer.service.GraphService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/works/{workId}/graph")
@CrossOrigin(origins = "*")
public class GraphController {

    private final WorkDao workDao;
    private final GraphService graphService;

    public GraphController(WorkDao workDao, GraphService graphService) {
        this.workDao = workDao;
        this.graphService = graphService;
    }

    /** 图数据（对齐方案 GET /works/{id}/graph?mode=god|timeline&sort=S） */
    @GetMapping
    public ResponseEntity<?> graph(
            @PathVariable Long workId,
            @RequestParam(defaultValue = "god") String mode,
            @RequestParam(required = false) Integer sort) {
        if (workDao.findById(workId).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        GraphResponse resp = graphService.build(workId, mode, sort);
        return ResponseEntity.ok(resp);
    }
}
