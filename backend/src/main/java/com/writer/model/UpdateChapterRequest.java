package com.writer.model;

/** 更新章节请求（标题/正文/状态任意可更新） */
public record UpdateChapterRequest(
    String title,
    String content,
    Integer status
) {}
