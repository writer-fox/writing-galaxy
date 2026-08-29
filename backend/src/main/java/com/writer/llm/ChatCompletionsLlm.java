package com.writer.llm;

import com.writer.config.LlmConfig;
import com.writer.service.llm.LlmProvider;
import com.writer.service.llm.ProviderNotConfiguredException;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * 通用 OpenAI 兼容 Chat Completions 客户端。
 * 兼容 GLM-4、DeepSeek(Qwen 系)、通义等以 /v1/chat/completions 为契约的国内大模型。
 * api-key 未配置时抛 ProviderNotConfiguredException，由上层转为友好提示。
 */
@Component
public class ChatCompletionsLlm implements LlmProvider {

    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(15)).build();

    private final LlmConfig cfg;

    public ChatCompletionsLlm(LlmConfig cfg) {
        this.cfg = cfg;
    }

    @Override
    public String name() {
        return cfg.provider().isBlank() ? "llm" : cfg.provider();
    }

    @Override
    public String complete(String systemPrompt, String userPrompt) {
        if (!cfg.isConfigured()) {
            throw new ProviderNotConfiguredException(
                "LLM 未配置：请在 backend 的 application.yml 或环境变量设置 llm.api-key（支持 GLM-4 / DeepSeek 等 Chat Completions 厂商）。当前："
                + cfg.describe());
        }
        String url = defaultBase() + "/chat/completions";
        String model = cfg.model().isBlank() ? defaultModel() : cfg.model();
        String body = "{\"model\":\"" + model + "\",\"messages\":["
            + msg("system", systemPrompt) + "," + msg("user", userPrompt)
            + "],\"temperature\":0.4}";

        try {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(120))
                .header("Authorization", "Bearer " + cfg.apiKey())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() / 100 != 2) {
                throw new RuntimeException("LLM 请求失败 HTTP " + resp.statusCode() + ": " + resp.body());
            }
            return extractContent(resp.body());
        } catch (ProviderNotConfiguredException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("LLM 调用异常: " + e.getMessage(), e);
        }
    }

    private String defaultBase() {
        if (!cfg.baseUrl().isBlank()) {
            String b = cfg.baseUrl();
            return b.endsWith("/") ? b.substring(0, b.length() - 1) : b;
        }
        // 按 provider 给默认网关（可被 base-url 覆盖）
        String p = cfg.provider().toLowerCase();
        if (p.contains("deepseek")) return "https://api.deepseek.com/v1";
        if (p.contains("zhipu") || p.contains("glm")) return "https://open.bigmodel.cn/api/paas/v4";
        // 默认走本地/通用网关
        return "http://localhost:11434/v1"; // Ollama 兼容端点
    }

    private String defaultModel() {
        String p = cfg.provider().toLowerCase();
        if (p.contains("deepseek")) return "deepseek-chat";
        if (p.contains("zhipu") || p.contains("glm")) return "glm-4";
        return "default";
    }

    private String msg(String role, String text) {
        String safe = text.replace("\\", "\\\\").replace("\"", "\\\"")
            .replace("\n", "\\n").replace("\r", "");
        return "{\"role\":\"" + role + "\",\"content\":\"" + safe + "\"}";
    }

    private String extractContent(String json) {
        // choices[0].message.content
        int ci = json.indexOf("\"choices\"");
        if (ci == -1) return json;
        int msgIdx = json.indexOf("\"message\"", ci);
        if (msgIdx == -1) return json;
        int conIdx = json.indexOf("\"content\"", msgIdx);
        if (conIdx == -1) return json;
        int q1 = json.indexOf('"', conIdx + 9);
        int q2 = json.indexOf('"', q1 + 1);
        if (q1 == -1 || q2 == -1) return json;
        String raw = json.substring(q1 + 1, q2);
        return raw.replace("\\n", "\n").replace("\\\"", "\"").replace("\\\\", "\\");
    }
}
