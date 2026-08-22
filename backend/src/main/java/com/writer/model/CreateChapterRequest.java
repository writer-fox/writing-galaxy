package com.writer.model;

/**
 * 新建章节请求。
 * afterSortOrder 用于插入到指定坐标之后（省略=追加末尾）。
 * 后端据此做紧凑重排。
 */
public record CreateChapterRequest(
    String title,
    Integer afterSortOrder
) {}
