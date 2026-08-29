package com.writer.service.llm;

/** LLM Provider 抽象：当前实现见 ChatCompletionsLlm（GLM-4 / DeepSeek 等兼容 Chat Completions 厂商） */
public interface LlmProvider {

    String name();

    /**
     * 以 system + user 两段 prompt 请求补全，返回纯文本结果。
     * 未配置 key 时应抛 ProviderNotConfiguredException（由上层转为友好提示）。
     */
    String complete(String systemPrompt, String userPrompt);
}
