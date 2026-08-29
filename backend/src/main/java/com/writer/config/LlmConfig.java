package com.writer.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** LLM 配置：从环境变量/application.yml 读取，未配置则 AI 接口返回明确提示而非崩溃 */
@Component
public class LlmConfig {

    private final String provider;
    private final String apiKey;
    private final String baseUrl;
    private final String model;

    public LlmConfig(
        @Value("${llm.provider:}") String provider,
        @Value("${llm.api-key:}") String apiKey,
        @Value("${llm.base-url:}") String baseUrl,
        @Value("${llm.model:}") String model) {
        this.provider = provider == null ? "" : provider.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
        this.model = model == null ? "" : model.trim();
    }

    public String provider() { return provider; }

    public String apiKey() { return apiKey; }

    public String baseUrl() { return baseUrl; }

    public String model() { return model; }

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    /** 打印可用配置摘要（不泄露 key 本身） */
    public String describe() {
        if (!isConfigured()) return "provider=" + (provider.isBlank() ? "未配置" : provider) + "（未配置 api-key）";
        return "provider=" + (provider.isBlank() ? "默认" : provider)
            + ", model=" + (model.isBlank() ? "默认" : model);
    }
}
