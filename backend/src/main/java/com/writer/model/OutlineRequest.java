package com.writer.model;

/** 生成大纲请求 */
public record OutlineRequest(
    Long workId,
    String scope       // book / volume / chapter（简略版默认 book）
) {}
