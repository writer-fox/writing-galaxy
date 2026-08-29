package com.writer.service.llm;

/** 当 LLM 未配置 api-key 时抛出，由上层转成明确的 400 提示而非崩溃 */
public class ProviderNotConfiguredException extends RuntimeException {
    public ProviderNotConfiguredException(String message) {
        super(message);
    }
}
