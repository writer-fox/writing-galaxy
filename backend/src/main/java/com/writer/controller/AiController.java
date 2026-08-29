package com.writer.controller;

import com.writer.config.LlmConfig;
import com.writer.model.AnalyzeChapterRequest;
import com.writer.model.OutlineRequest;
import com.writer.service.AiService;
import com.writer.service.llm.ProviderNotConfiguredException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** AI 接口：写大纲 / 单章关系抽取。未配 key 时返回明确的 400 配置提示。 */
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiController {

    private final AiService ai;
    private final LlmConfig llmConfig;

    public AiController(AiService ai, LlmConfig llmConfig) {
        this.ai = ai;
        this.llmConfig = llmConfig;
    }

    @PostMapping("/outline")
    public ResponseEntity<?> outline(@RequestBody OutlineRequest req) {
        if (req.workId() == null) return bad("workId 不能为空");
        return run(() -> ai.generateOutline(req.workId()));
    }

    @PostMapping("/analyze-chapter")
    public ResponseEntity<?> analyzeChapter(@RequestBody AnalyzeChapterRequest req) {
        if (req.chapterId() == null) return bad("chapterId 不能为空");
        return run(() -> ai.analyzeChapter(req.chapterId()));
    }

    /** 配置状态查询：前端据此显示「已配置/未配置」而不必调真实接口 */
    @GetMapping("/status")
    public ResponseEntity<?> status() {
        return ResponseEntity.ok(Map.of(
            "configured", llmConfig.isConfigured(),
            "summary", llmConfig.describe()));
    }

    private ResponseEntity<?> run(java.util.function.Supplier<String> task) {
        try {
            return ResponseEntity.ok(Map.of("result", task.get()));
        } catch (ProviderNotConfiguredException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("configured", false, "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", e.getMessage()));
        }
    }

    private ResponseEntity<?> bad(String msg) {
        return ResponseEntity.badRequest().body(Map.of("message", msg));
    }
}
