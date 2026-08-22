package com.writer.model;

/** 作品（对应 data 模型 work 表） */
public record Work(
    Long id,
    String title,
    String genre,
    String summary,
    String createdAt,
    String updatedAt
) {}
