package com.writer.model;

/** 新建/更新大纲节点请求 */
public record OutlineNodeRequest(
    Long parentId,
    Integer level,          // 0总纲 1分卷 2章纲
    Integer refSortOrder,
    String title,
    String content,
    Integer sortOrder
) {}
