package com.writer.model;

/** 章节（对齐 chapter 表；sortOrder 为稳定坐标/时间轴基准） */
public record Chapter(
    Long id,
    Long workId,
    int sortOrder,
    String title,
    String content,
    int wordCount,
    int status,
    String analyzedAt
) {}
