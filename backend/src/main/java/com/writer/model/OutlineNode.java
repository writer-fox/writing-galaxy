package com.writer.model;

/** 大纲节点（outline_node，三层树：总纲0/分卷1/章纲2） */
public record OutlineNode(
    Long id,
    Long workId,
    Long parentId,
    int level,
    Integer refSortOrder,
    String title,
    String content,
    int sortOrder
) {}
